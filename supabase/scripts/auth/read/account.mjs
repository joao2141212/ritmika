import {
    adminRequest,
    emailDomain,
    emailFingerprint,
    fetchTable,
    isQaRecord,
    logEvent,
    requireAdminEnvironment,
} from '../lib/admin-api.mjs';
import { argValue, assertUuid, printJson } from '../lib/cli.mjs';

const run = async () => {
    requireAdminEnvironment();
    const userId = assertUuid(argValue('--user-id'), 'user_id');
    const [authUser, memberships, profiles] = await Promise.all([
        adminRequest(`/auth/v1/admin/users/${userId}`),
        fetchTable('ritmika_workspace_members', `select=workspace_id,user_id,role,is_owner,managed_units,preferences&user_id=eq.${userId}`),
        fetchTable('ritmika_profiles', `select=id,workspace_id,auth_user_id,name,role,is_owner,managed_units,metadata&auth_user_id=eq.${userId}`),
    ]);
    if (!authUser?.id) throw new Error('auth_user_not_found');

    const workspaceIds = [...new Set([
        ...memberships.map((row) => row.workspace_id),
        ...profiles.map((row) => row.workspace_id),
    ].filter(Boolean))];
    const workspaces = workspaceIds.length
        ? await fetchTable('ritmika_workspaces', `select=id,source_system,source_id,name,metadata&id=in.(${workspaceIds.join(',')})`)
        : [];
    const qa = memberships.some(isQaRecord) || profiles.some(isQaRecord) || workspaces.some(isQaRecord);
    const result = {
        user_id: authUser.id,
        account_class: qa ? 'qa' : (workspaceIds.length ? 'customer' : 'orphan'),
        email_domain: emailDomain(authUser.email),
        email_fingerprint: emailFingerprint(authUser.email),
        confirmed: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
        banned_until: authUser.banned_until || null,
        last_sign_in_at: authUser.last_sign_in_at || null,
        workspaces: workspaces.map(({ metadata: _metadata, ...workspace }) => workspace),
        memberships,
        profiles,
    };
    printJson(result);
    logEvent({ fn: 'auth.account', status: 'ok', targetUserId: userId, accountClass: result.account_class });
};

run().catch((error) => {
    logEvent({ fn: 'auth.account', status: 'error', error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
});
