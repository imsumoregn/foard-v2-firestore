
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, Trash2 } from 'lucide-react';
import type { Task } from '@/lib/types';

interface TaskContextMenuProps {
  task: Task;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}

export function TaskContextMenu({ task, onDelete, children }: TaskContextMenuProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(task.title);
  };

  const handleDelete = () => {
    onDelete(task.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy Text</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
