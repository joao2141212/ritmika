import { resolve } from 'node:path';
import { loadRepoEnv, requireEnvironment, runTypeScript, scriptsRoot } from '../../runtime/process.ts';

const readRoot = resolve(scriptsRoot, 'auth/read');
const command = process.argv[2] || '';
if (command === 'help' || command === '--help') {
  process.stdout.write('Uso: bash supabase/scripts/auth/read/run.sh [arquivo.ts] [args...]\n');
  process.exit(0);
}
const requested = command || resolve(readRoot, 'inventory.ts');
const scriptPath = resolve(requested);

if (!scriptPath.startsWith(`${readRoot}/`)) throw new Error('auth_read_script_outside_read_directory');
if (!scriptPath.endsWith('.ts')) throw new Error('auth_read_script_must_be_typescript');

loadRepoEnv();
requireEnvironment('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const exitCode = await runTypeScript(scriptPath, process.argv.slice(3));
if (exitCode !== 0) process.exitCode = exitCode;
