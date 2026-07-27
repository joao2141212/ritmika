import { diffTransition } from '../diff/diff-transition.js';
import { diffNetworkIntent } from '../diff/diff-network-intent.js';
import { fingerprint } from './stable.js';
import type { JsonValue, NetworkSummary, SemanticAction, UIState, UITransition } from '../types.js';

export interface CompileTransitionOptions {
  action: SemanticAction;
  rawInputEvents?: JsonValue[];
  pointerTrajectory?: JsonValue[];
  keyboardSequence?: string[];
  requestSequence?: NetworkSummary[];
  websocketSequence?: NetworkSummary[];
  immediateFeedback?: string[];
  optimisticState?: JsonValue;
  settledState?: JsonValue;
  successAssertions?: string[];
  failureAssertions?: string[];
  undoTransition?: string;
  retryTransition?: string;
  settleReason?: UITransition['settleReason'];
  evidencePaths?: string[];
}

export function compileTransition(before: UIState, after: UIState, options: CompileTransitionOptions): UITransition {
  const deltas = diffTransition(before, after);
  const requestSequence = options.requestSequence ?? [];
  const websocketSequence = options.websocketSequence ?? [];
  const id = fingerprint({ feature: before.feature, source: before.id, target: after.id, action: options.action });
  return {
    id,
    feature: before.feature,
    sourceStateId: before.id,
    targetStateId: after.id,
    semanticAction: options.action,
    rawInputEvents: options.rawInputEvents ?? [],
    pointerTrajectory: options.pointerTrajectory ?? [],
    keyboardSequence: options.keyboardSequence ?? [],
    preconditions: [],
    immediateFeedback: options.immediateFeedback ?? [],
    optimisticState: options.optimisticState,
    settledState: options.settledState,
    networkIntent: [...requestSequence, ...websocketSequence],
    requestSequence,
    websocketSequence,
    storageDelta: deltas.storage as unknown as JsonValue,
    domDelta: deltas.dom as unknown as JsonValue,
    accessibilityDelta: deltas.accessibility as unknown as JsonValue,
    layoutDelta: deltas.layout as unknown as JsonValue,
    visualDelta: deltas.visual as unknown as JsonValue,
    focusDelta: deltas.focus as unknown as JsonValue,
    selectionDelta: deltas.selection as unknown as JsonValue,
    successAssertions: options.successAssertions ?? [],
    failureAssertions: options.failureAssertions ?? [],
    undoTransition: options.undoTransition,
    retryTransition: options.retryTransition,
    duration: Math.max(0, after.timestamp - before.timestamp),
    settleReason: options.settleReason ?? 'quiescent',
    evidencePaths: options.evidencePaths ?? [],
  };
}

export function inferNetworkIntent(transition: UITransition): JsonValue {
  return diffNetworkIntent([], transition.networkIntent) as unknown as JsonValue;
}
