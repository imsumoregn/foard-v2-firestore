'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DraggableTaskCardProps {
  task: Task;
}

export function DraggableTaskCard({ task }: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="bg-muted/50 cursor-grab">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <p className="font-medium">{task.title}</p>
            <Badge variant="secondary">{task.tag}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
