/**
 * User service for efficient user data fetching with caching
 * Implements progressive loading pattern for user names
 */

import { db } from '@/lib/firebase';
import { collection, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { firestoreCache, cacheKeys } from './firestore-cache';

export interface User {
  userId: string;
  name?: string;
}

/**
 * Fetch multiple users by their IDs in a single batch operation
 * Uses Promise.all for parallel fetching and caches results
 * 
 * This replaces the inefficient pattern of fetching users one by one
 * in a loop, which was causing sequential network requests.
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  if (userIds.length === 0) return [];

  // Check cache first for each user
  const cachedUsers: User[] = [];
  const uncachedUserIds: string[] = [];

  for (const userId of userIds) {
    const cached = firestoreCache.get<User>(cacheKeys.user(userId));
    if (cached) {
      cachedUsers.push(cached);
    } else {
      uncachedUserIds.push(userId);
    }
  }

  // If all users are cached, return them
  if (uncachedUserIds.length === 0) {
    return cachedUsers;
  }

  // Fetch uncached users in parallel
  // Using Promise.all instead of sequential getDoc calls
  const userPromises = uncachedUserIds.map(async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const user: User = {
        userId,
        name: userDoc.exists() ? (userDoc.data() as any).name : undefined,
      };
      
      // Cache the result with a longer TTL since user data changes infrequently
      firestoreCache.set(cacheKeys.user(userId), user, 15 * 60 * 1000); // 15 minutes
      
      return user;
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      // Return user with just the ID if fetch fails
      return { userId };
    }
  });

  const fetchedUsers = await Promise.all(userPromises);
  
  // Combine cached and fetched users
  return [...cachedUsers, ...fetchedUsers];
}

/**
 * Get a single user by ID with caching
 */
export async function getUserById(userId: string): Promise<User | null> {
  const users = await getUsersByIds([userId]);
  return users[0] || null;
}

/**
 * Progressive loading helper for components
 * Returns users with IDs immediately, then updates with names as they load
 */
export async function* loadUsersProgressively(userIds: string[]): AsyncGenerator<User[], void, unknown> {
  // First yield: users with just IDs (immediate)
  const initialUsers: User[] = userIds.map(userId => ({ userId }));
  yield initialUsers;

  // Then fetch and yield users with names
  const usersWithNames = await getUsersByIds(userIds);
  yield usersWithNames;
}

/**
 * Clear user cache for a specific user (useful when user data is updated)
 */
export function invalidateUserCache(userId: string): void {
  firestoreCache.invalidate(cacheKeys.user(userId));
}

