#!/usr/bin/env node

import { createRequire } from 'node:module';

const requireFromClient = createRequire(new URL('../../../../client/package.json', import.meta.url));
const { createClient } = requireFromClient('@supabase/supabase-js');

const args = process.argv.slice(2);
const valueAfter = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
};

const userId = valueAfter('--user-id');
const email = valueAfter('--email');
const verifyLogin = args.includes('--verify-login');
const emailEnvName = valueAfter('--email-env') || 'RITMIKA_QA_EMAIL';
const passwordEnvName = valueAfter('--password-env') || 'RITMIKA_QA_PASSWORD';

const fail = (error, context = {}) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({
        app: 'ritmika',
        layer: 'auth-read',
        fn: 'inspectAuthUser',
        status: 'error',
        error: message,
        ...context,
    }));
    process.exit(1);
};

if (!userId && !email) {
    fail('user_id_or_email_required');
}

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !secretKey) {
    fail('SUPABASE_URL_and_SUPABASE_SECRET_KEY_required');
}

const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const findUser = async () => {
    const perPage = 100;
    for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const match = data.users.find((candidate) => (
            userId ? candidate.id === userId : candidate.email?.toLowerCase() === email.toLowerCase()
        ));
        if (match) return match;
        if (data.users.length < perPage) break;
    }
    return null;
};

try {
    const user = await findUser();
    if (!user) fail('auth_user_not_found', { userId: userId || null, email: email || null });

    const result = {
        status: 'ok',
        operation: 'read_only',
        user: {
            id: user.id,
            email: user.email,
            emailConfirmed: Boolean(user.email_confirmed_at),
            lastSignInAt: user.last_sign_in_at,
            bannedUntil: user.banned_until,
        },
        adminApi: {
            secretKeyAccepted: true,
            responseMode: 'supabase-js-admin-list-users',
        },
    };

    if (verifyLogin) {
        if (!publishableKey) fail('SUPABASE_PUBLISHABLE_KEY_required_for_login_check', { userId: user.id });
        const loginEmail = process.env[emailEnvName];
        const loginPassword = process.env[passwordEnvName];
        if (!loginEmail || !loginPassword) {
            fail('login_environment_variables_required', {
                userId: user.id,
                emailEnvName,
                passwordEnvName,
            });
        }

        const publicClient = createClient(supabaseUrl, publishableKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await publicClient.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
        });
        if (error) throw error;
        result.login = {
            status: data.user?.id === user.id ? 'ok' : 'unexpected_user',
            expectedUserId: user.id,
            authenticatedUserId: data.user?.id || null,
            emailEnvName,
            passwordEnvName,
        };
        await publicClient.auth.signOut();
    }

    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    fail(error, { userId: userId || null, email: email || null });
}
