import type { Task } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DragOverlayTaskCardProps {
  task: Task;
}

export function DragOverlayTaskCard({ task }: DragOverlayTaskCardProps) {
  return (
    <Card className="bg-muted/70 shadow-xl opacity-90 scale-105 cursor-grabbing pointer-events-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <p className="font-medium break-all">{task.title}</p>
          <Badge variant="secondary" className="flex-shrink-0">{task.tag}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
