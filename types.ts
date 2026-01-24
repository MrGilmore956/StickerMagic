
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
