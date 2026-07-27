import assert from 'node:assert/strict';
import test from 'node:test';
import { createCausalTrace } from '../src/ir/causal-trace.js';
import { createRenderIR } from '../src/ir/render-ir.js';
import { compileUnifiedCloneSpec } from '../src/ir/unified-clone-spec.js';
import { compileTransition } from '../src/compiler/transition-compiler.js';
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

test('IR compiler preserves observed state and marks missing confirmation', () => {
  const before = state('before', 10);
  const after = state('after', 25);
  const transition = compileTransition(before, after, {
    action: { name: 'openPage', safety: 'read-only' },
  });
  const spec = compileUnifiedCloneSpec({
    app: 'fixture-app',
    feature: 'fixture-feature',
    states: [before, after],
    transitions: [transition],
  });
  assert.equal(createRenderIR(before).kind, 'RenderIR');
  assert.equal(createCausalTrace(transition).transitionId, transition.id);
  assert.equal(spec.kind, 'UnifiedCloneSpec');
  assert.equal(spec.status, 'incomplete');
  assert.equal(spec.workflow.semanticMappingRequired, true);
  assert.ok(spec.limitations.some((item) => item.includes('confirmation')));
});
