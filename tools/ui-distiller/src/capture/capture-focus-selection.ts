import type { Page } from 'playwright';
import type { ActiveElementSnapshot, CaretSnapshot, SelectionSnapshot } from '../types.js';

export interface FocusSelectionSnapshot {
  activeElement?: ActiveElementSnapshot;
  focusPath: string[];
  textSelection?: SelectionSnapshot;
  caret?: CaretSnapshot;
}

export async function captureFocusSelection(page: Page, captureSelectionText = false): Promise<FocusSelectionSnapshot> {
  return page.evaluate((includeText) => {
    const pathFor = (element: Element | null): string | undefined => {
      if (!element) return undefined;
      const html = element as HTMLElement;
      return html.dataset.testid
        ? `[data-testid="${html.dataset.testid}"]`
        : html.id
          ? `#${html.id}`
          : `${element.tagName.toLowerCase()}.${String(html.className || '').split(/\s+/).filter(Boolean).join('.')}`;
    };

    const active = document.activeElement as HTMLElement | null;
    const selection = window.getSelection();
    const activePath = pathFor(active);
    const anchorPath = pathFor(selection?.anchorNode?.parentElement ?? null);
    const focusPath = pathFor(selection?.focusNode?.parentElement ?? null);
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined;
    const caretRect = range?.getBoundingClientRect();

    const activeElement: ActiveElementSnapshot | undefined = active
      ? {
          tagName: active.tagName,
          role: active.getAttribute('role') ?? undefined,
          ariaLabel: active.getAttribute('aria-label') ?? undefined,
          testId: active.dataset.testid,
          id: active.id || undefined,
          name: active.getAttribute('name') ?? undefined,
          type: active.getAttribute('type') ?? undefined,
          disabled: 'disabled' in active ? Boolean((active as HTMLInputElement).disabled) : undefined,
          contentEditable: active.isContentEditable,
          selectionStart: 'selectionStart' in active ? (active as HTMLInputElement).selectionStart : undefined,
          selectionEnd: 'selectionEnd' in active ? (active as HTMLInputElement).selectionEnd : undefined,
        }
      : undefined;

    const textSelection: SelectionSnapshot | undefined = selection
      ? {
          anchorPath,
          focusPath,
          anchorOffset: selection.anchorOffset,
          focusOffset: selection.focusOffset,
          isCollapsed: selection.isCollapsed,
          ...(includeText && !selection.isCollapsed
            ? { textDigest: `length:${selection.toString().length}` }
            : {}),
        }
      : undefined;

    return {
      activeElement,
      focusPath: activePath ? [activePath] : [],
      textSelection,
      caret: caretRect
        ? { x: caretRect.x, y: caretRect.y, width: caretRect.width, height: caretRect.height }
        : undefined,
    };
  }, captureSelectionText);
}
