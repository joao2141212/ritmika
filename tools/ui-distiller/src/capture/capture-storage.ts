import type { CDPSession, Page } from 'playwright';
import { createStorageDigest } from '../redaction/redact.js';
import type { JsonValue, StorageDigest } from '../types.js';

export async function captureStorage(cdp: CDPSession, page: Page): Promise<StorageDigest> {
  const pageEntries = await page.evaluate(() => ({
    localStorage: Object.keys(window.localStorage).map((key) => ({ key, type: 'string' })),
    sessionStorage: Object.keys(window.sessionStorage).map((key) => ({ key, type: 'string' })),
  }));

  const databases: string[] = [];
  const metadata: JsonValue[] = [];
  try {
    await cdp.send('IndexedDB.enable');
    const storageKey = new URL(page.url()).origin;
    const result = await cdp.send('IndexedDB.requestDatabaseNames', { storageKey }) as { databaseNames?: string[] };
    databases.push(...(result.databaseNames ?? []));
  } catch {
    // IndexedDB is optional and differs across Chromium versions.
  }

  try {
    await cdp.send('DOMStorage.enable');
  } catch {
    // Key enumeration through the page remains available when DOMStorage is not exposed.
  }

  return createStorageDigest({
    localStorage: pageEntries.localStorage,
    sessionStorage: pageEntries.sessionStorage,
    indexedDb: { databases, metadata },
  });
}
