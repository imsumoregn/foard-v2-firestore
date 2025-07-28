'use client';

import { TaskColumn } from '@/components/dashboard/task-column';
import { TaskColumnSkeleton } from '@/components/dashboard/task-column-skeleton';
import type { Task, TaskCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Archive } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useMemo, useEffect } from 'react';
import { useIsClient } from '@/hooks/use-is-client';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, onSnapshot, doc, writeBatch, where, getDocs, orderBy, runTransaction, deleteDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { DragOverlayTaskCard } from '@/components/dashboard/drag-overlay-task-card';


const taskSchema = z.object({
  titles: z.string().min(1, 'At least one title is required'),
  category: z.enum(['Now', 'Day', 'Week', 'Month']),
});

const categories: TaskCategory[] = ['Now', 'Day', 'Week', 'Month'];

export default function CollabPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isClient = useIsClient();

  const { control, handleSubmit, register, reset, trigger } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      titles: '',
      category: 'Now' as TaskCategory,
    },
  });

  useEffect(() => {
    if (!isClient) return;

    const q = query(collection(db, 'collab-tasks'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isClient]);

  const onSubmit = async (data: z.infer<typeof taskSchema>) => {
    const titles = data.titles.split('\n').filter(title => title.trim() !== '');
    if (titles.length === 0) return;

    await runTransaction(db, async (transaction) => {
      const collabTasksRef = collection(db, 'collab-tasks');
      const q = query(collabTasksRef);
      const snapshot = await getDocs(q);
      const currentTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)).filter(t => t.status !== 'done');

      let maxOrder = -1;
      if (currentTasks.length > 0) {
        maxOrder = Math.max(...currentTasks.map(t => t.order));
      }

      const categoryTasks = currentTasks.filter(task => task.category === data.category);

      titles.forEach((title, index) => {
        const newTaskRef = doc(collabTasksRef);
        const newOrder = maxOrder + 1 + index;
        const newTag = `${data.category.charAt(0)}${categoryTasks.length + index + 1}`;
        transaction.set(newTaskRef, {
          title: title.trim(),
          category: data.category,
          tag: newTag,
          order: newOrder,
          status: 'active'
        });
      });
    });

    reset();
    setDialogOpen(false);
  };

  const handleMarkAsDone = async (taskId: string) => {
    const taskRef = doc(db, 'collab-tasks', taskId);
    await updateDoc(taskRef, {
      status: 'done',
      completedAt: new Date().toISOString()
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'collab-tasks', taskId));
  };

  const activeTasks = useMemo(() => tasks.filter(task => task.status !== 'done'), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter(task => task.status === 'done'), [tasks]);

  const categorizedTasks = useMemo(() => {
    const sortedTasks = [...activeTasks].sort((a, b) => a.order - b.order);
    return categories.reduce(
      (acc, category) => {
        acc[category] = sortedTasks.filter((task) => task.category === category);
        return acc;
      },
      {} as Record<TaskCategory, Task[]>
    );
  }, [activeTasks]);

  const groupedArchivedTasks = useMemo(() => {
    const sortedArchived = [...archivedTasks].sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    return sortedArchived.reduce((acc, task) => {
      if (task.completedAt) {
        const date = format(new Date(task.completedAt), 'PPP');
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(task);
      }
      return acc;
    }, {} as Record<string, Task[]>);
  }, [archivedTasks]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  // Helper function to persist task changes to Firestore
  const persistTaskChanges = async (updatedTasks: Task[]) => {
    const batch = writeBatch(db);
    updatedTasks.forEach((task, index) => {
      const docRef = doc(db, 'collab-tasks', task.id);
      const categoryTasks = updatedTasks.filter(t => t.category === task.category);
      const taskIndexInCategory = categoryTasks.findIndex(t => t.id === task.id);
      const newTag = `${task.category.charAt(0)}${taskIndexInCategory + 1}`;

      batch.update(docRef, { order: index, category: task.category, tag: newTag });
    });
    await batch.commit();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overCategory = categories.find(c => c === over.id || categorizedTasks[c].some(t => t.id === overId));

    if (overCategory && activeTask.category !== overCategory) {
      // Move to different category
      const newTasks = tasks.map(t => {
        if (t.id === activeId) {
          return { ...t, category: overCategory };
        }
        return t;
      }).map((t, index, array) => {
        const categoryTasks = array.filter(task => task.category === t.category);
        const taskIndex = categoryTasks.findIndex(task => task.id === t.id);
        const newTag = `${t.category.charAt(0)}${taskIndex + 1}`;
        if (t.tag !== newTag) {
          return { ...t, tag: newTag };
        }
        return t;
      });

      setTasks(newTasks);
      await persistTaskChanges(newTasks);

    } else {
      // Move within same category
      const activeCategory = activeTask.category;
      const activeIndex = categorizedTasks[activeCategory].findIndex(t => t.id === activeId);
      const overTask = tasks.find(t => t.id === overId);
      if (!overTask || overTask.category !== activeCategory) return;
      const overIndex = categorizedTasks[activeCategory].findIndex(t => t.id === overId);

      if (activeIndex !== overIndex) {
        const newCategoryTasks = arrayMove(categorizedTasks[activeCategory], activeIndex, overIndex);
        const otherTasks = tasks.filter(t => t.category !== activeCategory);
        const reorderedTasks = [...otherTasks, ...newCategoryTasks].map((t, index, array) => {
          if (t.category === activeCategory) {
            const categoryTasks = newCategoryTasks;
            const taskIndex = categoryTasks.findIndex(task => task.id === t.id);
            const newTag = `${t.category.charAt(0)}${taskIndex + 1}`;
            if (t.tag !== newTag) {
              return { ...t, tag: newTag };
            }
          }
          return t;
        });

        setTasks(reorderedTasks);
        await persistTaskChanges(reorderedTasks);
      }
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      const isValid = await trigger();
      if (isValid) {
        handleSubmit(onSubmit)();
      }
    }
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex h-full flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Collab</h1>
          <Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Add Task</Button>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <TaskColumnSkeleton key={category} category={category} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-full flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Collab</h1>
            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a new task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-4">
                  <div>
                    <Label htmlFor="titles">Titles (one per line)</Label>
                    <Textarea id="titles" {...register('titles')} rows={5} placeholder="Task 1&#10;Task 2&#10;Task 3" />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
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

          <SortableContext
            items={categories}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <TaskColumn
                  key={category}
                  category={category}
                  tasks={categorizedTasks[category]}
                  onDeleteTask={handleDeleteTask}
                  onDoneTask={handleMarkAsDone}
                />
              ))}
            </div>
          </SortableContext>
        </div>
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeId ? (() => {
            const task = tasks.find(t => t.id === activeId);
            return task ? <DragOverlayTaskCard task={task} /> : null;
          })() : null}
        </DragOverlay>
      </DndContext>
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
    </div>
  );
}

