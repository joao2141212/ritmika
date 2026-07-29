import {
    emailDomain,
    emailFingerprint,
    fetchAllAuthUsers,
    fetchTable,
    groupBy,
    isQaRecord,
    logEvent,
    requireAdminEnvironment,
} from '../lib/admin-api.ts';

const run = async () => {
    requireAdminEnvironment();
    const [authUsers, workspaces, memberships, profiles] = await Promise.all([
        fetchAllAuthUsers(),
        fetchTable('ritmika_workspaces', 'select=id,source_system,source_id,metadata'),
        fetchTable('ritmika_workspace_members', 'select=workspace_id,user_id,role,is_owner,managed_units,preferences'),
        fetchTable('ritmika_profiles', 'select=id,workspace_id,auth_user_id,role,is_owner,managed_units,metadata'),
    ]);

    const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
    const membershipsByUser = groupBy(memberships, (membership) => membership.user_id);
    const profilesByUser = groupBy(
        profiles.filter((profile) => profile.auth_user_id),
        (profile) => profile.auth_user_id,
    );
    const profilesByWorkspaceUser = new Map(
        profiles
            .filter((profile) => profile.auth_user_id)
            .map((profile) => [`${profile.workspace_id}:${profile.auth_user_id}`, profile]),
    );

    const accounts = authUsers.map((authUser) => {
        const userMemberships = membershipsByUser.get(authUser.id) || [];
        const userProfiles = profilesByUser.get(authUser.id) || [];
        const workspaceLinks = userMemberships.map((membership) => {
            const workspace = workspaceById.get(membership.workspace_id) || {};
            const profile = profilesByWorkspaceUser.get(`${membership.workspace_id}:${authUser.id}`);
            return {
                workspace_id: membership.workspace_id,
                workspace_source_system: workspace.source_system || '',
                workspace_source_id: workspace.source_id || '',
                role: membership.role || '',
                is_owner: Boolean(membership.is_owner),
                managed_unit_count: Array.isArray(membership.managed_units) ? membership.managed_units.length : 0,
                profile_present: Boolean(profile),
                profile_role: profile?.role || '',
                profile_is_owner: Boolean(profile?.is_owner),
                role_mismatch: Boolean(profile) && (profile.role || '') !== (membership.role || ''),
                owner_mismatch: Boolean(profile) && Boolean(profile.is_owner) !== Boolean(membership.is_owner),
            };
        });
        const qa = workspaceLinks.some((link) => link.workspace_source_system === 'ritmika_qa')
            || userMemberships.some(isQaRecord)
            || userProfiles.some(isQaRecord);
        return {
            auth_user_id: authUser.id,
            email_domain: emailDomain(authUser.email),
            email_fingerprint: emailFingerprint(authUser.email),
            confirmed: Boolean(authUser.email_confirmed_at),
            disabled: Boolean(authUser.banned_until || authUser.deleted_at),
            account_class: qa ? 'qa' : (workspaceLinks.length || userProfiles.length ? 'customer' : 'orphan'),
            workspace_count: new Set(workspaceLinks.map((link) => link.workspace_id)).size,
            profile_count: userProfiles.length,
            memberships: workspaceLinks,
        };
    });

    const linkedProfileIds = new Set(profiles.filter((profile) => profile.auth_user_id).map((profile) => profile.id));
    const output = {
        generated_at: new Date().toISOString(),
        summary: {
            auth_users: authUsers.length,
            workspaces: workspaces.length,
            memberships: memberships.length,
            profiles: profiles.length,
            linked_profiles: linkedProfileIds.size,
            domain_only_profiles: profiles.filter((profile) => !profile.auth_user_id).length,
            qa_accounts: accounts.filter((account) => account.account_class === 'qa').length,
            customer_accounts: accounts.filter((account) => account.account_class === 'customer').length,
            orphan_accounts: accounts.filter((account) => account.account_class === 'orphan').length,
        },
        accounts,
    };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    logEvent({ fn: 'auth.inventory', status: 'ok', ...output.summary });
};

run().catch((error) => {
    logEvent({
        fn: 'auth.inventory',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        statusCode: error?.statusCode,
    });
    process.exitCode = 1;
});
