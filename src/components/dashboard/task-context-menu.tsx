'use client';

import React, { useImperativeHandle, forwardRef, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

// Add imperative handle to control menu open state
export const TaskContextMenu = forwardRef(function TaskContextMenu(
  { task, onDelete, onDone, children }: TaskContextMenuProps,
  ref: React.Ref<{ openMenu: (event?: { x: number; y: number }) => void }>
) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    openMenu: (event) => {
      if (event) setMenuPosition(event);
      setOpen(true);
    },
  }));

  const handleCopy = () => {
    navigator.clipboard.writeText(task.title);
  };

  const handleDelete = () => {
    onDelete(task.id);
    setOpen(false);
    setMenuPosition(null);
  };

  const handleDone = () => {
    if (onDone) {
      onDone(task.id);
    }
    setOpen(false);
    setMenuPosition(null);
  };

  // When menu closes, reset position
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setMenuPosition(null);
  };

  // Positioning for context menu (Radix doesn't support absolute positioning out of the box, but we can use sideOffset as a workaround)
  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      {/* No DropdownMenuTrigger, children are just rendered */}
      {children}
      <DropdownMenuContent
        side={undefined}
        align={undefined}
        sideOffset={4}
        style={menuPosition ? { position: 'fixed', left: menuPosition.x, top: menuPosition.y, minWidth: 180 } : {}}
        onPointerDownOutside={() => setMenuPosition(null)}
      >
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
});
