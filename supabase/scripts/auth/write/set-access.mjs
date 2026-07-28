import {
    fetchTable,
    isQaRecord,
    logEvent,
    patchTable,
    requireAdminEnvironment,
} from '../lib/admin-api.mjs';
import {
    argValue,
    assertUuid,
    csvValues,
    hasFlag,
    parseBoolean,
    printJson,
} from '../lib/cli.mjs';

const ALLOWED_ROLES = new Set(['admin', 'manager', 'operator', 'viewer']);

const run = async () => {
    requireAdminEnvironment();
    const userId = assertUuid(argValue('--user-id'), 'user_id');
    const workspaceId = assertUuid(argValue('--workspace-id'), 'workspace_id');
    const role = argValue('--role').toLowerCase();
    const isOwner = parseBoolean(argValue('--owner') || 'false', 'owner');
    const managedUnits = csvValues(argValue('--managed-units'));
    const confirmation = argValue('--confirm');
    const apply = hasFlag('--apply');
    const allowCustomer = hasFlag('--allow-customer');
    if (!ALLOWED_ROLES.has(role)) throw new Error('unsupported_role');

    const [memberships, profiles, workspaces] = await Promise.all([
        fetchTable('ritmika_workspace_members', `select=id,workspace_id,user_id,role,is_owner,managed_units,preferences&workspace_id=eq.${workspaceId}&user_id=eq.${userId}`),
        fetchTable('ritmika_profiles', `select=id,workspace_id,auth_user_id,role,is_owner,managed_units,metadata&workspace_id=eq.${workspaceId}&auth_user_id=eq.${userId}`),
        fetchTable('ritmika_workspaces', `select=id,source_system,source_id,metadata&id=eq.${workspaceId}`),
    ]);
    if (memberships.length !== 1) throw new Error('exactly_one_membership_required');
    if (profiles.length !== 1) throw new Error('exactly_one_linked_profile_required');
    if (workspaces.length !== 1) throw new Error('workspace_not_found');

    const accountClass = [memberships[0], profiles[0], workspaces[0]].some(isQaRecord) ? 'qa' : 'customer';
    const expectedConfirmation = `ACCESS:${userId}:${workspaceId}:${role.toUpperCase()}:${isOwner ? 'OWNER' : 'MEMBER'}`;
    const updates = {
        role,
        is_owner: isOwner,
        managed_units: managedUnits,
        updated_at: new Date().toISOString(),
    };
    const plan = {
        fn: 'auth.setAccess',
        status: apply ? 'pending' : 'dry_run',
        targetUserId: userId,
        workspaceId,
        accountClass,
        before: {
            membership: { role: memberships[0].role, is_owner: memberships[0].is_owner, managed_units: memberships[0].managed_units },
            profile: { role: profiles[0].role, is_owner: profiles[0].is_owner, managed_units: profiles[0].managed_units },
        },
        after: updates,
        expectedConfirmation,
    };
    if (!apply) {
        printJson(plan);
        logEvent(plan);
        return;
    }
    if (accountClass === 'customer' && !allowCustomer) throw new Error('customer_access_change_requires_allow_customer');
    if (confirmation !== expectedConfirmation) throw new Error('access_confirmation_mismatch');

    const membershipFilters = `workspace_id=eq.${workspaceId}&user_id=eq.${userId}`;
    const profileFilters = `workspace_id=eq.${workspaceId}&auth_user_id=eq.${userId}`;
    await patchTable('ritmika_workspace_members', membershipFilters, updates);
    try {
        await patchTable('ritmika_profiles', profileFilters, updates);
    } catch (error) {
        const rollback = {
            role: memberships[0].role,
            is_owner: memberships[0].is_owner,
            managed_units: memberships[0].managed_units,
            updated_at: new Date().toISOString(),
        };
        try {
            await patchTable('ritmika_workspace_members', membershipFilters, rollback);
            logEvent({ ...plan, status: 'rolled_back', error: error instanceof Error ? error.message : String(error) });
        } catch (rollbackError) {
            logEvent({
                ...plan,
                status: 'critical_partial_write',
                error: error instanceof Error ? error.message : String(error),
                rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            });
            throw new Error('profile_update_failed_and_membership_rollback_failed');
        }
        throw error;
    }
    printJson({ status: 'access_updated', targetUserId: userId, workspaceId, accountClass, role, is_owner: isOwner, managed_units: managedUnits });
    logEvent({ ...plan, status: 'ok' });
};

run().catch((error) => {
    logEvent({ fn: 'auth.setAccess', status: 'error', error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
});
