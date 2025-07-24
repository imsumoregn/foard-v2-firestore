'use client';

import { useState } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { mockGoals } from '@/lib/mock-data';
import type { Goal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Target } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const goalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  targetValue: z.coerce.number().min(1, 'Target must be greater than 0'),
});

const updateGoalSchema = z.object({
  currentValue: z.coerce.number().min(0, 'Value must be non-negative'),
});

export default function GoalsPage() {
  const [goals, setGoals] = useLocalStorage<Goal[]>('goals', mockGoals);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const addForm = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
  });

  const updateForm = useForm<z.infer<typeof updateGoalSchema>>();

  const handleAddGoal = (data: z.infer<typeof goalSchema>) => {
    const newGoal: Goal = {
      id: new Date().toISOString(),
      title: data.title,
      currentValue: 0,
      targetValue: data.targetValue,
    };
    setGoals([newGoal, ...goals]);
    addForm.reset();
    setAddDialogOpen(false);
  };

  const handleUpdateGoal = (data: z.infer<typeof updateGoalSchema>) => {
    if (editingGoal) {
      if(data.currentValue > editingGoal.targetValue) {
        data.currentValue = editingGoal.targetValue;
      }
      setGoals(
        goals.map((g) => (g.id === editingGoal.id ? { ...g, currentValue: data.currentValue } : g))
      );
    }
    updateForm.reset();
    setEditingGoal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Goals</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> New Goal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Set a New Goal</DialogTitle></DialogHeader>
            <form onSubmit={addForm.handleSubmit(handleAddGoal)} className="space-y-4">
              <div>
                <Label htmlFor="title">Goal Title</Label>
                <Input id="title" {...addForm.register('title')} />
                {addForm.formState.errors.title && <p className="text-sm text-destructive">{addForm.formState.errors.title.message}</p>}
              </div>
              <div>
                <Label htmlFor="targetValue">Target Value</Label>
                <Input id="targetValue" type="number" {...addForm.register('targetValue')} />
                 {addForm.formState.errors.targetValue && <p className="text-sm text-destructive">{addForm.formState.errors.targetValue.message}</p>}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit">Set Goal</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = Math.round((goal.currentValue / goal.targetValue) * 100);
          return (
            <Card key={goal.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary"/>{goal.title}</CardTitle>
                <CardDescription>
                  {goal.currentValue} / {goal.targetValue}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progress} />
                <p className="mt-2 text-right text-sm font-medium">{progress}% complete</p>
              </CardContent>
              <CardFooter>
                 <Button variant="outline" size="sm" className="ml-auto" onClick={() => {
                   setEditingGoal(goal);
                   updateForm.setValue('currentValue', goal.currentValue);
                 }}>Update Progress</Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      {goals.length === 0 && (
        <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-lg font-medium text-muted-foreground">No goals set.</p>
            <p className="text-sm text-muted-foreground">Click "New Goal" to create one.</p>
        </div>
      )}

      {/* Update Progress Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(isOpen) => !isOpen && setEditingGoal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update: {editingGoal?.title}</DialogTitle></DialogHeader>
            <form onSubmit={updateForm.handleSubmit(handleUpdateGoal)} className="space-y-4">
              <div>
                <Label htmlFor="currentValue">Current Value</Label>
                <Input id="currentValue" type="number" {...updateForm.register('currentValue')} />
                {updateForm.formState.errors.currentValue && <p className="text-sm text-destructive">{updateForm.formState.errors.currentValue.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditingGoal(null)}>Cancel</Button>
                <Button type="submit">Update</Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
