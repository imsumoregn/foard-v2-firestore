
export type TaskCategory = 'Now' | 'Day' | 'Week' | 'Month';

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  tag: string;
  order: number;
  status?: 'active' | 'done';
  completedAt?: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

export type ReadingStatus = 'To Read' | 'Reading' | 'Completed';

export type ReadingListItem = {
  id: string;
  title:string;
  author: string;
  status: ReadingStatus;
  summary?: string;
};

export type Goal = {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
};
