import { Component, inject, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MemberSprintCard, SprintVotesResponse } from '../../../core/models/dashboard.model';
import { DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-sprint-vote-panel',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    @if (members.length === 0) {
      <div style="opacity:0.4;font-size:0.85rem;padding:24px 0">No members in this sprint yet.</div>
    } @else {
      <div style="border-radius:10px;background:rgba(255,255,255,0.03);
                  border:1px solid rgba(255,255,255,0.07);overflow:hidden">
        <div style="padding:8px 14px 6px;border-bottom:1px solid rgba(255,255,255,0.06);
                    display:flex;align-items:center;gap:8px">
          <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.4">Sprint MVP Vote</span>
          <span style="flex:1"></span>
          <button mat-stroked-button style="font-size:0.72rem;height:26px;line-height:26px;padding:0 10px;
                                            color:#ffd54f;border-color:rgba(255,213,79,0.4)"
                  [disabled]="voteData === null || voteData.votes.length === 0 || mvpAwarding"
                  (click)="awardMvp()"
                  matTooltip="Award Sprint MVP badge to the top vote-getter">
            🏆 Award MVP
          </button>
        </div>
        <div>
          @for (member of members; track member.sprintMemberId) {
            <div style="display:flex;align-items:center;gap:10px;padding:7px 14px;border-top:1px solid rgba(255,255,255,0.04)">
              <span style="font-size:0.8rem;font-weight:600;width:130px;flex-shrink:0;
                           overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ member.fullName }}</span>
              <span style="font-size:0.72rem;opacity:0.35;width:36px;flex-shrink:0">votes for</span>
              <select style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
                             border-radius:6px;padding:3px 8px;font-size:0.8rem;color:inherit;max-width:200px"
                      [value]="currentVoteFor(member.sprintMemberId)"
                      (change)="onVoteChange(member.sprintMemberId, $any($event.target).value)">
                <option value="" style="background:#1e1e2e">— no vote —</option>
                @for (opt of votableMembers(member.sprintMemberId); track opt.sprintMemberId) {
                  <option [value]="opt.sprintMemberId" style="background:#1e1e2e">{{ opt.fullName }}</option>
                }
              </select>
            </div>
          }
        </div>
        @if (voteData && voteData.tally.length > 0) {
          <div style="padding:10px 14px;border-top:1px solid rgba(255,255,255,0.06)">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.35;margin-bottom:8px">Tally</div>
            @for (row of voteData.tally; track row.sprintMemberId) {
              @if (row.votes > 0 || row.isMvp) {
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                  @if (row.isMvp) {
                    <span style="font-size:0.9rem" matTooltip="Sprint MVP awarded">🏆</span>
                  } @else {
                    <span style="width:1.2rem"></span>
                  }
                  <span style="font-size:0.8rem;font-weight:600;width:130px;flex-shrink:0;
                               overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ row.memberName }}</span>
                  <div style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.06)">
                    <div style="height:100%;border-radius:3px;background:#ffd54f;transition:width 0.3s"
                         [style.width.%]="voteBarWidth(row.votes)"></div>
                  </div>
                  <span style="font-size:0.78rem;font-weight:700;color:#ffd54f;width:16px;text-align:right">{{ row.votes }}</span>
                </div>
              }
            }
          </div>
        }
      </div>
    }
  `
})
export class SprintVotePanelComponent implements OnInit {
  @Input({ required: true }) sprintId!: string;
  @Input({ required: true }) members: MemberSprintCard[] = [];

  private dashSvc = inject(DashboardService);
  private snack = inject(MatSnackBar);

  voteData: SprintVotesResponse | null = null;
  mvpAwarding = false;

  ngOnInit() { this.loadVotes(); }

  loadVotes() {
    this.dashSvc.getVotes(this.sprintId).subscribe(data => this.voteData = data);
  }

  votableMembers(voterSprintMemberId: string) {
    return this.members.filter(m => m.sprintMemberId !== voterSprintMemberId);
  }

  currentVoteFor(voterSprintMemberId: string): string {
    return this.voteData?.votes.find(v => v.voterSprintMemberId === voterSprintMemberId)?.nomineeSprintMemberId ?? '';
  }

  onVoteChange(voterSprintMemberId: string, nomineeSprintMemberId: string) {
    if (!nomineeSprintMemberId) return;
    this.dashSvc.castVote(this.sprintId, voterSprintMemberId, nomineeSprintMemberId)
      .subscribe(() => this.loadVotes());
  }

  voteBarWidth(votes: number): number {
    const max = Math.max(...(this.voteData?.tally.map(t => t.votes) ?? [1]));
    return max > 0 ? (votes / max) * 100 : 0;
  }

  awardMvp() {
    this.mvpAwarding = true;
    this.dashSvc.awardMvp(this.sprintId).subscribe({
      next: () => {
        this.mvpAwarding = false;
        this.loadVotes();
        this.snack.open('🏆 Sprint MVP awarded!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.mvpAwarding = false;
        this.snack.open('No votes to award MVP from.', 'OK', { duration: 3000 });
      }
    });
  }
}
