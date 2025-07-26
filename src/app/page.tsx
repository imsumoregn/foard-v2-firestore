
'use client';

import { TaskColumn } from '@/components/dashboard/task-column';
import type { Task, TaskCategory } from '@/lib/types';
import { mockTasks } from '@/lib/mock-data';
import useLocalStorage from '@/hooks/use-local-storage';
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
import { useState, useMemo } from 'react';
import { useIsClient } from '@/hooks/use-is-client';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';


const taskSchema = z.object({
  titles: z.string().min(1, 'At least one title is required'),
  category: z.enum(['Now', 'Day', 'Week', 'Month']),
});

const categories: TaskCategory[] = ['Now', 'Day', 'Week', 'Month'];

export default function DashboardPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', mockTasks.filter(t => t.status !== 'done'));
  const [archivedTasks, setArchivedTasks] = useLocalStorage<Task[]>('archived-tasks', mockTasks.filter(t => t.status === 'done'));
  const [isDialogOpen, setDialogOpen] = useState(false);
  const isClient = useIsClient();

  const { control, handleSubmit, register, reset, trigger } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      titles: '',
      category: 'Now' as TaskCategory,
    },
  });

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    const titles = data.titles.split('\n').filter(title => title.trim() !== '');
    if (titles.length === 0) return;

    const newTasks: Task[] = titles.map((title, index) => {
        const categorizedTasks = tasks.filter(task => task.category === data.category);
        const newTag = `${data.category.charAt(0)}${categorizedTasks.length + index + 1}`;
        return {
            id: new Date().toISOString() + index,
            title: title.trim(),
            category: data.category as TaskCategory,
            tag: newTag,
            order: 0, 
            status: 'active'
        };
    });

    setTasks([...tasks, ...newTasks]);
    reset();
    setDialogOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
    setArchivedTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
  };
  
  const handleMarkAsDone = (taskId: string) => {
    const taskToArchive = tasks.find(task => task.id === taskId);
    if (taskToArchive) {
        const remainingTasks = tasks.filter(task => task.id !== taskId);
        setTasks(remainingTasks);
        setArchivedTasks([{ ...taskToArchive, status: 'done', completedAt: new Date().toISOString() }, ...archivedTasks]);
    }
  };

  const categorizedTasks = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category] = tasks.filter((task) => task.category === category && task.status !== 'done');
        return acc;
      },
      {} as Record<TaskCategory, Task[]>
    );
  }, [tasks]);
  
  const groupedArchivedTasks = useMemo(() => {
    return archivedTasks.reduce((acc, task) => {
      const date = format(new Date(task.completedAt!), 'PPP');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [archivedTasks]);
  
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

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      const isValid = await trigger();
      if (isValid) {
        handleSubmit(onSubmit)();
      }
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
        <DndContext onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-6">
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
            </div>
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
