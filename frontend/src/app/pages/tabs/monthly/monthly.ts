import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HabitService } from '../../../core/habit.service';
import { LogService } from '../../../core/log.service';
import { UiService } from '../../../core/ui.service';
import { Habit } from '../../../core/models';
import {
  toKey,
  todayKey,
  MONTH_NAMES,
  daysInMonth,
  mondayIndex,
} from '../../../core/date-utils';

interface Cell {
  key: string | null; // null = padding cell
  dayNum: number | null;
  isToday: boolean;
  isFuture: boolean;
}

@Component({
  selector: 'app-monthly',
  standalone: true,
  imports: [],
  templateUrl: './monthly.html',
  styleUrl: './monthly.scss',
})
export class Monthly implements OnInit {
  habits = inject(HabitService);
  private logs = inject(LogService);
  ui = inject(UiService);

  readonly today = todayKey();
  readonly weekdayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  private cursor = signal(new Date());
  private done = signal<Set<string>>(new Set());
  loaded = signal(false);

  readonly year = computed(() => this.cursor().getFullYear());
  readonly month = computed(() => this.cursor().getMonth());
  readonly monthLabel = computed(() => `${MONTH_NAMES[this.month()]} ${this.year()}`);

  readonly cells = computed<Cell[]>(() => {
    const y = this.year();
    const m = this.month();
    const total = daysInMonth(y, m);
    const lead = mondayIndex(new Date(y, m, 1));
    const cells: Cell[] = [];
    for (let i = 0; i < lead; i++) cells.push({ key: null, dayNum: null, isToday: false, isFuture: false });
    for (let d = 1; d <= total; d++) {
      const key = toKey(new Date(y, m, d));
      cells.push({ key, dayNum: d, isToday: key === this.today, isFuture: key > this.today });
    }
    return cells;
  });

  async ngOnInit() {
    if (this.habits.habits().length === 0) await this.habits.load();
    await this.loadMonth();
    this.loaded.set(true);
  }

  private async loadMonth() {
    const y = this.year();
    const m = this.month();
    const from = toKey(new Date(y, m, 1));
    const to = toKey(new Date(y, m, daysInMonth(y, m)));
    const logs = await this.logs.range(from, to);
    const set = new Set<string>();
    for (const l of logs) if (l.completed) set.add(`${l.habitId}|${l.date}`);
    this.done.set(set);
  }

  isDone(h: Habit, key: string | null): boolean {
    return key !== null && this.done().has(`${h.id}|${key}`);
  }

  monthCount(h: Habit): number {
    let c = 0;
    for (const cell of this.cells()) if (this.isDone(h, cell.key)) c++;
    return c;
  }

  async toggle(h: Habit, cell: Cell) {
    if (!cell.key || cell.isFuture) return;
    const completed = await this.logs.toggle(h.id, cell.key);
    const set = new Set(this.done());
    const id = `${h.id}|${cell.key}`;
    if (completed) set.add(id);
    else set.delete(id);
    this.done.set(set);
  }

  goalLabel(h: Habit): string {
    if (h.frequency === 'monthly') return `/ ${h.targetCount} this month`;
    if (h.frequency === 'weekly') return `(${h.targetCount}× / week)`;
    return 'this month';
  }

  async prev() {
    const d = new Date(this.cursor());
    d.setMonth(d.getMonth() - 1);
    this.cursor.set(d);
    await this.loadMonth();
  }

  async next() {
    const d = new Date(this.cursor());
    d.setMonth(d.getMonth() + 1);
    this.cursor.set(d);
    await this.loadMonth();
  }

  async thisMonth() {
    this.cursor.set(new Date());
    await this.loadMonth();
  }
}
