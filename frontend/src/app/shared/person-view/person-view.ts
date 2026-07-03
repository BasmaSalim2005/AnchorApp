import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { ShareService } from '../../core/share.service';
import { ViewHabit, ViewLog } from '../../core/models';
import { toKey, todayKey, startOfWeek, MONTH_NAMES } from '../../core/date-utils';

interface DayCell {
  key: string;
  inYear: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-person-view',
  standalone: true,
  imports: [],
  templateUrl: './person-view.html',
  styleUrl: './person-view.scss',
})
export class PersonView implements OnInit {
  @Input({ required: true }) ownerId!: string;
  @Input() username = '';

  private shares = inject(ShareService);

  readonly today = todayKey();
  yearSig = signal(new Date().getFullYear());
  habits = signal<ViewHabit[]>([]);
  private done = signal<Set<string>>(new Set());
  loading = signal(true);
  error = signal<string | null>(null);

  readonly year = computed(() => this.yearSig());

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
        col.push({ key, inYear: cursor.getFullYear() === y, isToday: key === this.today });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(col);
    }
    return weeks;
  });

  readonly monthLabels = computed<{ col: number; name: string }[]>(() => {
    const labels: { col: number; name: string }[] = [];
    let lastMonth = -1;
    this.weeks().forEach((col, idx) => {
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
    await this.loadHabits();
    await this.loadYear();
    this.loading.set(false);
  }

  private async loadHabits() {
    try {
      this.habits.set(await this.shares.habits(this.ownerId));
    } catch (err: any) {
      this.error.set(err?.error?.error ?? 'Could not load habits.');
    }
  }

  private async loadYear() {
    try {
      const logs: ViewLog[] = await this.shares.year(this.ownerId, this.year());
      const set = new Set<string>();
      for (const l of logs) {
        if (l.completed) set.add(`${l.habitId}|${String(l.date).slice(0, 10)}`);
      }
      this.done.set(set);
    } catch (err: any) {
      this.error.set(err?.error?.error ?? 'Could not load schedule.');
    }
  }

  isDone(h: ViewHabit, key: string): boolean {
    return this.done().has(`${h.id}|${key}`);
  }

  yearCount(h: ViewHabit): number {
    let c = 0;
    const prefix = `${h.id}|`;
    for (const id of this.done()) if (id.startsWith(prefix)) c++;
    return c;
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
