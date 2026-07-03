import { Injectable, signal } from '@angular/core';
import { Habit } from './models';

@Injectable({ providedIn: 'root' })
export class UiService {
  readonly formOpen = signal(false);
  readonly editing = signal<Habit | null>(null);

  openCreate() {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  openEdit(habit: Habit) {
    this.editing.set(habit);
    this.formOpen.set(true);
  }

  close() {
    this.formOpen.set(false);
    this.editing.set(null);
  }
}
