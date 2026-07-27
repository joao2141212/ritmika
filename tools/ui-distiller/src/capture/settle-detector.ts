import type { Page } from 'playwright';
import type { SettleReason } from '../types.js';

export interface SettleResult {
  settled: boolean;
  reason: SettleReason;
  duration: number;
}

export async function waitForQuiescence(
  page: Page,
  options: {
    timeoutMs?: number;
    quietFrames?: number;
    pendingRequests?: () => number;
  } = {}
): Promise<SettleResult> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 5000;
  const quietFrames = options.quietFrames ?? 2;
  let stableFrames = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const browserState = await page.evaluate(() => ({
      ready: document.readyState,
      busy: Boolean(document.querySelector('[aria-busy="true"], [data-loading="true"], [data-pending="true"]')),
      animations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
    }));
    const pending = options.pendingRequests?.() ?? 0;
    if (browserState.ready === 'complete' && !browserState.busy && browserState.animations === 0 && pending === 0) {
      stableFrames += 1;
      if (stableFrames >= quietFrames) {
        return { settled: true, reason: 'quiescent', duration: Date.now() - startedAt };
      }
    } else {
      stableFrames = 0;
    }
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  }

  return { settled: false, reason: 'timeout', duration: Date.now() - startedAt };
}
