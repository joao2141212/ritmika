import { printUsage, requireDatabaseUrl, resolveSqlFile, runSqlFile } from '../runtime/connection.ts';

const args = process.argv.slice(2);
const requested = args.find((arg) => arg.endsWith('.sql')) || '';
const apply = args.includes('--apply');
const confirmed = process.env.RITMIKA_DB_WRITE_CONFIRM === 'yes';

if (!requested || args.includes('--help') || args.includes('help')) {
  printUsage('write');
} else if (!apply || !confirmed) {
  process.stderr.write(JSON.stringify({
    status: 'blocked',
    reason: 'db_write_confirmation_required',
    required: ['--apply', 'RITMIKA_DB_WRITE_CONFIRM=yes'],
    file: requested,
  }) + '\n');
  process.exitCode = 2;
} else {
  const filePath = resolveSqlFile('write', requested);
  const databaseUrl = requireDatabaseUrl();
  await runSqlFile(filePath, databaseUrl, args.filter((arg) => arg !== requested && arg !== '--apply'));
}
