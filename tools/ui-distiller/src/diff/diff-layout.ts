import { diffJson, type JsonChange } from './diff-json.js';

export function diffLayout(before: unknown, after: unknown): JsonChange[] {
  return diffJson(before, after);
}
