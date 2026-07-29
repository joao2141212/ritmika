import { readFile } from 'node:fs/promises';

const cssPath = new URL('../src/styles/dashboard-reference-polish.css', import.meta.url);
const css = await readFile(cssPath, 'utf8');
const tabletStart = css.indexOf('@media (max-width: 900px)');
const mobileStart = css.indexOf('@media (max-width: 560px)');
const compactStart = css.indexOf('@media (max-width: 420px)');
if (tabletStart < 0) throw new Error('management_tablet_breakpoint_missing');
if (mobileStart < 0) throw new Error('management_mobile_breakpoint_missing');
if (compactStart < 0) throw new Error('management_compact_breakpoint_missing');
const tablet = css.slice(tabletStart, mobileStart);
const mobile = css.slice(mobileStart);
const compact = css.slice(compactStart);

const checks = [
  ['tablet summary grid overrides the desktop selector', /\.dashboard-remote \.remote-summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s, tablet],
  ['tablet summary grid disables the horizontal carousel', /\.dashboard-remote \.remote-summary-grid\s*\{[^}]*overflow-x:\s*visible[^}]*scroll-snap-type:\s*none/s, tablet],
  ['tablet cards release desktop column spans', /\.dashboard-remote \.remote-stat-card,[\s\S]*?\.dashboard-remote \.remote-stat-card:last-child\s*\{[^}]*grid-column:\s*auto/s, tablet],
  ['tablet dashboard clips accidental page overflow', /\.dashboard-remote\s*\{[^}]*overflow-x:\s*clip/s, tablet],
  ['summary grid restores grid layout', /\.remote-summary-grid\s*\{[^}]*display:\s*grid/s],
  ['summary grid cannot scroll horizontally', /\.remote-summary-grid\s*\{[^}]*overflow-x:\s*(?:visible|clip|hidden)/s],
  ['stat cards release carousel flex basis', /\.remote-stat-card[^}]*\{[^}]*flex:\s*(?:initial|none|0\s+1\s+auto)/s],
  ['dashboard clips accidental page overflow', /\.dashboard-remote\s*\{[^}]*overflow-x:\s*clip/s],
  ['title scales fluidly on phone widths', /\.remote-dashboard-header h1\s*\{[^}]*font-size:\s*clamp\(/s],
  ['filter toolbar uses a bounded mobile grid', /\.remote-filter-toolbar\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/s],
  ['compact phones use one summary column', /\.dashboard-remote \.remote-summary-grid\s*\{[^}]*grid-template-columns:\s*1fr/s, compact],
];

const failed = checks
  .filter(([, pattern, source = mobile]) => !pattern.test(source))
  .map(([label]) => label);
if (failed.length > 0) {
  process.stderr.write(`${JSON.stringify({ status: 'fail', failed })}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ status: 'ok', checks: checks.length })}\n`);
