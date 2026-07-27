import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connectFresh } from './browser/connect.js';
import { createCdpSession } from './browser/cdp-adapter.js';
import { captureState } from './capture/capture-state.js';
import { startEventRecorder, readRecordedEvents } from './capture/capture-events.js';
import { NetworkRecorder } from './capture/capture-network.js';
import { waitForQuiescence } from './capture/settle-detector.js';
import { redactValue } from './redaction/redact.js';
import type { DistillationSide } from './types.js';

interface CaptureArgs {
  url: string;
  out: string;
  app: string;
  feature: string;
  side: DistillationSide;
  semanticRoute: string;
  headed: boolean;
  captureVisual: boolean;
  authorizedTestAccount: boolean;
  captureBodies: boolean;
  storageState?: string;
}

function readArgs(argv: string[]): CaptureArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith('--')) {
      if (argument) positional.push(argument);
      continue;
    }
    const [rawKey, inline] = argument.slice(2).split('=', 2);
    const key = rawKey ?? '';
    if (inline !== undefined) values.set(key, inline);
    else {
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        index += 1;
        values.set(key, next);
      } else {
        flags.add(key);
      }
    }
  }
  const url = values.get('url') ?? positional[0];
  if (!url) throw new Error('capture requires --url <url>');
  return {
    url,
    out: values.get('out') ?? './evidence/source/capture',
    app: values.get('app') ?? 'unknown-app',
    feature: values.get('feature') ?? 'unknown-feature',
    side: values.get('side') === 'source' ? 'source' : 'clone',
    semanticRoute: values.get('semantic-route') ?? new URL(url).pathname,
    headed: flags.has('headed'),
    captureVisual: flags.has('capture-visual') || flags.has('screenshots'),
    authorizedTestAccount: flags.has('authorized-test-account'),
    captureBodies: flags.has('capture-bodies'),
    storageState: values.get('storage-state'),
  };
}

async function capture(args: CaptureArgs): Promise<void> {
  if ((args.captureVisual || args.captureBodies || args.storageState) && !args.authorizedTestAccount) {
    throw new Error('visual/body/session capture requires --authorized-test-account and must use a synthetic or explicitly approved test account');
  }
  await mkdir(args.out, { recursive: true });
  const connection = await connectFresh({
    url: args.url,
    headed: args.headed,
    storageState: args.storageState,
  });
  const cdp = await createCdpSession(connection.page);
  const network = new NetworkRecorder(cdp, { captureBodies: args.captureBodies });
  try {
    await network.start();
    await startEventRecorder(connection.page);
    const settle = await waitForQuiescence(connection.page, { pendingRequests: () => 0 });
    const state = await captureState({
      page: connection.page,
      cdp,
      app: args.app,
      feature: args.feature,
      side: args.side,
      semanticRoute: args.semanticRoute,
      networkCursor: network.cursor(),
      evidenceDir: join(args.out, 'screens'),
      captureVisual: args.captureVisual,
    });
    await writeFile(join(args.out, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
    await writeFile(join(args.out, 'network.json'), `${JSON.stringify(redactValue(network.all()), null, 2)}\n`);
    await writeFile(join(args.out, 'events.json'), `${JSON.stringify(await readRecordedEvents(connection.page), null, 2)}\n`);
    await writeFile(join(args.out, 'settle.json'), `${JSON.stringify(settle, null, 2)}\n`);
  } finally {
    await network.stop();
    await connection.close();
  }
}

async function main(): Promise<void> {
  const [command, ...argv] = process.argv.slice(2);
  if (command !== 'capture') {
    throw new Error('Usage: npm run capture -- --url <url> [--out <dir>] [--app <name>] [--feature <name>]');
  }
  await capture(readArgs(argv));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
