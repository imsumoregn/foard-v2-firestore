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
import { useState } from 'react';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['Now', 'Day', 'Week', 'Month']),
});

const categories: TaskCategory[] = ['Now', 'Day', 'Week', 'Month'];

export default function DashboardPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', mockTasks);
  const [isDialogOpen, setDialogOpen] = useState(false);

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

  const categorizedTasks = categories.reduce(
    (acc, category) => {
      acc[category] = tasks.filter((task) => task.category === category);
      return acc;
    },
    {} as Record<TaskCategory, Task[]>
  );

  return (
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
          <TaskColumn key={category} category={category} tasks={categorizedTasks[category]} />
        ))}
      </div>
      <div className="mt-6">
        <InspirationCard />
      </div>
    </div>
  );
}
