import type { Page } from 'playwright';
import { fingerprint } from '../compiler/stable.js';
import type { JsonObject } from '../types.js';

const STYLE_PROPERTIES = [
  'display',
  'position',
  'flex',
  'gridTemplateColumns',
  'gap',
  'padding',
  'margin',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'color',
  'backgroundColor',
  'border',
  'borderRadius',
  'boxShadow',
  'opacity',
  'transform',
  'zIndex',
  'overflow',
  'transition',
  'animation',
] as const;

export async function captureStyles(page: Page): Promise<JsonObject> {
  const styles = await page.evaluate((properties) => {
    const elements = [
      document.documentElement,
      document.body,
      document.activeElement,
      ...[...document.querySelectorAll('[role="dialog"], [role="menu"], [aria-expanded="true"]')].slice(0, 20),
    ].filter((element): element is Element => Boolean(element));
    return elements.map((element) => {
      const computed = getComputedStyle(element);
      const data = Object.fromEntries(properties.map((property) => [property, String(computed[property as keyof CSSStyleDeclaration] ?? '')]));
      return {
        tagName: element.tagName,
        id: (element as HTMLElement).id || undefined,
        testId: (element as HTMLElement).dataset.testid,
        data,
      };
    });
  }, STYLE_PROPERTIES);

  return {
    fingerprint: fingerprint(styles),
    sampleCount: styles.length,
    samples: styles as unknown as JsonObject,
  };
}
