import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export interface BrowserConnection {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

export async function connectFresh(options: {
  url: string;
  headed?: boolean;
  viewport?: { width: number; height: number };
  storageState?: string;
}): Promise<BrowserConnection> {
  const browser = await chromium.launch({ headless: options.headed !== true });
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1440, height: 900 },
    storageState: options.storageState,
  });
  const page = await context.newPage();
  await page.goto(options.url, { waitUntil: 'domcontentloaded' });
  return { browser, context, page, close: () => browser.close() };
}

export async function connectOverCdp(options: {
  endpoint: string;
  url?: string;
}): Promise<BrowserConnection> {
  const browser = await chromium.connectOverCDP(options.endpoint);
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();
  if (options.url) await page.goto(options.url, { waitUntil: 'domcontentloaded' });
  return { browser, context, page, close: () => browser.close() };
}
