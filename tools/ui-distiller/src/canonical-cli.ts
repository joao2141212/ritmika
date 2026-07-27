import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { connectFresh } from './browser/connect.js';
import { createCdpSession } from './browser/cdp-adapter.js';
import { captureState } from './capture/capture-state.js';
import { startEventRecorder, readRecordedEvents } from './capture/capture-events.js';
import { NetworkRecorder } from './capture/capture-network.js';
import { waitForQuiescence } from './capture/settle-detector.js';
import { compileStateMachine } from './compiler/machine-compiler.js';
import { compileTransition } from './compiler/transition-compiler.js';
import { diffJson } from './diff/diff-json.js';
import { importRecorderRecording } from './replay/recorder-import.js';
import { createCausalTrace } from './ir/causal-trace.js';
import { compileUnifiedCloneSpec } from './ir/unified-clone-spec.js';
import type { ActionSafety, JsonValue, UIState, UITransition } from './types.js';

interface ParsedArgs {
  positional: string[];
  values: Map<string, string>;
  flags: Set<string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith('--')) {
      if (argument) positional.push(argument);
      continue;
    }
    const [rawKey, inline] = argument.slice(2).split('=', 2);
    const key = rawKey ?? '';
    if (inline !== undefined) values.set(key, inline);
    else if (argv[index + 1] && !argv[index + 1]?.startsWith('--')) {
      values.set(key, argv[index + 1] as string);
      index += 1;
    } else flags.add(key);
  }
  return { positional, values, flags };
}

function option(args: ParsedArgs, name: string, fallback?: string): string | undefined {
  return args.values.get(name) ?? fallback;
}

