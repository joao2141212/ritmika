import { compileTransition } from '../compiler/transition-compiler.js';
import type { SemanticFlow, UIState, UITransition } from '../types.js';
import type { SemanticAdapter } from './source-adapter.js';

export interface DifferentialRunReport {
  flowId: string;
  source: { states: UIState[]; transitions: UITransition[]; failures: string[] };
  clone: { states: UIState[]; transitions: UITransition[]; failures: string[] };
  mismatches: Array<{ step: number; reason: string }>;
  status: 'passed' | 'partial' | 'blocked';
}

export async function runDifferential(
  flow: SemanticFlow,
  source: SemanticAdapter,
  clone: SemanticAdapter
): Promise<DifferentialRunReport> {
  const report: DifferentialRunReport = {
    flowId: flow.id,
    source: { states: [], transitions: [], failures: [] },
    clone: { states: [], transitions: [], failures: [] },
    mismatches: [],
    status: 'passed',
  };

  for (const [adapter, bucket] of [[source, report.source], [clone, report.clone]] as const) {
    try {
      await adapter.reset(flow.initialFixture);
      const initial = await adapter.capture('initial');
      bucket.states.push(initial);
      for (const [stepIndex, step] of flow.steps.entries()) {
        const before = await adapter.capture(`before-${stepIndex}`);
        await adapter.execute(step);
        await adapter.settle();
        const after = await adapter.capture(`after-${stepIndex}`);
        const transition = compileTransition(before, after, {
          action: { name: step.command, args: step.args, safety: step.safety ?? 'mutating' },
          successAssertions: step.expect?.text ? [`text:${step.expect.text}`] : [],
        });
        bucket.transitions.push(transition);
        bucket.states.push(after);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      bucket.failures.push(message);
    }
  }

  const sourceCount = report.source.transitions.length;
  const cloneCount = report.clone.transitions.length;
  if (report.source.failures.length > 0 || report.clone.failures.length > 0) report.status = 'blocked';
  else if (sourceCount !== cloneCount) {
    report.status = 'partial';
    report.mismatches.push({ step: Math.min(sourceCount, cloneCount), reason: 'transition count differs' });
  }
  return report;
}
