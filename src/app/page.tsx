'use client';

import { TaskColumn } from '@/components/dashboard/task-column';
import { InspirationCard } from '@/components/dashboard/inspiration-card';
import type { Task, TaskCategory } from '@/lib/types';
import { mockTasks } from '@/lib/mock-data';
import useLocalStorage from '@/hooks/use-local-storage';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useState, useMemo } from 'react';
import { useIsClient } from '@/hooks/use-is-client';
import { DndContext, DragEndEvent, useDroppable, useDraggable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { DraggableTaskCard } from '@/components/dashboard/draggable-task-card';


const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['Now', 'Day', 'Week', 'Month']),
});

const categories: TaskCategory[] = ['Now', 'Day', 'Week', 'Month'];

export default function DashboardPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', mockTasks);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const isClient = useIsClient();

  const { control, handleSubmit, register, reset, watch } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      category: 'Now' as TaskCategory,
    },
  });

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    const categorizedTasks = tasks.filter(task => task.category === data.category);
    const newTag = `${data.category.charAt(0)}${categorizedTasks.length + 1}`;
    
    const newTask: Task = {
      id: new Date().toISOString(),
      title: data.title,
      category: data.category as TaskCategory,
      tag: newTag,
    };
    setTasks([...tasks, newTask]);
    reset();
    setDialogOpen(false);
  };

  const categorizedTasks = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category] = tasks.filter((task) => task.category === category);
        return acc;
      },
      {} as Record<TaskCategory, Task[]>
    );
  }, [tasks]);
  
  const handleDragEnd = (event: DragEndEvent) => {
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
      // Task moved to a new column
      const newTasks = tasks.map(t => {
        if (t.id === activeId) {
          return { ...t, category: overCategory };
        }
        return t;
      }).map((t, index, array) => {
        const categoryTasks = array.filter(task => task.category === t.category);
        const taskIndex = categoryTasks.findIndex(task => task.id === t.id);
        const newTag = `${t.category.charAt(0)}${taskIndex + 1}`;
        if(t.tag !== newTag) {
          return {...t, tag: newTag};
        }
        return t;
      });
      setTasks(newTasks);

    } else {
        // Task reordered within the same column
        const activeCategory = activeTask.category;
        const activeIndex = categorizedTasks[activeCategory].findIndex(t => t.id === activeId);
        const overTask = tasks.find(t => t.id === overId);
        if(!overTask || overTask.category !== activeCategory) return;
        const overIndex = categorizedTasks[activeCategory].findIndex(t => t.id === overId);

        if (activeIndex !== overIndex) {
            const newCategoryTasks = arrayMove(categorizedTasks[activeCategory], activeIndex, overIndex);
            const otherTasks = tasks.filter(t => t.category !== activeCategory);
            const reorderedTasks = [...otherTasks, ...newCategoryTasks].map((t, index, array) => {
              if(t.category === activeCategory) {
                  const categoryTasks = newCategoryTasks;
                  const taskIndex = categoryTasks.findIndex(task => task.id === t.id);
                  const newTag = `${t.category.charAt(0)}${taskIndex + 1}`;
                  if(t.tag !== newTag) {
                    return {...t, tag: newTag};
                  }
              }
              return t;
            });
            setTasks(reorderedTasks);
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
            <h1 className="text-3xl font-bold">Dashboard</h1>
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
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" {...register('title')} />
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
                    <Button type="submit">Add Task</Button>
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
