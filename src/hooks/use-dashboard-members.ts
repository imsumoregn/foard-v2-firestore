/**
 * Custom hook for managing dashboard members with progressive user name loading
 * Implements lazy loading pattern for optimal UX and performance
 */

import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firestoreCache, cacheKeys } from '@/lib/firestore-cache';
import { getUsersByIds, type User } from '@/lib/user-service';

interface DashboardMember {
  dashboardId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: any; // Firestore Timestamp
}

interface MemberWithUser extends DashboardMember {
  user?: User;
}

interface UseDashboardMembersResult {
  members: MemberWithUser[];
  loading: boolean;
  error: Error | null;
  /** Refetch members data */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching dashboard members with progressive user name loading
 * 
 * Progressive loading pattern:
 * 1. Immediately show members with userIds (fast)
 * 2. Fetch and display user names in background (non-blocking)
 * 
 * This eliminates the blocking behavior where the entire page waits
 * for user names to load before displaying any content.
 */
export function useDashboardMembers(dashboardId: string | null | undefined): UseDashboardMembersResult {
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchMembers = async () => {
    if (!dashboardId || !isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cacheKey = cacheKeys.dashboardMembers(dashboardId);
      const cachedMembers = firestoreCache.get<DashboardMember[]>(cacheKey);
      
      let membersData: DashboardMember[];

      if (cachedMembers) {
        membersData = cachedMembers;
      } else {
        // Fetch member documents
        const membersQuery = query(
          collection(db, 'dashboardMembers'),
          where('dashboardId', '==', dashboardId)
        );
        
        const membersSnapshot = await getDocs(membersQuery);
        membersData = membersSnapshot.docs.map(doc => ({
          ...doc.data(),
        })) as DashboardMember[];

        // Cache member data with shorter TTL since members can change
        firestoreCache.set(cacheKey, membersData, 30 * 1000); // 30 seconds
      }

      if (!isMountedRef.current) return;

      // Immediately show members with just userIds (progressive loading step 1)
      const membersWithUserIds: MemberWithUser[] = membersData.map(member => ({
        ...member,
        user: { userId: member.userId },
      }));
      setMembers(membersWithUserIds);
      setLoading(false);

      // Fetch user names in background (progressive loading step 2)
      const userIds = membersData.map(m => m.userId);
      const users = await getUsersByIds(userIds);

      if (!isMountedRef.current) return;

      // Update members with resolved user names
      const membersWithUsers: MemberWithUser[] = membersData.map(member => {
        const user = users.find(u => u.userId === member.userId);
        return {
          ...member,
          user: user || { userId: member.userId },
        };
      });

      setMembers(membersWithUsers);
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch dashboard members:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch members'));
        setLoading(false);
      }
    }
  };

  const refetch = async () => {
    if (dashboardId) {
      firestoreCache.invalidate(cacheKeys.dashboardMembers(dashboardId));
      await fetchMembers();
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [dashboardId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    members,
    loading,
    error,
    refetch,
  };
}

