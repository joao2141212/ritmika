import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    adminRequest,
    fetchAllAuthUsers,
    logEvent,
    requireAdminEnvironment,
} from '../lib/admin-api.mjs';

const TARGET_EMAIL = 'qa.e2e.operator.ritmika@example.com';
const TARGET_NAME = 'Operador QA E2E';
const CONFIRMATION = 'PREPARE:QA_OPERATOR_CANDIDATE';

const upsertEnvValue = (contents, key, value) => {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    if (pattern.test(contents)) return contents.replace(pattern, line);
    return `${contents.replace(/\s*$/, '')}\n${line}\n`;
};

const run = async () => {
    const apply = process.argv.includes('--apply');
    const confirmationIndex = process.argv.indexOf('--confirm');
    const confirmation = confirmationIndex >= 0 ? process.argv[confirmationIndex + 1] : '';

    if (!apply || confirmation !== CONFIRMATION) {
        process.stdout.write(`${JSON.stringify({
            status: 'dry_run',
            target: 'qa_auth_candidate_only',
            email: TARGET_EMAIL,
            required: `--apply --confirm ${CONFIRMATION}`,
        }, null, 2)}\n`);
        return;
    }

    requireAdminEnvironment();
    const envPath = resolve(process.cwd(), '.env');
    const envContents = readFileSync(envPath, 'utf8');
    const storedPassword = envContents.match(/^QA_E2E_OPERATOR_PASSWORD=(.+)$/m)?.[1]?.trim();
    const password = storedPassword || `Rk!${randomBytes(24).toString('base64url')}`;
    const users = await fetchAllAuthUsers();
    const existing = users.find((user) => String(user.email || '').toLowerCase() === TARGET_EMAIL);

    if (existing && existing.user_metadata?.ritmika_qa !== true) {
        throw new Error('existing_target_is_not_marked_as_qa');
    }

    const body = JSON.stringify({
        email: TARGET_EMAIL,
        password,
        email_confirm: true,
        user_metadata: {
            ...(existing?.user_metadata || {}),
            name: TARGET_NAME,
            role: 'operator',
            ritmika_qa: true,
            qa_candidate: true,
        },
    });
    const authUser = existing
        ? await adminRequest(`/auth/v1/admin/users/${existing.id}`, { method: 'PUT', body })
        : await adminRequest('/auth/v1/admin/users', { method: 'POST', body });

    let nextEnv = upsertEnvValue(envContents, 'QA_E2E_OPERATOR_EMAIL', TARGET_EMAIL);
    nextEnv = upsertEnvValue(nextEnv, 'QA_E2E_OPERATOR_PASSWORD', password);
    writeFileSync(envPath, nextEnv, { mode: 0o600 });

    const result = {
        status: existing ? 'qa_auth_candidate_refreshed' : 'qa_auth_candidate_created',
        target: 'qa_auth_candidate_only',
        userId: authUser.id,
        email: TARGET_EMAIL,
        passwordStored: true,
        envPath,
    };
    logEvent({
        fn: 'auth.prepareQaOperatorCandidate',
        status: 'ok',
        targetUserId: authUser.id,
        target: result.target,
        created: !existing,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
};

run().catch((error) => {
    logEvent({
        fn: 'auth.prepareQaOperatorCandidate',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
    });
    process.stderr.write(`${JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
});
