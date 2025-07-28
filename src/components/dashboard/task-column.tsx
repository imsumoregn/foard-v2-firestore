'use client';

import type { Task, TaskCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTaskCard } from './draggable-task-card';

interface TaskColumnProps {
  category: TaskCategory;
  tasks: Task[];
  onDeleteTask?: (id: string) => void;
  onDoneTask?: (id: string) => void;
}

export function TaskColumn({ category, tasks, onDeleteTask, onDoneTask }: TaskColumnProps) {
    const { setNodeRef } = useDroppable({
        id: category,
    });
    
  return (
    <Card ref={setNodeRef} className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{category}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-4 p-6 pt-0">
            {tasks.map((task) => (
              <DraggableTaskCard 
                key={task.id} 
                task={task} 
                onDelete={(id) => onDeleteTask && onDeleteTask(id)}
                onDone={(id) => onDoneTask && onDoneTask(id)}
              />
            ))}
            {tasks.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-sm text-muted-foreground">Drop tasks here</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
