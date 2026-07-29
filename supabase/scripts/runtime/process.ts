import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const scriptsRoot = resolve(repoRoot, 'supabase/scripts');

export const loadRepoEnv = () => {
  const envPath = resolve(repoRoot, '.env');
  if (existsSync(envPath) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envPath);
  if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  }
};

export const requireEnvironment = (...names: string[]) => {
  for (const name of names) {
    if (!String(process.env[name] || '')) throw new Error(`${name}_missing`);
  }
};

export const runProcess = (command: string, args: string[], env = process.env) => new Promise<number>((resolveProcess, reject) => {
  const child = spawn(command, args, { env, stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (signal) return reject(new Error(`${command}_terminated_by_${signal}`));
    resolveProcess(code ?? 1);
  });
});

export const runTypeScript = (scriptPath: string, args: string[]) => runProcess(
  process.execPath,
  ['--import', 'tsx/esm', scriptPath, ...args],
);
