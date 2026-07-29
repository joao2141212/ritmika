import { printUsage, requireDatabaseUrl, resolveSqlFile, runSqlFile } from '../runtime/connection.ts';

const args = process.argv.slice(2);
const requested = args.find((arg) => arg.endsWith('.sql')) || '';

if (!requested || args.includes('--help') || args.includes('help')) {
  printUsage('read');
} else {
  const filePath = resolveSqlFile('read', requested);
  const databaseUrl = requireDatabaseUrl();
  await runSqlFile(filePath, databaseUrl, args.filter((arg) => arg !== requested));
}
