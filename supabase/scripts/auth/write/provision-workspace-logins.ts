import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmod, mkdir, open, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
    adminRequest,
    fetchAllAuthUsers,
    fetchTable,
    logEvent,
    requireAdminEnvironment,
} from '../lib/admin-api.ts';

const argValue = (name) => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : '';
};

const hasFlag = (name) => process.argv.includes(name);
const assertUuid = (value, field) => {
    if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`valid_${field}_required`);
    return value;
};

const normalizeText = (value) => String(value || '').trim();
const displayName = (profile) => normalizeText(
    profile.name
    || profile.full_name
    || profile.display_name
    || profile.metadata?.name
    || profile.metadata?.full_name
    || `Acesso ${String(profile.id).slice(0, 8)}`,
);

const loginFor = (profile) => {
    const fingerprint = createHash('sha256').update(String(profile.id)).digest('hex').slice(0, 16);
    return `acesso+${fingerprint}@ritmika.invalid`;
};

const passwordFor = () => {
    const raw = randomBytes(24).toString('base64url');
    return `Rm!${raw}7a`;
};

const restWrite = async (path, method, body, prefer = 'return=representation') => adminRequest(path, {
    method,
    headers: { Prefer: prefer },
    body: JSON.stringify(body),
});

const writePrivateReport = async (outputPath, report) => {
    const absolute = resolve(outputPath);
    await mkdir(dirname(absolute), { recursive: true });
    const temporary = `${absolute}.${process.pid}.${randomUUID()}.tmp`;
    const handle = await open(temporary, 'wx', 0o600);
    try {
        await handle.writeFile(`${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8' });
    } finally {
        await handle.close();
    }
    await chmod(temporary, 0o600);
    await rename(temporary, absolute);
    await chmod(absolute, 0o600);
    return absolute;
};

const fail = (error, context = {}) => {
    const message = error instanceof Error ? error.message : String(error);
    logEvent({
        fn: 'auth.provisionWorkspaceLogins',
        status: 'error',
        error: message,
        httpStatus: error?.statusCode || null,
        providerCode: error?.payload?.code || null,
        ...context,
    });
    process.stderr.write(`${JSON.stringify({ status: 'error', error: message, ...context })}\n`);
    process.exit(1);
};

const run = async () => {
    requireAdminEnvironment();
    const workspaceId = assertUuid(argValue('--workspace-id'), 'workspace_id');
    const outputPath = argValue('--output');
    const confirmation = argValue('--confirm');
    const apply = hasFlag('--apply');
    const allowCustomer = hasFlag('--allow-customer');

    const [workspaces, profiles, authUsers] = await Promise.all([
        fetchTable('ritmika_workspaces', `select=id,source_system,source_id,metadata&id=eq.${workspaceId}`),
        fetchTable('ritmika_profiles', `select=*&workspace_id=eq.${workspaceId}&order=created_at.asc`),
        fetchAllAuthUsers(),
    ]);
    if (workspaces.length !== 1) throw new Error('workspace_not_found');
    const workspace = workspaces[0];
    const accountClass = workspace.source_system === 'ritmika_qa' ? 'qa' : 'customer';
    const missing = profiles.filter((profile) => !profile.auth_user_id);
    const expectedConfirmation = `PROVISION:${workspaceId}:${missing.length}`;
    const assignedProfiles = await fetchTable(
        'ritmika_checklists',
        `select=responsible_profile_id&workspace_id=eq.${workspaceId}&responsible_profile_id=not.is.null`,
    );
    const assignedIds = new Set(assignedProfiles.map((row) => row.responsible_profile_id));
    const plan = {
        fn: 'auth.provisionWorkspaceLogins',
        status: apply ? 'pending' : 'dry_run',
        workspaceId,
        workspaceSourceSystem: workspace.source_system || '',
        workspaceSourceId: workspace.source_id || '',
        accountClass,
        profileCount: profiles.length,
        alreadyLinkedCount: profiles.length - missing.length,
        missingLoginCount: missing.length,
        missingWithAssignments: missing.filter((profile) => assignedIds.has(profile.id)).length,
        targetRole: 'operator',
        emailDelivery: false,
        expectedConfirmation,
    };

    if (!apply) {
        process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
        logEvent(plan);
        return;
    }
    if (accountClass === 'customer' && !allowCustomer) throw new Error('customer_provision_requires_allow_customer');
    if (confirmation !== expectedConfirmation) throw new Error('provision_confirmation_mismatch');
    if (!outputPath) throw new Error('output_path_required');
    if (missing.length === 0) {
        process.stdout.write(`${JSON.stringify({ ...plan, status: 'noop', reportWritten: false })}\n`);
        return;
    }

    const authByEmail = new Map(authUsers.map((user) => [normalizeText(user.email).toLowerCase(), user]));
    const credentials = [];
    const failures = [];

    for (const profile of missing) {
        const email = loginFor(profile);
        const password = passwordFor();
        let authUser = authByEmail.get(email);
        try {
            const appMetadata = {
                account_class: accountClass,
                workspace_id: workspaceId,
                profile_id: profile.id,
                role: 'operator',
            };
            if (authUser) {
                authUser = await adminRequest(`/auth/v1/admin/users/${authUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ password, app_metadata: appMetadata }),
                });
            } else {
                authUser = await adminRequest('/auth/v1/admin/users', {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password,
                        email_confirm: true,
                        app_metadata: appMetadata,
                        user_metadata: { display_name: displayName(profile) },
                    }),
                });
            }
            if (!authUser?.id) throw new Error('auth_user_create_missing_id');

            await restWrite(
                '/rest/v1/ritmika_workspace_members?on_conflict=workspace_id,user_id',
                'POST',
                {
                    workspace_id: workspaceId,
                    user_id: authUser.id,
                    role: 'operator',
                    is_owner: false,
                    managed_units: Array.isArray(profile.managed_units) ? profile.managed_units : [],
                    preferences: {
                        provisioned_by: 'auth.provisionWorkspaceLogins',
                        profile_id: profile.id,
                    },
                },
                'resolution=merge-duplicates,return=representation',
            );
            const updatedProfiles = await restWrite(
                `/rest/v1/ritmika_profiles?id=eq.${profile.id}&workspace_id=eq.${workspaceId}&auth_user_id=is.null`,
                'PATCH',
                {
                    auth_user_id: authUser.id,
                    role: 'operator',
                    is_owner: false,
                    metadata: {
                        ...(profile.metadata || {}),
                        auth_provisioned_at: new Date().toISOString(),
                        auth_provisioned_by: 'auth.provisionWorkspaceLogins',
                    },
                    updated_at: new Date().toISOString(),
                },
            );
            if (!Array.isArray(updatedProfiles) || updatedProfiles.length !== 1) {
                throw new Error('profile_link_not_applied_exactly_once');
            }
            credentials.push({
                profile_id: profile.id,
                display_name: displayName(profile),
                login: email,
                temporary_password: password,
                role: 'operator',
                workspace_id: workspaceId,
                auth_user_id: authUser.id,
                has_existing_assignment: assignedIds.has(profile.id),
            });
        } catch (error) {
            failures.push({
                profile_id: profile.id,
                login_fingerprint: createHash('sha256').update(email).digest('hex').slice(0, 12),
                error: error instanceof Error ? error.message : String(error),
            });
            logEvent({
                fn: 'auth.provisionWorkspaceLogins.item',
                status: 'error',
                workspaceId,
                profileId: profile.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    const report = {
        generated_at: new Date().toISOString(),
        purpose: 'Temporary customer login handoff. Rotate passwords after first access.',
        workspace: {
            id: workspaceId,
            source_system: workspace.source_system || '',
            source_id: workspace.source_id || '',
        },
        credentials,
        failures,
    };
    const absoluteReportPath = await writePrivateReport(outputPath, report);
    const result = {
        ...plan,
        status: failures.length === 0 ? 'ok' : 'partial',
        provisionedCount: credentials.length,
        failureCount: failures.length,
        reportWritten: true,
        reportPath: absoluteReportPath,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    logEvent(result);
    if (failures.length > 0) process.exitCode = 1;
};

run().catch((error) => fail(error));
