import type { JsonValue, SemanticAction } from '../types.js';
import { isSafeForAutomaticExploration } from './safe-action-classifier.js';

export interface FrontierItem {
  id: string;
  stateId: string;
  action: SemanticAction;
  explored: boolean;
  reason?: string;
}

export function buildActionFrontier(stateId: string, actions: SemanticAction[]): FrontierItem[] {
  return actions.map((action, index) => ({
    id: `${stateId}:${action.name}:${index}`,
    stateId,
    action,
    explored: false,
    reason: isSafeForAutomaticExploration(action) ? undefined : 'requires synthetic fixture and explicit mutation policy',
  }));
}

export function frontierSummary(items: FrontierItem[]): JsonValue {
  return {
    total: items.length,
    unexplored: items.filter((item) => !item.explored).length,
    safe: items.filter((item) => isSafeForAutomaticExploration(item.action)).length,
    guarded: items.filter((item) => !isSafeForAutomaticExploration(item.action)).length,
  };
}
