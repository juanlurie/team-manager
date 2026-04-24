import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Achievement } from '../../../core/models/achievement.model';
import { AchievementService } from '../../../core/services/achievement.service';

const CATEGORY_COLORS: Record<string, string> = {
  SME:       'rgba(171,71,188,0.15)',
  Knowledge: 'rgba(100,181,246,0.15)',
  Social:    'rgba(76,175,80,0.12)',
  Fun:       'rgba(255,167,38,0.15)',
};
const CATEGORY_TEXT: Record<string, string> = {
  SME:       '#ce93d8',
  Knowledge: '#64b5f6',
  Social:    '#81c784',
  Fun:       '#ffb74d',
};

@Component({
  selector: 'app-award-achievement-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title style="margin-bottom:4px">Award a Badge</h2>
    <p style="margin:0 24px 12px;font-size:0.8rem;opacity:0.5">to {{ data.memberName }}</p>
    <mat-dialog-content style="padding-bottom:8px">
      @for (cat of categories; track cat) {
        <div style="margin-bottom:16px">
          <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;opacity:0.4;letter-spacing:0.08em;margin-bottom:8px">
            {{ cat }}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            @for (a of byCategory[cat]; track a.id) {
              <button
                (click)="pick(a)"
                [matTooltip]="a.description"
                [disabled]="awarded.has(a.id)"
                style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;border:1px solid;cursor:pointer;font-size:0.82rem;font-weight:600;transition:opacity 0.15s"
                [style.background]="CATEGORY_COLORS[cat]"
                [style.borderColor]="CATEGORY_TEXT[cat] + '44'"
                [style.color]="CATEGORY_TEXT[cat]"
                [style.opacity]="awarded.has(a.id) ? '0.35' : '1'">
                <span style="font-size:1.2rem">{{ a.icon }}</span>
                {{ a.name }}
                @if (awarded.has(a.id)) { <span style="font-size:0.7rem;opacity:0.7">(awarded)</span> }
              </button>
            }
          </div>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `
})
export class AwardAchievementDialogComponent implements OnInit {
  private svc = inject(AchievementService);
  private dialogRef = inject(MatDialogRef<AwardAchievementDialogComponent>);
  data: { memberId: string; memberName: string; awardedIds: Set<string> } = inject(MAT_DIALOG_DATA);

  readonly CATEGORY_COLORS = CATEGORY_COLORS;
  readonly CATEGORY_TEXT = CATEGORY_TEXT;

  achievements: Achievement[] = [];
  byCategory: Record<string, Achievement[]> = {};
  categories: string[] = [];
  awarded = new Set<string>();

  ngOnInit() {
    this.awarded = new Set(this.data.awardedIds);
    this.svc.getAll().subscribe(list => {
      this.achievements = list;
      list.forEach(a => {
        if (!this.byCategory[a.category]) this.byCategory[a.category] = [];
        this.byCategory[a.category].push(a);
      });
      this.categories = Object.keys(this.byCategory);
    });
  }

  pick(a: Achievement) {
    this.dialogRef.close(a);
  }
}
