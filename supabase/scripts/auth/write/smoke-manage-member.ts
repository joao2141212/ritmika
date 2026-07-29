import { randomUUID } from 'node:crypto';

const baseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const secretKey = String(process.env.SUPABASE_SECRET_KEY || '');
const publishableKey = String(
    process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || '',
);

declare global {
    interface Error {
        statusCode?: number;
        safePayload?: unknown;
    }
}
const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const confirmation = (() => {
    const index = args.indexOf('--confirm');
    return index >= 0 ? String(args[index + 1] || '') : '';
})();

type RequestOptions = {
    method?: string;
    body?: unknown;
    key?: string;
    authorization?: string;
    correlationId?: string;
};

const request = async (path: string, {
    method = 'GET',
    body,
    key = secretKey,
    authorization = '',
    correlationId = '',
}: RequestOptions = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            apikey: key,
            'Content-Type': 'application/json',
            ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
            ...(correlationId ? { 'x-ritmika-correlation-id': correlationId } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(`smoke_http_${response.status}`);
        error.statusCode = response.status;
        error.safePayload = {
            error: payload?.error || payload?.message || 'unknown',
            correlationId: payload?.correlationId || correlationId || null,
        };
        throw error;
    }
    return payload;
};

const run = async () => {
    if (!baseUrl || !secretKey.startsWith('sb_secret_') || !publishableKey) {
        throw new Error('SUPABASE_URL_SECRET_OR_PUBLISHABLE_KEY_MISSING');
    }
    if (!hasFlag('--apply') || confirmation !== 'SMOKE:MANAGE_MEMBER:QA') {
        process.stdout.write(`${JSON.stringify({
            status: 'dry_run',
            target: 'qa_workspace_only',
            mutation: 'idempotent_manage_member_roundtrip',
            required: '--apply --confirm SMOKE:MANAGE_MEMBER:QA',
        }, null, 2)}\n`);
        return;
    }

    const workspaces = await request(
        '/rest/v1/ritmika_workspaces?select=id,source_system,source_id&source_system=eq.ritmika_qa',
    );
    if (!Array.isArray(workspaces) || workspaces.length !== 1) {
        throw new Error('QA_WORKSPACE_NOT_UNIQUE');
    }
    const workspace = workspaces[0];
    const memberships = await request(
        `/rest/v1/ritmika_workspace_members?select=id,workspace_id,user_id,role,is_owner,managed_units&workspace_id=eq.${workspace.id}&is_owner=eq.true`,
    );
    if (!Array.isArray(memberships) || memberships.length !== 1) {
        throw new Error('QA_OWNER_MEMBERSHIP_NOT_UNIQUE');
    }
    const owner = memberships[0];
    const profiles = await request(
        `/rest/v1/ritmika_profiles?select=id,workspace_id,auth_user_id,role,is_owner,managed_units&workspace_id=eq.${workspace.id}&auth_user_id=eq.${owner.user_id}`,
    );
    if (!Array.isArray(profiles) || profiles.length !== 1) {
        throw new Error('QA_OWNER_PROFILE_NOT_UNIQUE');
    }
    const profile = profiles[0];

    const authPayload = await request('/auth/v1/admin/users?page=1&per_page=1000');
    const authUsers = Array.isArray(authPayload) ? authPayload : (authPayload?.users || []);
    const authUser = authUsers.find((user) => user.id === owner.user_id);
    if (!authUser?.email) throw new Error('QA_AUTH_USER_NOT_FOUND');

    const generated = await request('/auth/v1/admin/generate_link', {
        method: 'POST',
        body: { type: 'magiclink', email: authUser.email },
    });
    const actionLinkToken = (() => {
        try {
            return new URL(generated?.action_link || generated?.properties?.action_link || '')
                .searchParams.get('token');
        } catch {
            return '';
        }
    })();
    const tokenHash = generated?.properties?.hashed_token || generated?.hashed_token || actionLinkToken;
    if (!tokenHash) {
        const error = new Error('QA_MAGIC_LINK_TOKEN_HASH_MISSING');
        error.safePayload = {
            response_keys: Object.keys(generated || {}),
            properties_keys: Object.keys(generated?.properties || {}),
        };
        throw error;
    }

    const verified = await request('/auth/v1/verify', {
        method: 'POST',
        body: { type: 'email', token_hash: tokenHash },
        key: publishableKey,
    });
    const accessToken = verified?.access_token;
    if (!accessToken) throw new Error('QA_ACCESS_TOKEN_MISSING');

    const correlationId = randomUUID();
    const result = await request('/functions/v1/manage-member', {
        method: 'POST',
        body: {
            workspace_id: workspace.id,
            profile_id: profile.id,
            role: profile.role,
            managed_units: Array.isArray(profile.managed_units) ? profile.managed_units : [],
            metadata: { qa_manage_member_smoke: true },
        },
        key: publishableKey,
        authorization: accessToken,
        correlationId,
    });

    if (result?.profile?.workspace_id !== workspace.id || result?.profile?.id !== profile.id) {
        throw new Error('QA_MANAGE_MEMBER_RESPONSE_MISMATCH');
    }
    if (result?.membership?.user_id !== owner.user_id) {
        throw new Error('QA_MANAGE_MEMBER_MEMBERSHIP_MISMATCH');
    }

    process.stdout.write(`${JSON.stringify({
        status: 'passed',
        target: 'qa',
        workspace_id: workspace.id,
        profile_id: profile.id,
        membership_id: result.membership.id,
        role: result.profile.role,
        correlation_id: result.correlationId || correlationId,
    }, null, 2)}\n`);
};

run().catch((error) => {
    process.stderr.write(`${JSON.stringify({
        status: 'failed',
        error: error.message,
        status_code: error.statusCode || null,
        detail: error.safePayload || null,
    }, null, 2)}\n`);
    process.exitCode = 1;
});
