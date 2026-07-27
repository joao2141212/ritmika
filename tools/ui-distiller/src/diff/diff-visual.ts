import { diffJson, type JsonChange } from './diff-json.js';

export function diffVisual(before: unknown, after: unknown): JsonChange[] {
  return diffJson(before, after);
}
