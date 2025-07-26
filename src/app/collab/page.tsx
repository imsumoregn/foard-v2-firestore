
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
import { collection, addDoc, query, onSnapshot, doc, writeBatch, where, getDocs, orderBy, runTransaction } from 'firebase/firestore';


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

    await runTransaction(db, async (transaction) => {
        const collabTasksRef = collection(db, 'collab-tasks');
        const q = query(collabTasksRef);
        const snapshot = await getDocs(q);
        const currentTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        
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
            });
        });
    });

    reset();
    setDialogOpen(false);
  };
  
  const categorizedTasks = useMemo(() => {
    const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
    return categories.reduce(
      (acc, category) => {
        acc[category] = sortedTasks.filter((task) => task.category === category);
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

    setTasks((prevTasks) => {
        const oldIndex = prevTasks.findIndex((t) => t.id === activeId);
        const overTask = prevTasks.find((t) => t.id === overId);
        const activeTask = prevTasks[oldIndex];
        
        if (!activeTask) return prevTasks;

        const overContainer = over.data.current?.sortable?.containerId;
        const newCategory = (overContainer || overTask?.category) as TaskCategory | undefined;

        if (newCategory && activeTask.category !== newCategory) {
            // Move to a different column
            const newTasks = [...prevTasks];
            newTasks[oldIndex] = { ...activeTask, category: newCategory };
            
            const categoryTasks = newTasks.filter(t => t.category === newCategory);
            const overInNewCategoryIndex = categoryTasks.findIndex(t => t.id === overId);
            const targetIndexInAll = newTasks.findIndex(t => t.id === (overInNewCategoryIndex !== -1 ? overId : categoryTasks[categoryTasks.length-1]?.id)) + 1;
           
            const movedTask = newTasks.splice(oldIndex, 1)[0];
            newTasks.splice(targetIndexInAll, 0, movedTask);

            return newTasks;
        } else {
             // Move within the same column
            const overIndex = prevTasks.findIndex((t) => t.id === overId);
            if (oldIndex !== overIndex) {
                return arrayMove(prevTasks, oldIndex, overIndex);
            }
        }
        return prevTasks;
    });

    // After optimistic update, persist changes to Firestore
    await runTransaction(db, async (transaction) => {
        const finalTasks = await new Promise<Task[]>((resolve) => {
            setTasks(currentTasks => {
                resolve(currentTasks);
                return currentTasks;
            });
        });

        finalTasks.forEach((task, index) => {
            const docRef = doc(db, 'collab-tasks', task.id);
            const categoryTasks = finalTasks.filter(t => t.category === task.category);
            const taskIndexInCategory = categoryTasks.findIndex(t => t.id === task.id);
            const newTag = `${task.category.charAt(0)}${taskIndexInCategory + 1}`;
            
            transaction.update(docRef, { order: index, category: task.category, tag: newTag });
        });
    });
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
                    tasks={categorizedTasks[category] ?? []} />
            ))}
        </div>
        <div className="xl:col-span-4">
            <InspirationCard />
        </div>
        </div>
    </DndContext>
  );
}
