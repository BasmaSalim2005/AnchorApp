export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  habitCount: number;
  completionCount: number;
  lastActivity: string | null;
}

export interface ShareIn {
  id: string;
  ownerId: string;
  ownerUsername: string;
  habitCount: number;
  createdAt: string;
}

export interface ShareOut {
  id: string;
  viewer_id: string;
  viewer_username: string;
  created_at: string;
}

// A habit as returned by the read-only /view endpoints (no editing fields).
export interface ViewHabit {
  id: string;
  name: string;
  color: string;
  icon: string;
  frequency: Frequency;
  targetCount: number;
  unit: string | null;
  targetQuantity: number | null;
  createdAt: string;
}

export interface ViewLog {
  habitId: string;
  date: string;
  completed: boolean;
  quantity: number | null;
}

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  name: string;
  color: string;
  icon: string;
  frequency: Frequency;
  targetCount: number;
  unit: string | null;
  targetQuantity: number | null;
  reminderEnabled: boolean;
  reminderTime: string | null; // "HH:MM"
  archived: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // "YYYY-MM-DD"
  completed: boolean;
  quantity: number | null;
}

export type HabitInput = {
  name: string;
  color: string;
  icon: string;
  frequency: Frequency;
  targetCount: number;
  unit: string | null;
  targetQuantity: number | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
};
