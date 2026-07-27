import { diffAccessibility } from './diff-accessibility.js';
import { diffDom } from './diff-dom.js';
import { diffJson } from './diff-json.js';
import { diffLayout } from './diff-layout.js';
import { diffStorage } from './diff-storage.js';
import { diffVisual } from './diff-visual.js';
import type { UIState } from '../types.js';

export interface TransitionDiff {
  dom: ReturnType<typeof diffDom>;
  accessibility: ReturnType<typeof diffAccessibility>;
  layout: ReturnType<typeof diffLayout>;
  visual: ReturnType<typeof diffVisual>;
  focus: ReturnType<typeof diffJson>;
  selection: ReturnType<typeof diffJson>;
  storage: ReturnType<typeof diffStorage>;
  overlays: ReturnType<typeof diffJson>;
}

export function diffTransition(before: UIState, after: UIState): TransitionDiff {
  return {
    dom: diffDom(before.domSnapshot, after.domSnapshot),
    accessibility: diffAccessibility(before.accessibilityTree, after.accessibilityTree),
    layout: diffLayout(before.layoutSnapshot, after.layoutSnapshot),
    visual: diffVisual(before.visualSnapshot, after.visualSnapshot),
    focus: diffJson(before.activeElement, after.activeElement),
    selection: diffJson(before.textSelection, after.textSelection),
    storage: diffStorage(before.storageDigest, after.storageDigest),
    overlays: diffJson(before.overlayStack, after.overlayStack),
  };
}
