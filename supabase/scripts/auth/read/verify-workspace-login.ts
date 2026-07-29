import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { logEvent, requireAdminEnvironment } from '../lib/admin-api.ts';

const argValue = (name) => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : '';
};

declare global {
    interface Error {
        statusCode?: number;
        payload?: unknown;
    }
}

const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = { raw: text.slice(0, 300) };
        }
    }
    if (!response.ok) {
        const error = new Error(`verification_http_${response.status}`);
        error.statusCode = response.status;
        error.payload = payload;
        throw error;
    }
    return payload;
};

const run = async () => {
    requireAdminEnvironment();
    const baseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '');
    if (!publishableKey.startsWith('sb_publishable_')) throw new Error('SUPABASE_PUBLISHABLE_KEY_missing');
    const reportPath = resolve(argValue('--report'));
    const workspaceId = argValue('--workspace-id');
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) throw new Error('valid_workspace_id_required');
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const credential = report.credentials?.find((item) => (
        item.workspace_id === workspaceId && item.has_existing_assignment
    )) || report.credentials?.find((item) => item.workspace_id === workspaceId);
    if (!credential) throw new Error('credential_fixture_not_found');

    const token = await requestJson(`${baseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credential.login, password: credential.temporary_password }),
    });
    const accessToken = token?.access_token;
    if (!accessToken) throw new Error('login_missing_access_token');
    const headers = { apikey: publishableKey, Authorization: `Bearer ${accessToken}` };

    try {
        const [memberships, profiles, assignedChecklists, foreignWorkspaces] = await Promise.all([
            requestJson(`${baseUrl}/rest/v1/ritmika_workspace_members?select=workspace_id,user_id,role,is_owner&user_id=eq.${credential.auth_user_id}`, { headers }),
            requestJson(`${baseUrl}/rest/v1/ritmika_profiles?select=id,workspace_id,auth_user_id,role,is_owner&id=eq.${credential.profile_id}`, { headers }),
            requestJson(`${baseUrl}/rest/v1/ritmika_checklists?select=id,workspace_id,responsible_profile_id&responsible_profile_id=eq.${credential.profile_id}`, { headers }),
            requestJson(`${baseUrl}/rest/v1/ritmika_workspaces?select=id&id=neq.${workspaceId}`, { headers }),
        ]);
        const appMetadata = token.user?.app_metadata || {};
        const result = {
            fn: 'auth.verifyWorkspaceLogin',
            status: 'ok',
            authenticated: token.user?.id === credential.auth_user_id,
            appMetadataMatches: appMetadata.workspace_id === workspaceId
                && appMetadata.profile_id === credential.profile_id
                && appMetadata.role === 'operator',
            membershipCount: Array.isArray(memberships) ? memberships.length : -1,
            profileCount: Array.isArray(profiles) ? profiles.length : -1,
            assignedChecklistCount: Array.isArray(assignedChecklists) ? assignedChecklists.length : -1,
            foreignWorkspaceCount: Array.isArray(foreignWorkspaces) ? foreignWorkspaces.length : -1,
            role: memberships?.[0]?.role || '',
            isOwner: Boolean(memberships?.[0]?.is_owner),
        };
        const valid = result.authenticated
            && result.appMetadataMatches
            && result.membershipCount === 1
            && result.profileCount === 1
            && result.assignedChecklistCount > 0
            && result.foreignWorkspaceCount === 0
            && result.role === 'operator'
            && result.isOwner === false;
        if (!valid) throw Object.assign(new Error('workspace_login_contract_failed'), { result });
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        logEvent(result);
    } finally {
        await fetch(`${baseUrl}/auth/v1/logout`, {
            method: 'POST',
            headers,
        }).catch(() => null);
    }
};

run().catch((error) => {
    const result = {
        fn: 'auth.verifyWorkspaceLogin',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        ...(error?.result || {}),
    };
    logEvent(result);
    process.stderr.write(`${JSON.stringify(result)}\n`);
    process.exit(1);
});
