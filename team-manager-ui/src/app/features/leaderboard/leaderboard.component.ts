import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { LeaderboardEntry } from '../../core/models/leaderboard.model';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { MemberPointsHistoryComponent } from './member-points-history.component';

const POS_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: 'rgba(255,215,0,0.12)',   text: '#FFD700', border: 'rgba(255,215,0,0.4)',   label: 'P1' },
  2: { bg: 'rgba(192,192,192,0.12)', text: '#C0C0C0', border: 'rgba(192,192,192,0.4)', label: 'P2' },
  3: { bg: 'rgba(205,127,50,0.12)',  text: '#CD7F32', border: 'rgba(205,127,50,0.4)',  label: 'P3' },
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  badge:  { bg: 'rgba(171,71,188,0.15)', text: '#ce93d8' },
  sprint: { bg: 'rgba(100,181,246,0.15)', text: '#64b5f6' },
  bonus:  { bg: 'rgba(255,167,38,0.15)',  text: '#ffb74d' },
  wow:    { bg: 'rgba(255,215,0,0.15)',   text: '#FFD700' },
  quiz:   { bg: 'rgba(77,182,172,0.15)',  text: '#4db6ac' },
};

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, MatDialogModule],
  styles: [`
    .podium-card { transition:opacity 0.15s; }
    .podium-card:hover { opacity:0.8; }
    .rank-row { transition:opacity 0.15s; }
    .rank-row:hover { opacity:0.75; }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="max-width:900px;margin:0 auto;padding:0 8px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <mat-icon style="font-size:1.6rem;width:1.6rem;height:1.6rem;color:#FFD700">emoji_events</mat-icon>
        <h2 style="margin:0;font-size:1.3rem;font-weight:700">Leaderboard</h2>
      </div>

      @if (entries().length > 0) {
        <!-- F1 Podium: top 3 -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:32px;align-items:end">
          <!-- P2 -->
          @let p2 = entries()[1];
          @if (p2) {
            <div [style.background]="POS_COLORS[2].bg"
                 [style.borderColor]="POS_COLORS[2].border"
                 (click)="openMember(p2.memberId)" class="podium-card"
                 style="border:1px solid;border-radius:14px;padding:20px 16px 16px;text-align:center;order:1;cursor:pointer">
              <div style="font-size:2rem;font-weight:900;margin-bottom:8px" [style.color]="POS_COLORS[2].text">P2</div>
              <div style="width:52px;height:52px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700"
                   [style.background]="POS_COLORS[2].bg" [style.color]="POS_COLORS[2].text" [style.border]="'2px solid ' + POS_COLORS[2].border">
                {{p2.firstName[0]}}{{p2.lastName[0]}}
              </div>
              <div style="font-weight:700;font-size:0.95rem">{{p2.firstName}} {{p2.lastName}}</div>
              <div style="font-size:1.4rem;font-weight:900;margin-top:6px" [style.color]="POS_COLORS[2].text">{{p2.totalPoints}} <span style="font-size:0.8rem;font-weight:400;opacity:0.6">pts</span></div>
            </div>
          }

          <!-- P1 (centre, tallest) -->
          @let p1 = entries()[0];
          @if (p1) {
            <div [style.background]="POS_COLORS[1].bg"
                 [style.borderColor]="POS_COLORS[1].border"
                 (click)="openMember(p1.memberId)" class="podium-card"
                 style="border:1px solid;border-radius:14px;padding:28px 16px 20px;text-align:center;order:2;cursor:pointer">
              <div style="font-size:2.4rem;font-weight:900;margin-bottom:8px" [style.color]="POS_COLORS[1].text">P1</div>
              <div style="width:60px;height:60px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700"
                   [style.background]="POS_COLORS[1].bg" [style.color]="POS_COLORS[1].text" [style.border]="'2px solid ' + POS_COLORS[1].border">
                {{p1.firstName[0]}}{{p1.lastName[0]}}
              </div>
              <div style="font-weight:700;font-size:1rem">{{p1.firstName}} {{p1.lastName}}</div>
              <div style="font-size:1.7rem;font-weight:900;margin-top:6px" [style.color]="POS_COLORS[1].text">{{p1.totalPoints}} <span style="font-size:0.85rem;font-weight:400;opacity:0.6">pts</span></div>
            </div>
          }

          <!-- P3 -->
          @let p3 = entries()[2];
          @if (p3) {
            <div [style.background]="POS_COLORS[3].bg"
                 [style.borderColor]="POS_COLORS[3].border"
                 (click)="openMember(p3.memberId)" class="podium-card"
                 style="border:1px solid;border-radius:14px;padding:16px 16px 16px;text-align:center;order:3;cursor:pointer">
              <div style="font-size:2rem;font-weight:900;margin-bottom:8px" [style.color]="POS_COLORS[3].text">P3</div>
              <div style="width:52px;height:52px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700"
                   [style.background]="POS_COLORS[3].bg" [style.color]="POS_COLORS[3].text" [style.border]="'2px solid ' + POS_COLORS[3].border">
                {{p3.firstName[0]}}{{p3.lastName[0]}}
              </div>
              <div style="font-weight:700;font-size:0.95rem">{{p3.firstName}} {{p3.lastName}}</div>
              <div style="font-size:1.4rem;font-weight:900;margin-top:6px" [style.color]="POS_COLORS[3].text">{{p3.totalPoints}} <span style="font-size:0.8rem;font-weight:400;opacity:0.6">pts</span></div>
            </div>
          }
        </div>

        <!-- Full rankings -->
        <div style="display:flex;flex-direction:column;gap:6px">
          @for (e of entries(); track e.memberId) {
            <div class="rank-row"
                 style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);cursor:pointer"
                 [style.borderColor]="e.position <= 3 ? POS_COLORS[e.position].border : 'rgba(255,255,255,0.06)'"
                 [style.background]="e.position <= 3 ? POS_COLORS[e.position].bg : 'rgba(255,255,255,0.04)'"
                 (click)="openMember(e.memberId)">

              <!-- Position -->
              <div style="width:32px;text-align:center;font-size:0.85rem;font-weight:700;flex-shrink:0"
                   [style.color]="e.position <= 3 ? POS_COLORS[e.position].text : 'rgba(255,255,255,0.3)'">
                P{{e.position}}
              </div>

              <!-- Avatar -->
              <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;background:rgba(100,181,246,0.1);color:#64b5f6;border:1px solid rgba(100,181,246,0.2)">
                {{e.firstName[0]}}{{e.lastName[0]}}
              </div>

              <!-- Name + role -->
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:0.9rem">{{e.firstName}} {{e.lastName}}</div>
                <div style="font-size:0.72rem;opacity:0.4">{{e.role === 'TeamLead' ? 'Team Lead' : e.role}}</div>
              </div>

<!-- Total -->
              <div style="width:64px;text-align:right;font-size:1rem;font-weight:800;flex-shrink:0"
                   [style.color]="e.position <= 3 ? POS_COLORS[e.position].text : 'rgba(255,255,255,0.85)'">
                {{e.totalPoints}}
                <span style="font-size:0.65rem;font-weight:400;opacity:0.5">pts</span>
              </div>
            </div>
          }
        </div>

        <!-- Legend -->
        <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;opacity:0.5;font-size:0.72rem">
          @for (src of ['badge','wow','quiz','sprint','bonus']; track src) {
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:10px;border-radius:50%;display:inline-block" [style.background]="sourceStyle(src).text"></span>
              {{src === 'badge' ? 'Badges' : src === 'wow' ? 'Win of the Week' : src === 'quiz' ? 'Quiz Game' : src === 'sprint' ? 'Sprint participation (5 pts each)' : 'Bonus awards'}}
            </span>
          }
        </div>
      }

      @if (entries().length === 0 && !loading()) {
        <div style="text-align:center;padding:64px;opacity:0.35">No data yet</div>
      }
    </div>
  `
})
export class LeaderboardComponent implements OnInit {
  private svc = inject(LeaderboardService);
  private dialog = inject(MatDialog);

  entries = signal<LeaderboardEntry[]>([]);
  loading = signal(true);

  readonly POS_COLORS = POS_COLORS;

  sourceStyle(source: string) { return SOURCE_COLORS[source] ?? SOURCE_COLORS['bonus']; }

  ngOnInit() {
    this.svc.getLeaderboard().subscribe(data => {
      this.entries.set(data);
      this.loading.set(false);
    });
  }

  openMember(memberId: string) {
    const entry = this.entries().find(e => e.memberId === memberId);
    if (!entry) return;
    this.dialog.open(MemberPointsHistoryComponent, {
      width: '480px',
      data: {
        memberId: entry.memberId,
        firstName: entry.firstName,
        lastName: entry.lastName,
        totalPoints: entry.totalPoints
      }
    });
  }
}
