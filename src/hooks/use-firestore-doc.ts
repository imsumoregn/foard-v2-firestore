/**
 * Custom hook for fetching Firestore documents with caching
 * Provides automatic cleanup, error handling, and request deduplication
 */

import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firestoreCache, cacheKeys } from '@/lib/firestore-cache';

interface UseFirestoreDocOptions {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  ttlMs?: number;
  /** Whether to enable caching (default: true) */
  enableCache?: boolean;
}

interface UseFirestoreDocResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Manually refetch the document */
  refetch: () => Promise<void>;
  /** Clear the cache for this document */
  invalidate: () => void;
}

/**
 * Hook for fetching a single Firestore document with caching and deduplication
 * 
 * Key optimizations:
 * - Request deduplication prevents multiple components from triggering the same read
 * - Caching reduces redundant network requests
 * - Automatic cleanup prevents memory leaks
 */
export function useFirestoreDoc<T = DocumentData>(
  collectionPath: string,
  documentId: string | null | undefined,
  options: UseFirestoreDocOptions = {}
): UseFirestoreDocResult<T> {
  const { ttlMs = 5 * 60 * 1000, enableCache = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const docRef = documentId ? doc(db, collectionPath, documentId) : null;
  const cacheKey = docRef ? cacheKeys.dashboard(documentId!) : null;

  const fetchDoc = async () => {
    if (!docRef || !isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      // Check cache first if enabled
      if (enableCache && cacheKey) {
        const cached = firestoreCache.get<T>(cacheKey);
        if (cached !== undefined) {
          if (isMountedRef.current) {
            setData(cached);
            setLoading(false);
          }
          return;
        }
      }

      // Use cache deduplication to prevent multiple simultaneous requests
      const result = enableCache && cacheKey
        ? await firestoreCache.deduplicate(
            cacheKey,
            () => getDoc(docRef),
            ttlMs
          )
        : await getDoc(docRef);

      if (!isMountedRef.current) return;

      if (result.exists()) {
        const docData = { id: result.id, ...result.data() } as T;
        setData(docData);
        
        // Cache the result if enabled
        if (enableCache && cacheKey) {
          firestoreCache.set(cacheKey, docData, ttlMs);
        }
      } else {
        setData(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch document'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const refetch = async () => {
    if (cacheKey) {
      firestoreCache.invalidate(cacheKey);
    }
    await fetchDoc();
  };

  const invalidate = () => {
    if (cacheKey) {
      firestoreCache.invalidate(cacheKey);
    }
    setData(null);
  };

  useEffect(() => {
    fetchDoc();
  }, [collectionPath, documentId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
  };
}