function requireOption(args: ParsedArgs, name: string): string {
  const value = option(args, name);
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

async function loadJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function loadState(path: string): Promise<UIState> {
  const raw = await loadJson<unknown>(path);
  if (raw && typeof raw === 'object' && 'state' in raw) {
    const envelope = raw as { state?: unknown };
    if (envelope.state && typeof envelope.state === 'object') return normalizeState(envelope.state);
  }
  return normalizeState(raw);
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeState(raw: unknown): UIState {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const viewport = (value.viewport && typeof value.viewport === 'object' ? value.viewport : {}) as Record<string, unknown>;
  const rawLayout = Array.isArray(value.layoutSnapshot) ? value.layoutSnapshot : [];
  const layoutObject = value.layoutSnapshot && typeof value.layoutSnapshot === 'object' && !Array.isArray(value.layoutSnapshot)
    ? value.layoutSnapshot as Record<string, unknown>
    : {};
  const fixedOrAbsolute = (Array.isArray(layoutObject.fixedOrAbsolute) ? layoutObject.fixedOrAbsolute : rawLayout)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => {
      const rect = item.rect && typeof item.rect === 'object' ? item.rect as Record<string, unknown> : {};
      return {
        path: String(item.path ?? item.tag ?? `layout-${index}`),
        position: String(item.position ?? 'static'),
        zIndex: String(item.zIndex ?? 'auto'),
        rect: { x: asNumber(rect.x), y: asNumber(rect.y), width: asNumber(rect.width), height: asNumber(rect.height) },
      };
    });
  const storage = (value.storageDigest && typeof value.storageDigest === 'object' ? value.storageDigest : {}) as Record<string, unknown>;
  const emptyStorage = { keys: [], count: 0, fingerprint: '' };
  const storageDigest = {
    localStorage: (storage.localStorage && typeof storage.localStorage === 'object' ? storage.localStorage : emptyStorage) as UIState['storageDigest']['localStorage'],
    sessionStorage: (storage.sessionStorage && typeof storage.sessionStorage === 'object' ? storage.sessionStorage : emptyStorage) as UIState['storageDigest']['sessionStorage'],
    indexedDb: (storage.indexedDb && typeof storage.indexedDb === 'object' ? storage.indexedDb : { databases: [], metadata: [] }) as UIState['storageDigest']['indexedDb'],
  };
  return {
    id: String(value.id ?? value.url ?? 'state'),
    app: String(value.app ?? 'unknown-app'),
    feature: String(value.feature ?? 'unknown-feature'),
    side: value.side === 'source' ? 'source' : 'clone',
    url: String(value.url ?? ''),
    semanticRoute: String(value.semanticRoute ?? value.url ?? '/'),
    viewport: { width: asNumber(viewport.width), height: asNumber(viewport.height), deviceScaleFactor: asNumber(viewport.deviceScaleFactor) || undefined },
    accessibilityTree: (value.accessibilityTree ?? value.accessibility ?? {}) as JsonValue,
    domSnapshot: (value.domSnapshot ?? value.documentTree ?? {}) as JsonValue,
    layoutSnapshot: {
      fixedOrAbsolute,
      scrollContainers: (Array.isArray(layoutObject.scrollContainers) ? layoutObject.scrollContainers : []) as UIState['layoutSnapshot']['scrollContainers'],
      visibleVirtualRanges: (Array.isArray(layoutObject.visibleVirtualRanges) ? layoutObject.visibleVirtualRanges : []) as UIState['layoutSnapshot']['visibleVirtualRanges'],
    },
    styleDigest: typeof value.styleDigest === 'object' && value.styleDigest ? value.styleDigest as Record<string, JsonValue> : { fingerprint: String(value.styleDigest ?? '') },
    activeElement: value.activeElement as UIState['activeElement'],
    focusPath: Array.isArray(value.focusPath) ? value.focusPath.map(String) : [],
    textSelection: value.textSelection as UIState['textSelection'],
    caret: value.caret as UIState['caret'],
    overlayStack: Array.isArray(value.overlayStack) ? value.overlayStack as UIState['overlayStack'] : [],
    scrollContainers: Array.isArray(value.scrollContainers) ? value.scrollContainers as UIState['scrollContainers'] : [],
    scrollOffsets: value.scrollOffsets && typeof value.scrollOffsets === 'object' ? value.scrollOffsets as UIState['scrollOffsets'] : {},
    visibleVirtualRanges: Array.isArray(value.visibleVirtualRanges) ? value.visibleVirtualRanges as UIState['visibleVirtualRanges'] : [],
    pendingIndicators: Array.isArray(value.pendingIndicators) ? value.pendingIndicators.map(String) : [],
    storageDigest,
    deepSensors: value.deepSensors as Record<string, JsonValue> | undefined,
    networkCursor: value.networkCursor as UIState['networkCursor'],
    timestamp: asNumber(value.timestamp) || Date.now(),
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function packageAvailable(name: string): Promise<boolean> {
  try {
    createRequire(import.meta.url).resolve(name);
    return true;
  } catch {
    return false;
  }
}

async function doctor(): Promise<void> {
  const names = ['playwright', 'ajv', 'xstate', '@rrweb/record', '@rrweb/replay'];
  const packages = await Promise.all(names.map(async (name) => ({ name, installed: await packageAvailable(name) })));
  const ok = packages.every((item) => item.installed);
  console.log(JSON.stringify({ node: process.version, packages, ok }, null, 2));
  if (!ok) process.exitCode = 1;
}

function safetyValue(value: string | undefined, fallback: ActionSafety = 'read-only'): ActionSafety {
  if (value === 'read-only' || value === 'reversible' || value === 'mutating' || value === 'destructive') return value;
  return fallback;
}

async function importRecording(args: ParsedArgs): Promise<void> {
  const input = args.positional[0];
  if (!input) throw new Error('recording-to-flow requires recording.json');
  const recording = await loadJson<unknown>(resolve(input));
  const flow = importRecorderRecording(recording, {
    id: option(args, 'id', 'flow-imported') as string,
    app: option(args, 'app', 'unknown-app') as string,
    feature: option(args, 'feature', 'unknown-feature') as string,
    initialFixture: option(args, 'fixture', 'synthetic-empty') as string,
  });
  const semanticMappingRequired = flow.steps.some((step) => step.command === 'custom' || Boolean(step.args?.selector));
  await writeJson(requireOption(args, 'out'), { ...flow, semanticMappingRequired });
  console.log(JSON.stringify({ ok: true, steps: flow.steps.length, semanticMappingRequired }));
}

async function findStatePair(input: string): Promise<[string, string]> {
  const info = await stat(input);
  if (!info.isDirectory()) throw new Error('findStatePair expects a directory');
  const names = (await readdir(input)).filter((name) => name.endsWith('.json') && !name.includes('manifest'));
  const before = names.find((name) => name === 'before.json') ?? names.find((name) => name.includes('desktop')) ?? names[0];
  const after = names.find((name) => name === 'after.json') ?? names.find((name) => name.includes('tablet')) ?? names[1];
  if (!before || !after) throw new Error('Directory compile requires at least two state JSON files');
  return [join(input, before), join(input, after)];
}

async function compile(args: ParsedArgs): Promise<void> {
  const first = args.positional[0];
  if (!first) throw new Error('compile requires before.json after.json or a directory');
  const pair = (await stat(first)).isDirectory()
    ? await findStatePair(first)
    : [first, args.positional[1]] as [string, string | undefined];
  if (!pair[1]) throw new Error('compile requires before.json and after.json');
  const before = await loadState(resolve(pair[0]));
  const after = await loadState(resolve(pair[1]));
  const actionName = option(args, 'action', 'observed-action') as string;
  const transition = compileTransition(before, after, {
    action: {
      name: actionName,
      safety: safetyValue(option(args, 'safety'), 'read-only'),
      target: {
        role: option(args, 'role'),
        name: option(args, 'name'),
        testId: option(args, 'test-id'),
        text: option(args, 'text'),
        fallbackSelector: option(args, 'selector'),
      },
    },
    successAssertions: option(args, 'confirmation') ? [option(args, 'confirmation') as string] : [],
    evidencePaths: [resolve(pair[0]), resolve(pair[1])],
  });
  await writeJson(requireOption(args, 'out'), transition);
  console.log(JSON.stringify({ ok: true, out: option(args, 'out') }));
}

async function graph(args: ParsedArgs): Promise<void> {
  const input = args.positional[0];
  if (!input) throw new Error('graph requires a transition JSON file');
  const loaded = await loadJson<UITransition | UITransition[]>(resolve(input));
  const transitions = Array.isArray(loaded) ? loaded : [loaded];
  const machine = compileStateMachine(transitions);
  const out = requireOption(args, 'out');
  const graph = {
    kind: 'StateGraph',
    nodes: Object.keys(machine.states).map((id) => ({ id, ...machine.states[id] })),
    edges: transitions.map((transition) => ({ from: transition.sourceStateId, to: transition.targetStateId, action: transition.semanticAction.name })),
  };
  if (out.endsWith('.json')) await writeJson(out, { machine, graph });
  else {
    await writeJson(join(out, 'compiled-machine.json'), machine);
    await writeJson(join(out, 'graph.json'), graph);
  }
  console.log(JSON.stringify({ ok: true, nodes: graph.nodes.length, edges: graph.edges.length, out }));
}

async function differential(args: ParsedArgs): Promise<void> {
  const sourcePath = args.positional[0];
  const clonePath = args.positional[1];
  if (!sourcePath || !clonePath) throw new Error('diff requires source-transitions.json clone-transitions.json');
  const source = await loadJson<UITransition | UITransition[]>(resolve(sourcePath));
  const clone = await loadJson<UITransition | UITransition[]>(resolve(clonePath));
  const differences = diffJson(source, clone, 500);
  const sourceCount = Array.isArray(source) ? source.length : 1;
  const cloneCount = Array.isArray(clone) ? clone.length : 1;
  const complete = sourceCount > 0 && sourceCount === cloneCount;
  const score = differences.length === 0 ? 100 : Math.max(0, 100 - Math.min(100, differences.length * 5));
  const report = { ok: true, score, complete, sourceCount, cloneCount, differences };
  await writeJson(requireOption(args, 'out'), report);
  console.log(JSON.stringify({ ok: true, score, complete, out: option(args, 'out') }));
}

async function unifiedSpec(args: ParsedArgs): Promise<void> {
  const statePaths = requireOption(args, 'states').split(',').filter(Boolean);
  const states = await Promise.all(statePaths.map((path) => loadState(resolve(path))));
  const transitionPath = option(args, 'transitions');
  const transitions = transitionPath ? await loadJson<UITransition | UITransition[]>(resolve(transitionPath)) : [];
  const transitionList = Array.isArray(transitions) ? transitions : [transitions];
  const causalPath = option(args, 'causal-traces');
  const causal = causalPath ? await loadJson<ReturnType<typeof createCausalTrace> | Array<ReturnType<typeof createCausalTrace>>>(resolve(causalPath)) : undefined;
  const causalList = causal ? (Array.isArray(causal) ? causal : [causal]) : undefined;
  const spec = compileUnifiedCloneSpec({
    app: requireOption(args, 'app'),
    feature: requireOption(args, 'feature'),
    sourceUrl: option(args, 'url'),
    states,
    transitions: transitionList,
    causalTraces: causalList,
    sourcePath: option(args, 'source', 'evidence'),
  });
  await writeJson(requireOption(args, 'out'), spec);
  console.log(JSON.stringify({ ok: true, output: option(args, 'out'), states: spec.states.length, transitions: spec.workflow.transitions.length, status: spec.status }));
}

async function captureAction(args: ParsedArgs): Promise<void> {
  const url = args.positional[0] ?? option(args, 'url');
  if (!url) throw new Error('capture-action requires a URL');
  const out = requireOption(args, 'out');
  const actionName = option(args, 'action', 'click') as string;
  const actionSafety = safetyValue(option(args, 'safety'), 'mutating');
  if (actionSafety !== 'read-only' && !args.flags.has('authorized-test-account')) {
    throw new Error('capture-action for a mutating action requires --authorized-test-account');
  }
  if (args.flags.has('screenshots') && !args.flags.has('authorized-test-account')) {
    throw new Error('capture-action screenshots require --authorized-test-account');
  }
  await mkdir(out, { recursive: true });
  const connection = await connectFresh({ url, headed: args.flags.has('headed') });
  const cdp = await createCdpSession(connection.page);
  const network = new NetworkRecorder(cdp, { captureBodies: false });
  try {
    await network.start();
    await startEventRecorder(connection.page);
    const beforeSettle = await waitForQuiescence(connection.page, { pendingRequests: () => 0 });
    const before = await captureState({
      page: connection.page,
      cdp,
      app: option(args, 'app', 'unknown-app') as string,
      feature: option(args, 'feature', 'unknown-feature') as string,
      side: 'clone',
      semanticRoute: new URL(url).pathname,
      networkCursor: network.cursor(),
      evidenceDir: join(out, 'screens'),
      captureVisual: args.flags.has('screenshots'),
    });
    if (actionName === 'click') {
      const selector = requireOption(args, 'selector');
      await connection.page.locator(selector).click();
    } else if (actionName === 'navigate') {
      await connection.page.goto(requireOption(args, 'target-url'));
    } else {
      throw new Error(`capture-action currently supports click and navigate, received ${actionName}`);
    }
    const afterSettle = await waitForQuiescence(connection.page, { pendingRequests: () => 0 });
    const after = await captureState({
      page: connection.page,
      cdp,
      app: option(args, 'app', 'unknown-app') as string,
      feature: option(args, 'feature', 'unknown-feature') as string,
      side: 'clone',
      semanticRoute: new URL(connection.page.url()).pathname,
      networkCursor: network.cursor(),
      evidenceDir: join(out, 'screens'),
      captureVisual: args.flags.has('screenshots'),
    });
    const events = await readRecordedEvents(connection.page);
    const transition = compileTransition(before, after, {
      action: {
        name: actionName,
        safety: actionSafety,
        target: { fallbackSelector: option(args, 'selector') },
      },
      rawInputEvents: events as unknown as JsonValue[],
      requestSequence: network.all(),
      successAssertions: option(args, 'confirmation') ? [option(args, 'confirmation') as string] : [],
      settleReason: afterSettle.reason,
      evidencePaths: [join(out, 'before.json'), join(out, 'after.json')],
    });
    await writeJson(join(out, 'before.json'), before);
    await writeJson(join(out, 'after.json'), after);
    await writeJson(join(out, 'transition.json'), transition);
    await writeJson(join(out, 'events.json'), events);
    await writeJson(join(out, 'network.json'), network.all());
    await writeJson(join(out, 'settle.json'), { before: beforeSettle, after: afterSettle });
    console.log(JSON.stringify({ ok: true, out, transitionId: transition.id }));
  } finally {
    await network.stop();
    await connection.close();
  }
}

async function main(): Promise<void> {
  const [command, ...argv] = process.argv.slice(2);
  const args = parseArgs(argv);
  if (command === 'doctor') return doctor();
  if (command === 'recording-to-flow') return importRecording(args);
  if (command === 'compile') return compile(args);
  if (command === 'graph') return graph(args);
  if (command === 'diff') return differential(args);
  if (command === 'unified-spec') return unifiedSpec(args);
  if (command === 'capture-action') return captureAction(args);
  throw new Error('Usage: doctor | capture-action | recording-to-flow | compile | graph | diff | unified-spec');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
