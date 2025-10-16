'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { AuthUser, computeUserId, getStoredUser, storeUser, clearStoredUser, upsertUser } from '@/lib/auth';

const loginSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  luckyNumber: z.number().int().min(1).max(9999),
});

type AuthContextType = {
  user: AuthUser | null;
  login: (input: { name: string; luckyNumber: number }) => Promise<void>;
  logout: () => void;
  ensureAuth: () => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
  }, []);

  const login = useCallback(async (input: { name: string; luckyNumber: number }) => {
    const parsed = loginSchema.parse(input);
    const userId = await computeUserId(parsed.name, parsed.luckyNumber);
    const authUser: AuthUser = { userId, name: parsed.name, luckyNumber: parsed.luckyNumber };
    await upsertUser(authUser);
    storeUser(authUser);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    clearStoredUser();
    setUser(null);
  }, []);

  const ensureAuth = useCallback(async () => {
    if (user) return user;
    return new Promise<AuthUser>((resolve, reject) => {
      const check = () => {
        const s = getStoredUser();
        if (s) {
          setUser(s);
          resolve(s);
        }
      };
      const id = setInterval(check, 200);
      setTimeout(() => {
        clearInterval(id);
        const s = getStoredUser();
        if (s) {
          setUser(s);
          resolve(s);
        } else {
          reject(new Error('Not authenticated'));
        }
      }, 8000);
    });
  }, [user]);

  const value = useMemo(() => ({ user, login, logout, ensureAuth }), [user, login, logout, ensureAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}



