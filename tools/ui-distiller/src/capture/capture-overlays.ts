import type { Page } from 'playwright';
import type { OverlaySnapshot } from '../types.js';

export async function captureOverlays(page: Page): Promise<OverlaySnapshot[]> {
  return page.evaluate(() => {
    const selectors = [
      '[role="dialog"]',
      '[role="menu"]',
      '[role="listbox"]',
      '[role="tooltip"]',
      '[data-popover]',
      '[data-radix-popper-content-wrapper]',
    ];
    const kindFor = (element: Element): OverlaySnapshot['kind'] => {
      const role = element.getAttribute('role');
      if (role === 'dialog') return 'dialog';
      if (role === 'menu') return 'menu';
      if (role === 'listbox') return 'listbox';
      if (role === 'tooltip') return 'tooltip';
      return 'popover';
    };
    return [...document.querySelectorAll<HTMLElement>(selectors.join(','))]
      .map((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          kind: kindFor(element),
          role: element.getAttribute('role') ?? undefined,
          id: element.id || undefined,
          testId: element.dataset.testid,
          expanded: element.getAttribute('aria-expanded') === 'true' ? true : undefined,
          modal: element.getAttribute('aria-modal') === 'true' ? true : undefined,
          visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        };
      })
      .filter((overlay) => overlay.visible);
  });
}
