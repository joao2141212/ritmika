import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CDPSession, Page } from 'playwright';
import { captureAccessibilityTree } from './capture-accessibility.js';
import { captureDeepCdpSensors } from './capture-cdp-deep.js';
import { captureDomSnapshot } from './capture-dom.js';
import { captureFocusSelection } from './capture-focus-selection.js';
import { captureLayout } from './capture-layout.js';
import { captureOverlays } from './capture-overlays.js';
import { captureStorage } from './capture-storage.js';
import { captureStyles } from './capture-styles.js';
import { fingerprint, canonicalStateInput } from '../compiler/stable.js';
import { sha256 } from '../redaction/redact.js';
import type { DistillationSide, NetworkCursor, UIState } from '../types.js';

export interface CaptureStateOptions {
  page: Page;
  cdp?: CDPSession;
  app: string;
  feature: string;
  side: DistillationSide;
  semanticRoute: string;
  networkCursor?: NetworkCursor;
  evidenceDir?: string;
  captureVisual?: boolean;
  captureSelectionText?: boolean;
}

export async function captureState(options: CaptureStateOptions): Promise<UIState> {
  const cdp = options.cdp ?? await options.page.context().newCDPSession(options.page);
  const viewport = options.page.viewportSize() ?? { width: 0, height: 0 };
  const [accessibilityTree, domSnapshot, layoutSnapshot, focus, overlays, styleDigest, storageDigest, deepSensors] = await Promise.all([
    captureAccessibilityTree(cdp),
    captureDomSnapshot(cdp, ['display', 'position', 'color', 'background-color', 'font-size', 'line-height', 'z-index']),
    captureLayout(options.page),
    captureFocusSelection(options.page, options.captureSelectionText === true),
    captureOverlays(options.page),
    captureStyles(options.page),
    captureStorage(cdp, options.page),
    captureDeepCdpSensors(cdp),
  ]);

  const pendingIndicators = await options.page.evaluate(() =>
    [...document.querySelectorAll('[aria-busy="true"], [data-loading="true"], [data-pending="true"]')]
      .map((element) => (element as HTMLElement).dataset.testid || element.getAttribute('role') || element.tagName.toLowerCase())
  );
  const timestamp = Date.now();
  const stateBase = {
    app: options.app,
    feature: options.feature,
    side: options.side,
    url: options.page.url(),
    semanticRoute: options.semanticRoute,
    viewport,
    accessibilityTree,
    domSnapshot,
    layoutSnapshot,
    styleDigest,
    activeElement: focus.activeElement,
    focusPath: focus.focusPath,
    textSelection: focus.textSelection,
    caret: focus.caret,
    overlayStack: overlays,
    scrollContainers: layoutSnapshot.scrollContainers,
    scrollOffsets: Object.fromEntries(layoutSnapshot.scrollContainers.map((container) => [container.path, {
      left: container.scrollLeft,
      top: container.scrollTop,
    }])),
    visibleVirtualRanges: layoutSnapshot.visibleVirtualRanges,
    pendingIndicators,
    storageDigest,
    deepSensors,
    networkCursor: options.networkCursor,
    timestamp,
  } satisfies Omit<UIState, 'id'>;

  const visualSnapshot = options.captureVisual && options.evidenceDir
    ? await captureScreenshot(options.page, options.evidenceDir, options.side, options.feature, timestamp)
    : undefined;
  const withVisual = { ...stateBase, visualSnapshot };
  const id = fingerprint(canonicalStateInput(withVisual));
  return { id, ...withVisual };
}

async function captureScreenshot(
  page: Page,
  evidenceDir: string,
  side: DistillationSide,
  feature: string,
  timestamp: number
): Promise<UIState['visualSnapshot']> {
  await mkdir(evidenceDir, { recursive: true });
  const safeFeature = feature.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);
  const path = join(evidenceDir, `${side}-${safeFeature}-${timestamp}.png`);
  await page.screenshot({ path, fullPage: false });
  const bytes = await readFile(path);
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  return { path, sha256: sha256(bytes.toString('base64')), width: viewport.width, height: viewport.height };
}
