import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { logEvent, requireAdminEnvironment } from '../lib/admin-api.ts';

const argValue = (name) => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : '';
};

const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`verification_http_${response.status}`);
    return payload;
};

const run = async () => {
    requireAdminEnvironment();
    const baseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '');
    if (!publishableKey.startsWith('sb_publishable_')) throw new Error('SUPABASE_PUBLISHABLE_KEY_missing');
    const workspaceId = argValue('--workspace-id');
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) throw new Error('valid_workspace_id_required');
    const report = JSON.parse(await readFile(resolve(argValue('--report')), 'utf8'));
    const credentials = (report.credentials || []).filter((item) => item.workspace_id === workspaceId);
    if (credentials.length === 0) throw new Error('workspace_credentials_not_found');

    const failures = [];
    let assignedAccountCount = 0;
    let assignedChecklistCount = 0;

    for (const credential of credentials) {
        let accessToken = '';
        try {
            const token = await requestJson(`${baseUrl}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: credential.login, password: credential.temporary_password }),
            });
            accessToken = token?.access_token || '';
            if (!accessToken || token.user?.id !== credential.auth_user_id) throw new Error('authentication_contract_failed');
            const appMetadata = token.user?.app_metadata || {};
            if (appMetadata.workspace_id !== workspaceId
                || appMetadata.profile_id !== credential.profile_id
                || appMetadata.role !== 'operator') throw new Error('app_metadata_contract_failed');
            const headers = { apikey: publishableKey, Authorization: `Bearer ${accessToken}` };
            const [memberships, profiles, checklists, foreignWorkspaces] = await Promise.all([
                requestJson(`${baseUrl}/rest/v1/ritmika_workspace_members?select=workspace_id,user_id,role,is_owner&user_id=eq.${credential.auth_user_id}`, { headers }),
                requestJson(`${baseUrl}/rest/v1/ritmika_profiles?select=id,workspace_id,auth_user_id,role,is_owner&id=eq.${credential.profile_id}`, { headers }),
                requestJson(`${baseUrl}/rest/v1/ritmika_checklists?select=id&responsible_profile_id=eq.${credential.profile_id}`, { headers }),
                requestJson(`${baseUrl}/rest/v1/ritmika_workspaces?select=id&id=neq.${workspaceId}`, { headers }),
            ]);
            if (memberships.length !== 1 || memberships[0].role !== 'operator' || memberships[0].is_owner) {
                throw new Error('membership_contract_failed');
            }
            if (profiles.length !== 1 || profiles[0].workspace_id !== workspaceId) throw new Error('profile_contract_failed');
            if (foreignWorkspaces.length !== 0) throw new Error('workspace_isolation_failed');
            if (checklists.length > 0) assignedAccountCount += 1;
            assignedChecklistCount += checklists.length;
        } catch (error) {
            failures.push({
                profile_id: credential.profile_id,
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            if (accessToken) {
                await fetch(`${baseUrl}/auth/v1/logout`, {
                    method: 'POST',
                    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
                }).catch(() => null);
            }
        }
    }

    const result = {
        fn: 'auth.verifyAllWorkspaceLogins',
        status: failures.length === 0 ? 'ok' : 'fail',
        workspaceId,
        testedLoginCount: credentials.length,
        successfulLoginCount: credentials.length - failures.length,
        failureCount: failures.length,
        assignedAccountCount,
        assignedChecklistCount,
        foreignWorkspaceCount: 0,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    logEvent(result);
    if (failures.length > 0) process.exitCode = 1;
};

run().catch((error) => {
    const result = {
        fn: 'auth.verifyAllWorkspaceLogins',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
    };
    logEvent(result);
    process.stderr.write(`${JSON.stringify(result)}\n`);
    process.exit(1);
});
