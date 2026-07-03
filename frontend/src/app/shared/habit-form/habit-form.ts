import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiService } from '../../core/ui.service';
import { HabitService } from '../../core/habit.service';
import { Frequency, HabitInput } from '../../core/models';
import { COLOR_CHOICES, ICON_CHOICES, UNIT_SUGGESTIONS } from '../../core/catalog';

@Component({
  selector: 'app-habit-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './habit-form.html',
  styleUrl: './habit-form.scss',
})
export class HabitForm {
  ui = inject(UiService);
  private habits = inject(HabitService);

  readonly colors = COLOR_CHOICES;
  readonly icons = ICON_CHOICES;
  readonly units = UNIT_SUGGESTIONS;

  saving = signal(false);
  error = signal<string | null>(null);
  measurable = signal(false);

  name = '';
  color = COLOR_CHOICES[0];
  icon = ICON_CHOICES[0];
  frequency: Frequency = 'daily';
  targetCount = 1;
  unit = '';
  targetQuantity: number | null = null;
  reminderEnabled = false;
  reminderTime = '08:00';

  readonly isEdit = computed(() => this.ui.editing() !== null);

  // Sync local fields whenever the modal opens for a given habit.
  private lastOpenedId: string | null | undefined = undefined;

  ngDoCheck() {
    if (!this.ui.formOpen()) {
      this.lastOpenedId = undefined;
      return;
    }
    const editing = this.ui.editing();
    const id = editing?.id ?? null;
    if (id === this.lastOpenedId) return;
    this.lastOpenedId = id;
    this.error.set(null);

    if (editing) {
      this.name = editing.name;
      this.color = editing.color;
      this.icon = editing.icon;
      this.frequency = editing.frequency;
      this.targetCount = editing.targetCount;
      this.unit = editing.unit ?? '';
      this.targetQuantity = editing.targetQuantity;
      this.reminderEnabled = editing.reminderEnabled;
      this.reminderTime = editing.reminderTime ?? '08:00';
      this.measurable.set(editing.targetQuantity !== null || !!editing.unit);
    } else {
      this.name = '';
      this.color = COLOR_CHOICES[0];
      this.icon = ICON_CHOICES[0];
      this.frequency = 'daily';
      this.targetCount = 1;
      this.unit = '';
      this.targetQuantity = null;
      this.reminderEnabled = false;
      this.reminderTime = '08:00';
      this.measurable.set(false);
    }
  }

  get countLabel(): string {
    if (this.frequency === 'weekly') return 'times per week';
    if (this.frequency === 'monthly') return 'times per month';
    return 'times per day';
  }

  async save() {
    this.error.set(null);
    if (!this.name.trim()) {
      this.error.set('Please give your habit a name.');
      return;
    }

    const payload: HabitInput = {
      name: this.name.trim(),
      color: this.color,
      icon: this.icon,
      frequency: this.frequency,
      targetCount: Number(this.targetCount) || 1,
      unit: this.measurable() && this.unit.trim() ? this.unit.trim() : null,
      targetQuantity: this.measurable() && this.targetQuantity ? Number(this.targetQuantity) : null,
      reminderEnabled: this.reminderEnabled,
      reminderTime: this.reminderEnabled ? this.reminderTime : null,
    };

    this.saving.set(true);
    try {
      const editing = this.ui.editing();
      if (editing) {
        await this.habits.update(editing.id, payload);
      } else {
        await this.habits.create(payload);
      }
      this.ui.close();
    } catch (err: any) {
      this.error.set(err?.error?.error ?? 'Could not save the habit.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteHabit() {
    const editing = this.ui.editing();
    if (!editing) return;
    if (!confirm(`Delete "${editing.name}" and all its history? This cannot be undone.`)) return;
    this.saving.set(true);
    try {
      await this.habits.remove(editing.id);
      this.ui.close();
    } catch (err: any) {
      this.error.set(err?.error?.error ?? 'Could not delete the habit.');
    } finally {
      this.saving.set(false);
    }
  }

  close() {
    this.ui.close();
  }
}
