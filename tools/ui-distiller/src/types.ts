export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type DistillationSide = 'source' | 'clone';
export type ActionSafety = 'read-only' | 'reversible' | 'mutating' | 'destructive';
export type SettleReason = 'terminal-condition' | 'quiescent' | 'timeout' | 'navigation' | 'error';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportSnapshot {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

export interface ActiveElementSnapshot {
  tagName: string;
  role?: string;
  ariaLabel?: string;
  testId?: string;
  id?: string;
  name?: string;
  type?: string;
  disabled?: boolean;
  contentEditable?: boolean;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

export interface SelectionSnapshot {
  anchorPath?: string;
  focusPath?: string;
  anchorOffset?: number;
  focusOffset?: number;
  isCollapsed: boolean;
  textDigest?: string;
}

export interface CaretSnapshot {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface OverlaySnapshot {
  kind: 'dialog' | 'menu' | 'listbox' | 'popover' | 'tooltip' | 'unknown';
  role?: string;
  id?: string;
  testId?: string;
  expanded?: boolean;
  modal?: boolean;
  visible: boolean;
}

export interface ScrollContainerSnapshot {
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
}

export interface LayoutSnapshot {
  fixedOrAbsolute: Array<{
    path: string;
    position: string;
    zIndex: string;
    rect: { x: number; y: number; width: number; height: number };
  }>;
  scrollContainers: ScrollContainerSnapshot[];
  visibleVirtualRanges: Array<{
    path: string;
    rowIndex?: string;
    colIndex?: string;
  }>;
}

export interface StorageDigest {
  localStorage: { keys: string[]; count: number; fingerprint: string };
  sessionStorage: { keys: string[]; count: number; fingerprint: string };
  indexedDb: { databases: string[]; metadata: JsonValue[] };
}

export interface NetworkSummary {
  id: string;
  method: string;
  url: string;
  resourceType?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: { length: number; sha256: string };
  status?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: { length: number; sha256: string };
  websocket?: boolean;
  timestamp: number;
}

export interface NetworkCursor {
  index: number;
  timestamp: number;
}

export interface UIState {
  id: string;
  app: string;
  feature: string;
  side: DistillationSide;
  url: string;
  semanticRoute: string;
  viewport: ViewportSnapshot;
  visualSnapshot?: {
    path: string;
    sha256?: string;
    width: number;
    height: number;
  };
  accessibilityTree: JsonValue;
  domSnapshot: JsonValue;
  layoutSnapshot: LayoutSnapshot;
  styleDigest: JsonObject;
  activeElement?: ActiveElementSnapshot;
  focusPath: string[];
  textSelection?: SelectionSnapshot;
  caret?: CaretSnapshot;
  overlayStack: OverlaySnapshot[];
  scrollContainers: ScrollContainerSnapshot[];
  scrollOffsets: Record<string, { left: number; top: number }>;
  visibleVirtualRanges: LayoutSnapshot['visibleVirtualRanges'];
  pendingIndicators: string[];
  storageDigest: StorageDigest;
  deepSensors?: JsonObject;
  networkCursor?: NetworkCursor;
  timestamp: number;
}

export interface SemanticAction {
  name: string;
  args?: JsonObject;
  safety: ActionSafety;
  target?: {
    role?: string;
    name?: string;
    testId?: string;
    text?: string;
    fallbackSelector?: string;
  };
}

export interface UITransition {
  id: string;
  feature: string;
  sourceStateId: string;
  targetStateId: string;
  semanticAction: SemanticAction;
  rawInputEvents: JsonValue[];
  pointerTrajectory: JsonValue[];
  keyboardSequence: string[];
  preconditions: string[];
  immediateFeedback: string[];
  optimisticState?: JsonValue;
  settledState?: JsonValue;
  networkIntent: NetworkSummary[];
  requestSequence: NetworkSummary[];
  websocketSequence: NetworkSummary[];
  storageDelta: JsonValue;
  domDelta: JsonValue;
  accessibilityDelta: JsonValue;
  layoutDelta: JsonValue;
  visualDelta: JsonValue;
  focusDelta: JsonValue;
  selectionDelta: JsonValue;
  successAssertions: string[];
  failureAssertions: string[];
  undoTransition?: string;
  retryTransition?: string;
  duration: number;
  settleReason: SettleReason;
  evidencePaths: string[];
}

export interface FeatureContract {
  id: string;
  app: string;
  feature: string;
  version: string;
  preconditions: string[];
  triggers: {
    mouse: string[];
    keyboard: string[];
  };
  semanticActions: SemanticAction[];
  payloads: JsonValue[];
  immediateFeedback: string[];
  optimisticStates: JsonValue[];
  persistentEffects: string[];
  successStates: string[];
  errorStates: string[];
  permissionStates: string[];
  emptyStates: string[];
  loadingStates: string[];
  retryActions: string[];
  cancellationActions: string[];
  undoActions: string[];
  finalFocus: string[];
  responsiveRequirements: string[];
  accessibilityRequirements: string[];
  transitions: string[];
  evidencePaths: string[];
}

export interface StateMachineDefinition {
  id: string;
  initial: string;
  states: Record<string, {
    on: Record<string, string>;
    meta?: JsonObject;
  }>;
}

export type SemanticCommand =
  | 'openWorkspace'
  | 'openPage'
  | 'openBoard'
  | 'openMenu'
  | 'activateCommand'
  | 'createBlock'
  | 'moveBlock'
  | 'createCard'
  | 'moveCard'
  | 'editProperty'
  | 'pressShortcut'
  | 'closeOverlay'
  | 'undo'
  | 'redo'
  | 'custom';

export interface SemanticFlowStep {
  command: SemanticCommand;
  args?: JsonObject;
  safety?: ActionSafety;
  expect?: {
    route?: string;
    text?: string;
    role?: string;
    state?: string;
    timeoutMs?: number;
  };
}

export interface SemanticFlow {
  id: string;
  app: string;
  feature: string;
  initialFixture: string;
  steps: SemanticFlowStep[];
  metadata?: JsonObject;
}

export interface DistillationManifest {
  runId: string;
  app: string;
  feature: string;
  source?: { url: string; authorization: string; testAccount: boolean };
  clone?: { url: string; fixture: string };
  statesVisited: string[];
  transitionsVisited: string[];
  frontierRemaining: number;
  tracesGenerated: string[];
  captureFailures: string[];
  replayFailures: string[];
  parityScore?: number;
  unsupportedStates: string[];
  finalStatus: 'in-progress' | 'blocked' | 'passed' | 'partial';
}
