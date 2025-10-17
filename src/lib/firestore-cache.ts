/**
 * Simple in-memory cache for Firestore documents
 * Reduces redundant network requests by caching frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class FirestoreCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();

  /**
   * Get cached data if available and not expired
   * @param key - Cache key (typically document path)
   * @returns Cached data or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if cache entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   * Useful for invalidating all tasks in a dashboard
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Deduplicate simultaneous requests to the same resource
   * If a request is already in flight, return the existing promise
   * Otherwise, execute the fetcher and cache the result
   * 
   * This prevents multiple components from triggering the same Firestore read
   * when they mount simultaneously.
   */
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // Check if we have a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise;
    }

    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Create new pending request
    let resolvePromise: (value: T) => void;
    let rejectPromise: (error: any) => void;

    const promise = new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    this.pendingRequests.set(key, {
      promise,
      resolve: resolvePromise!,
      reject: rejectPromise!,
    });

    try {
      const result = await fetcher();
      this.set(key, result, ttlMs);
      
      // Resolve any waiting requests
      const pending = this.pendingRequests.get(key);
      if (pending) {
        pending.resolve(result);
      }
      
      return result;
    } catch (error) {
      // Reject any waiting requests
      const pending = this.pendingRequests.get(key);
      if (pending) {
        pending.reject(error);
      }
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        expiresIn: Math.max(0, entry.expiresAt - Date.now()),
      })),
    };
  }
}

// Export singleton instance
export const firestoreCache = new FirestoreCache();

// Export cache key generators for consistency
export const cacheKeys = {
  dashboard: (dashboardId: string) => `dashboard:${dashboardId}`,
  dashboardMember: (dashboardId: string, userId: string) => 
    `member:${dashboardId}:${userId}`,
  dashboardMembers: (dashboardId: string) => `members:${dashboardId}`,
  user: (userId: string) => `user:${userId}`,
  userDashboards: (userId: string) => `user-dashboards:${userId}`,
};


