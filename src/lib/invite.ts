import { db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where, deleteDoc } from 'firebase/firestore';

export async function generateToken(bytes = 16): Promise<string> {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  // base64url
  const b64 = btoa(String.fromCharCode(...array));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function createInvite(dashboardId: string, createdBy: string, ttlHours = 72): Promise<{ token: string; inviteId: string; }> {
  const token = await generateToken();
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
  const ref = await addDoc(collection(db, 'dashboardInvites'), {
    dashboardId,
    createdBy,
    token,
    createdAt: serverTimestamp(),
    expiresAt,
  });
  return { token, inviteId: ref.id };
}

export async function resolveInvite(token: string): Promise<{ dashboardId: string; inviteDocId: string; } | null> {
  const q = query(collection(db, 'dashboardInvites'), where('token', '==', token));
  const snap = await getDocs(q);
  const docSnap = snap.docs[0];
  if (!docSnap) return null;
  const data = docSnap.data() as any;
  if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
    return null;
  }
  return { dashboardId: data.dashboardId, inviteDocId: docSnap.id };
}

export async function acceptInviteToken(token: string, userId: string): Promise<{ dashboardId: string } | null> {
  const resolved = await resolveInvite(token);
  if (!resolved) return null;
  const { dashboardId, inviteDocId } = resolved;
  const memberId = `${dashboardId}_${userId}`;
  await setDoc(doc(db, 'dashboardMembers', memberId), { dashboardId, userId, role: 'member', joinedAt: serverTimestamp() }, { merge: true });
  // optional: delete invite to prevent reuse
  try { await deleteDoc(doc(db, 'dashboardInvites', inviteDocId)); } catch {}
  return { dashboardId };
}



