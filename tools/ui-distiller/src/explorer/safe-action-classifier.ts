import type { ActionSafety, SemanticAction } from '../types.js';

const SAFETY_BY_COMMAND: Record<string, ActionSafety> = {
  openWorkspace: 'read-only',
  openPage: 'read-only',
  openBoard: 'read-only',
  openMenu: 'read-only',
  activateCommand: 'mutating',
  createBlock: 'mutating',
  moveBlock: 'reversible',
  createCard: 'mutating',
  moveCard: 'reversible',
  editProperty: 'mutating',
  pressShortcut: 'reversible',
  closeOverlay: 'reversible',
  undo: 'reversible',
  redo: 'reversible',
};

export function classifyAction(action: Pick<SemanticAction, 'name'> & Partial<Pick<SemanticAction, 'safety'>>): ActionSafety {
  return action.safety ?? SAFETY_BY_COMMAND[action.name] ?? 'mutating';
}

export function isSafeForAutomaticExploration(action: Pick<SemanticAction, 'name'> & Partial<Pick<SemanticAction, 'safety'>>): boolean {
  const safety = classifyAction(action);
  return safety === 'read-only' || safety === 'reversible';
}
