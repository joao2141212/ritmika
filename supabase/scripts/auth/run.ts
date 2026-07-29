import { resolve } from 'node:path';
import { loadRepoEnv, requireEnvironment, runTypeScript, scriptsRoot } from '../runtime/process.ts';

const command = process.argv[2] || '';
const args = process.argv.slice(3);
if (command === 'help' || command === '--help') {
  process.stdout.write('Uso: bash supabase/scripts/auth/run.sh <comando> [args...]\n');
  process.exit(0);
}
const commands: Record<string, string> = {
  inventory: 'auth/read/inventory.ts',
  account: 'auth/read/account.ts',
  workspace: 'auth/read/workspace.ts',
  'verify-workspace-login': 'auth/read/verify-workspace-login.ts',
  'verify-all-workspace-logins': 'auth/read/verify-all-workspace-logins.ts',
  'production-ui-sweep': 'auth/read/production-ui-sweep.ts',
  environment: 'auth/read/environment.ts',
  'production-operation-e2e': 'auth/write/production-operation-e2e.ts',
  'reset-password': 'auth/write/reset-password.ts',
  'provision-workspace-logins': 'auth/write/provision-workspace-logins.ts',
  'reconcile-workspace-emails': 'auth/write/reconcile-workspace-emails.ts',
  'set-access': 'auth/write/set-access.ts',
  'account-state': 'auth/write/set-account-state.ts',
};

const relativeScript = commands[command];
if (!relativeScript) throw new Error(`unknown_auth_command:${command || 'missing'}`);

loadRepoEnv();
requireEnvironment('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const exitCode = await runTypeScript(resolve(scriptsRoot, relativeScript), args);
if (exitCode !== 0) process.exitCode = exitCode;
