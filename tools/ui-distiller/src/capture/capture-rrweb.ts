import type { Page } from 'playwright';
import type { JsonValue } from '../types.js';

export interface RrwebCaptureHandle {
  supported: boolean;
  stop: () => Promise<JsonValue[]>;
  reason?: string;
}

export async function installRrwebRecorder(page: Page, recordSource: string): Promise<RrwebCaptureHandle> {
  await page.addScriptTag({ content: recordSource });
  const installed = await page.evaluate(() => typeof (window as Window & { rrwebRecord?: unknown }).rrwebRecord === 'function');
  if (!installed) {
    return {
      supported: false,
      reason: 'recordSource did not expose window.rrwebRecord',
      stop: async () => [],
    };
  }

  await page.evaluate(() => {
    const target = window as Window & { __uiDistillerRrweb?: JsonValue[]; rrwebRecord?: (options: unknown) => () => void };
    target.__uiDistillerRrweb = [];
    target.rrwebRecord?.({ emit: (event: JsonValue) => target.__uiDistillerRrweb?.push(event) });
  });
  return {
    supported: true,
    stop: async () => page.evaluate(() => (window as Window & { __uiDistillerRrweb?: JsonValue[] }).__uiDistillerRrweb ?? []),
  };
}
