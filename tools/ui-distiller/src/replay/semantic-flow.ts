import { classifyAction } from '../explorer/safe-action-classifier.js';
import type { ActionSafety, JsonObject, SemanticCommand, SemanticFlow, SemanticFlowStep } from '../types.js';

const COMMANDS = new Set<SemanticCommand>([
  'openWorkspace', 'openPage', 'openBoard', 'openMenu', 'activateCommand',
  'createBlock', 'moveBlock', 'createCard', 'moveCard', 'editProperty',
  'pressShortcut', 'closeOverlay', 'undo', 'redo', 'custom',
]);

export function parseSemanticFlow(input: unknown): SemanticFlow {
  if (!input || typeof input !== 'object') throw new Error('Semantic flow must be an object');
  const value = input as Partial<SemanticFlow>;
  if (!value.id || !value.app || !value.feature || !value.initialFixture || !Array.isArray(value.steps)) {
    throw new Error('Semantic flow requires id, app, feature, initialFixture and steps');
  }
  const steps = value.steps.map((step) => normalizeStep(step));
  return { id: value.id, app: value.app, feature: value.feature, initialFixture: value.initialFixture, steps, metadata: value.metadata };
}

function normalizeStep(input: SemanticFlowStep): SemanticFlowStep {
  if (!COMMANDS.has(input.command)) throw new Error(`Unsupported semantic command: ${String(input.command)}`);
  const safety: ActionSafety = input.safety ?? classifyAction({ name: input.command });
  return { ...input, safety, args: input.args as JsonObject | undefined };
}

export function serializeSemanticFlow(flow: SemanticFlow): string {
  return `${JSON.stringify(flow, null, 2)}\n`;
}
