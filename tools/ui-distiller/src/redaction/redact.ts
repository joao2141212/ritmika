import { createHash } from 'node:crypto';
import type { JsonValue, NetworkSummary, StorageDigest } from '../types.js';

const SENSITIVE_KEY = /(authorization|cookie|set-cookie|token|secret|password|passwd|api[-_]?key|session|credential|private[-_]?key)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const LONG_SECRET = /\b[A-Za-z0-9_-]{40,}\b/g;

export const REDACTED = '[REDACTED]';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function redactString(value: string): string {
  return value
    .replace(BEARER, 'Bearer [REDACTED]')
    .replace(EMAIL, '[EMAIL]')
    .replace(PHONE, '[PHONE]')
    .replace(LONG_SECRET, '[REDACTED]');
}

export function redactValue(value: unknown, key?: string): JsonValue {
  if (key && SENSITIVE_KEY.test(key)) return REDACTED;
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, entryKey),
      ])
    );
  }
  return REDACTED;
}

export function redactHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redactString(String(value)),
    ])
  );
}

export function digestBody(body: string | undefined): { length: number; sha256: string } | undefined {
  if (body === undefined) return undefined;
  return { length: body.length, sha256: sha256(body) };
}

export function sanitizeNetworkSummary(summary: NetworkSummary): NetworkSummary {
  let safeUrl = summary.url;
  try {
    const parsed = new URL(summary.url);
    const query = [...parsed.searchParams.keys()].map((key) => `${encodeURIComponent(key)}=${REDACTED}`);
    parsed.search = query.length > 0 ? `?${query.join('&')}` : '';
    safeUrl = parsed.toString();
  } catch {
    safeUrl = redactString(summary.url);
  }

  return {
    ...summary,
    url: safeUrl,
    requestHeaders: redactHeaders(summary.requestHeaders),
    responseHeaders: redactHeaders(summary.responseHeaders),
  };
}

interface StorageEntryMetadata {
  key: string;
  type: string;
  length?: number;
}

function digestStorageEntries(entries: StorageEntryMetadata[]): StorageDigest['localStorage'] {
  const normalized = entries
    .map(({ key, type, length }) => ({ key, type, length }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return {
    keys: normalized.map((entry) => entry.key),
    count: normalized.length,
    fingerprint: sha256(JSON.stringify(normalized)),
  };
}

export function createStorageDigest(input: {
  localStorage?: StorageEntryMetadata[];
  sessionStorage?: StorageEntryMetadata[];
  indexedDb?: { databases?: string[]; metadata?: JsonValue[] };
}): StorageDigest {
  return {
    localStorage: digestStorageEntries(input.localStorage ?? []),
    sessionStorage: digestStorageEntries(input.sessionStorage ?? []),
    indexedDb: {
      databases: [...(input.indexedDb?.databases ?? [])].sort(),
      metadata: (input.indexedDb?.metadata ?? []) as JsonValue[],
    },
  };
}
