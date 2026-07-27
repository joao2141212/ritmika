import assert from 'node:assert/strict';
import test from 'node:test';
import { compileFeatureContract } from '../src/compiler/contract-compiler.js';
import { compileStateMachine } from '../src/compiler/machine-compiler.js';
import { compileTransition } from '../src/compiler/transition-compiler.js';
import { fingerprint } from '../src/compiler/stable.js';
import { parseSemanticFlow } from '../src/replay/semantic-flow.js';
import type { UIState } from '../src/types.js';

const state = (id: string, timestamp: number): UIState => ({
  id,
  app: 'fixture-app',
  feature: 'fixture-feature',
  side: 'clone',
  url: 'http://localhost/fixture',
  semanticRoute: '/fixture',
  viewport: { width: 1280, height: 720 },
  accessibilityTree: { role: 'main' },
  domSnapshot: { nodes: [] },
  layoutSnapshot: { fixedOrAbsolute: [], scrollContainers: [], visibleVirtualRanges: [] },
  styleDigest: { fingerprint: 'styles' },
  focusPath: ['button'],
  overlayStack: [],
  scrollContainers: [],
  scrollOffsets: {},
  visibleVirtualRanges: [],
  pendingIndicators: [],
  storageDigest: {
    localStorage: { keys: [], count: 0, fingerprint: 'local' },
    sessionStorage: { keys: [], count: 0, fingerprint: 'session' },
    indexedDb: { databases: [], metadata: [] },
  },
  timestamp,
});

test('fingerprint is stable when object key order changes', () => {
  assert.equal(fingerprint({ b: 2, a: 1 }), fingerprint({ a: 1, b: 2 }));
});

test('semantic flow normalizes safety and compiles a transition', () => {
  const flow = parseSemanticFlow({
    id: 'flow-1',
    app: 'fixture-app',
    feature: 'fixture-feature',
    initialFixture: 'empty',
    steps: [{ command: 'openMenu', args: { name: 'commands' } }],
  });
  assert.equal(flow.steps[0]?.safety, 'read-only');
  const transition = compileTransition(state('before', 10), state('after', 25), {
    action: { name: 'openMenu', safety: 'read-only' },
    successAssertions: ['menu visible'],
  });
  const contract = compileFeatureContract({ app: flow.app, feature: flow.feature, transitions: [transition] });
  assert.equal(transition.duration, 15);
  assert.deepEqual(contract.successStates, ['menu visible']);
  assert.equal(compileStateMachine([transition]).initial, 'before');
});
