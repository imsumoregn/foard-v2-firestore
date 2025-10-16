import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export type AuthUser = {
  userId: string;
  name: string;
  luckyNumber: number;
};

const LOCAL_STORAGE_KEY = 'foard-auth-user';

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export async function computeUserId(name: string, luckyNumber: number): Promise<string> {
  const normalized = `${name.trim().toLowerCase()}:${luckyNumber}`;
  const enc = new TextEncoder();
  const data = enc.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash;
}

export async function upsertUser(user: AuthUser): Promise<void> {
  const userRef = doc(db, 'users', user.userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    await setDoc(userRef, { name: user.name, luckyNumber: user.luckyNumber, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(userRef, { name: user.name, luckyNumber: user.luckyNumber, createdAt: serverTimestamp() });
  }
}



