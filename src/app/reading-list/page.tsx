'use client';

import { useState } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { mockReadingList } from '@/lib/mock-data';
import type { ReadingListItem, ReadingStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Loader2, BookOpen } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Badge } from '@/components/ui/badge';
import { useIsClient } from '@/hooks/use-is-client';
import { summarizeBook } from '@/ai/flows/summarize-book-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const readingItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
});

const statuses: ReadingStatus[] = ['To Read', 'Reading', 'Completed'];

export default function ReadingListPage() {
  const [readingList, setReadingList] = useLocalStorage<ReadingListItem[]>('readingList', mockReadingList);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSummarizing, setSummarizing] = useState(false);
  const isClient = useIsClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof readingItemSchema>>({
    resolver: zodResolver(readingItemSchema),
    defaultValues: { title: '', author: '' },
  });

  const handleAddItem = async (data: z.infer<typeof readingItemSchema>) => {
    setSummarizing(true);
    try {
      const { summary } = await summarizeBook(data);
      const newItem: ReadingListItem = {
        id: new Date().toISOString(),
        title: data.title,
        author: data.author,
        status: 'To Read',
        summary: summary,
      };
      setReadingList([newItem, ...readingList]);
      reset();
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to summarize book:", error);
      // Handle error, maybe show a toast message
    } finally {
      setSummarizing(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setReadingList(readingList.filter((item) => item.id !== id));
  };
  
  const handleStatusChange = (id: string, status: ReadingStatus) => {
    setReadingList(readingList.map(item => item.id === id ? {...item, status} : item));
  };
  
  const getStatusBadgeVariant = (status: ReadingStatus) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Reading': return 'secondary';
      case 'To Read': return 'outline';
      default: return 'outline';
    }
  };
  
  if (!isClient) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reading List</h1>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add to Reading List</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(handleAddItem)} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register('title')} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div>
                <Label htmlFor="author">Author / Source</Label>
                <Input id="author" {...register('author')} />
                {errors.author && <p className="text-sm text-destructive">{errors.author.message}</p>}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost" disabled={isSummarizing}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSummarizing}>
                  {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {readingList.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{item.author}</p>
            </CardHeader>
            <CardContent className="flex-1">
               <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                {item.summary && (
                  <Accordion type="single" collapsible className="w-full mt-4">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2 text-sm">
                          <BookOpen className="h-4 w-4" />
                          Show Summary
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">{item.summary}</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
               <Select value={item.status} onValueChange={(value) => handleStatusChange(item.id, value as ReadingStatus)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Update status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="destructive" size="icon" onClick={() => handleDeleteItem(item.id)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      {readingList.length === 0 && (
        <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed">
          <p className="text-lg font-medium text-muted-foreground">Your reading list is empty.</p>
          <p className="text-sm text-muted-foreground">Click "Add Item" to add a book or article.</p>
        </div>
      )}
    </div>
  );
}
