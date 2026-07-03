import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { HabitService } from '../../core/habit.service';
import { UiService } from '../../core/ui.service';
import { NotificationService } from '../../core/notification.service';
import { AnchorLogo } from '../../shared/anchor-logo';
import { HabitForm } from '../../shared/habit-form/habit-form';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AnchorLogo, HabitForm],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  auth = inject(AuthService);
  habits = inject(HabitService);
  ui = inject(UiService);
  notify = inject(NotificationService);
  private router = inject(Router);

  menuOpen = signal(false);
  notifState = signal<NotificationPermission>('default');

  constructor() {
    // Keep the reminder scheduler in sync with the latest habits.
    effect(() => {
      this.notify.setHabits(this.habits.habits());
    });
  }

  async ngOnInit() {
    await this.habits.load();
    if (this.notify.supported) {
      this.notifState.set(this.notify.permission);
      if (this.notify.permission === 'granted') this.notify.start();
    }
  }

  async enableReminders() {
    const result = await this.notify.requestPermission();
    this.notifState.set(result);
    if (result === 'granted') this.notify.start();
  }

  async logout() {
    this.menuOpen.set(false);
    this.notify.stop();
    await this.auth.logout();
    this.router.navigateByUrl('/welcome');
  }
}
