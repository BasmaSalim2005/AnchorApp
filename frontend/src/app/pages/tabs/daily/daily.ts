import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HabitService } from '../../../core/habit.service';
import { LogService } from '../../../core/log.service';
import { UiService } from '../../../core/ui.service';
import { Habit, HabitLog } from '../../../core/models';
import { todayKey, fromKey, MONTH_NAMES } from '../../../core/date-utils';

@Component({
  selector: 'app-daily',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './daily.html',
  styleUrl: './daily.scss',
})
export class Daily implements OnInit {
  habits = inject(HabitService);
  private logs = inject(LogService);
  ui = inject(UiService);

  readonly today = todayKey();
  loaded = signal(false);

  // Map of habitId -> today's log (if any)
  private todayLogs = signal<Record<string, HabitLog>>({});

  readonly prettyDate = computed(() => {
    const d = fromKey(this.today);
    return `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  });

  readonly completedCount = computed(() => {
    const logs = this.todayLogs();
    return this.habits.habits().filter((h) => logs[h.id]?.completed).length;
  });

  readonly totalCount = computed(() => this.habits.habits().length);

  readonly progress = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.completedCount() / total) * 100);
  });

  async ngOnInit() {
    if (this.habits.habits().length === 0) await this.habits.load();
    await this.refreshLogs();
    this.loaded.set(true);
  }

  private async refreshLogs() {
    const logs = await this.logs.range(this.today, this.today);
    const map: Record<string, HabitLog> = {};
    for (const l of logs) map[l.habitId] = l;
    this.todayLogs.set(map);
  }

  isDone(h: Habit): boolean {
    return !!this.todayLogs()[h.id]?.completed;
  }

  quantityOf(h: Habit): number | null {
    return this.todayLogs()[h.id]?.quantity ?? null;
  }

  async toggle(h: Habit) {
    const completed = await this.logs.toggle(h.id, this.today);
    const map = { ...this.todayLogs() };
    if (completed) {
      map[h.id] = { id: 'temp', habitId: h.id, date: this.today, completed: true, quantity: map[h.id]?.quantity ?? null };
    } else {
      delete map[h.id];
    }
    this.todayLogs.set(map);
  }

  async setQuantity(h: Habit, value: string) {
    const qty = value === '' ? null : Number(value);
    if (qty !== null && (Number.isNaN(qty) || qty < 0)) return;
    // Mark complete if quantity reaches target (or any positive value when no target).
    const reaches = h.targetQuantity ? (qty ?? 0) >= h.targetQuantity : (qty ?? 0) > 0;
    const log = await this.logs.set(h.id, this.today, reaches, qty);
    const map = { ...this.todayLogs() };
    map[h.id] = log;
    this.todayLogs.set(map);
  }

  freqLabel(h: Habit): string {
    if (h.frequency === 'daily') return 'Daily';
    if (h.frequency === 'weekly') return `${h.targetCount}× / week`;
    return `${h.targetCount}× / month`;
  }
}
