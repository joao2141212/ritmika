import type { JsonObject, UIState } from '../types.js';

export interface DesignTokenObservation {
  name: string;
  value: string | number;
  role?: string;
  states: string[];
  source: string;
  confidence: number;
}

export interface DesignComponentProfile {
  name: string;
  roles: string[];
  variants: string[];
  states: string[];
  tokenNames: string[];
  source: string;
  confidence: number;
}

export interface DesignSystemIR {
  kind: 'DesignSystemIR';
  version: '1.0';
  tokens: DesignTokenObservation[];
  components: DesignComponentProfile[];
  provenance: Array<{ source: string; confidence: number; note?: string }>;
}

export function createDesignSystemIR(state: UIState, evidencePath = 'state.json'): DesignSystemIR {
  const digest = state.styleDigest as JsonObject;
  const tokens: DesignTokenObservation[] = Object.entries(digest)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .map(([name, value]) => ({
      name,
      value: value as string | number,
      states: ['observed'],
      source: evidencePath,
      confidence: 0.8,
    }));

  return {
    kind: 'DesignSystemIR',
    version: '1.0',
    tokens,
    components: state.overlayStack.map((overlay) => ({
      name: overlay.kind,
      roles: overlay.role ? [overlay.role] : [],
      variants: overlay.modal ? ['modal'] : [],
      states: [overlay.visible ? 'visible' : 'hidden'],
      tokenNames: [],
      source: evidencePath,
      confidence: 0.7,
    })),
    provenance: [{ source: evidencePath, confidence: 0.8, note: 'Only observed values are included' }],
  };
}
