/**
 * Lightweight Prometheus metrics collection middleware for Express.js.
 * No external dependencies - implements Prometheus text exposition format manually.
 */

import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Internal metric storage
// ---------------------------------------------------------------------------

/** Counter: keyed by label-set string, stores monotonically increasing value */
const counters: Map<string, number> = new Map();

/** Histogram observations: keyed by label-set string, stores sorted array of values */
const histogramObservations: Map<string, number[]> = new Map();

/** Histogram sum: keyed by label-set string */
const histogramSums: Map<string, number> = new Map();

/** Histogram count: keyed by label-set string */
const histogramCounts: Map<string, number> = new Map();

/** Gauge: single numeric value */
let activeConnections = 0;

// Histogram bucket upper bounds (in seconds)
const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePath(req: Request): string {
  const route = (req as any).route;
  if (route && route.path) {
    // Use the Express matched route pattern (e.g. /api/voters/:id)
    const basePath = (req as any).baseUrl || '';
    return `${basePath}${route.path}`;
  }
  // Fallback: collapse numeric path segments to `:id` to reduce cardinality
  const url = req.originalUrl || req.url;
  const pathOnly = url.split('?')[0] ?? url;
  return pathOnly.replace(/\/\d+/g, '/:id');
}

function counterKey(method: string, path: string, status: number): string {
  return `method="${method}",path="${path}",status="${status}"`;
}

function histogramKey(method: string, path: string): string {
  return `method="${method}",path="${path}"`;
}

function incrementCounter(key: string): void {
  counters.set(key, (counters.get(key) || 0) + 1);
}

function observeHistogram(key: string, value: number): void {
  if (!histogramObservations.has(key)) {
    histogramObservations.set(key, []);
    histogramSums.set(key, 0);
    histogramCounts.set(key, 0);
  }
  histogramObservations.get(key)!.push(value);
  histogramSums.set(key, (histogramSums.get(key) || 0) + value);
  histogramCounts.set(key, (histogramCounts.get(key) || 0) + 1);
}

// ---------------------------------------------------------------------------
// Prometheus text format serialization
// ---------------------------------------------------------------------------

function serializeMetrics(): string {
  const lines: string[] = [];

  // --- http_requests_total (counter) ---
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [labels, value] of counters.entries()) {
    lines.push(`http_requests_total{${labels}} ${value}`);
  }

  // --- http_request_duration_seconds (histogram) ---
  lines.push('# HELP http_request_duration_seconds Duration of HTTP requests in seconds');
  lines.push('# TYPE http_request_duration_seconds histogram');
  for (const [labels, observations] of histogramObservations.entries()) {
    // Sort observations so we can compute bucket counts efficiently
    const sorted = observations.slice().sort((a, b) => a - b);
    let idx = 0;
    for (const bound of HISTOGRAM_BUCKETS) {
      while (idx < sorted.length && (sorted[idx] ?? Infinity) <= bound) {
        idx++;
      }
      lines.push(`http_request_duration_seconds_bucket{${labels},le="${bound}"} ${idx}`);
    }
    lines.push(`http_request_duration_seconds_bucket{${labels},le="+Inf"} ${sorted.length}`);
    lines.push(`http_request_duration_seconds_sum{${labels}} ${histogramSums.get(labels) || 0}`);
    lines.push(`http_request_duration_seconds_count{${labels}} ${histogramCounts.get(labels) || 0}`);
  }

  // --- http_active_connections (gauge) ---
  lines.push('# HELP http_active_connections Number of currently active HTTP connections');
  lines.push('# TYPE http_active_connections gauge');
  lines.push(`http_active_connections ${activeConnections}`);

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Exported Express middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that tracks request count, duration, and active connections.
 * Mount this early in the middleware chain (but after any body-parser / routing setup).
 *
 * ```ts
 * app.use(metricsMiddleware);
 * ```
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip metrics endpoint itself to avoid self-referential noise
  if (req.path === '/metrics') {
    return next();
  }

  activeConnections++;
  const start = process.hrtime.bigint();

  // Hook into response finish to record metrics
  const onFinish = () => {
    activeConnections = Math.max(0, activeConnections - 1);

    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    const method = req.method;
    const path = normalizePath(req);
    const status = res.statusCode;

    incrementCounter(counterKey(method, path, status));
    observeHistogram(histogramKey(method, path), durationSec);

    res.removeListener('finish', onFinish);
    res.removeListener('close', onFinish);
  };

  res.on('finish', onFinish);
  res.on('close', onFinish);

  next();
}

/**
 * Express route handler that returns metrics in Prometheus text exposition format.
 *
 * ```ts
 * app.get('/metrics', metricsEndpoint);
 * ```
 */
export function metricsEndpoint(_req: Request, res: Response): void {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(serializeMetrics());
}
