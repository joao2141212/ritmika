export interface ResetStrategy {
  name: string;
  reset: (fixture: string) => Promise<void>;
}

export function createResetStrategy(reset: ResetStrategy['reset']): ResetStrategy {
  return { name: 'fixture-reset', reset };
}
