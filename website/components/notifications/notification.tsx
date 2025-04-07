export interface Notification {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string
  endTime: string; // ISO string
  createdAt: string; // ISO string
  published: boolean;
  category: 'general' | 'event' | 'chapter';
  private: boolean;
  userids?: string[];
}