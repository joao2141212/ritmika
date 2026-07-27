import type { Page } from 'playwright';
import type { SemanticFlowStep, UIState } from '../types.js';

export interface SemanticAdapter {
  readonly side: 'source' | 'clone';
  readonly page: Page;
  reset(fixture: string): Promise<void>;
  execute(step: SemanticFlowStep): Promise<void>;
  capture(stepId: string): Promise<UIState>;
  settle(): Promise<{ reason: UIState['timestamp'] extends never ? never : 'quiescent' | 'timeout' }>;
  normalizeState?(state: UIState): unknown;
}

export class UnsupportedSemanticCommandError extends Error {
  public constructor(command: string, side: string) {
    super(`Semantic command ${command} is not implemented by ${side} adapter`);
    this.name = 'UnsupportedSemanticCommandError';
  }
}
