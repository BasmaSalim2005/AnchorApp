import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminUser } from './models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/admin`;
  private opts = { withCredentials: true } as const;

  async users(): Promise<AdminUser[]> {
    const res = await firstValueFrom(
      this.http.get<{ users: AdminUser[] }>(`${this.base}/users`, this.opts)
    );
    return res.users;
  }

  async setRole(id: string, role: 'user' | 'admin'): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${this.base}/users/${id}/role`, { role }, this.opts)
    );
  }

  async deleteUser(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/users/${id}`, this.opts));
  }

  async shares(): Promise<any[]> {
    const res = await firstValueFrom(
      this.http.get<{ shares: any[] }>(`${this.base}/shares`, this.opts)
    );
    return res.shares;
  }

  async linkShare(ownerUsername: string, viewerUsername: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.base}/shares`, { ownerUsername, viewerUsername }, this.opts)
    );
  }

  async removeShare(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/shares/${id}`, this.opts));
  }
}
