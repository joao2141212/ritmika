import {
    adminRequest,
    fetchTable,
    isQaRecord,
    logEvent,
    requireAdminEnvironment,
} from '../lib/admin-api.mjs';
import { argValue, assertUuid, hasFlag, printJson } from '../lib/cli.mjs';

const ALLOWED_ACTIONS = new Set(['ban', 'unban']);

const run = async () => {
    requireAdminEnvironment();
    const userId = assertUuid(argValue('--user-id'), 'user_id');
    const action = argValue('--action').toLowerCase();
    const confirmation = argValue('--confirm');
    const apply = hasFlag('--apply');
    const allowCustomer = hasFlag('--allow-customer');
    if (!ALLOWED_ACTIONS.has(action)) throw new Error('action_must_be_ban_or_unban');

    const [authUser, memberships, profiles] = await Promise.all([
        adminRequest(`/auth/v1/admin/users/${userId}`),
        fetchTable('ritmika_workspace_members', `select=workspace_id,user_id,preferences&user_id=eq.${userId}`),
        fetchTable('ritmika_profiles', `select=workspace_id,auth_user_id,metadata&auth_user_id=eq.${userId}`),
    ]);
    if (!authUser?.id) throw new Error('auth_user_not_found');
    if (memberships.length === 0 && profiles.length === 0) throw new Error('target_not_managed_by_ritmika');

    const qa = memberships.some(isQaRecord) || profiles.some(isQaRecord);
    const accountClass = qa ? 'qa' : 'customer';
    const expectedConfirmation = `STATE:${userId}:${action.toUpperCase()}:${accountClass.toUpperCase()}`;
    const plan = {
        fn: 'auth.setAccountState',
        status: apply ? 'pending' : 'dry_run',
        targetUserId: userId,
        accountClass,
        action,
        currentBannedUntil: authUser.banned_until || null,
        expectedConfirmation,
    };
    if (!apply) {
        printJson(plan);
        logEvent(plan);
        return;
    }
    if (accountClass === 'customer' && !allowCustomer) throw new Error('customer_state_change_requires_allow_customer');
    if (confirmation !== expectedConfirmation) throw new Error('state_confirmation_mismatch');

    await adminRequest(`/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ ban_duration: action === 'ban' ? '876000h' : 'none' }),
    });
    printJson({ status: 'account_state_updated', targetUserId: userId, action, accountClass });
    logEvent({ ...plan, status: 'ok' });
};

run().catch((error) => {
    logEvent({ fn: 'auth.setAccountState', status: 'error', error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
});
