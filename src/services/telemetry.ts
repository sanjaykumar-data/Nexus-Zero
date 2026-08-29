import type { NetworkEvent, NetworkStats } from '../types';

/**
 * FIX (vs. the original build): the previous telemetry service only patched
 * `window.fetch`, so it could never see the network calls that actually
 * matter — the model/weight downloads that happen inside Worker 2
 * (Transformers.js) and Worker 3 (web-llm), since each Web Worker has its
 * own isolated global scope with its own `fetch`.
 *
 * This version is isomorphic: call `installFetchInterceptor(source, onEvent)`
 * from ANY context (main thread or a worker) and it patches that context's
 * own `fetch`. In a worker, pass an `onEvent` callback that posts the event
 * back to the main thread; the main thread's TelemetryStore then aggregates
 * events from every source into one real, subscribable total.
 */

export function installFetchInterceptor(
  source: NetworkEvent['source'],
  onEvent: (event: NetworkEvent) => void,
): void {
  const scope: typeof globalThis = typeof window !== 'undefined' ? window : self;
  const originalFetch = scope.fetch.bind(scope);

  scope.fetch = (async (...args: Parameters<typeof fetch>) => {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : (input as Request).url ?? 'unknown';
    const method = (init?.method ?? 'GET').toUpperCase();

    let bodyBytes = 0;
    const body = init?.body;
    if (typeof body === 'string') bodyBytes = body.length;
    else if (body instanceof ArrayBuffer) bodyBytes = body.byteLength;

    onEvent({ url, method, bodyBytes, timestamp: Date.now(), source });

    return originalFetch(...args);
  }) as typeof fetch;
}

/** Main-thread aggregating store. Subscribe from React via useEffect. */
class TelemetryStore {
  private stats: NetworkStats = { totalRequests: 0, egressBytes: 0, history: [] };
  private listeners: ((stats: NetworkStats) => void)[] = [];

  recordEvent(event: NetworkEvent): void {
    this.stats = {
      totalRequests: this.stats.totalRequests + 1,
      egressBytes: this.stats.egressBytes + event.bodyBytes,
      history: [event, ...this.stats.history].slice(0, 30),
    };
    this.notify();
  }

  getStats(): NetworkStats {
    return this.stats;
  }

  reset(): void {
    this.stats = { totalRequests: 0, egressBytes: 0, history: [] };
    this.notify();
  }

  subscribe(listener: (stats: NetworkStats) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStats());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const current = this.getStats();
    for (const listener of this.listeners) listener(current);
  }
}

export const telemetry = new TelemetryStore();
