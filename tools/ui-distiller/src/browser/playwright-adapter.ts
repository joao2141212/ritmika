import type { Locator, Page } from 'playwright';

export function semanticLocator(page: Page, target: {
  role?: string;
  name?: string;
  testId?: string;
  text?: string;
  fallbackSelector?: string;
}): Locator {
  if (target.testId) return page.getByTestId(target.testId);
  if (target.role) return page.getByRole(target.role as any, target.name ? { name: target.name } : {});
  if (target.text) return page.getByText(target.text);
  if (target.fallbackSelector) return page.locator(target.fallbackSelector);
  throw new Error('Semantic target requires role, testId, text or fallbackSelector');
}
