import { Injectable } from '@angular/core';
import { Habit } from './models';
import { todayKey } from './date-utils';

/**
 * Lightweight client-side reminder scheduler.
 * Uses the browser Notification API. Because this is a PWA, reminders fire
 * while the app (or its tab) is open. We avoid duplicate notifications per
 * habit per day using localStorage bookkeeping.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private habits: Habit[] = [];

  get permission(): NotificationPermission {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  }

  get supported(): boolean {
    return typeof Notification !== 'undefined';
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.supported) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }

  /** Provide the current habit list; the scheduler reads from this. */
  setHabits(habits: Habit[]): void {
    this.habits = habits;
  }

  start(): void {
    if (this.timer || !this.supported) return;
    // Check every 30 seconds whether any reminder is due.
    this.timer = setInterval(() => this.check(), 30_000);
    this.check();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private check(): void {
    if (this.permission !== 'granted') return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const current = `${hh}:${mm}`;
    const day = todayKey();

    for (const habit of this.habits) {
      if (!habit.reminderEnabled || !habit.reminderTime) continue;
      if (habit.reminderTime !== current) continue;

      const flagKey = `anchor.reminded.${habit.id}.${day}`;
      if (localStorage.getItem(flagKey)) continue;

      localStorage.setItem(flagKey, '1');
      this.fire(habit);
    }
  }

  private fire(habit: Habit): void {
    try {
      const body = habit.targetQuantity
        ? `Time to ${habit.name} — aim for ${habit.targetQuantity}${habit.unit ? ' ' + habit.unit : ''}.`
        : `Time to ${habit.name}. Keep your streak anchored.`;
      const n = new Notification(`${habit.icon ?? '⚓'} ${habit.name}`, {
        body,
        tag: `anchor-${habit.id}`,
      });
      n.onclick = () => window.focus();
    } catch {
      /* ignore notification errors */
    }
  }
}
