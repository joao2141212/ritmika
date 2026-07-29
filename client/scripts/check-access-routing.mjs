import assert from 'node:assert/strict';
import { classifyAccess, resolvePostLoginPath } from '../src/lib/accessRouting.js';

assert.equal(resolvePostLoginPath({ role: 'operator', is_owner: false }), '/app');
assert.equal(resolvePostLoginPath({ role: 'employee', is_owner: false }), '/app');
assert.equal(resolvePostLoginPath({ role: 'admin', is_owner: false }), '/');
assert.equal(resolvePostLoginPath({ role: 'operator', is_owner: true }), '/');
assert.equal(classifyAccess({ role: 'admin' }).canAccessOperation, true);
assert.equal(classifyAccess({ role: 'operator' }).canAccessOperation, true);
assert.equal(classifyAccess({ role: 'viewer' }).canAccessOperation, false);

process.stdout.write(`${JSON.stringify({ status: 'ok', checks: 7 })}\n`);
