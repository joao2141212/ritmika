import type { JsonValue, UIState, UITransition } from '../types.js';

function hasChanges(value: JsonValue): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

export interface WorkflowGuard {
  expression: string;
  evidence: string[];
  confidence: number;
}

export interface ConfirmationSignal {
  kind: 'state' | 'dom' | 'network' | 'storage' | 'url' | 'text';
  expression: string;
  required: boolean;
}

export interface WorkflowRecovery {
  retry?: { transitionId?: string; maxAttempts: number; backoffMs?: number };
  rollback?: { transitionId?: string; action: string };
  cancellation?: { action: string; confirmation: string };
}

export interface WorkflowState {
  id: string;
  route?: string;
  evidencePaths: string[];
  terminal?: boolean;
}

export interface WorkflowTransition {
  id: string;
  from: string;
  to: string;
  action: string;
  guard: WorkflowGuard;
  immediateFeedback: string[];
  effect: string[];
  confirmationSignals: ConfirmationSignal[];
  recovery: WorkflowRecovery;
  durationMs: number;
  settleReason: string;
  evidencePaths: string[];
}

export interface WorkflowIR {
  kind: 'WorkflowIR';
  version: '1.0';
  initialState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  semanticMappingRequired: boolean;
  provenance: Array<{ source: string; confidence: number; note?: string }>;
}

export function createWorkflowIR(states: UIState[], transitions: UITransition[], evidencePath = 'workflow.json'): WorkflowIR {
  const stateMap = new Map<string, WorkflowState>();
  for (const state of states) {
    stateMap.set(state.id, {
      id: state.id,
      route: state.semanticRoute,
      evidencePaths: [evidencePath],
    });
  }

  const workflowTransitions = transitions.map((transition) => {
    stateMap.set(transition.sourceStateId, stateMap.get(transition.sourceStateId) ?? {
      id: transition.sourceStateId,
      evidencePaths: transition.evidencePaths,
    });
    stateMap.set(transition.targetStateId, stateMap.get(transition.targetStateId) ?? {
      id: transition.targetStateId,
      evidencePaths: transition.evidencePaths,
    });
    return {
      id: transition.id,
      from: transition.sourceStateId,
      to: transition.targetStateId,
      action: transition.semanticAction.name,
      guard: {
        expression: transition.preconditions.join(' && ') || 'evidence-backed preconditions not recorded',
        evidence: transition.evidencePaths,
        confidence: transition.preconditions.length > 0 ? 1 : 0.5,
      },
      immediateFeedback: transition.immediateFeedback,
      effect: [
        hasChanges(transition.domDelta) ? 'DOM changed' : '',
        hasChanges(transition.accessibilityDelta) ? 'accessibility tree changed' : '',
        hasChanges(transition.layoutDelta) ? 'layout changed' : '',
        hasChanges(transition.storageDelta) ? 'storage changed' : '',
      ].filter(Boolean),
      confirmationSignals: transition.successAssertions.map((expression) => ({
        kind: 'state' as const,
        expression,
        required: true,
      })),
      recovery: {
        retry: transition.retryTransition ? { transitionId: transition.retryTransition, maxAttempts: 1 } : undefined,
        rollback: transition.undoTransition ? { transitionId: transition.undoTransition, action: 'undo' } : undefined,
      },
      durationMs: transition.duration,
      settleReason: transition.settleReason,
      evidencePaths: transition.evidencePaths,
    };
  });

  return {
    kind: 'WorkflowIR',
    version: '1.0',
    initialState: states[0]?.id ?? transitions[0]?.sourceStateId ?? 'unknown',
    states: [...stateMap.values()],
    transitions: workflowTransitions,
    semanticMappingRequired: transitions.some((transition) => transition.successAssertions.length === 0),
    provenance: [{ source: evidencePath, confidence: transitions.length > 0 ? 1 : 0.4 }],
  };
}
