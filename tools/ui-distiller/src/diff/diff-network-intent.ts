import { diffJson, type JsonChange } from './diff-json.js';
import type { NetworkSummary } from '../types.js';

export function normalizeNetworkIntent(events: NetworkSummary[]): Array<Pick<NetworkSummary, 'method' | 'url' | 'status' | 'websocket'>> {
  return events.map((event) => {
    let url = event.url;
    try {
      const parsed = new URL(event.url);
      url = `${parsed.pathname}${parsed.search ? '?query' : ''}`;
    } catch {
      // Keep the already-redacted URL when it is not a valid absolute URL.
    }
    return { method: event.method, url, status: event.status, websocket: event.websocket };
  });
}

export function diffNetworkIntent(before: NetworkSummary[], after: NetworkSummary[]): JsonChange[] {
  return diffJson(normalizeNetworkIntent(before), normalizeNetworkIntent(after));
}
