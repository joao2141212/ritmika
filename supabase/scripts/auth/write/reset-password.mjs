import {
    adminRequest,
    fetchTable,
    isQaRecord,
    logEvent,
    requireAdminEnvironment,
} from '../lib/admin-api.mjs';

const argValue = (name) => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : '';
};

const run = async () => {
    requireAdminEnvironment();
    const userId = argValue('--user-id');
    const confirmation = argValue('--confirm');
    const apply = process.argv.includes('--apply');
    const allowCustomer = process.argv.includes('--allow-customer');
    const password = String(process.env.RITMIKA_NEW_PASSWORD || '');

    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('valid_user_id_required');

    const [authUser, memberships, profiles] = await Promise.all([
        adminRequest(`/auth/v1/admin/users/${userId}`),
        fetchTable('ritmika_workspace_members', `select=workspace_id,user_id,role,is_owner,preferences&user_id=eq.${userId}`),
        fetchTable('ritmika_profiles', `select=workspace_id,auth_user_id,role,is_owner,metadata&auth_user_id=eq.${userId}`),
    ]);
    if (!authUser?.id) throw new Error('auth_user_not_found');
    if (memberships.length === 0 && profiles.length === 0) throw new Error('target_not_managed_by_ritmika');

    const qa = memberships.some(isQaRecord) || profiles.some(isQaRecord);
    const accountClass = qa ? 'qa' : 'customer';
    const expectedConfirmation = `RESET:${userId}:${accountClass.toUpperCase()}`;
    const plan = {
        fn: 'auth.resetPassword',
        status: apply ? 'pending' : 'dry_run',
        targetUserId: userId,
        accountClass,
        membershipCount: memberships.length,
        profileCount: profiles.length,
        expectedConfirmation,
    };

    if (!apply) {
        process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
        logEvent(plan);
        return;
    }
    if (accountClass === 'customer' && !allowCustomer) throw new Error('customer_reset_requires_allow_customer');
    if (confirmation !== expectedConfirmation) throw new Error('reset_confirmation_mismatch');
    if (password.length < 12) throw new Error('RITMIKA_NEW_PASSWORD_minimum_12_chars');

    await adminRequest(`/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
    });
    logEvent({ ...plan, status: 'ok' });
    process.stdout.write(`${JSON.stringify({
        status: 'password_reset',
        targetUserId: userId,
        accountClass,
    })}\n`);
};

run().catch((error) => {
    logEvent({
        fn: 'auth.resetPassword',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        statusCode: error?.statusCode,
    });
    process.exitCode = 1;
});
