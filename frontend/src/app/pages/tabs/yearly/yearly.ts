import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HabitService } from '../../../core/habit.service';
import { LogService } from '../../../core/log.service';
import { UiService } from '../../../core/ui.service';
import { Habit } from '../../../core/models';
import { toKey, todayKey, startOfWeek, MONTH_NAMES } from '../../../core/date-utils';

interface DayCell {
  key: string;
  inYear: boolean;
  isToday: boolean;
  isFuture: boolean;
}

@Component({
  selector: 'app-yearly',
  standalone: true,
  imports: [],
  templateUrl: './yearly.html',
  styleUrl: './yearly.scss',
})
export class Yearly implements OnInit {
  habits = inject(HabitService);
  private logs = inject(LogService);
  ui = inject(UiService);

  readonly today = todayKey();
  private yearSig = signal(new Date().getFullYear());
  private done = signal<Set<string>>(new Set());
  loaded = signal(false);

  readonly year = computed(() => this.yearSig());

  // Weeks as columns; each column has 7 day cells (Mon..Sun).
  readonly weeks = computed<DayCell[][]>(() => {
    const y = this.year();
    const first = new Date(y, 0, 1);
    const last = new Date(y, 11, 31);
    const cursor = startOfWeek(first);
    const weeks: DayCell[][] = [];
    while (cursor <= last) {
      const col: DayCell[] = [];
      for (let i = 0; i < 7; i++) {
        const key = toKey(cursor);
        col.push({
          key,
          inYear: cursor.getFullYear() === y,
          isToday: key === this.today,
          isFuture: key > this.today,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(col);
    }
    return weeks;
  });

  // Month labels aligned to the week column where each month starts.
  readonly monthLabels = computed<{ col: number; name: string }[]>(() => {
    const labels: { col: number; name: string }[] = [];
    const weeks = this.weeks();
    let lastMonth = -1;
    weeks.forEach((col, idx) => {
      const firstInYear = col.find((c) => c.inYear);
      if (!firstInYear) return;
      const m = Number(firstInYear.key.slice(5, 7)) - 1;
      if (m !== lastMonth) {
        labels.push({ col: idx, name: MONTH_NAMES[m].slice(0, 3) });
        lastMonth = m;
      }
    });
    return labels;
  });

  async ngOnInit() {
    if (this.habits.habits().length === 0) await this.habits.load();
    await this.loadYear();
    this.loaded.set(true);
  }

  private async loadYear() {
    const logs = await this.logs.year(this.year());
    const set = new Set<string>();
    for (const l of logs) if (l.completed) set.add(`${l.habitId}|${l.date}`);
    this.done.set(set);
  }

  isDone(h: Habit, key: string): boolean {
    return this.done().has(`${h.id}|${key}`);
  }

  yearCount(h: Habit): number {
    let c = 0;
    const prefix = `${h.id}|`;
    for (const id of this.done()) if (id.startsWith(prefix)) c++;
    return c;
  }

  async toggle(h: Habit, cell: DayCell) {
    if (!cell.inYear || cell.isFuture) return;
    const completed = await this.logs.toggle(h.id, cell.key);
    const set = new Set(this.done());
    const id = `${h.id}|${cell.key}`;
    if (completed) set.add(id);
    else set.delete(id);
    this.done.set(set);
  }

  async prev() {
    this.yearSig.set(this.year() - 1);
    await this.loadYear();
  }

  async next() {
    this.yearSig.set(this.year() + 1);
    await this.loadYear();
  }
}
