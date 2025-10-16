'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, writeBatch, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task, TaskCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useIsClient } from '@/hooks/use-is-client';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { DragOverlayTaskCard } from '@/components/dashboard/drag-overlay-task-card';
import { TaskColumn } from '@/components/dashboard/task-column';
import { TaskColumnSkeleton } from '@/components/dashboard/task-column-skeleton';
import { useAuth } from '@/hooks/use-auth';
import { acceptInviteToken } from '@/lib/invite';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareButton } from '@/components/share-button';
import { Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const taskSchema = z.object({
  titles: z.string().min(1, 'At least one title is required'),
  category: z.enum(['Now', 'Day', 'Week', 'Month']),
});

const categories: TaskCategory[] = ['Now', 'Day', 'Week', 'Month'];

export default function DashboardCollabPage() {
  const params = useParams<{ dashboardId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const dashboardId = params.dashboardId;
  const inviteToken = search.get('invite');

  const { user, ensureAuth } = useAuth();
  const isClient = useIsClient();

  const [dashboardName, setDashboardName] = useState<string>('');
  const [members, setMembers] = useState<Array<{ userId: string; name?: string }>>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [isMember, setIsMember] = useState<boolean>(false);
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const { toast } = useToast();

  const { control, handleSubmit, register, reset, trigger } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { titles: '', category: 'Now' as TaskCategory },
  });

  useEffect(() => {
    if (!isClient) return;
    (async () => {
      try {
        const u = await ensureAuth().catch(() => null);
        if (!u) return;

        // load dashboard name
        const dRef = doc(db, 'dashboards', dashboardId);
        const dSnap = await getDoc(dRef);
        setDashboardName(dSnap.exists() ? ((dSnap.data() as any).name || 'Untitled') : 'Unknown');

        // membership
        const memberId = `${dashboardId}_${u.userId}`;
        const mSnap = await getDoc(doc(db, 'dashboardMembers', memberId));
        const isMem = mSnap.exists();
        setIsMember(isMem);
        if (!isMem) {
          setLoading(false);
          if (inviteToken) setShowInvitePrompt(true);
          return;
        }

        // subscribe tasks only for members
        const qy = query(collection(db, 'dashboards', dashboardId, 'tasks'), orderBy('order', 'asc'));
        const unsub = onSnapshot(qy, (qs) => {
          const list: Task[] = [];
          qs.forEach((docx) => list.push({ id: docx.id, ...(docx.data() as any) }));
          setTasks(list);
          setLoading(false);
        });
        unsubscribeRef.current = unsub;

        // members details
        const mq = query(collection(db, 'dashboardMembers'), where('dashboardId', '==', dashboardId));
        const mqs = await getDocs(mq);
        const basic = mqs.docs.map(d => ({ userId: (d.data() as any).userId as string }));
        // resolve names
        const withNames = await Promise.all(basic.map(async m => {
          try { const us = await getDoc(doc(db, 'users', m.userId)); return { userId: m.userId, name: us.exists() ? (us.data() as any).name : undefined }; } catch { return m; }
        }));
        setMembers(withNames);
      } catch {
        setLoading(false);
      }
    })();
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [dashboardId, isClient, ensureAuth, inviteToken]);

  const onSubmit = async (data: z.infer<typeof taskSchema>) => {
    const titles = data.titles.split('\n').filter(t => t.trim() !== '');
    if (titles.length === 0) return;

    await runTransaction(db, async (transaction) => {
      const coll = collection(db, 'dashboards', dashboardId, 'tasks');
      const qs = await getDocs(query(coll));
      const current = qs.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as Task).filter(t => t.status !== 'done');
      let maxOrder = current.length ? Math.max(...current.map(t => t.order)) : -1;
      const categoryTasks = current.filter(t => t.category === data.category);
      titles.forEach((title, index) => {
        const ref = doc(coll);
        const newOrder = maxOrder + 1 + index;
        const newTag = `${data.category.charAt(0)}${categoryTasks.length + index + 1}`;
        transaction.set(ref, { title: title.trim(), category: data.category, tag: newTag, order: newOrder, status: 'active', createdBy: user?.userId });
      });
    });

    reset();
    setDialogOpen(false);
  };

  const handleMarkAsDone = async (taskId: string) => {
    const taskRef = doc(db, 'dashboards', dashboardId, 'tasks', taskId);
    await updateDoc(taskRef, { status: 'done', completedAt: new Date().toISOString() });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'dashboards', dashboardId, 'tasks', taskId));
  };

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);

  const categorizedTasks = useMemo(() => {
    const sortedTasks = [...activeTasks].sort((a, b) => a.order - b.order);
    return categories.reduce((acc, category) => {
      acc[category] = sortedTasks.filter(t => t.category === category);
      return acc;
    }, {} as Record<TaskCategory, Task[]>);
  }, [activeTasks]);

  const groupedArchivedTasks = useMemo(() => {
    const sortedArchived = [...archivedTasks].sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    return sortedArchived.reduce((acc, t) => {
      if (t.completedAt) {
        const date = format(new Date(t.completedAt), 'PPP');
        if (!acc[date]) acc[date] = [];
        acc[date].push(t);
      }
      return acc;
    }, {} as Record<string, Task[]>);
  }, [archivedTasks]);

  const handleDragStart = (event: any) => setActiveId(event.active.id as string);

  const persistTaskChanges = async (updated: Task[]) => {
    const batch = writeBatch(db);
    categories.forEach(category => {
      const categoryTasks = updated.filter(t => t.category === category).sort((a, b) => a.order - b.order);
      categoryTasks.forEach((task, index) => {
        const docRef = doc(db, 'dashboards', dashboardId, 'tasks', task.id);
        const newTag = `${category.charAt(0)}${index + 1}`;
        batch.update(docRef, { order: index, category: task.category, tag: newTag });
      });
    });
    await batch.commit();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;
    const overCategory = categories.find(c => c === over.id || categorizedTasks[c].some(t => t.id === overId));
    const fromCategory = activeTask.category;
    if (overCategory && fromCategory !== overCategory) {
      const fromTasks = categorizedTasks[fromCategory].filter(t => t.id !== activeId);
      let toTasks = [...categorizedTasks[overCategory]];
      let overIndex = toTasks.findIndex(t => t.id === overId);
      if (overIndex === -1) overIndex = toTasks.length;
      const movedTask = { ...activeTask, category: overCategory };
      toTasks.splice(overIndex, 0, movedTask);
      const updatedFrom = fromTasks.map((t, idx) => ({ ...t, order: idx }));
      const updatedTo = toTasks.map((t, idx) => ({ ...t, order: idx }));
      const unaffected = tasks.filter(t => t.category !== fromCategory && t.category !== overCategory);
      const newTasks = [...unaffected, ...updatedFrom, ...updatedTo];
      setTasks(newTasks);
      await persistTaskChanges(newTasks);
    } else if (overCategory && fromCategory === overCategory) {
      const category = fromCategory;
      const categoryTasks = [...categorizedTasks[category]];
      const activeIndex = categoryTasks.findIndex(t => t.id === activeId);
      let overIndex = categoryTasks.findIndex(t => t.id === overId);
      if (overIndex === -1) overIndex = categoryTasks.length;
      if (activeIndex === -1 || activeIndex === overIndex) return;
      const newCategoryTasks = arrayMove(categoryTasks, activeIndex, overIndex);
      const otherTasks = tasks.filter(t => t.category !== category);
      const updatedCategoryTasks = newCategoryTasks.map((t, idx) => ({ ...t, order: idx }));
      const newTasks = [...otherTasks, ...updatedCategoryTasks];
      setTasks(newTasks);
      await persistTaskChanges(newTasks);
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      const isValid = await trigger();
      if (isValid) handleSubmit(onSubmit)();
    }
  };

  const acceptInvite = async () => {
    if (!inviteToken) return;
    const u = await ensureAuth().catch(() => null);
    if (!u) return;
    const res = await acceptInviteToken(inviteToken, u.userId);
    if (res) {
      setShowInvitePrompt(false);
      setIsMember(true);
      toast({ title: 'Invitation accepted', description: 'You can now collaborate on this dashboard.' });
      // re-trigger subscription by reloading effect dependencies
      setLoading(true);
      // force refresh members
      const mq = query(collection(db, 'dashboardMembers'), where('dashboardId', '==', dashboardId));
      const mqs = await getDocs(mq);
      const basic = mqs.docs.map(d => ({ userId: (d.data() as any).userId as string }));
      const withNames = await Promise.all(basic.map(async m => {
        try { const us = await getDoc(doc(db, 'users', m.userId)); return { userId: m.userId, name: us.exists() ? (us.data() as any).name : undefined }; } catch { return m; }
      }));
      setMembers(withNames);
      // subscribe tasks now
      if (unsubscribeRef.current) unsubscribeRef.current();
      const qy = query(collection(db, 'dashboards', dashboardId, 'tasks'), orderBy('order', 'asc'));
      unsubscribeRef.current = onSnapshot(qy, (qs) => {
        const list: Task[] = [];
        qs.forEach((docx) => list.push({ id: docx.id, ...(docx.data() as any) }));
        setTasks(list);
        setLoading(false);
      });
    }
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex h-full flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Collab</h1>
          <Button disabled>Add Task</Button>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
          {categories.map((category) => (
            <TaskColumnSkeleton key={category} category={category} />
          ))}
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{dashboardName}</h1>
            <p className="text-sm text-muted-foreground">You don’t have access to this dashboard.</p>
          </div>
          <ShareButton dashboardId={dashboardId} />
        </div>
        {/* Invite prompt handled below */}
        <Dialog open={showInvitePrompt} onOpenChange={setShowInvitePrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept invitation?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">You have been invited to collaborate on {dashboardName}.</p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={acceptInvite}>Accept</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{dashboardName}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Collaborators</span>
            <div className="flex -space-x-2">
              {members.map((m) => {
                const initials = (m.name || m.userId).split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <Avatar key={m.userId} className="h-7 w-7 ring-2 ring-background">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton dashboardId={dashboardId} />
          <Button onClick={() => setDialogOpen(true)}>Add Task</Button>
        </div>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={categories} strategy={verticalListSortingStrategy}>
          <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
            {categories.map((category) => (
              <TaskColumn key={category} category={category} tasks={categorizedTasks[category]} onDeleteTask={handleDeleteTask} onDoneTask={handleMarkAsDone} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeId ? (() => { const task = tasks.find(t => t.id === activeId); return task ? <DragOverlayTaskCard task={task} /> : null; })() : null}
        </DragOverlay>
      </DndContext>

      <div className="flex items-center justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a new task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-4">
              <div>
                <Label htmlFor="titles">Titles (one per line)</Label>
                <Textarea id="titles" {...register('titles')} rows={5} placeholder="Task 1\nTask 2\nTask 3" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Controller name="category" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Tasks</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {archivedTasks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Archive className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Archive</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(groupedArchivedTasks).map(([date, tasks]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold mb-2">{date}</h3>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {tasks.map(task => (
                      <p key={task.id} className="text-sm text-muted-foreground line-through">{task.title}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showInvitePrompt} onOpenChange={setShowInvitePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept invitation?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">You have been invited to collaborate on {dashboardName}.</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={acceptInvite}>Accept</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


