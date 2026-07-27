import type { CDPSession } from 'playwright';
import { redactValue } from '../redaction/redact.js';
import type { JsonValue } from '../types.js';

export async function captureDomSnapshot(
  cdp: CDPSession,
  computedStyles: string[] = []
): Promise<JsonValue> {
  const snapshot = await cdp.send('DOMSnapshot.captureSnapshot', {
    computedStyles,
    includePaintOrder: true,
    includeDOMRects: true,
  });
  return redactValue(snapshot);
}
