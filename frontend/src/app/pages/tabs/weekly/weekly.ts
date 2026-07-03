import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HabitService } from '../../../core/habit.service';
import { LogService } from '../../../core/log.service';
import { UiService } from '../../../core/ui.service';
import { Habit } from '../../../core/models';
import {
  toKey,
  todayKey,
  startOfWeek,
  MONTH_NAMES,
  isoWeek,
} from '../../../core/date-utils';

interface DayCell {
  key: string;
  dayNum: number;
  weekday: string;
  isToday: boolean;
  isFuture: boolean;
}

@Component({
  selector: 'app-weekly',
  standalone: true,
  imports: [],
  templateUrl: './weekly.html',
  styleUrl: './weekly.scss',
})
export class Weekly implements OnInit {
  habits = inject(HabitService);
  private logs = inject(LogService);
  ui = inject(UiService);

  private weekStart = signal(startOfWeek(new Date()));
  private done = signal<Set<string>>(new Set()); // "habitId|dateKey"
  loaded = signal(false);

  readonly today = todayKey();

  readonly days = computed<DayCell[]>(() => {
    const start = this.weekStart();
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toKey(d);
      return {
        key,
        dayNum: d.getDate(),
        weekday: labels[i],
        isToday: key === this.today,
        isFuture: key > this.today,
      };
    });
  });

  readonly rangeLabel = computed(() => {
    const days = this.days();
    const first = days[0];
    const last = days[6];
    const start = new Date(this.weekStart());
    const end = new Date(this.weekStart());
    end.setDate(end.getDate() + 6);
    const wk = isoWeek(start);
    return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${first.dayNum} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${last.dayNum} · W${wk}`;
  });

  async ngOnInit() {
    if (this.habits.habits().length === 0) await this.habits.load();
    await this.loadWeek();
    this.loaded.set(true);
  }

  private async loadWeek() {
    const days = this.days();
    const logs = await this.logs.range(days[0].key, days[6].key);
    const set = new Set<string>();
    for (const l of logs) if (l.completed) set.add(`${l.habitId}|${l.date}`);
    this.done.set(set);
  }

  isDone(h: Habit, dayKey: string): boolean {
    return this.done().has(`${h.id}|${dayKey}`);
  }

  async toggle(h: Habit, cell: DayCell) {
    if (cell.isFuture) return;
    const completed = await this.logs.toggle(h.id, cell.key);
    const set = new Set(this.done());
    const id = `${h.id}|${cell.key}`;
    if (completed) set.add(id);
    else set.delete(id);
    this.done.set(set);
  }

  weekCount(h: Habit): number {
    return this.days().filter((d) => this.isDone(h, d.key)).length;
  }

  async prev() {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() - 7);
    this.weekStart.set(d);
    await this.loadWeek();
  }

  async next() {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 7);
    this.weekStart.set(d);
    await this.loadWeek();
  }

  async thisWeek() {
    this.weekStart.set(startOfWeek(new Date()));
    await this.loadWeek();
  }
}
