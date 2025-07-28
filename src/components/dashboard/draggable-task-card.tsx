'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskContextMenu } from './task-context-menu';
import React, { useRef } from 'react';

interface DraggableTaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onDone?: (id: string) => void;
}

export function DraggableTaskCard({ task, onDelete, onDone }: DraggableTaskCardProps) {
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

  // Ref for imperative menu control
  const menuRef = useRef<{ openMenu: (event?: { x: number; y: number }) => void }>(null);
  let longPressTimer: NodeJS.Timeout | null = null;

  // Right-click (desktop)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (menuRef.current) {
      menuRef.current.openMenu({ x: e.clientX, y: e.clientY });
    }
  };

  // Long-press (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer = setTimeout(() => {
      const touch = e.touches[0];
      if (menuRef.current) {
        menuRef.current.openMenu({ x: touch.clientX, y: touch.clientY });
      }
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  // Prevent menu from opening on normal click
  const handleClick = (e: React.MouseEvent) => {
    // Do nothing
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      style={{ width: '100%' }}
    >
      <TaskContextMenu ref={menuRef} task={task} onDelete={onDelete} onDone={onDone}>
        <Card ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-muted/50 cursor-grab touch-none">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium break-all">{task.title}</p>
              <Badge variant="secondary" className="flex-shrink-0">{task.tag}</Badge>
            </div>
          </CardContent>
        </Card>
      </TaskContextMenu>
    </div>
  );
}
