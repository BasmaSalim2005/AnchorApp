import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ShareIn, ShareOut, ViewHabit, ViewLog } from './models';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private http = inject(HttpClient);
  private base = environment.apiBase;
  private opts = { withCredentials: true } as const;

  // --- Sharing management (owner side) ---
  async shareWith(viewerUsername: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.base}/shares`, { viewerUsername }, this.opts)
    );
  }

  async sharedOut(): Promise<ShareOut[]> {
    const res = await firstValueFrom(
      this.http.get<{ shares: ShareOut[] }>(`${this.base}/shares/out`, this.opts)
    );
    return res.shares;
  }

  async sharedIn(): Promise<ShareIn[]> {
    const res = await firstValueFrom(
      this.http.get<{ shares: ShareIn[] }>(`${this.base}/shares/in`, this.opts)
    );
    return res.shares;
  }

  async removeShare(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/shares/${id}`, this.opts));
  }

  // --- Read-only viewing of a user's data (admin or shared) ---
  async profile(ownerId: string): Promise<{ id: string; username: string; email: string; createdAt: string }> {
    const res = await firstValueFrom(
      this.http.get<{ user: any }>(`${this.base}/view/${ownerId}/profile`, this.opts)
    );
    return res.user;
  }

  async habits(ownerId: string): Promise<ViewHabit[]> {
    const res = await firstValueFrom(
      this.http.get<{ habits: ViewHabit[] }>(`${this.base}/view/${ownerId}/habits`, this.opts)
    );
    return res.habits;
  }

  async year(ownerId: string, year: number): Promise<ViewLog[]> {
    const res = await firstValueFrom(
      this.http.get<{ logs: ViewLog[] }>(`${this.base}/view/${ownerId}/logs/year/${year}`, this.opts)
    );
    return res.logs;
  }
}
