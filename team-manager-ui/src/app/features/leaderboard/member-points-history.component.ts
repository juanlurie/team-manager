import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LeaderboardService, PointHistoryEntry } from '../../core/services/leaderboard.service';

const SOURCE_ICONS: Record<string, string> = {
  badge: 'workspace_premium',
  sprint: 'directions_run',
  bonus: 'star',
  wow: 'emoji_events',
};

const SOURCE_COLORS: Record<string, string> = {
  badge: '#ce93d8',
  sprint: '#64b5f6',
  bonus: '#ffb74d',
  wow: '#FFD700',
};

@Component({
  selector: 'app-member-points-history',
  standalone: true,
  imports: [MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <div class="dialog-wrap">
      <div class="dialog-header">
        <button mat-icon-button class="close-btn" (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      @if (loading()) {
        <div class="loading-wrap"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (member()) {
        @let m = member()!;
        <div class="member-header">
          <div class="avatar" [style.color]="avatarColor" [style.borderColor]="avatarColor">
            {{m.firstName[0]}}{{m.lastName[0]}}
          </div>
          <div class="member-info">
            <div class="name">{{m.firstName}} {{m.lastName}}</div>
            <div class="total">{{m.totalPoints}} <span>pts</span></div>
          </div>
        </div>

        @if (history().length === 0) {
          <div class="empty-state">
            <mat-icon style="font-size:48px;width:48px;height:48px;opacity:0.3;color:#FFD700">emoji_events</mat-icon>
            <div>No points earned yet</div>
          </div>
        } @else {
          <div class="history-list">
            @for (entry of history(); track entry.id) {
              <div class="history-entry">
                <mat-icon class="entry-icon" [style.color]="sourceColor(entry.source)">
                  {{sourceIcon(entry.source)}}
                </mat-icon>
                <div class="entry-details">
                  <div class="entry-reason">{{entry.reason}}</div>
                  <div class="entry-date">{{formatDate(entry.awardedAt)}}</div>
                </div>
                <div class="entry-points" [style.color]="sourceColor(entry.source)">
                  +{{entry.points}}
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .dialog-wrap { background:#1a2636;border-radius:12px;width:480px;max-width:calc(100vw - 32px);max-height:80vh;display:flex;flex-direction:column; }
    .dialog-header { display:flex;justify-content:flex-end;padding:8px; }
    .close-btn { color:rgba(255,255,255,0.4); }
    .close-btn:hover { color:rgba(255,255,255,0.8); }
    .loading-wrap { display:flex;justify-content:center;padding:48px; }
    .member-header { display:flex;align-items:center;gap:16px;padding:8px 24px 20px;border-bottom:1px solid rgba(255,255,255,0.06); }
    .avatar { width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;background:rgba(100,181,246,0.1);border:2px solid;flex-shrink:0; }
    .member-info { flex:1; }
    .name { font-weight:700;font-size:1.1rem; }
    .total { font-size:1.4rem;font-weight:900;color:#FFD700;margin-top:2px; }
    .total span { font-size:0.8rem;font-weight:400;opacity:0.6; }
    .empty-state { text-align:center;padding:48px;opacity:0.5; }
    .empty-state div { margin-top:12px;font-size:0.9rem; }
    .history-list { overflow-y:auto;flex:1; }
    .history-entry { display:flex;align-items:center;gap:12px;padding:12px 24px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.1s; }
    .history-entry:hover { background:rgba(255,255,255,0.03); }
    .entry-icon { font-size:18px;width:18px;height:18px;flex-shrink:0; }
    .entry-details { flex:1;min-width:0; }
    .entry-reason { font-weight:500;font-size:0.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .entry-date { font-size:0.72rem;opacity:0.4;margin-top:2px; }
    .entry-points { font-size:0.9rem;font-weight:700;flex-shrink:0; }
  `]
})
export class MemberPointsHistoryComponent implements OnInit {
  private svc = inject(LeaderboardService);
  private ref = inject(MatDialogRef<MemberPointsHistoryComponent>);
  private data = inject<{ memberId: string; firstName: string; lastName: string; totalPoints: number }>(MAT_DIALOG_DATA);

  loading = signal(true);
  history = signal<PointHistoryEntry[]>([]);
  member = signal<{ firstName: string; lastName: string; totalPoints: number } | null>(null);

  readonly SOURCE_ICONS = SOURCE_ICONS;
  readonly SOURCE_COLORS = SOURCE_COLORS;

  ngOnInit() {
    this.member.set({ firstName: this.data.firstName, lastName: this.data.lastName, totalPoints: this.data.totalPoints });
    this.svc.getMemberHistory(this.data.memberId).subscribe({
      next: entries => { this.history.set(entries); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  sourceIcon(source: string): string { return SOURCE_ICONS[source] ?? 'star'; }
  sourceColor(source: string): string { return SOURCE_COLORS[source] ?? SOURCE_COLORS['bonus']; }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (d.getFullYear() === now.getFullYear()) {
      return `${months[d.getMonth()]} ${d.getDate()}`;
    }
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  get avatarColor(): string { return '#64b5f6'; }

  close() { this.ref.close(); }
}
