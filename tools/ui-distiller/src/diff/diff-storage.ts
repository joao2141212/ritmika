import { diffJson, type JsonChange } from './diff-json.js';
import type { StorageDigest } from '../types.js';

export function diffStorage(before: StorageDigest, after: StorageDigest): JsonChange[] {
  return diffJson(before, after);
}
