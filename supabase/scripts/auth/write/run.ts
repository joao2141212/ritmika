import { resolve } from 'node:path';
import { loadRepoEnv, requireEnvironment, runTypeScript, scriptsRoot } from '../../runtime/process.ts';

const writeRoot = resolve(scriptsRoot, 'auth/write');
const requested = process.argv[2];
if (requested === 'help' || requested === '--help') {
  process.stdout.write('Uso: bash supabase/scripts/auth/write/run.sh <arquivo.ts> [args...]\n');
  process.exit(0);
}
if (!requested) throw new Error('auth_write_script_required');
const scriptPath = resolve(requested);

if (!scriptPath.startsWith(`${writeRoot}/`)) throw new Error('auth_write_script_outside_write_directory');
if (!scriptPath.endsWith('.ts')) throw new Error('auth_write_script_must_be_typescript');

loadRepoEnv();
requireEnvironment('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const exitCode = await runTypeScript(scriptPath, process.argv.slice(3));
if (exitCode !== 0) process.exitCode = exitCode;
