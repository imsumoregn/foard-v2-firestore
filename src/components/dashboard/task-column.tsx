
'use client';

import type { Task, TaskCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTaskCard } from './draggable-task-card';

interface TaskColumnProps {
  category: TaskCategory;
  tasks: Task[];
  onDeleteTask?: (id: string) => void;
}

export function TaskColumn({ category, tasks, onDeleteTask }: TaskColumnProps) {
    const { setNodeRef } = useDroppable({
        id: category,
    });
    
  return (
    <SortableContext id={category} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <Card ref={setNodeRef} className="flex h-full flex-col overflow-hidden">
        <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
            <ScrollArea className="h-full pr-4">
            <div className="flex flex-col gap-4">
                {tasks.map((task) => (
                    <DraggableTaskCard 
                      key={task.id} 
                      task={task} 
                      onDelete={(id) => onDeleteTask && onDeleteTask(id)}
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
    </SortableContext>
  );
}
