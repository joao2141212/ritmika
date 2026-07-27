import type { Page } from 'playwright';
import type { LayoutSnapshot } from '../types.js';

export async function captureLayout(page: Page): Promise<LayoutSnapshot> {
  return page.evaluate(() => {
    const pathFor = (element: Element): string => {
      const html = element as HTMLElement;
      return html.dataset.testid
        ? `[data-testid="${html.dataset.testid}"]`
        : html.id
          ? `#${html.id}`
          : `${element.tagName.toLowerCase()}.${String(html.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')}`;
    };
    const rectFor = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    const fixedOrAbsolute = [...document.querySelectorAll<HTMLElement>('*')]
      .filter((element) => visible(element))
      .map((element) => ({ element, style: getComputedStyle(element) }))
      .filter(({ style }) => style.position === 'fixed' || style.position === 'absolute')
      .slice(0, 250)
      .map(({ element, style }) => ({
        path: pathFor(element),
        position: style.position,
        zIndex: style.zIndex,
        rect: rectFor(element),
      }));

    const scrollContainers = [...document.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)
      .slice(0, 150)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          path: pathFor(element),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          scrollLeft: element.scrollLeft,
          scrollTop: element.scrollTop,
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
        };
      });

    const visibleVirtualRanges = [...document.querySelectorAll<HTMLElement>('[aria-rowindex], [aria-colindex]')]
      .filter((element) => visible(element))
      .slice(0, 250)
      .map((element) => ({
        path: pathFor(element),
        rowIndex: element.getAttribute('aria-rowindex') ?? undefined,
        colIndex: element.getAttribute('aria-colindex') ?? undefined,
      }));

    return { fixedOrAbsolute, scrollContainers, visibleVirtualRanges };
  });
}
