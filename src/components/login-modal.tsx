'use client';

import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  luckyNumber: z.string().regex(/^[0-9]+$/, 'Enter numbers only').transform(v => Number(v)).pipe(z.number().int().min(1).max(9999)),
});

export function LoginModal({ forceOpen }: { forceOpen?: boolean }) {
  const { user, login } = useAuth();
  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [lucky, setLucky] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOpen(forceOpen ? true : !user);
  }, [user, forceOpen]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ name, luckyNumber: lucky });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Invalid input');
      return;
    }
    setLoading(true);
    try {
      await login({ name: parsed.data.name, luckyNumber: parsed.data.luckyNumber });
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (user) setOpen(next); }}>
      <DialogContent className="backdrop-blur-md bg-background/70 border border-border sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Welcome</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lucky">Lucky number (1–9999)</Label>
            <Input id="lucky" inputMode="numeric" value={lucky} onChange={e => setLucky(e.target.value)} placeholder="1234" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Continue'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}



