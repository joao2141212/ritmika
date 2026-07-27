import assert from 'node:assert/strict';
import test from 'node:test';
import { createStorageDigest, redactHeaders, redactValue } from '../src/redaction/redact.js';

test('redaction removes credentials and personal strings without storing the original value', () => {
  const safe = redactValue({ Authorization: 'Bearer very-secret-token', email: 'person@example.com' });
  assert.deepEqual(safe, { Authorization: '[REDACTED]', email: '[EMAIL]' });
  assert.deepEqual(redactHeaders({ Authorization: 'Bearer token', 'x-request-id': 'safe-id' }), {
    Authorization: '[REDACTED]',
    'x-request-id': 'safe-id',
  });
});

test('storage digest contains keys and metadata but no values', () => {
  const digest = createStorageDigest({ localStorage: [{ key: 'theme', type: 'string' }] });
  assert.deepEqual(digest.localStorage.keys, ['theme']);
  assert.equal('value' in digest.localStorage, false);
});
