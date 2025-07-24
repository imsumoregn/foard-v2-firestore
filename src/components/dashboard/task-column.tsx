'use client';

import type { Task, TaskCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface TaskColumnProps {
  category: TaskCategory;
  tasks: Task[];
}

export function TaskColumn({ category, tasks }: TaskColumnProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{category}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{task.title}</p>
                    <Badge variant="secondary">{task.tag}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
             {tasks.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
