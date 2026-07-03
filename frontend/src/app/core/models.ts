export interface User {
  id: string;
  username: string;
  email: string;
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
