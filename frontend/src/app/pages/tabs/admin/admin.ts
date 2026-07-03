import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/admin.service';
import { AuthService } from '../../../core/auth.service';
import { AdminUser } from '../../../core/models';
import { PersonView } from '../../../shared/person-view/person-view';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, DatePipe, PersonView],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  private admin = inject(AdminService);
  auth = inject(AuthService);

  users = signal<AdminUser[]>([]);
  shares = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  selected = signal<AdminUser | null>(null);

  ownerU = '';
  viewerU = '';
  linkBusy = signal(false);
  linkError = signal<string | null>(null);

  async ngOnInit() {
    await this.refresh();
    this.loading.set(false);
  }

  private async refresh() {
    try {
      const [users, shares] = await Promise.all([this.admin.users(), this.admin.shares()]);
      this.users.set(users);
      this.shares.set(shares);
    } catch (err: any) {
      this.error.set(err?.error?.error ?? 'Could not load admin data.');
    }
  }

  get me(): string | undefined {
    return this.auth.user()?.id;
  }

  async toggleRole(u: AdminUser) {
    const next = u.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Make ${u.username} ${next === 'admin' ? 'an admin' : 'a regular user'}?`)) return;
    try {
      await this.admin.setRole(u.id, next);
      await this.refresh();
    } catch (err: any) {
      alert(err?.error?.error ?? 'Could not change role.');
    }
  }

  async removeUser(u: AdminUser) {
    if (!confirm(`Delete ${u.username} and ALL their habits and history? This cannot be undone.`)) return;
    try {
      await this.admin.deleteUser(u.id);
      if (this.selected()?.id === u.id) this.selected.set(null);
      await this.refresh();
    } catch (err: any) {
      alert(err?.error?.error ?? 'Could not delete user.');
    }
  }

  async link() {
    this.linkError.set(null);
    if (!this.ownerU.trim() || !this.viewerU.trim()) {
      this.linkError.set('Enter both usernames.');
      return;
    }
    this.linkBusy.set(true);
    try {
      await this.admin.linkShare(this.ownerU.trim(), this.viewerU.trim());
      this.ownerU = '';
      this.viewerU = '';
      await this.refresh();
    } catch (err: any) {
      this.linkError.set(err?.error?.error ?? 'Could not link accounts.');
    } finally {
      this.linkBusy.set(false);
    }
  }

  async unlink(id: string) {
    await this.admin.removeShare(id);
    await this.refresh();
  }

  view(u: AdminUser) {
    this.selected.set(u);
  }

  back() {
    this.selected.set(null);
  }
}
