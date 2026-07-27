import type { Page, CDPSession } from 'playwright';

export async function createCdpSession(page: Page): Promise<CDPSession> {
  return page.context().newCDPSession(page);
}

export async function captureCdpCapabilityReport(cdp: CDPSession): Promise<Record<string, boolean>> {
  const report: Record<string, boolean> = {};
  for (const command of ['DOMSnapshot.captureSnapshot', 'Accessibility.getFullAXTree', 'DOMDebugger.getEventListeners', 'Network.enable', 'DOMStorage.enable', 'IndexedDB.requestDatabaseNames']) {
    try {
      report[command] = true;
    } catch {
      report[command] = false;
    }
  }
  return report;
}
