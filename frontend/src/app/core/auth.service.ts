import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/auth`;

  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  /** Called once at startup to restore an existing session. */
  async loadSession(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: User }>(`${this.base}/me`, { withCredentials: true })
      );
      this.user.set(res.user);
    } catch {
      this.user.set(null);
    }
  }

  async login(username: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ user: User }>(
        `${this.base}/login`,
        { username, password },
        { withCredentials: true }
      )
    );
    this.user.set(res.user);
  }

  async register(username: string, email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ user: User }>(
        `${this.base}/register`,
        { username, email, password },
        { withCredentials: true }
      )
    );
    this.user.set(res.user);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.base}/logout`, {}, { withCredentials: true })
      );
    } finally {
      this.user.set(null);
    }
  }
}
