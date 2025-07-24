'use client';

import { useState } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { mockNotes } from '@/lib/mock-data';
import type { Note } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useIsClient } from '@/hooks/use-is-client';

const noteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

export default function NotesPage() {
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', mockNotes);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const isClient = useIsClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', content: '' },
  });

  const handleAddNote = (data: z.infer<typeof noteSchema>) => {
    const newNote: Note = {
      id: new Date().toISOString(),
      title: data.title,
      content: data.content,
      createdAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    reset();
    setDialogOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
  };
  
  if (!isClient) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new note</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddNote)} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register('title')} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" {...register('content')} rows={10} />
                {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit">Save Note</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <Card key={note.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{note.title}</CardTitle>
              <CardDescription>
                Created on {format(new Date(note.createdAt), 'PPP')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="line-clamp-4 text-sm text-muted-foreground">{note.content}</p>
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto"
                onClick={() => handleDeleteNote(note.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       {notes.length === 0 && (
          <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-lg font-medium text-muted-foreground">You have no notes yet.</p>
            <p className="text-sm text-muted-foreground">Click "New Note" to get started.</p>
          </div>
        )}
    </div>
  );
}
