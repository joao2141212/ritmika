import type { CDPSession } from 'playwright';
import { digestBody, redactHeaders, sanitizeNetworkSummary } from '../redaction/redact.js';
import type { NetworkCursor, NetworkSummary } from '../types.js';

interface RequestRecord {
  id: string;
  url: string;
  method: string;
  resourceType?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: { length: number; sha256: string };
  timestamp: number;
}

export class NetworkRecorder {
  private readonly events: NetworkSummary[] = [];
  private readonly requests = new Map<string, RequestRecord>();
  private readonly captureBodies: boolean;
  private started = false;

  public constructor(private readonly cdp: CDPSession, options: { captureBodies?: boolean } = {}) {
    this.captureBodies = options.captureBodies === true;
  }

  public async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.cdp.send('Network.enable');
    this.cdp.on('Network.requestWillBeSent', (event: any) => {
      const request = event.request ?? {};
      const record: RequestRecord = {
        id: String(event.requestId),
        url: String(request.url ?? ''),
        method: String(request.method ?? 'GET'),
        resourceType: event.type,
        requestHeaders: redactHeaders(request.headers),
        requestBody: digestBody(request.postData),
        timestamp: Date.now(),
      };
      this.requests.set(record.id, record);
      this.events.push(sanitizeNetworkSummary({ ...record, timestamp: record.timestamp }));
    });
    this.cdp.on('Network.responseReceived', (event: any) => {
      const request = this.requests.get(String(event.requestId));
      if (!request) return;
      const response = event.response ?? {};
      this.events.push(sanitizeNetworkSummary({
        ...request,
        id: `${request.id}:response`,
        status: Number(response.status),
        responseHeaders: redactHeaders(response.headers),
        timestamp: Date.now(),
      }));
    });
    this.cdp.on('Network.webSocketCreated', (event: any) => {
      this.events.push(sanitizeNetworkSummary({
        id: String(event.requestId),
        method: 'WEBSOCKET',
        url: String(event.url ?? ''),
        websocket: true,
        timestamp: Date.now(),
      }));
    });
    this.cdp.on('Network.webSocketFrameSent', (event: any) => this.recordWebSocketFrame(event, 'WS_FRAME_SENT'));
    this.cdp.on('Network.webSocketFrameReceived', (event: any) => this.recordWebSocketFrame(event, 'WS_FRAME_RECEIVED'));
    this.cdp.on('Network.eventSourceMessageReceived', (event: any) => this.recordWebSocketFrame(event, 'EVENTSOURCE_MESSAGE'));
    this.cdp.on('Network.loadingFinished', async (event: any) => {
      if (!this.captureBodies) return;
      const request = this.requests.get(String(event.requestId));
      if (!request) return;
      try {
        const body = await this.cdp.send('Network.getResponseBody', { requestId: event.requestId }) as { body?: string };
        this.events.push(sanitizeNetworkSummary({
          ...request,
          id: `${request.id}:body`,
          responseBody: digestBody(body.body),
          timestamp: Date.now(),
        }));
      } catch {
        // A body may be unavailable for cache, opaque, or service-worker responses.
      }
    });
  }

  public cursor(): NetworkCursor {
    return { index: this.events.length, timestamp: Date.now() };
  }

  public delta(cursor: NetworkCursor): NetworkSummary[] {
    return this.events.slice(cursor.index).map((event) => ({ ...event }));
  }

  public all(): NetworkSummary[] {
    return this.events.map((event) => ({ ...event }));
  }

  public async stop(): Promise<void> {
    if (!this.started) return;
    await this.cdp.send('Network.disable').catch(() => undefined);
    this.started = false;
  }

  private recordWebSocketFrame(event: any, method: string): void {
    const response = event.response ?? {};
    const payload = typeof response.payloadData === 'string' ? response.payloadData : undefined;
    this.events.push(sanitizeNetworkSummary({
      id: `${String(event.requestId)}:${method}`,
      method,
      url: String(response.url ?? event.url ?? ''),
      websocket: true,
      ...(this.captureBodies && payload !== undefined ? { responseBody: digestBody(payload) } : {}),
      timestamp: Date.now(),
    }));
  }
}
