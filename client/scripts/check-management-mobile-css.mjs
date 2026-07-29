import { readFile } from 'node:fs/promises';

const cssPath = new URL('../src/styles/dashboard-reference-polish.css', import.meta.url);
const css = await readFile(cssPath, 'utf8');
const mobileStart = css.indexOf('@media (max-width: 560px)');
if (mobileStart < 0) throw new Error('management_mobile_breakpoint_missing');
const mobile = css.slice(mobileStart);

const checks = [
  ['summary grid restores grid layout', /\.remote-summary-grid\s*\{[^}]*display:\s*grid/s],
  ['summary grid cannot scroll horizontally', /\.remote-summary-grid\s*\{[^}]*overflow-x:\s*(?:visible|clip|hidden)/s],
  ['stat cards release carousel flex basis', /\.remote-stat-card[^}]*\{[^}]*flex:\s*(?:initial|none|0\s+1\s+auto)/s],
  ['dashboard clips accidental page overflow', /\.dashboard-remote\s*\{[^}]*overflow-x:\s*clip/s],
  ['title scales fluidly on phone widths', /\.remote-dashboard-header h1\s*\{[^}]*font-size:\s*clamp\(/s],
  ['filter toolbar uses a bounded mobile grid', /\.remote-filter-toolbar\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/s],
];

const failed = checks.filter(([, pattern]) => !pattern.test(mobile)).map(([label]) => label);
if (failed.length > 0) {
  process.stderr.write(`${JSON.stringify({ status: 'fail', failed })}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ status: 'ok', checks: checks.length })}\n`);
