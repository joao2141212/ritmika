import type { CDPSession } from 'playwright';
import { redactValue } from '../redaction/redact.js';
import type { JsonObject } from '../types.js';

export async function captureDeepCdpSensors(cdp: CDPSession): Promise<JsonObject> {
  const capabilities: Record<string, boolean> = {};
  const result: Record<string, unknown> = { capabilities };

  await tryCommand(cdp, 'Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: false,
    flatten: true,
  }, capabilities);

  let activeObjectId: string | undefined;
  try {
    const evaluated = await cdp.send('Runtime.evaluate', {
      expression: 'document.activeElement',
      objectGroup: 'ui-distiller',
      returnByValue: false,
    }) as { result?: { objectId?: string } };
    activeObjectId = evaluated.result?.objectId;
    if (activeObjectId) {
      result.eventListeners = await cdp.send('DOMDebugger.getEventListeners', { objectId: activeObjectId });
      capabilities['DOMDebugger.getEventListeners'] = true;
    }
  } catch {
    capabilities['DOMDebugger.getEventListeners'] = false;
  } finally {
    if (activeObjectId) await cdp.send('Runtime.releaseObject', { objectId: activeObjectId }).catch(() => undefined);
  }

  try {
    const document = await cdp.send('DOM.getDocument', { depth: 1, pierce: true }) as { root?: { nodeId?: number } };
    const rootNodeId = document.root?.nodeId;
    if (rootNodeId) {
      const body = await cdp.send('DOM.querySelector', { nodeId: rootNodeId, selector: 'body' }) as { nodeId?: number };
      if (body.nodeId) {
        await cdp.send('CSS.enable');
        result.computedStyles = await cdp.send('CSS.getComputedStyleForNode', { nodeId: body.nodeId });
        result.matchedStyles = await cdp.send('CSS.getMatchedStylesForNode', { nodeId: body.nodeId });
        capabilities['CSS.getComputedStyleForNode'] = true;
        capabilities['CSS.getMatchedStylesForNode'] = true;
      }
    }
  } catch {
    capabilities['CSS.getComputedStyleForNode'] = false;
    capabilities['CSS.getMatchedStylesForNode'] = false;
  }

  try {
    const frameTree = await cdp.send('Page.getFrameTree') as { frameTree?: { frame?: { id?: string } } };
    const frameId = frameTree.frameTree?.frame?.id;
    if (frameId) {
      result.storageKey = await cdp.send('Storage.getStorageKeyForFrame', { frameId });
      capabilities['Storage.getStorageKeyForFrame'] = true;
    }
  } catch {
    capabilities['Storage.getStorageKeyForFrame'] = false;
  }

  return redactValue(result) as JsonObject;
}

async function tryCommand(
  cdp: CDPSession,
  command: string,
  params: Record<string, unknown>,
  capabilities: Record<string, boolean>
): Promise<void> {
  try {
    await cdp.send(command as any, params);
    capabilities[command] = true;
  } catch {
    capabilities[command] = false;
  }
}
