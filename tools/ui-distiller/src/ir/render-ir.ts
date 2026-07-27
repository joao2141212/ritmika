import type { JsonObject, Rect, UIState, ViewportSnapshot } from '../types.js';

export interface RenderRegion {
  id: string;
  role?: string;
  label?: string;
  rect: Rect;
  visible: boolean;
  anchors: Array<{
    tier: 'structural' | 'geometry' | 'pixel-fallback';
    role?: string;
    name?: string;
    testId?: string;
    selector?: string;
    confidence: number;
  }>;
  styles: JsonObject;
  stateTags: string[];
  interactionNames: string[];
  evidencePaths: string[];
}

export interface MotionEvidence {
  target: string;
  properties: string[];
  durationMs?: number;
  easing?: string;
  settleMs?: number;
  source: 'computed-style' | 'animation' | 'transition' | 'observed';
}

export interface RenderIR {
  kind: 'RenderIR';
  version: '1.0';
  route: string;
  viewport: ViewportSnapshot;
  regions: RenderRegion[];
  assets: Array<{ url: string; kind?: string; confidence: number }>;
  motions: MotionEvidence[];
  sourceStateId: string;
  provenance: Array<{ source: string; confidence: number; note?: string }>;
}

export function createRenderIR(state: UIState, evidencePath = 'state.json'): RenderIR {
  const regions: RenderRegion[] = state.layoutSnapshot.fixedOrAbsolute.map((item, index) => ({
    id: `layout-${index}`,
    rect: item.rect,
    visible: true,
    anchors: [{ tier: 'geometry', selector: item.path, confidence: 0.7 }],
    styles: { position: item.position, zIndex: item.zIndex },
    stateTags: [],
    interactionNames: [],
    evidencePaths: [evidencePath],
  }));

  state.overlayStack.forEach((overlay, index) => {
    regions.push({
      id: `overlay-${index}`,
      role: overlay.role ?? overlay.kind,
      rect: { x: 0, y: 0, width: state.viewport.width, height: state.viewport.height },
      visible: overlay.visible,
      anchors: [{ tier: 'structural', role: overlay.role, testId: overlay.testId, confidence: 0.8 }],
      styles: {},
      stateTags: [overlay.kind, overlay.modal ? 'modal' : 'non-modal'],
      interactionNames: [],
      evidencePaths: [evidencePath],
    });
  });

  if (regions.length === 0) {
    regions.push({
      id: 'viewport',
      rect: { x: 0, y: 0, width: state.viewport.width, height: state.viewport.height },
      visible: true,
      anchors: [{ tier: 'structural', role: 'document', confidence: 0.5 }],
      styles: state.styleDigest,
      stateTags: [],
      interactionNames: [],
      evidencePaths: [evidencePath],
    });
  }

  return {
    kind: 'RenderIR',
    version: '1.0',
    route: state.semanticRoute,
    viewport: state.viewport,
    regions,
    assets: [],
    motions: [],
    sourceStateId: state.id,
    provenance: [{ source: evidencePath, confidence: 1, note: 'Derived from captured DOM/layout state' }],
  };
}
