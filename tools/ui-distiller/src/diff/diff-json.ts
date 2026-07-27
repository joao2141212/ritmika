import type { JsonValue } from '../types.js';

export interface JsonChange {
  path: string;
  before?: JsonValue;
  after?: JsonValue;
}

export function diffJson(before: unknown, after: unknown, maxChanges = 500): JsonChange[] {
  const changes: JsonChange[] = [];
  const visit = (left: unknown, right: unknown, path: string): void => {
    if (changes.length >= maxChanges) return;
    if (Object.is(left, right)) return;
    if (Array.isArray(left) && Array.isArray(right)) {
      const length = Math.max(left.length, right.length);
      for (let index = 0; index < length; index += 1) visit(left[index], right[index], `${path}/${index}`);
      return;
    }
    if (left && right && typeof left === 'object' && typeof right === 'object') {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      for (const key of [...keys].sort()) {
        visit((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], `${path}/${key}`);
      }
      return;
    }
    changes.push({ path: path || '/', before: left as JsonValue, after: right as JsonValue });
  };
  visit(before, after, '');
  return changes;
}
