#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const target = process.env.QA_CREDENTIAL_TARGET || 'operator';
const targetConfig = {
  operator: {
    confirmation: 'RESET:QA_OPERATOR_CREDENTIALS',
    emailKey: 'QA_OPERATOR_EMAIL',
    passwordKey: 'QA_OPERATOR_PASSWORD',
    userIdKey: 'QA_OPERATOR_USER_ID',
    defaultEmail: 'qa.worker.ritmika@example.com',
  },
  manager: {
    confirmation: 'RESET:QA_MANAGER_CREDENTIALS',
    emailKey: 'QA_MANAGER_EMAIL',
    passwordKey: 'QA_MANAGER_PASSWORD',
    userIdKey: 'QA_MANAGER_USER_ID',
    defaultEmail: '',
  },
}[target];

if (!targetConfig) {
  process.stderr.write(`${JSON.stringify({
    fn: 'resetQaCredentials',
    status: 'error',
    errorCode: 'INVALID_QA_CREDENTIAL_TARGET',
    target,
  })}\n`);
  process.exit(2);
}

const confirmation = targetConfig.confirmation;
const qaEmail = process.env[targetConfig.emailKey] || targetConfig.defaultEmail;
const envPath = path.resolve(process.cwd(), '.env');

function fail(errorCode, error, extra = {}) {
  process.stderr.write(`${JSON.stringify({
    fn: 'resetQaCredentials',
    status: 'error',
    errorCode,
    error,
    ...extra,
  })}\n`);
  process.exit(1);
}

if (process.env.RITMIKA_WRITE_CONFIRMATION !== confirmation) {
  fail(
    'WRITE_CONFIRMATION_REQUIRED',
    'A confirmação explícita para redefinir apenas a credencial QA não foi fornecida.',
    { expectedConfirmation: confirmation },
  );
}

if (!qaEmail) {
  fail('QA_EMAIL_REQUIRED', `${targetConfig.emailKey} é obrigatório para o alvo ${target}.`);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  fail('MISSING_ENV', 'SUPABASE_URL e SUPABASE_SECRET_KEY são obrigatórios.');
}

if (!fs.existsSync(envPath)) {
  fail('ENV_FILE_NOT_FOUND', 'O arquivo .env de destino não existe.', { envPath });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function createPassword() {
  return `Rk!${crypto.randomBytes(24).toString('base64url')}9a`;
}

function upsertEnvValues(source, values) {
  const keys = new Set(Object.keys(values));
  const lines = source.split(/\r?\n/);
  const written = new Set();
  const updated = lines.map((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
    if (!match || !keys.has(match[1])) return line;
    written.add(match[1]);
    return `${match[1]}=${values[match[1]]}`;
  });

  for (const [key, value] of Object.entries(values)) {
    if (!written.has(key)) updated.push(`${key}=${value}`);
  }

  return `${updated.filter((line, index, all) => (
    line !== '' || index < all.length - 1
  )).join('\n')}\n`;
}

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const users = data?.users || [];
    const user = users.find((candidate) => candidate.email === email);
    if (user) return user;
    if (users.length < 100) return null;
    page += 1;
  }
}

async function resetQaCredentials() {
  const user = await findUserByEmail(qaEmail);
  if (!user) {
    fail('QA_USER_NOT_FOUND', 'A conta QA operacional não foi encontrada.', {
      email: qaEmail,
    });
  }

  const password = createPassword();
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const currentEnv = fs.readFileSync(envPath, 'utf8');
  const updatedEnv = upsertEnvValues(currentEnv, {
    [targetConfig.userIdKey]: user.id,
    [targetConfig.emailKey]: qaEmail,
    [targetConfig.passwordKey]: password,
  });
  fs.writeFileSync(envPath, updatedEnv, { mode: 0o600 });
  fs.chmodSync(envPath, 0o600);

  process.stdout.write(`${JSON.stringify({
    status: 'ok',
    target: `qa_${target}_only`,
    userId: user.id,
    email: qaEmail,
    envPath,
    passwordStored: true,
  })}\n`);
}

resetQaCredentials().catch((error) => {
  fail(
    error?.code || 'QA_CREDENTIAL_RESET_FAILED',
    error instanceof Error ? error.message : String(error),
  );
});
