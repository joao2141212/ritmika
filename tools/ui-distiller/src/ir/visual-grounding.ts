import type { SemanticAction, UIState } from '../types.js';

export interface VisualGrounding {
  kind: 'VisualGrounding';
  version: '1.0';
  action: string;
  structural?: { role?: string; name?: string; testId?: string; text?: string; selector?: string };
  geometry?: { x: number; y: number; width: number; height: number };
  pixelFallback?: { evidencePath: string; requiredHumanReview: true };
  tier: 'structural' | 'geometry' | 'pixel-fallback';
  confidence: number;
  provenance: string[];
}

export function createVisualGrounding(action: SemanticAction, state: UIState, evidencePath = 'state.json'): VisualGrounding {
  const target = action.target;
  const geometry = state.layoutSnapshot.fixedOrAbsolute[0]?.rect;
  const structural = target ? {
    role: target.role,
    name: target.name,
    testId: target.testId,
    text: target.text,
    selector: target.fallbackSelector,
  } : undefined;
  return {
    kind: 'VisualGrounding',
    version: '1.0',
    action: action.name,
    structural,
    geometry,
    tier: structural ? 'structural' : geometry ? 'geometry' : 'pixel-fallback',
    confidence: structural ? 1 : geometry ? 0.7 : 0.2,
    ...(structural || geometry ? {} : { pixelFallback: { evidencePath, requiredHumanReview: true as const } }),
    provenance: [evidencePath],
  };
}
