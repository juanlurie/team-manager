import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { HiScoreGame, LeaderboardEntry } from '../../core/models/leaderboard.model';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { buildDuplicateFirstNames, memberDisplayName } from '../../core/utils/member-display-name';
import { MemberPointsHistoryComponent } from './member-points-history.component';
import { AvatarCircleComponent } from '../../core/components/k-picker/avatar-circle.component';

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
  imports: [MatIconModule, MatTooltipModule, MatDialogModule, DecimalPipe, AvatarCircleComponent],
  styles: [`
    .podium-card { transition:opacity 0.15s; }
    .podium-card:hover { opacity:0.8; }
    .rank-row { transition:opacity 0.15s; }
    .rank-row:hover { opacity:0.75; }

    .lb-tab { padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,0.4);font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all 0.12s; }
    .lb-tab:hover { color:rgba(255,255,255,0.7); }
    .lb-tab.active { color:#64b5f6;border-bottom-color:#64b5f6; }

    .hs-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px; }
    .hs-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden; }
    .hs-card-header { display:flex;align-items:baseline;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,0.06); }
    .hs-game-label { font-size:0.9rem;font-weight:700;color:rgba(255,255,255,0.85); }
    .hs-unit { font-size:0.7rem;color:rgba(255,255,255,0.3); }
    .hs-rows { display:flex;flex-direction:column; }
    .hs-row { display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,0.04); }
    .hs-row:last-child { border-bottom:none; }
    .hs-rank { width:20px;font-size:0.75rem;font-weight:700;color:rgba(255,255,255,0.25);flex-shrink:0;text-align:center; }
    .hs-gold .hs-rank   { color:#FFD700; }
    .hs-silver .hs-rank { color:#C0C0C0; }
    .hs-bronze .hs-rank { color:#CD7F32; }
    .hs-avatar { width:26px;height:26px;border-radius:50%;background:rgba(100,181,246,0.12);color:#64b5f6;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .hs-gold   .hs-avatar { background:rgba(255,215,0,0.12);color:#FFD700; }
    .hs-silver .hs-avatar { background:rgba(192,192,192,0.12);color:#C0C0C0; }
    .hs-bronze .hs-avatar { background:rgba(205,127,50,0.12);color:#CD7F32; }
    .hs-name { flex:1;font-size:0.82rem;color:rgba(255,255,255,0.75);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .hs-score { font-size:0.9rem;font-weight:800;color:rgba(255,255,255,0.9);flex-shrink:0; }
    .hs-unit-small { font-size:0.65rem;font-weight:400;opacity:0.45; }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="max-width:900px;margin:0 auto;padding:0 8px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <mat-icon style="font-size:1.6rem;width:1.6rem;height:1.6rem;color:#FFD700">emoji_events</mat-icon>
        <h2 style="margin:0;font-size:1.3rem;font-weight:700">Leaderboard</h2>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <button class="lb-tab" [class.active]="tab()==='points'" (click)="tab.set('points')">Points</button>
        <button class="lb-tab" [class.active]="tab()==='hiscores'" (click)="switchHiScores()">Hi Scores</button>
      </div>

      @if (tab() === 'points') {

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
              <div style="margin:0 auto 10px;width:52px">
                <app-avatar-circle [memberId]="p2.memberId" [name]="p2.firstName + ' ' + p2.lastName" [avatarSeed]="p2.avatarSeed" [size]="52" />
              </div>
              <div style="font-weight:700;font-size:0.95rem">{{memberName(p2)}}</div>
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
              <div style="margin:0 auto 10px;width:60px">
                <app-avatar-circle [memberId]="p1.memberId" [name]="p1.firstName + ' ' + p1.lastName" [avatarSeed]="p1.avatarSeed" [size]="60" />
              </div>
              <div style="font-weight:700;font-size:1rem">{{memberName(p1)}}</div>
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
              <div style="margin:0 auto 10px;width:52px">
                <app-avatar-circle [memberId]="p3.memberId" [name]="p3.firstName + ' ' + p3.lastName" [avatarSeed]="p3.avatarSeed" [size]="52" />
              </div>
              <div style="font-weight:700;font-size:0.95rem">{{memberName(p3)}}</div>
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
              <app-avatar-circle [memberId]="e.memberId" [name]="e.firstName + ' ' + e.lastName" [avatarSeed]="e.avatarSeed" [size]="34" />

              <!-- Name + role -->
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:0.9rem">{{memberName(e)}}</div>
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

      } @else {

      <!-- Hi Scores tab -->
      @if (hiLoading()) {
        <div style="text-align:center;padding:64px;opacity:0.35">Loading…</div>
      } @else if (hiScores().length === 0) {
        <div style="text-align:center;padding:64px;opacity:0.35">No game scores yet</div>
      } @else {
        <div class="hs-grid">
          @for (game of hiScores(); track game.key) {
            <div class="hs-card">
              <div class="hs-card-header">
                <span class="hs-game-label">{{ game.label }}</span>
                <span class="hs-unit">{{ game.higherIsBetter ? 'best' : 'fewest' }} {{ game.unit }}</span>
              </div>
              <div class="hs-rows">
                @for (e of game.entries; track e.memberId) {
                  <div class="hs-row" [class.hs-gold]="e.rank===1" [class.hs-silver]="e.rank===2" [class.hs-bronze]="e.rank===3">
                    <span class="hs-rank">{{ e.rank }}</span>
                    <app-avatar-circle [memberId]="e.memberId" [name]="e.displayName" [avatarSeed]="e.avatarSeed" [size]="26" />
                    <span class="hs-name">{{ e.displayName }}</span>
                    <span class="hs-score">{{ e.score | number }}<span class="hs-unit-small"> {{ game.unit }}</span></span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      }
    </div>
  `
})
export class LeaderboardComponent implements OnInit {
  private svc = inject(LeaderboardService);
  private dialog = inject(MatDialog);

  entries = signal<LeaderboardEntry[]>([]);
  loading = signal(true);
  tab = signal<'points' | 'hiscores'>('points');
  hiScores = signal<HiScoreGame[]>([]);
  hiLoading = signal(false);
  private hiLoaded = false;

  private duplicates = computed(() => buildDuplicateFirstNames(this.entries()));
  memberName = (e: LeaderboardEntry) => memberDisplayName(e, this.duplicates());

  readonly POS_COLORS = POS_COLORS;

  sourceStyle(source: string) { return SOURCE_COLORS[source] ?? SOURCE_COLORS['bonus']; }

  ngOnInit() {
    this.svc.getLeaderboard().subscribe(data => {
      this.entries.set(data);
      this.loading.set(false);
    });
  }

  switchHiScores() {
    this.tab.set('hiscores');
    if (this.hiLoaded) return;
    this.hiLoaded = true;
    this.hiLoading.set(true);
    this.svc.getHiScores().subscribe(data => {
      this.hiScores.set(data);
      this.hiLoading.set(false);
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
        avatarSeed: entry.avatarSeed,
        totalPoints: entry.totalPoints
      }
    });
  }
}
