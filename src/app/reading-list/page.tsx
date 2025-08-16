'use client';

import { useState } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { mockReadingList } from '@/lib/mock-data';
import type { ReadingListItem, ReadingStatus, ReadingSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Loader2, BookOpen, Clock, Play, Square, History } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Badge } from '@/components/ui/badge';
import { useIsClient } from '@/hooks/use-is-client';
import { summarizeBook } from '@/ai/flows/summarize-book-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';

const readingItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
});

const sessionSchema = z.object({
  chaptersRead: z.string().min(1, 'Chapters read is required'),
  thoughts: z.string().optional(),
});

const statuses: ReadingStatus[] = ['To Read', 'Reading', 'Completed'];

export default function ReadingListPage() {
  const [readingList, setReadingList] = useLocalStorage<ReadingListItem[]>('readingList', mockReadingList);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSummarizing, setSummarizing] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Record<string, { startTime: Date; sessionId: string }>>({});
  const [isSessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<{ bookId: string; startTime: Date; sessionId: string } | null>(null);
  const [selectedBookForSessions, setSelectedBookForSessions] = useState<ReadingListItem | null>(null);
  const isClient = useIsClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof readingItemSchema>>({
    resolver: zodResolver(readingItemSchema),
    defaultValues: { title: '', author: '' },
  });

  const { register: registerSession, handleSubmit: handleSubmitSessionForm, reset: resetSession, formState: { errors: sessionErrors } } = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { chaptersRead: '', thoughts: '' },
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
        sessions: [],
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
    // Remove active session if book is deleted
    if (activeSessions[id]) {
      const newActiveSessions = { ...activeSessions };
      delete newActiveSessions[id];
      setActiveSessions(newActiveSessions);
    }
  };
  
  const handleStatusChange = (id: string, status: ReadingStatus) => {
    setReadingList(readingList.map(item => item.id === id ? {...item, status} : item));
  };

  const handleStartSession = (bookId: string) => {
    const startTime = new Date();
    const sessionId = new Date().toISOString();
    setActiveSessions(prev => ({
      ...prev,
      [bookId]: { startTime, sessionId }
    }));
  };

  const handleEndSession = (bookId: string) => {
    const session = activeSessions[bookId];
    if (session) {
      setCurrentSession({
        bookId,
        startTime: session.startTime,
        sessionId: session.sessionId
      });
      setSessionDialogOpen(true);
    }
  };

  const handleSubmitSession = (data: z.infer<typeof sessionSchema>) => {
    if (!currentSession) return;

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - currentSession.startTime.getTime()) / (1000 * 60)); // in minutes

    const newSession: ReadingSession = {
      id: currentSession.sessionId,
      bookId: currentSession.bookId,
      startTime: currentSession.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      chaptersRead: data.chaptersRead,
      thoughts: data.thoughts,
      createdAt: new Date().toISOString(),
    };

    // Add session to the book
    setReadingList(prev => prev.map(item => 
      item.id === currentSession.bookId 
        ? { ...item, sessions: [...(item.sessions || []), newSession] }
        : item
    ));

    // Remove from active sessions
    const newActiveSessions = { ...activeSessions };
    delete newActiveSessions[currentSession.bookId];
    setActiveSessions(newActiveSessions);

    // Reset and close dialog
    setCurrentSession(null);
    setSessionDialogOpen(false);
    resetSession();
  };

  const openSessionsView = (book: ReadingListItem) => {
    setSelectedBookForSessions(book);
  };

  const closeSessionsView = () => {
    setSelectedBookForSessions(null);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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

  if (selectedBookForSessions) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={closeSessionsView}>
              ← Back to Reading List
            </Button>
            <h1 className="text-3xl font-bold">Reading Sessions</h1>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">{selectedBookForSessions.title}</h2>
            <p className="text-muted-foreground">by {selectedBookForSessions.author}</p>
          </div>
          
          {selectedBookForSessions.sessions && selectedBookForSessions.sessions.length > 0 ? (
            <div className="space-y-4">
              {selectedBookForSessions.sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          {formatDateTime(session.startTime)} - {formatDateTime(session.endTime)}
                        </span>
                      </div>
                      <Badge variant="secondary">{formatDuration(session.duration)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Chapters Read:</Label>
                      <p className="text-sm">{session.chaptersRead}</p>
                    </div>
                    {session.thoughts && (
                      <div>
                        <Label className="text-sm font-medium">Thoughts:</Label>
                        <p className="text-sm text-muted-foreground">{session.thoughts}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No reading sessions yet. Start your first session!</p>
            </div>
          )}
        </div>
      </div>
    );
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
        {readingList.map((item) => {
          const isSessionActive = !!activeSessions[item.id];
          const sessionCount = item.sessions?.length || 0;
          
          return (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.author}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                  {sessionCount > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <History className="h-3 w-3" />
                      {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                {item.summary && (
                  <Accordion type="single" collapsible className="w-full">
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

                <div className="flex gap-2">
                  {!isSessionActive ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleStartSession(item.id)}
                      className="flex-1"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Session
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleEndSession(item.id)}
                      className="flex-1"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      End Session
                    </Button>
                  )}
                  
                  {sessionCount > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openSessionsView(item)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
          );
        })}
      </div>

      {/* Session End Dialog */}
      <Dialog open={isSessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Reading Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitSessionForm(handleSubmitSession)} className="space-y-4">
            <div>
              <Label htmlFor="chaptersRead">Chapters Read *</Label>
              <Input 
                id="chaptersRead" 
                placeholder="e.g., Chapter 1-3, Pages 45-67"
                {...registerSession('chaptersRead')} 
              />
              {sessionErrors.chaptersRead && (
                <p className="text-sm text-destructive">{sessionErrors.chaptersRead.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="thoughts">Thoughts (Optional)</Label>
              <Textarea 
                id="thoughts" 
                placeholder="Any thoughts, notes, or reflections from this reading session..."
                {...registerSession('thoughts')} 
              />
            </div>
            {currentSession && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Started:</span>
                  <span>{currentSession.startTime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ended:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Duration:</span>
                  <span>{formatDuration(Math.round((new Date().getTime() - currentSession.startTime.getTime()) / (1000 * 60)))}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Session</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {readingList.length === 0 && (
        <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed">
          <p className="text-lg font-medium text-muted-foreground">Your reading list is empty.</p>
          <p className="text-sm text-muted-foreground">Click "Add Item" to add a book or article.</p>
        </div>
      )}
    </div>
  );
}
