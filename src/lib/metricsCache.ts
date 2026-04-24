// src/lib/metricsCache.ts
// Simple in-memory cache for audit results to avoid redundant Firestore reads

const cache = new Map<string, { data: unknown; timestamp: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function cacheAuditResult(auditId: string, data: unknown): void {
  cache.set(auditId, { data, timestamp: Date.now() });
}

export function getCachedAuditResult<T>(auditId: string): T | null {
  const entry = cache.get(auditId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(auditId);
    return null;
  }
  return entry.data as T;
}

export function invalidateCache(auditId: string): void {
  cache.delete(auditId);
}
