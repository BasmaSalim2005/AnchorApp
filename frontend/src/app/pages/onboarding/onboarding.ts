import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AnchorLogo } from '../../shared/anchor-logo';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule, AnchorLogo],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class Onboarding {
  private auth = inject(AuthService);
  private router = inject(Router);

  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);

  username = '';
  email = '';
  password = '';

  switchMode(mode: 'login' | 'register') {
    this.mode.set(mode);
    this.error.set(null);
  }

  private validate(): string | null {
    if (this.mode() === 'register') {
      if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(this.username.trim())) {
        return 'Username must be 3–50 characters (letters, numbers, . _ -).';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
        return 'Please enter a valid email address.';
      }
    } else if (!this.username.trim()) {
      return 'Please enter your username.';
    }
    if (this.password.length < 8 || !/[A-Za-z]/.test(this.password) || !/[0-9]/.test(this.password)) {
      return 'Password must be at least 8 characters and include a letter and a number.';
    }
    return null;
  }

  async submit() {
    this.error.set(null);
    const issue = this.validate();
    if (issue) {
      this.error.set(issue);
      return;
    }

    this.loading.set(true);
    try {
      if (this.mode() === 'register') {
        await this.auth.register(this.username.trim(), this.email.trim(), this.password);
      } else {
        await this.auth.login(this.username.trim(), this.password);
      }
      this.router.navigateByUrl('/app/daily');
    } catch (err: any) {
      this.error.set(err?.error?.error ?? 'Something went wrong. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
