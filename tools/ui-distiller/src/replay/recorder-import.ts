import { redactValue } from '../redaction/redact.js';
import type { JsonObject, SemanticFlow, SemanticFlowStep } from '../types.js';

export interface RecorderImportOptions {
  id: string;
  app: string;
  feature: string;
  initialFixture: string;
}

export function importRecorderRecording(recording: unknown, options: RecorderImportOptions): SemanticFlow {
  const root = recording as { title?: string; steps?: unknown[] };
  const steps = (root.steps ?? []).flatMap((rawStep) => mapRecorderStep(rawStep));
  return {
    ...options,
    id: options.id,
    steps,
    metadata: {
      importedFrom: 'Chrome DevTools Recorder / Puppeteer Replay compatible JSON',
      recordingTitle: root.title ?? 'untitled',
    },
  };
}

function mapRecorderStep(raw: unknown): SemanticFlowStep[] {
  if (!raw || typeof raw !== 'object') return [];
  const step = raw as Record<string, unknown>;
  const type = String(step.type ?? step.name ?? 'custom');
  const selector = selectorFromStep(step);
  const args = redactValue({ selector, ...safeArguments(step) }) as JsonObject;
  if (type === 'navigate' || type === 'goto') return [{ command: 'openPage', args, safety: 'read-only' }];
  if (type === 'click') return [{ command: 'activateCommand', args, safety: 'mutating' }];
  if (type === 'keyDown' || type === 'keyUp') return [{ command: 'pressShortcut', args, safety: 'reversible' }];
  if (type === 'change' || type === 'input' || type === 'fill') return [{ command: 'editProperty', args, safety: 'mutating' }];
  if (type === 'scroll') return [{ command: 'custom', args: { ...args, name: 'scroll' }, safety: 'read-only' }];
  return [{ command: 'custom', args, safety: 'read-only' }];
}

function selectorFromStep(step: Record<string, unknown>): string | undefined {
  const selectors = step.selectors;
  if (Array.isArray(selectors)) {
    const first = selectors.find((selector) => typeof selector === 'string');
    if (typeof first === 'string') return first;
  }
  return typeof step.selector === 'string' ? step.selector : undefined;
}

function safeArguments(step: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...step };
  delete safe.value;
  delete safe.text;
  delete safe.password;
  delete safe.headers;
  return safe;
}

export interface ReplayHooks {
  beforeAllSteps?: () => Promise<void>;
  beforeEachStep?: (step: SemanticFlowStep, index: number) => Promise<void>;
  afterEachStep?: (step: SemanticFlowStep, index: number) => Promise<void>;
  afterAllSteps?: () => Promise<void>;
}

export async function runWithHooks(
  steps: SemanticFlowStep[],
  execute: (step: SemanticFlowStep) => Promise<void>,
  hooks: ReplayHooks = {}
): Promise<void> {
  await hooks.beforeAllSteps?.();
  try {
    for (const [index, step] of steps.entries()) {
      await hooks.beforeEachStep?.(step, index);
      await execute(step);
      await hooks.afterEachStep?.(step, index);
    }
  } finally {
    await hooks.afterAllSteps?.();
  }
}
