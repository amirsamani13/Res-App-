export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  description: string;
  type: 'special' | 'music' | 'food' | 'private' | 'booking';
  posterUrl?: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  phone?: string;
  email?: string;
  size: number;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
}

export enum ViewMode {
  CALENDAR = 'CALENDAR',
  RESERVATIONS = 'RESERVATIONS',
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  WEBSITE_DEMO = 'WEBSITE_DEMO'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface ToolCallResponse {
  result: string;
}