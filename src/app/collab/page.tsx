
'use client';

import { TaskColumn } from '@/components/dashboard/task-column';
import { InspirationCard } from '@/components/dashboard/inspiration-card';
import type { Task, TaskCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
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
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, onSnapshot, doc, writeBatch, where, getDocs, orderBy } from 'firebase/firestore';


const taskSchema = z.object({
  titles: z.string().min(1, 'At least one title is required'),
  category: z.enum(['Now', 'Day', 'Week', 'Month']),
});

const categories: TaskCategory[] = ['Now', 'Day', 'Week', 'Month'];

export default function CollabPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const isClient = useIsClient();

  const { control, handleSubmit, register, reset } = useForm({
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
    });

    return () => unsubscribe();
  }, [isClient]);

  const onSubmit = async (data: z.infer<typeof taskSchema>) => {
    const titles = data.titles.split('\n').filter(title => title.trim() !== '');
    if (titles.length === 0) return;

    const categoryTasks = tasks.filter(task => task.category === data.category);
    const startingOrder = categoryTasks.length;

    const batch = writeBatch(db);
    titles.forEach((title, index) => {
      const newTaskRef = doc(collection(db, 'collab-tasks'));
      const newTag = `${data.category.charAt(0)}${startingOrder + index + 1}`;
      batch.set(newTaskRef, { 
        title: title.trim(),
        category: data.category,
        tag: newTag,
        order: tasks.length + index,
      });
    });

    await batch.commit();

    reset();
    setDialogOpen(false);
  };
  
  const categorizedTasks = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category] = tasks
          .filter((task) => task.category === category)
          .sort((a,b) => a.order - b.order);
        return acc;
      },
      {} as Record<TaskCategory, Task[]>
    );
  }, [tasks]);
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overCategory = categories.find(c => c === over.id || categorizedTasks[c].some(t => t.id === overId));
    
    const newTasks = [...tasks];
    const activeIndex = newTasks.findIndex(t => t.id === activeId);

    if (overCategory && activeTask.category !== overCategory) {
      // Task moved to a new column
      const targetCategoryTasks = categorizedTasks[overCategory];
      
      // Remove from old position
      newTasks.splice(activeIndex, 1);
      
      // Find new position
      const overTaskIndex = newTasks.findIndex(t => t.id === overId);
      const newIndex = overTaskIndex >= 0 ? 
        (newTasks[overTaskIndex].category === overCategory ? overTaskIndex : targetCategoryTasks.length) 
        : targetCategoryTasks.length;

      // Insert into new position with updated category
      const updatedTask = { ...activeTask, category: overCategory };
      newTasks.splice(newIndex, 0, updatedTask);
      
      setTasks(newTasks); // Optimistic update
      
      const batch = writeBatch(db);
      newTasks.forEach((t, index) => {
          const newTag = `${t.category.charAt(0)}${categorizedTasks[t.category].findIndex(task => task.id === t.id) + 1}`;
          batch.update(doc(db, 'collab-tasks', t.id), { order: index, category: t.category, tag: newTag });
      });
      await batch.commit();

    } else {
        // Task reordered within the same column
        const overTask = tasks.find(t => t.id === overId);
        if(!overTask || overTask.category !== activeTask.category) return;
        
        const overIndex = newTasks.findIndex(t => t.id === overId);

        if (activeIndex !== overIndex) {
            const reorderedTasks = arrayMove(newTasks, activeIndex, overIndex);
            setTasks(reorderedTasks); // Optimistic update

            const batch = writeBatch(db);
            reorderedTasks.forEach((t, index) => {
                 const categoryTasks = reorderedTasks.filter(task => task.category === t.category);
                 const taskIndex = categoryTasks.findIndex(task => task.id === t.id);
                 const newTag = `${t.category.charAt(0)}${taskIndex + 1}`;
                 batch.update(doc(db, 'collab-tasks', t.id), { order: index, tag: newTag });
            });
            await batch.commit();
        }
    }
  };


  if (!isClient) {
    return null;
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
                <TaskColumn 
                    key={category} 
                    category={category} 
                    tasks={categorizedTasks[category]} />
            ))}
        </div>
        <div className="xl:col-span-4">
            <InspirationCard />
        </div>
        </div>
    </DndContext>
  );
}

