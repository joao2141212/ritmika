import type { JsonValue, UITransition } from '../types.js';

function hasChanges(value: JsonValue): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

export interface CausalTrace {
  kind: 'CausalTrace';
  version: '1.0';
  transitionId: string;
  userEvent: { action: string; rawInputEvents: number; keyboardEvents: number };
  handler: { family: string; evidence: string[]; confidence: number };
  runtimeMutations: Array<{ target: string; change: string }>;
  semanticMutation: { action: string; safety: string };
  renderEffects: string[];
  networkIntent: Array<{ method: string; url: string; status?: number }>;
  confirmation: { signals: string[]; observed: boolean };
  recovery: { retry?: string; rollback?: string; failureAssertions: string[] };
  evidence: string[];
}

export function createCausalTrace(transition: UITransition): CausalTrace {
  return {
    kind: 'CausalTrace',
    version: '1.0',
    transitionId: transition.id,
    userEvent: {
      action: transition.semanticAction.name,
      rawInputEvents: transition.rawInputEvents.length + transition.pointerTrajectory.length,
      keyboardEvents: transition.keyboardSequence.length,
    },
    handler: {
      family: transition.semanticAction.name,
      evidence: transition.evidencePaths,
      confidence: transition.rawInputEvents.length > 0 ? 1 : 0.6,
    },
    runtimeMutations: [
      ...(hasChanges(transition.storageDelta) ? [{ target: 'storage', change: 'storage delta observed' }] : []),
      ...(hasChanges(transition.domDelta) ? [{ target: 'DOM', change: 'DOM delta observed' }] : []),
    ],
    semanticMutation: { action: transition.semanticAction.name, safety: transition.semanticAction.safety },
    renderEffects: [
      ...(hasChanges(transition.domDelta) ? ['DOM changed'] : []),
      ...(hasChanges(transition.layoutDelta) ? ['layout changed'] : []),
      ...(hasChanges(transition.visualDelta) ? ['visual state changed'] : []),
    ],
    networkIntent: transition.networkIntent.map((event) => ({ method: event.method, url: event.url, status: event.status })),
    confirmation: {
      signals: transition.successAssertions,
      observed: transition.successAssertions.length > 0,
    },
    recovery: {
      retry: transition.retryTransition,
      rollback: transition.undoTransition,
      failureAssertions: transition.failureAssertions,
    },
    evidence: transition.evidencePaths,
  };
}
