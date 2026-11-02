/**
 * High-performance In-Memory & Session Caching with Request Deduplication for ClassSure API
 *
 * Solves:
 * 1. High latency & slow response times from remote Render backend
 * 2. Cascading N+1 HTTP calls (hundreds of duplicate requests across feature navigations)
 * 3. Blank loading spinners every time the user opens or switches tabs
 */

class CachedResponse {
  constructor(data, status = 200, statusText = "OK") {
    this.data = data;
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.statusText = statusText;
  }

  async json() {
    if (typeof this.data === "string") {
      try {
        return JSON.parse(this.data);
      } catch {
        return this.data;
      }
    }
    // Return deep copy so callers cannot mutate cached state directly
    return JSON.parse(JSON.stringify(this.data));
  }

  async text() {
    if (typeof this.data === "string") {
      return this.data;
    }
    return JSON.stringify(this.data);
  }

  clone() {
    return new CachedResponse(this.data, this.status, this.statusText);
  }
}

// In-memory cache store: key -> { data, status, timestamp, ttl }
const memoryCache = new Map();

// In-flight promises map: key -> Promise<CachedResponse>
const inFlightRequests = new Map();

/**
 * Default TTLs in milliseconds
 */
export const CACHE_TTL = {
  STATIC_DATA: 60 * 60 * 1000,      // 1 hour (boards, subjects, categories)
  ENTITY_DETAILS: 5 * 60 * 1000,     // 5 minutes (student, parent, tutor details)
  FEATURE_QUERIES: 60 * 1000,        // 60 seconds (today sessions, history, students list)
  SHORT: 30 * 1000,                  // 30 seconds
};

/**
 * Build a deterministic cache key from URL and request options
 */
function buildCacheKey(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : "";
  return `${method}:::${url}:::${body}`;
}

/**
 * Execute an API fetch with caching and in-flight request deduplication.
 *
 * @param {string} url - API endpoint URL
 * @param {object} options - Standard fetch options (method, headers, body)
 * @param {number} ttlMs - Cache time-to-live in ms (default 60s)
 * @param {boolean} forceRefresh - If true, bypasses existing cache and fetches fresh
 * @returns {Promise<Response|CachedResponse>}
 */
export async function cachedFetch(url, options = {}, ttlMs = CACHE_TTL.FEATURE_QUERIES, forceRefresh = false) {
  const method = (options.method || "GET").toUpperCase();
  const isCacheableMethod = method === "GET" || (method === "POST" && url.includes("/static_data/"));

  // Only GET requests or static_data POST lookups are safe to cache
  if (!isCacheableMethod) {
    return fetch(url, options);
  }

  const cacheKey = buildCacheKey(url, options);
  const now = Date.now();

  // 1. Check in-memory cache if not forcing a refresh
  if (!forceRefresh && memoryCache.has(cacheKey)) {
    const entry = memoryCache.get(cacheKey);
    if (now - entry.timestamp < entry.ttl) {
      return new CachedResponse(entry.data, entry.status);
    }
    // Expired
    memoryCache.delete(cacheKey);
  }

  // 2. In-flight request deduplication:
  // If the exact same request is already executing over the network, await the same Promise!
  if (inFlightRequests.has(cacheKey)) {
    const activePromise = inFlightRequests.get(cacheKey);
    const result = await activePromise;
    return result.clone();
  }

  // 3. Initiate fetch and store promise in inFlightRequests
  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, options);

      // Only cache successful 2xx responses
      if (res.ok) {
        const text = await res.text();
        let parsedData;
        try {
          parsedData = JSON.parse(text);
        } catch {
          parsedData = text;
        }

        memoryCache.set(cacheKey, {
          data: parsedData,
          status: res.status,
          timestamp: Date.now(),
          ttl: ttlMs,
        });

        return new CachedResponse(parsedData, res.status);
      }

      // If non-2xx, return standard cloned response
      return res;
    } catch (err) {
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  const response = await fetchPromise;
  return response.clone();
}

/**
 * Invalidate cached entries matching a key substring or regex pattern
 *
 * @param {string|RegExp|string[]} pattern - Substrings or regex to match against cache keys
 */
export function invalidateCache(pattern) {
  if (!pattern) {
    memoryCache.clear();
    return;
  }

  const patterns = Array.isArray(pattern) ? pattern : [pattern];

  for (const key of memoryCache.keys()) {
    const shouldDelete = patterns.some((p) => {
      if (p instanceof RegExp) return p.test(key);
      return key.includes(p);
    });

    if (shouldDelete) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Clear all cached API entries
 */
export function clearAllApiCache() {
  memoryCache.clear();
  inFlightRequests.clear();
}
