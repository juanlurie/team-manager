import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WinOfTheWeekService } from '../../core/services/win-of-the-week.service';
import { WinWeekHistory, WinWeekDetail, WinNomination } from '../../core/models/win-week.model';

@Component({
  selector: 'app-win-of-the-week-history',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatTooltipModule],
  template: `
    <div style="max-width:1000px;margin:0 auto;padding:0 8px 80px">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px">
          <mat-icon style="font-size:1.6rem;width:1.6rem;height:1.6rem;color:#FFD700">history</mat-icon>
          <h2 style="margin:0;font-size:1.3rem;font-weight:700">Win of the Week History</h2>
        </div>
        <div style="flex:1"></div>
        <mat-form-field appearance="outline" style="width:120px;margin-bottom:0" subscriptSizing="dynamic">
          <mat-label>Year</mat-label>
          <mat-select [value]="selectedYear()" (selectionChange)="onYearChange($event.value)">
            <mat-option [value]="null">All</mat-option>
            @for (y of availableYears(); track y) {
              <mat-option [value]="y">{{y}}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div style="text-align:center;padding:64px;opacity:0.35">Loading...</div>
      }

      <!-- Empty state -->
      @if (!loading() && history().length === 0) {
        <div style="text-align:center;padding:64px;opacity:0.35">
          <mat-icon style="font-size:3rem;width:3rem;height:3rem;opacity:0.3">emoji_events</mat-icon>
          <div style="margin-top:12px;font-weight:600">No winners yet</div>
          <div style="margin-top:4px;font-size:0.85rem">Be the first to win! Nominate someone in Win of the Week.</div>
        </div>
      }

      <!-- Grid -->
      @if (!loading() && history().length > 0) {
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
          @for (w of history(); track w.id) {
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.2s;position:relative"
                 (click)="toggleDetail(w.id)"
                 (mouseenter)="hoveredId.set(w.id)"
                 (mouseleave)="hoveredId.set(null)"
                 [style.transform]="hoveredId() === w.id ? 'translateY(-4px)' : 'none'"
                 [style.boxShadow]="hoveredId() === w.id ? '0 4px 12px rgba(0,0,0,0.12)' : 'none'">
              <!-- Status chip -->
              <span style="position:absolute;top:10px;right:10px;font-size:0.6rem;font-weight:700;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:0.3px;background:rgba(76,175,80,0.15);color:#4caf50">
                Closed
              </span>
              <!-- Avatar -->
              <div style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;background:rgba(255,215,0,0.12);color:#FFD700;border:1px solid rgba(255,215,0,0.3);margin-bottom:10px">
                {{getInitials(w.winnerNomineeName || '?')}}
              </div>
              <!-- Name -->
              <div style="font-weight:700;font-size:0.9rem">{{w.winnerNomineeName}}</div>
              <!-- Title -->
              <div style="font-size:0.8rem;opacity:0.6;margin-top:2px;font-style:italic">"{{w.winnerTitle}}"</div>
              <!-- Week -->
              <div style="font-size:0.72rem;opacity:0.4;margin-top:8px">Week of {{formatWeek(w.weekStart, w.weekEnd)}}</div>
              <!-- Votes -->
              <div style="display:flex;align-items:center;gap:4px;margin-top:6px;font-size:0.75rem;opacity:0.5">
                <mat-icon style="font-size:1rem;width:1rem;height:1rem">how_to_vote</mat-icon>
                {{w.winnerVoteCount}} votes
              </div>
            </div>
          }
        </div>

        <!-- Expanded detail -->
        @if (expandedWeek()) {
          <div style="margin-top:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div style="font-weight:700;font-size:1rem">
                {{expandedWeek()?.winnerNomineeName}} — Week of {{expandedWeek() ? formatWeek(expandedWeek()!.weekStart, expandedWeek()!.weekEnd) : ''}}
              </div>
              <button mat-stroked-button style="font-size:0.75rem;height:28px" (click)="expandedWeek.set(null); expandedDetail.set(null)">
                <mat-icon style="font-size:1rem;width:1rem;height:1rem">expand_less</mat-icon>
                Show less
              </button>
            </div>
            @if (expandedDetail()) {
              <div style="font-size:0.85rem;opacity:0.6;margin-bottom:12px">All Nominations:</div>
              @for (nom of expandedDetail()!.allNominations; track nom.id; let i = $index) {
                <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;margin-bottom:4px"
                     [style.borderLeft]="nom.id === expandedWeek()?.id ? '3px solid #FFD700' : '3px solid transparent'"
                     [style.background]="nom.id === expandedWeek()?.id ? 'rgba(255,215,0,0.06)' : 'transparent'">
                  <span style="font-size:0.8rem;font-weight:700;opacity:0.4;width:20px">{{i + 1}}.</span>
                  <span style="font-weight:600;font-size:0.85rem;flex:1">{{nom.nomineeName}}</span>
                  <span style="font-size:0.8rem;opacity:0.5;font-style:italic;flex:2">"{{nom.title}}"</span>
                  <span style="font-size:0.75rem;opacity:0.5;white-space:nowrap">{{nom.voteCount}} 🗳️</span>
                </div>
              }
            } @else {
              <div style="text-align:center;padding:20px;opacity:0.4">Loading details...</div>
            }
          </div>
        }
      }
    </div>
  `
})
export class WinOfTheWeekHistoryComponent implements OnInit {
  private svc = inject(WinOfTheWeekService);

  history = signal<WinWeekHistory[]>([]);
  loading = signal(true);
  selectedYear = signal<number | null>(null);
  expandedWeek = signal<WinWeekHistory | null>(null);
  expandedDetail = signal<WinWeekDetail | null>(null);
  hoveredId = signal<string | null>(null);

  readonly availableYears = computed(() => {
    const years = new Set<number>();
    for (const w of this.history()) {
      years.add(new Date(w.weekStart).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  });

  ngOnInit() {
    this.refresh();
  }

  private refresh() {
    this.loading.set(true);
    this.svc.getHistory(undefined, this.selectedYear() ?? undefined).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onYearChange(year: number | null) {
    this.selectedYear.set(year);
    this.expandedWeek.set(null);
    this.expandedDetail.set(null);
    this.refresh();
  }

  toggleDetail(weekId: string) {
    if (this.expandedWeek()?.id === weekId) {
      this.expandedWeek.set(null);
      this.expandedDetail.set(null);
      return;
    }
    const week = this.history().find(w => w.id === weekId);
    if (!week) return;
    this.expandedWeek.set(week);
    this.expandedDetail.set(null);
    this.svc.getWeekDetail(weekId).subscribe({
      next: (detail) => this.expandedDetail.set(detail),
      error: () => this.expandedDetail.set(null)
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
  }

  formatWeek(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (s.getMonth() === e.getMonth()) {
      return `${months[s.getMonth()]} ${s.getDate()}-${e.getDate()}`;
    }
    return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}`;
  }
}
