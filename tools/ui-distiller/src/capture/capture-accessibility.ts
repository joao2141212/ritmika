import type { CDPSession } from 'playwright';
import { redactValue } from '../redaction/redact.js';
import type { JsonValue } from '../types.js';

export async function captureAccessibilityTree(cdp: CDPSession): Promise<JsonValue> {
  await cdp.send('Accessibility.enable');
  const tree = await cdp.send('Accessibility.getFullAXTree');
  return redactValue(tree);
}
