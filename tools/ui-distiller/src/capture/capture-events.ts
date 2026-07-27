import type { Page } from 'playwright';
import { redactValue } from '../redaction/redact.js';
import type { JsonValue } from '../types.js';

const EVENT_NAMES = [
  'pointerdown', 'pointermove', 'pointerup', 'click', 'dblclick', 'contextmenu',
  'dragstart', 'dragenter', 'dragover', 'drop', 'dragend', 'wheel', 'scroll',
  'keydown', 'keyup', 'beforeinput', 'input', 'compositionstart', 'compositionupdate',
  'compositionend', 'paste', 'copy', 'cut', 'focusin', 'focusout', 'selectionchange',
  'visibilitychange', 'popstate', 'fullscreenchange',
];

export async function startEventRecorder(page: Page): Promise<void> {
  await page.evaluate((eventNames) => {
    const target = window as Window & { __uiDistillerEvents?: JsonValue[] };
    target.__uiDistillerEvents = [];
    const pathFor = (element: EventTarget | null): string | undefined => {
      if (!(element instanceof Element)) return undefined;
      const html = element as HTMLElement;
      return html.dataset.testid
        ? `[data-testid="${html.dataset.testid}"]`
        : html.id
          ? `#${html.id}`
          : element.tagName.toLowerCase();
    };
    for (const name of eventNames) {
      document.addEventListener(name, (event) => {
        const input = event as InputEvent & KeyboardEvent & PointerEvent;
        target.__uiDistillerEvents?.push({
          name,
          timestamp: performance.now(),
          target: pathFor(event.target),
          role: event.target instanceof Element ? event.target.getAttribute('role') : undefined,
          testId: event.target instanceof HTMLElement ? event.target.dataset.testid : undefined,
          x: 'clientX' in input ? input.clientX : undefined,
          y: 'clientY' in input ? input.clientY : undefined,
          key: 'key' in input ? input.key : undefined,
          code: 'code' in input ? input.code : undefined,
          inputType: 'inputType' in input ? input.inputType : undefined,
          selectionStart: event.target instanceof HTMLInputElement ? event.target.selectionStart : undefined,
          selectionEnd: event.target instanceof HTMLInputElement ? event.target.selectionEnd : undefined,
        } as unknown as JsonValue);
      }, true);
    }
  }, EVENT_NAMES);
}

export async function readRecordedEvents(page: Page): Promise<JsonValue[]> {
  const events = await page.evaluate(() => (window as Window & { __uiDistillerEvents?: JsonValue[] }).__uiDistillerEvents ?? []);
  return redactValue(events) as JsonValue[];
}

export async function clearRecordedEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as Window & { __uiDistillerEvents?: JsonValue[] }).__uiDistillerEvents = [];
  });
}
