
export interface Message {
  role: 'user' | 'model';
  content: string;
}

export type StickerSize = '1K' | '2K' | '4K';

export interface StickerResult {
  url: string;
  prompt?: string;
}

export enum AppTab {
  CREATE = 'CREATE',
  CHAT = 'CHAT'
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: any;
  updatedAt: any;
  assignee?: string;
  order: number;
}
