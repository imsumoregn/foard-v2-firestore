/**
 * Custom hook for managing dashboard tasks with real-time updates
 * Combines Firestore real-time listeners with caching for optimal performance
 */

import { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firestoreCache } from '@/lib/firestore-cache';
import type { Task } from '@/lib/types';

interface UseDashboardTasksResult {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for subscribing to dashboard tasks with caching
 * 
 * Performance optimizations:
 * - Real-time listener provides instant updates across components
 * - Cache prevents refetching on component remount
 * - Automatic cleanup prevents memory leaks
 * - Single listener per dashboard (deduplication handled by Firestore)
 */
export function useDashboardTasks(dashboardId: string | null | undefined): UseDashboardTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!dashboardId || !isMountedRef.current) return;

    // Check cache first for immediate data display
    const cacheKey = `dashboard-tasks:${dashboardId}`;
    const cachedTasks = firestoreCache.get<Task[]>(cacheKey);
    if (cachedTasks) {
      setTasks(cachedTasks);
      setLoading(false);
    }

    // Set up real-time listener
    const tasksQuery = query(
      collection(db, 'dashboards', dashboardId, 'tasks'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (querySnapshot) => {
        if (!isMountedRef.current) return;

        const tasksList: Task[] = [];
        querySnapshot.forEach((doc) => {
          tasksList.push({ id: doc.id, ...doc.data() } as Task);
        });

        setTasks(tasksList);
        setLoading(false);
        setError(null);

        // Update cache with fresh data
        firestoreCache.set(cacheKey, tasksList, 2 * 60 * 1000); // 2 minutes cache
      },
      (err) => {
        if (isMountedRef.current) {
          console.error('Dashboard tasks listener error:', err);
          setError(err);
          setLoading(false);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [dashboardId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    tasks,
    loading,
    error,
  };
}

