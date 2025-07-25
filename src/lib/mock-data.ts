import type { Task, Note, ReadingListItem, Goal } from '@/lib/types';

export const mockTasks: Task[] = [
  { id: '1', title: 'Finalize project proposal', category: 'Now', tag: 'N1' },
  { id: '2', title: 'Team meeting at 2 PM', category: 'Now', tag: 'N2' },
  { id: '3', title: 'Schedule dentist appointment', category: 'Day', tag: 'D1' },
  { id: '4', title: 'Weekly report', category: 'Week', tag: 'W1' },
  { id: '5', title: 'Plan Q3 marketing strategy', category: 'Month', tag: 'M1' },
  { id: '6', title: 'Buy groceries', category: 'Day', tag: 'D2' },
];

export const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Meeting Notes 2024-07-21',
    content: 'Discussed Q3 roadmap. Key takeaways: focus on user retention, explore new marketing channels. AIs assigned.',
    createdAt: '2024-07-21',
  },
  {
    id: '2',
    title: 'Brainstorming Ideas',
    content: 'New feature ideas: 1. Gamification of tasks. 2. Social sharing of goals. 3. Integration with calendars.',
    createdAt: '2024-07-20',
  },
];

export const mockReadingList: ReadingListItem[] = [
  { id: '1', title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt', status: 'Reading', summary: 'A classic guide to software development best practices, emphasizing a pragmatic approach to writing flexible, adaptable, and maintainable code.' },
  { id: '2', title: 'Atomic Habits', author: 'James Clear', status: 'To Read', summary: 'An easy and proven way to build good habits and break bad ones by focusing on small, incremental changes that compound over time.' },
  { id: '3', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', status: 'Completed', summary: 'A comprehensive guide to the principles and practicalities of building scalable and reliable data systems in the modern era.' },
];

export const mockGoals: Goal[] = [
    { id: '1', title: 'Read 12 books this year', currentValue: 7, targetValue: 12 },
    { id: '2', title: 'Run 100km this month', currentValue: 42, targetValue: 100 },
    { id: '3', title: 'Complete online course on Next.js', currentValue: 80, targetValue: 100 },
];
