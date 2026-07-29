import { createHash, randomUUID } from 'node:crypto';
import { chmod, open, readFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';

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
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const fingerprint = (value) => createHash('sha256').update(normalizeEmail(value)).digest('hex').slice(0, 12);
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const writePrivateReport = async (reportPath, report) => {
    const absolute = resolve(reportPath);
    const temporary = `${absolute}.${process.pid}.${randomUUID()}.tmp`;
    const handle = await open(temporary, 'wx', 0o600);
    try {
        await handle.writeFile(`${JSON.stringify(report, null, 2)}\n`, 'utf8');
    } finally {
        await handle.close();
    }
    await chmod(temporary, 0o600);
    await rename(temporary, absolute);
    await chmod(absolute, 0o600);
};

const run = async () => {
    requireAdminEnvironment();
    const workspaceId = argValue('--workspace-id');
    const reportPath = argValue('--report');
    const apply = hasFlag('--apply');
    const allowCustomer = hasFlag('--allow-customer');
    const confirmation = argValue('--confirm');
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) throw new Error('valid_workspace_id_required');
    if (!reportPath) throw new Error('report_path_required');

    const report = JSON.parse(await readFile(resolve(reportPath), 'utf8'));
    const [workspaces, profiles, authUsers] = await Promise.all([
        fetchTable('ritmika_workspaces', `select=id,source_system,source_id&id=eq.${workspaceId}`),
        fetchTable('ritmika_profiles', `select=id,workspace_id,auth_user_id,email,role&workspace_id=eq.${workspaceId}`),
        fetchAllAuthUsers(),
    ]);
    if (workspaces.length !== 1) throw new Error('workspace_not_found');
    const workspace = workspaces[0];
    const accountClass = workspace.source_system === 'ritmika_qa' ? 'qa' : 'customer';
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const authById = new Map(authUsers.map((user) => [user.id, user]));
    const authByEmail = new Map(authUsers.map((user) => [normalizeEmail(user.email), user]));
    const credentials = (report.credentials || []).filter((item) => item.workspace_id === workspaceId);
    if (credentials.length === 0) throw new Error('workspace_credentials_not_found');

    const targets = credentials.map((credential) => {
        const profile = profileById.get(credential.profile_id);
        const authUser = authById.get(credential.auth_user_id);
        if (!profile || profile.auth_user_id !== credential.auth_user_id) throw new Error('profile_auth_link_mismatch');
        if (!authUser) throw new Error('auth_user_not_found');
        const targetEmail = normalizeEmail(profile.email);
        if (!isEmail(targetEmail) || targetEmail.endsWith('@ritmika.invalid')) throw new Error('real_profile_email_required');
        const collision = authByEmail.get(targetEmail);
        if (collision && collision.id !== authUser.id) throw new Error(`email_collision:${fingerprint(targetEmail)}`);
        return {
            credential,
            authUser,
            targetEmail,
            currentEmail: normalizeEmail(authUser.email),
        };
    });
    if (new Set(targets.map((target) => target.targetEmail)).size !== targets.length) {
        throw new Error('duplicate_profile_emails');
    }

    const pending = targets.filter((target) => target.currentEmail !== target.targetEmail);
    const expectedConfirmation = `RECONCILE_EMAILS:${workspaceId}:${pending.length}`;
    const resultBase = {
        fn: 'auth.reconcileWorkspaceEmails',
        workspaceId,
        accountClass,
        credentialCount: credentials.length,
        pendingCount: pending.length,
        alreadyCorrectCount: targets.length - pending.length,
        expectedConfirmation,
    };
    if (!apply) {
        const result = { ...resultBase, status: 'dry_run' };
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        logEvent(result);
        return;
    }
    if (accountClass === 'customer' && !allowCustomer) throw new Error('customer_reconcile_requires_allow_customer');
    if (confirmation !== expectedConfirmation) throw new Error('reconcile_confirmation_mismatch');
    if (pending.length === 0) {
        process.stdout.write(`${JSON.stringify({ ...resultBase, status: 'noop' }, null, 2)}\n`);
        return;
    }

    const applied = [];
    try {
        for (const target of pending) {
            await adminRequest(`/auth/v1/admin/users/${target.authUser.id}`, {
                method: 'PUT',
                body: JSON.stringify({ email: target.targetEmail, email_confirm: true }),
            });
            target.credential.login = target.targetEmail;
            applied.push(target);
            logEvent({
                fn: 'auth.reconcileWorkspaceEmails.item',
                status: 'ok',
                workspaceId,
                authUserId: target.authUser.id,
                emailFingerprint: fingerprint(target.targetEmail),
            });
        }
        report.generated_at = new Date().toISOString();
        report.purpose = 'Customer login handoff using imported profile emails. Rotate temporary passwords after first access.';
        await writePrivateReport(reportPath, report);
    } catch (error) {
        const rollbackFailures = [];
        for (const target of applied.reverse()) {
            try {
                await adminRequest(`/auth/v1/admin/users/${target.authUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ email: target.currentEmail, email_confirm: true }),
                });
            } catch (rollbackError) {
                rollbackFailures.push({
                    auth_user_id: target.authUser.id,
                    error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
                });
            }
        }
        logEvent({
            fn: 'auth.reconcileWorkspaceEmails',
            status: 'error',
            workspaceId,
            error: error instanceof Error ? error.message : String(error),
            rollbackFailureCount: rollbackFailures.length,
        });
        if (rollbackFailures.length > 0) throw new Error('email_reconcile_failed_with_partial_rollback');
        throw error;
    }

    const result = { ...resultBase, status: 'ok', updatedCount: pending.length, reportUpdated: true };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    logEvent(result);
};

run().catch((error) => {
    const result = {
        fn: 'auth.reconcileWorkspaceEmails',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
    };
    logEvent(result);
    process.stderr.write(`${JSON.stringify(result)}\n`);
    process.exit(1);
});
