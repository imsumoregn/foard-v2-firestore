'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createInvite } from '@/lib/invite';
import { useAuth } from '@/hooks/use-auth';

export function ShareButton({ dashboardId }: { dashboardId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const onShare = async () => {
    if (!user) {
      toast({ title: 'Please login first' });
      return;
    }
    setLoading(true);
    try {
      const { token } = await createInvite(dashboardId, user.userId);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/collab/${dashboardId}?invite=${token}`;
      await navigator.clipboard.writeText(link);
      toast({ title: 'Invite link copied', description: 'Share it with your collaborator.' });
    } catch (e: any) {
      toast({ title: 'Could not create invite', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onShare} disabled={loading}>{loading ? 'Sharing…' : 'Share'}</Button>
  );
}



