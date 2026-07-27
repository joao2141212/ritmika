import type { UIState, UITransition } from '../types.js';
import { createCausalTrace, type CausalTrace } from './causal-trace.js';
import { createDesignSystemIR, type DesignSystemIR } from './design-system-ir.js';
import { createRenderIR, type RenderIR } from './render-ir.js';
import { createVisualGrounding, type VisualGrounding } from './visual-grounding.js';
import { createWorkflowIR, type WorkflowIR } from './workflow-ir.js';

export interface UnifiedCloneSpec {
  kind: 'UnifiedCloneSpec';
  version: '1.0';
  app: string;
  feature: string;
  sourceUrl?: string;
  states: UIState[];
  render: RenderIR[];
  designSystem: DesignSystemIR;
  workflow: WorkflowIR;
  causalTraces: CausalTrace[];
  visualGrounding: VisualGrounding[];
  provenance: Array<{ source: string; technique: string; confidence: number }>;
  completion: {
    fixture: boolean;
    apiLocal: boolean;
    uiLocal: boolean;
    recovery: boolean;
    differential: boolean;
  };
  status: 'incomplete' | 'complete';
  limitations: string[];
}

export interface UnifiedCloneSpecInput {
  app: string;
  feature: string;
  sourceUrl?: string;
  states: UIState[];
  transitions: UITransition[];
  causalTraces?: CausalTrace[];
  visualGrounding?: VisualGrounding[];
  sourcePath?: string;
  completion?: Partial<UnifiedCloneSpec['completion']>;
}

export function compileUnifiedCloneSpec(input: UnifiedCloneSpecInput): UnifiedCloneSpec {
  const firstState = input.states[0];
  const sourcePath = input.sourcePath ?? 'evidence';
  const traces = input.causalTraces ?? input.transitions.map(createCausalTrace);
  const groundings = input.visualGrounding ?? input.transitions.map((transition) => createVisualGrounding(transition.semanticAction, firstState ?? fallbackState(input), sourcePath));
  const render = input.states.map((state) => createRenderIR(state, sourcePath));
  const designSystem = firstState ? createDesignSystemIR(firstState, sourcePath) : {
    kind: 'DesignSystemIR' as const,
    version: '1.0' as const,
    tokens: [],
    components: [],
    provenance: [{ source: sourcePath, confidence: 0.2 }],
  };
  const workflow = createWorkflowIR(input.states, input.transitions, sourcePath);
  const limitations: string[] = [];
  if (input.states.length === 0) limitations.push('No captured states were provided');
  if (input.transitions.length === 0) limitations.push('No semantic transition was provided');
  if (workflow.semanticMappingRequired) limitations.push('At least one transition lacks an observed confirmation signal');
  const completion = {
    fixture: input.completion?.fixture ?? false,
    apiLocal: input.completion?.apiLocal ?? false,
    uiLocal: input.completion?.uiLocal ?? false,
    recovery: input.completion?.recovery ?? false,
    differential: input.completion?.differential ?? false,
  };
  if (!completion.fixture) limitations.push('Isolated synthetic fixture proof was not supplied');
  if (!completion.apiLocal) limitations.push('Local API/DB proof was not supplied');
  if (!completion.uiLocal) limitations.push('Local UI execution proof was not supplied');
  if (!completion.recovery) limitations.push('Error, retry and cancellation proof was not supplied');
  if (!completion.differential) limitations.push('Differential source/clone proof was not supplied');
  return {
    kind: 'UnifiedCloneSpec',
    version: '1.0',
    app: input.app,
    feature: input.feature,
    sourceUrl: input.sourceUrl,
    states: input.states,
    render,
    designSystem,
    workflow,
    causalTraces: traces,
    visualGrounding: groundings,
    provenance: [
      { source: sourcePath, technique: 'OpenAdapt guards + WorkflowIR', confidence: input.transitions.length ? 1 : 0.4 },
      { source: sourcePath, technique: 'RenderIR + DesignSystemIR', confidence: input.states.length ? 1 : 0.4 },
    ],
    completion,
    status: limitations.length === 0 ? 'complete' : 'incomplete',
    limitations,
  };
}

function fallbackState(input: UnifiedCloneSpecInput): UIState {
  return {
    id: 'unknown',
    app: input.app,
    feature: input.feature,
    side: 'clone',
    url: input.sourceUrl ?? '',
    semanticRoute: '/',
    viewport: { width: 0, height: 0 },
    accessibilityTree: {},
    domSnapshot: {},
    layoutSnapshot: { fixedOrAbsolute: [], scrollContainers: [], visibleVirtualRanges: [] },
    styleDigest: {},
    focusPath: [],
    overlayStack: [],
    scrollContainers: [],
    scrollOffsets: {},
    visibleVirtualRanges: [],
    pendingIndicators: [],
    storageDigest: {
      localStorage: { keys: [], count: 0, fingerprint: '' },
      sessionStorage: { keys: [], count: 0, fingerprint: '' },
      indexedDb: { databases: [], metadata: [] },
    },
    timestamp: 0,
  };
}
