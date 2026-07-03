import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Habit, HabitInput } from './models';

@Injectable({ providedIn: 'root' })
export class HabitService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/habits`;
  private opts = { withCredentials: true } as const;

  readonly habits = signal<Habit[]>([]);
  readonly loading = signal(false);

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ habits: Habit[] }>(this.base, this.opts)
      );
      this.habits.set(res.habits);
    } finally {
      this.loading.set(false);
    }
  }

  async create(input: HabitInput): Promise<Habit> {
    const res = await firstValueFrom(
      this.http.post<{ habit: Habit }>(this.base, input, this.opts)
    );
    this.habits.update((list) => [...list, res.habit]);
    return res.habit;
  }

  async update(id: string, input: Partial<HabitInput>): Promise<Habit> {
    const res = await firstValueFrom(
      this.http.put<{ habit: Habit }>(`${this.base}/${id}`, input, this.opts)
    );
    this.habits.update((list) => list.map((h) => (h.id === id ? res.habit : h)));
    return res.habit;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/${id}`, this.opts));
    this.habits.update((list) => list.filter((h) => h.id !== id));
  }
}
