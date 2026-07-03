import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { HabitLog } from './models';

@Injectable({ providedIn: 'root' })
export class LogService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/logs`;
  private opts = { withCredentials: true } as const;

  async range(from: string, to: string): Promise<HabitLog[]> {
    const res = await firstValueFrom(
      this.http.get<{ logs: HabitLog[] }>(`${this.base}?from=${from}&to=${to}`, this.opts)
    );
    return res.logs;
  }

  async year(year: number): Promise<HabitLog[]> {
    const res = await firstValueFrom(
      this.http.get<{ logs: HabitLog[] }>(`${this.base}/year/${year}`, this.opts)
    );
    return res.logs;
  }

  /** Toggle a day complete/incomplete. Returns the new completed state. */
  async toggle(habitId: string, date: string): Promise<boolean> {
    const res = await firstValueFrom(
      this.http.post<{ completed: boolean }>(
        `${this.base}/toggle`,
        { habitId, date },
        this.opts
      )
    );
    return res.completed;
  }

  /** Upsert a log with an explicit completed state and/or quantity. */
  async set(
    habitId: string,
    date: string,
    completed: boolean,
    quantity: number | null
  ): Promise<HabitLog> {
    const res = await firstValueFrom(
      this.http.post<{ log: HabitLog }>(
        this.base,
        { habitId, date, completed, quantity },
        this.opts
      )
    );
    return res.log;
  }

  async remove(habitId: string, date: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.base}?habitId=${habitId}&date=${date}`, this.opts)
    );
  }
}
