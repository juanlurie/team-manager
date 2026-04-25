import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TeamMember, Badge } from '../../../core/models/team-member.model';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { AchievementService } from '../../../core/services/achievement.service';
import { LeaderboardService } from '../../../core/services/leaderboard.service';
import { AwardAchievementDialogComponent } from '../award-achievement-dialog/award-achievement-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Achievement, MemberAchievement } from '../../../core/models/achievement.model';
import { LeaderboardEntry } from '../../../core/models/leaderboard.model';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  SME:       { bg: 'rgba(171,71,188,0.15)',  text: '#ce93d8' },
  Knowledge: { bg: 'rgba(100,181,246,0.15)', text: '#64b5f6' },
  Social:    { bg: 'rgba(76,175,80,0.12)',   text: '#81c784' },
  Fun:       { bg: 'rgba(255,167,38,0.15)',  text: '#ffb74d' },
};

@Component({
  selector: 'app-team-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule,
    MatIconModule, MatTooltipModule, DatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.member ? 'Edit' : 'Add' }} Team Member</h2>
    <mat-dialog-content style="max-height:80vh">
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px">
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>First Name</mat-label>
            <input matInput formControlName="firstName">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Last Name</mat-label>
            <input matInput formControlName="lastName">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            <mat-option value="Member">Member</mat-option>
            <mat-option value="TeamLead">Team Lead</mat-option>
            <mat-option value="TechLead">Tech Lead</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Team Lead</mat-label>
          <mat-select formControlName="teamLeadId">
            <mat-option [value]="null">None</mat-option>
            @for (m of teamLeads; track m.id) {
              <mat-option [value]="m.id">{{ m.firstName }} {{ m.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Crafts <span style="opacity:0.5;font-size:0.85em">(optional, multi-select)</span></mat-label>
          <mat-select formControlName="crafts" multiple>
            <mat-option value="DevBE">Dev — Backend</mat-option>
            <mat-option value="DevFE">Dev — Frontend</mat-option>
            <mat-option value="DevIOS">Dev — Mobile iOS</mat-option>
            <mat-option value="DevAndroid">Dev — Mobile Android</mat-option>
            <mat-option value="Analysis">Analyst</mat-option>
            <mat-option value="Design">Designer</mat-option>
            <mat-option value="QA">QA</mat-option>
          </mat-select>
        </mat-form-field>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Birthday (optional)</mat-label>
            <input matInput [matDatepicker]="birthPicker" formControlName="birthDate">
            <mat-datepicker-toggle matIconSuffix [for]="birthPicker"></mat-datepicker-toggle>
            <mat-datepicker #birthPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Join Date (optional)</mat-label>
            <input matInput [matDatepicker]="joinPicker" formControlName="joinDate">
            <mat-datepicker-toggle matIconSuffix [for]="joinPicker"></mat-datepicker-toggle>
            <mat-datepicker #joinPicker></mat-datepicker>
          </mat-form-field>
        </div>
        @if (data.member) {
          <mat-checkbox formControlName="isActive">Active</mat-checkbox>
        }
      </form>

      @if (data.member) {
        <!-- Achievements list -->
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-size:0.8rem;font-weight:700;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em">Achievements</span>
            <span style="font-size:0.75rem;opacity:0.3">{{ achievements().length }}</span>
            <span style="flex:1"></span>
            <button mat-stroked-button style="font-size:0.75rem;height:28px;line-height:28px;padding:0 10px" (click)="openAward()">
              <mat-icon style="font-size:14px;vertical-align:middle;margin-right:2px">add</mat-icon> Award badge
            </button>
          </div>

          @if (achievements().length === 0) {
            <div style="font-size:0.82rem;opacity:0.3;padding:8px 0">No badges awarded yet</div>
          } @else {
            <div style="display:flex;flex-direction:column;gap:6px">
              @for (a of achievements(); track a.id) {
                <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)">
                  <!-- Icon -->
                  <span style="font-size:1.6rem;line-height:1;flex-shrink:0">{{ a.achievementIcon }}</span>

                  <!-- Details -->
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                      <span style="font-weight:600;font-size:0.88rem">{{ a.achievementName }}</span>
                      <span style="font-size:0.68rem;font-weight:700;padding:1px 7px;border-radius:8px"
                            [style.background]="catStyle(a.achievementCategory).bg"
                            [style.color]="catStyle(a.achievementCategory).text">
                        {{ a.achievementCategory }}
                      </span>
                    </div>
                    <div style="font-size:0.72rem;opacity:0.4;margin-top:2px">
                      {{ a.awardedAt | date:'d MMM yyyy' }}
                      @if (a.note) { · <span style="font-style:italic">{{ a.note }}</span> }
                    </div>
                  </div>

                  <!-- Remove -->
                  <button mat-icon-button style="width:28px;height:28px;line-height:28px;flex-shrink:0;opacity:0.35"
                          (click)="revokeAchievement(a)" matTooltip="Remove">
                    <mat-icon style="font-size:16px;line-height:28px">close</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Points section -->
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span style="font-size:0.8rem;font-weight:700;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em">Points</span>
            @if (stats()) {
              <span style="font-size:1rem;font-weight:800;color:#FFD700">{{ stats()!.totalPoints }}</span>
              <span style="font-size:0.7rem;opacity:0.4">total</span>
            }
          </div>

          @if (stats()?.breakdown?.length) {
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
              @for (b of stats()!.breakdown; track b.source) {
                <span [matTooltip]="b.label + ': ' + b.points + ' pts'"
                  style="font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:10px"
                  [style.background]="b.source === 'badge' ? 'rgba(171,71,188,0.15)' : b.source === 'sprint' ? 'rgba(100,181,246,0.15)' : 'rgba(255,167,38,0.15)'"
                  [style.color]="b.source === 'badge' ? '#ce93d8' : b.source === 'sprint' ? '#64b5f6' : '#ffb74d'">
                  {{ b.label }} {{ b.points }}
                </span>
              }
            </div>
          }

          @if (!showBonusForm()) {
            <button mat-stroked-button style="font-size:0.75rem;height:28px;line-height:28px;padding:0 10px" (click)="showBonusForm.set(true)">
              <mat-icon style="font-size:14px;vertical-align:middle;margin-right:2px">add</mat-icon> Award bonus points
            </button>
          } @else {
            <div style="display:flex;gap:8px;align-items:flex-start">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:80px">
                <mat-label>Pts</mat-label>
                <input matInput type="number" [(ngModel)]="bonusPoints" [ngModelOptions]="{standalone:true}" min="1" max="100">
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" style="flex:1">
                <mat-label>Reason</mat-label>
                <input matInput [(ngModel)]="bonusReason" [ngModelOptions]="{standalone:true}">
              </mat-form-field>
              <button mat-icon-button color="primary" [disabled]="!bonusPoints || !bonusReason" (click)="awardBonus()" matTooltip="Confirm">
                <mat-icon>check</mat-icon>
              </button>
              <button mat-icon-button (click)="showBonusForm.set(false)" matTooltip="Cancel">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class TeamMemberFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(TeamMemberService);
  private achievementSvc = inject(AchievementService);
  private leaderboardSvc = inject(LeaderboardService);
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<TeamMemberFormComponent>);
  data: { member?: TeamMember; allMembers: TeamMember[] } = inject(MAT_DIALOG_DATA);

  achievements = signal<MemberAchievement[]>([]);
  stats = signal<LeaderboardEntry | null>(null);
  showBonusForm = signal(false);
  bonusPoints: number | null = null;
  bonusReason = '';

  readonly CATEGORY_COLORS = CATEGORY_COLORS;
  catStyle(cat: string) { return CATEGORY_COLORS[cat] ?? { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)' }; }

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['Member', Validators.required],
    teamLeadId: [null as string | null],
    crafts: [[] as string[]],
    isActive: [true],
    birthDate: [null as Date | null],
    joinDate:  [null as Date | null]
  });

  get teamLeads() {
    return this.data.allMembers.filter(m => m.role === 'TeamLead' || m.role === 'TechLead');
  }

  ngOnInit() {
    if (this.data.member) {
      this.form.patchValue({
        ...this.data.member,
        birthDate: this.data.member.birthDate ? new Date(this.data.member.birthDate) : null,
        joinDate:  this.data.member.joinDate  ? new Date(this.data.member.joinDate)  : null,
      } as any);
      this.loadAchievements();
      this.refreshStats();
    }
  }

  private loadAchievements() {
    this.achievementSvc.getForMember(this.data.member!.id)
      .subscribe(list => this.achievements.set(list));
  }

  openAward() {
    const awardedIds = new Set(this.achievements().map(a => a.achievementId));

    const ref = this.dialog.open(AwardAchievementDialogComponent, {
      width: '520px',
      data: {
        memberId: this.data.member!.id,
        memberName: `${this.data.member!.firstName} ${this.data.member!.lastName}`,
        awardedIds
      }
    });

    ref.afterClosed().subscribe((achievement: Achievement | undefined) => {
      if (!achievement) return;
      this.achievementSvc.award(this.data.member!.id, achievement.id).subscribe(() => {
        this.loadAchievements();
        this.refreshStats();
      });
    });
  }

  revokeAchievement(a: MemberAchievement) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Remove achievement?', message: `Remove "${a.achievementName}" from this team member?`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.achievementSvc.revoke(a.id).subscribe(() => {
        this.achievements.update(list => list.filter(x => x.id !== a.id));
        this.refreshStats();
      });
    });
  }

  awardBonus() {
    if (!this.bonusPoints || !this.bonusReason || !this.data.member) return;
    this.leaderboardSvc.awardPoints(this.data.member.id, this.bonusPoints, this.bonusReason)
      .subscribe(() => {
        this.bonusPoints = null;
        this.bonusReason = '';
        this.showBonusForm.set(false);
        this.refreshStats();
      });
  }

  private refreshStats() {
    if (this.data.member)
      this.leaderboardSvc.getMemberStats(this.data.member.id).subscribe(s => this.stats.set(s));
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.value;
    const toDateStr = (d: Date | null | undefined) => d ? d.toISOString().slice(0, 10) : null;
    const payload = { ...val, birthDate: toDateStr(val.birthDate as any), joinDate: toDateStr(val.joinDate as any) };
    const obs = this.data.member
      ? this.svc.update(this.data.member.id, payload as any)
      : this.svc.create(payload as any);
    obs.subscribe(() => this.dialogRef.close(true));
  }
}
