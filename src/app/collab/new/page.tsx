'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function NewCollabPage() {
  const [name, setName] = useState('');
  const { ensureAuth } = useAuth();
  const router = useRouter();

  const onCreate = async () => {
    const u = await ensureAuth().catch(() => null);
    if (!u) return;
    const ref = await addDoc(collection(db, 'dashboards'), { name: name || 'Untitled', ownerId: u.userId, createdAt: serverTimestamp() });
    await setDoc(doc(db, 'dashboardMembers', `${ref.id}_${u.userId}`), { dashboardId: ref.id, userId: u.userId, role: 'owner', joinedAt: serverTimestamp() });
    router.push(`/collab/${ref.id}`);
  };

  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Dashboard name</Label>
        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., F1" />
      </div>
      <Button onClick={onCreate}>Create</Button>
    </div>
  );
}



