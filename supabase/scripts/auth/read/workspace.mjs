import {
    emailFingerprint,
    fetchTable,
    logEvent,
    requireAdminEnvironment,
} from '../lib/admin-api.mjs';
import { argValue, assertUuid, hasFlag, printJson } from '../lib/cli.mjs';

const run = async () => {
    requireAdminEnvironment();
    const workspaceId = assertUuid(argValue('--workspace-id'), 'workspace_id');
    const includeContact = hasFlag('--include-contact');
    const filter = `workspace_id=eq.${workspaceId}`;

    const [workspaces, memberships, profiles, units, sectors] = await Promise.all([
        fetchTable('ritmika_workspaces', `select=id,name,source_system,source_id,metadata&id=eq.${workspaceId}`),
        fetchTable('ritmika_workspace_members', `select=id,user_id,role,is_owner,managed_units,preferences,created_at,updated_at&${filter}`),
        fetchTable('ritmika_profiles', `select=id,auth_user_id,source_user_id,email,name,phone,role,is_owner,managed_units,metadata&${filter}`),
        fetchTable('ritmika_units', `select=id,source_id,name&${filter}`),
        fetchTable('ritmika_sectors', `select=id,source_id,name&${filter}`),
    ]);

    if (workspaces.length !== 1) throw new Error('workspace_not_found');
    const membershipByUser = new Map(memberships.map((row) => [row.user_id, row]));
    const directory = profiles.map((profile) => {
        const membership = profile.auth_user_id ? membershipByUser.get(profile.auth_user_id) : null;
        const record = {
            profile_id: profile.id,
            auth_user_id: profile.auth_user_id || null,
            source_user_id: profile.source_user_id || null,
            name: profile.name || null,
            email_fingerprint: emailFingerprint(profile.email),
            role: membership?.role || profile.role,
            is_owner: membership?.is_owner ?? profile.is_owner ?? false,
            managed_units: membership?.managed_units || profile.managed_units || [],
            access_state: membership ? 'active_auth_membership' : (profile.auth_user_id ? 'auth_without_membership' : 'directory_only'),
        };
        if (includeContact) {
            record.email = profile.email || null;
            record.phone = profile.phone || null;
        }
        return record;
    });

    const result = {
        workspace: workspaces[0],
        counts: {
            auth_memberships: memberships.length,
            directory_profiles: profiles.length,
            linked_profiles: profiles.filter((row) => row.auth_user_id).length,
            directory_only_profiles: profiles.filter((row) => !row.auth_user_id).length,
            units: units.length,
            sectors: sectors.length,
        },
        roles: memberships.reduce((summary, row) => {
            summary[row.role] = (summary[row.role] || 0) + 1;
            return summary;
        }, {}),
        directory,
        units,
        sectors,
        contact_fields_included: includeContact,
    };
    printJson(result);
    logEvent({
        fn: 'auth.readWorkspace',
        status: 'ok',
        workspaceId,
        counts: result.counts,
        contactFieldsIncluded: includeContact,
    });
};

run().catch((error) => {
    logEvent({ fn: 'auth.readWorkspace', status: 'error', error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
});
