import { existsSync, readdirSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';

import { loadRepoEnv, repoRoot, runProcess, scriptsRoot } from '../../runtime/process.ts';

export const dbScriptsRoot = resolve(scriptsRoot, 'db');

export const resolveDatabaseUrl = () => {
  loadRepoEnv();
  return String(
    process.env.SUPABASE_DB_URL
    || process.env.SUPABASE_DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.DATABASE_URL
    || '',
  );
};

export const requireDatabaseUrl = () => {
  const url = resolveDatabaseUrl();
  if (!url) throw new Error('SUPABASE_DB_URL_missing');
  return url;
};

export const listSqlFiles = (scope: 'read' | 'write') => {
  const directory = resolve(dbScriptsRoot, scope);
  return readdirSync(directory)
    .filter((entry) => entry.endsWith('.sql'))
    .sort();
};

export const resolveSqlFile = (scope: 'read' | 'write', requested: string) => {
  const candidate = resolve(repoRoot, requested);
  const allowedRoots = [resolve(dbScriptsRoot, scope), resolve(repoRoot, 'supabase/migrations')];
  const allowed = allowedRoots.some((root) => candidate === root || candidate.startsWith(`${root}/`));
  if (!allowed || !candidate.endsWith('.sql') || !existsSync(candidate)) {
    throw new Error(`sql_file_not_allowed:${requested}`);
  }
  return candidate;
};

export const runSqlFile = async (filePath: string, databaseUrl: string, args: string[]) => {
  const exitCode = await runProcess('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', filePath, ...args]);
  if (exitCode !== 0) process.exitCode = exitCode;
};

export const printUsage = (scope: 'read' | 'write') => {
  const command = scope === 'write' ? 'npm run supabase:db:write' : 'npm run supabase:db:read';
  process.stdout.write([
    `${command} -- <arquivo.sql>`,
    '',
    `Arquivos SQL permitidos em supabase/scripts/db/${scope}/ e supabase/migrations/.`,
    scope === 'write'
      ? 'Escrita exige --apply e RITMIKA_DB_WRITE_CONFIRM=yes.'
      : 'Leitura não altera o banco.',
    '',
    `Disponíveis agora: ${listSqlFiles(scope).join(', ') || '(nenhum)'}`,
    '',
  ].join('\n'));
};

export const describeInvocation = (scope: 'read' | 'write', filePath: string) => ({
  scope,
  file: relative(repoRoot, filePath),
  name: basename(filePath),
  source: 'supabase/scripts/db/runtime/connection.ts',
});
