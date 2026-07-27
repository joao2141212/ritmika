import type { FeatureContract, SemanticFlow, UITransition } from '../types.js';

export interface DifferentialTestPlan {
  id: string;
  featureContractId: string;
  flow: SemanticFlow;
  assertions: Array<{
    transitionId: string;
    success: string[];
    failure: string[];
    persistence: boolean;
  }>;
}

export function compileDifferentialTestPlan(
  contract: FeatureContract,
  flow: SemanticFlow,
  transitions: UITransition[]
): DifferentialTestPlan {
  return {
    id: `differential-${contract.id}`,
    featureContractId: contract.id,
    flow,
    assertions: transitions.map((transition) => ({
      transitionId: transition.id,
      success: transition.successAssertions,
      failure: transition.failureAssertions,
      persistence: transition.storageDelta !== null && transition.storageDelta !== undefined,
    })),
  };
}
