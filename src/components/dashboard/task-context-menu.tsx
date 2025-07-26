
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Copy, Trash2, CheckCircle } from 'lucide-react';
import type { Task } from '@/lib/types';

interface TaskContextMenuProps {
  task: Task;
  onDelete: (id: string) => void;
  onDone?: (id: string) => void;
  children: React.ReactNode;
}

export function TaskContextMenu({ task, onDelete, onDone, children }: TaskContextMenuProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(task.title);
  };

  const handleDelete = () => {
    onDelete(task.id);
  };

  const handleDone = () => {
    if (onDone) {
      onDone(task.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent>
        {onDone && (
          <DropdownMenuItem onClick={handleDone}>
            <CheckCircle className="mr-2 h-4 w-4" />
            <span>Done</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy Text</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
