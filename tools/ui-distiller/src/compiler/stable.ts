import { createHash } from 'node:crypto';
import type { JsonValue } from '../types.js';

const VOLATILE_KEYS = new Set([
  'id',
  'timestamp',
  'createdAt',
  'updatedAt',
  'evidencePaths',
  'visualSnapshot',
  'networkCursor',
]);

export function sortObject(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => sortObject(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortObject(nested)])
    );
  }
  return String(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortObject(value));
}

export function fingerprint(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function canonicalStateInput(state: Record<string, unknown>): JsonValue {
  const normalize = (value: unknown, key?: string): JsonValue => {
    if (key && VOLATILE_KEYS.has(key)) return null;
    if (Array.isArray(value)) return value.map((item) => normalize(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([entryKey]) => !VOLATILE_KEYS.has(entryKey))
          .map(([entryKey, nested]) => [entryKey, normalize(nested, entryKey)])
      );
    }
    if (value === undefined) return null;
    return value as JsonValue;
  };

  return normalize(state);
}
