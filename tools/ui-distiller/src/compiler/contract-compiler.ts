import { fingerprint } from './stable.js';
import type { FeatureContract, SemanticAction, UITransition } from '../types.js';

function uniqueActions(transitions: UITransition[]): SemanticAction[] {
  const byKey = new Map<string, SemanticAction>();
  for (const transition of transitions) {
    const key = JSON.stringify(transition.semanticAction);
    byKey.set(key, transition.semanticAction);
  }
  return [...byKey.values()];
}

export function compileFeatureContract(input: {
  app: string;
  feature: string;
  transitions: UITransition[];
  version?: string;
  responsiveRequirements?: string[];
  accessibilityRequirements?: string[];
}): FeatureContract {
  const transitions = input.transitions;
  const actionNames = uniqueActions(transitions).map((action) => action.name);
  const networkEffects = transitions.flatMap((transition) => transition.networkIntent.map((event) => `${event.method} ${event.url}`));
  const storageEffects = transitions.flatMap((transition) => transition.storageDelta as unknown as Array<{ path?: string }>);
  const hasFailure = transitions.some((transition) => transition.failureAssertions.length > 0);
  const hasUndo = transitions.some((transition) => Boolean(transition.undoTransition));

  return {
    id: fingerprint({ app: input.app, feature: input.feature, transitions: transitions.map((transition) => transition.id) }),
    app: input.app,
    feature: input.feature,
    version: input.version ?? '0.1.0',
    preconditions: [...new Set(transitions.flatMap((transition) => transition.preconditions))],
    triggers: {
      mouse: [...new Set(transitions.flatMap((transition) => transition.pointerTrajectory.length > 0 ? [transition.semanticAction.name] : []))],
      keyboard: [...new Set(transitions.flatMap((transition) => transition.keyboardSequence.length > 0 ? transition.keyboardSequence : []))],
    },
    semanticActions: uniqueActions(transitions),
    payloads: transitions.map((transition) => transition.settledState).filter((state): state is NonNullable<typeof state> => state !== undefined),
    immediateFeedback: [...new Set(transitions.flatMap((transition) => transition.immediateFeedback))],
    optimisticStates: transitions.map((transition) => transition.optimisticState).filter((state): state is NonNullable<typeof state> => state !== undefined),
    persistentEffects: [...new Set([...networkEffects, ...storageEffects.map((effect) => effect.path ?? 'storage change')])],
    successStates: [...new Set(transitions.flatMap((transition) => transition.successAssertions))],
    errorStates: hasFailure ? ['observed failure state'] : [],
    permissionStates: [],
    emptyStates: [],
    loadingStates: transitions.some((transition) => transition.immediateFeedback.some((feedback) => /loading|pending/i.test(feedback))) ? ['loading'] : [],
    retryActions: transitions.filter((transition) => Boolean(transition.retryTransition)).map((transition) => transition.retryTransition as string),
    cancellationActions: transitions.filter((transition) => transition.semanticAction.name === 'closeOverlay').map((transition) => transition.semanticAction.name),
    undoActions: hasUndo ? ['undo'] : [],
    finalFocus: [...new Set(transitions.flatMap((transition) => {
      const changes = Array.isArray(transition.focusDelta)
        ? transition.focusDelta as unknown as Array<{ path: string }>
        : [];
      return changes.map((change) => change.path);
    }))],
    responsiveRequirements: input.responsiveRequirements ?? [],
    accessibilityRequirements: input.accessibilityRequirements ?? ['semantic role and accessible name remain discoverable'],
    transitions: transitions.map((transition) => transition.id),
    evidencePaths: [...new Set(transitions.flatMap((transition) => transition.evidencePaths))],
  };
}
