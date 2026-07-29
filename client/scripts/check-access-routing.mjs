import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyAccess, resolvePostLoginPath } from '../src/lib/accessRouting.js';

assert.equal(resolvePostLoginPath({ role: 'operator', is_owner: false }), '/app');
assert.equal(resolvePostLoginPath({ role: 'employee', is_owner: false }), '/app');
assert.equal(resolvePostLoginPath({ role: 'admin', is_owner: false }), '/');
assert.equal(resolvePostLoginPath({ role: 'operator', is_owner: true }), '/');
assert.equal(classifyAccess({ role: 'admin' }).canAccessOperation, true);
assert.equal(classifyAccess({ role: 'operator' }).canAccessOperation, true);
assert.equal(classifyAccess({ role: 'viewer' }).canAccessOperation, false);

const [appSource, dashboardSource, workspaceSource] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/DashboardRemote.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ChecklistWorkspace.jsx', import.meta.url), 'utf8'),
]);

assert.equal(
    appSource.includes('<Route path="checklists/:id/execute" element={<ChecklistExecutionWorkspace />} />'),
    false,
);
assert.equal(
    appSource.includes('<Route path="checklists/:id/execute" element={<ChecklistDetails />} />'),
    true,
);
assert.equal(dashboardSource.includes("task.id + '/execute'"), false);
assert.equal(workspaceSource.includes('/execute`'), false);
assert.equal(workspaceSource.includes('>Acompanhar</span>'), true);

process.stdout.write(`${JSON.stringify({ status: 'ok', checks: 12 })}\n`);
