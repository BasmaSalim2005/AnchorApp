import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ShareService } from '../../../core/share.service';
import { ShareIn, ShareOut } from '../../../core/models';
import { PersonView } from '../../../shared/person-view/person-view';

@Component({
  selector: 'app-shared',
  standalone: true,
  imports: [FormsModule, PersonView],
  templateUrl: './shared.html',
  styleUrl: './shared.scss',
})
export class Shared implements OnInit {
  private shares = inject(ShareService);

  incoming = signal<ShareIn[]>([]);
  outgoing = signal<ShareOut[]>([]);
  loading = signal(true);

  shareUsername = '';
  busy = signal(false);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);

  selected = signal<ShareIn | null>(null);

  async ngOnInit() {
    await this.refresh();
    this.loading.set(false);
  }

  private async refresh() {
    const [incoming, outgoing] = await Promise.all([
      this.shares.sharedIn(),
      this.shares.sharedOut(),
    ]);
    this.incoming.set(incoming);
    this.outgoing.set(outgoing);
  }

  async share() {
    this.error.set(null);
    this.notice.set(null);
    const name = this.shareUsername.trim();
    if (!name) {
      this.error.set('Enter a username to share with.');
      return;
    }
    this.busy.set(true);
    try {
      await this.shares.shareWith(name);
      this.notice.set(`Your habits are now visible to ${name}.`);
      this.shareUsername = '';
      await this.refresh();
    } catch (err: any) {
      this.error.set(err?.error?.error ?? 'Could not share.');
    } finally {
      this.busy.set(false);
    }
  }

  async revoke(s: ShareOut) {
    if (!confirm(`Stop sharing your habits with ${s.viewer_username}?`)) return;
    await this.shares.removeShare(s.id);
    await this.refresh();
  }

  async leave(s: ShareIn) {
    if (!confirm(`Remove ${s.ownerUsername}'s shared habits from your view?`)) return;
    await this.shares.removeShare(s.id);
    if (this.selected()?.id === s.id) this.selected.set(null);
    await this.refresh();
  }

  open(s: ShareIn) {
    this.selected.set(s);
  }

  back() {
    this.selected.set(null);
  }
}
