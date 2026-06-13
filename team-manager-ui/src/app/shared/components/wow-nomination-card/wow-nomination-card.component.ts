import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WowNominationDisplay } from '../../../core/models/win-week.model';

@Component({
  selector: 'app-wow-nomination-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div [style.border]="isTied() ? '1px solid rgba(255,87,34,0.4)' : '1px solid rgba(255,255,255,0.08)'"
         [style.background]="isTied() ? 'rgba(255,87,34,0.06)' : 'rgba(255,255,255,0.03)'"
         style="display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:12px;transition:border 0.3s,background 0.3s">
      <!-- Avatar -->
      <div [style.background]="isTied() ? 'rgba(255,87,34,0.15)' : 'rgba(255,215,0,0.12)'"
           [style.color]="isTied() ? '#ff7043' : '#FFD700'"
           [style.border]="isTied() ? '1px solid rgba(255,87,34,0.4)' : '1px solid rgba(255,215,0,0.3)'"
           style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.85rem;font-weight:700">
        {{initials()}}
      </div>

      <!-- Content -->
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.95rem">{{nomination().nomineeName}}</div>
        <div style="font-weight:600;font-size:0.85rem;margin-top:2px">{{nomination().title}}</div>
        @if (nomination().description) {
          <div style="font-size:0.8rem;opacity:0.55;margin-top:4px;line-height:1.4">{{nomination().description}}</div>
        }
        <div style="font-size:0.7rem;opacity:0.35;margin-top:8px">Nominated by {{nomination().nominatorName}}</div>
      </div>

      <!-- Edit/Delete (owner, nominating phase) -->
      @if (canEdit() && weekStatus() === 'Nominating') {
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button mat-icon-button style="width:32px;height:32px;line-height:32px"
                  matTooltip="Edit nomination" (click)="editClick.emit(nomination())">
            <mat-icon style="font-size:18px;width:18px;height:18px;color:rgba(255,255,255,0.4)">edit</mat-icon>
          </button>
          <button mat-icon-button style="width:32px;height:32px;line-height:32px"
                  matTooltip="Delete nomination" (click)="deleteClick.emit(nomination().id)">
            <mat-icon style="font-size:18px;width:18px;height:18px;color:rgba(239,83,80,0.6)">delete</mat-icon>
          </button>
        </div>
      }

      <!-- Vote section -->
      @if (weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath' || weekStatus() === 'Closed') {
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;min-width:60px">
          <div style="font-size:1.1rem;font-weight:800;opacity:0.8">{{nomination().voteCount}}</div>
          <div style="font-size:0.6rem;opacity:0.4;text-transform:uppercase">votes</div>
          @if (weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath') {
            @if (nomination().hasVoted) {
              <button mat-stroked-button color="warn" (click)="removeVoteClick.emit(nomination().id)"
                      style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                Voted ✓
              </button>
            } @else if (votesRemaining() > 0) {
              <button mat-stroked-button color="primary" (click)="voteClick.emit(nomination().id)"
                      style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                Vote
              </button>
            } @else {
              <button mat-stroked-button disabled
                      style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                Max votes
              </button>
            }
          }
        </div>
      }
    </div>
  `
})
export class WowNominationCardComponent {
  nomination = input.required<WowNominationDisplay>();
  weekStatus = input.required<'Nominating' | 'Voting' | 'SuddenDeath' | 'Closed'>();
  canEdit = input(false);
  votesRemaining = input(0);
  isTied = input(false);

  voteClick = output<string>();
  removeVoteClick = output<string>();
  editClick = output<WowNominationDisplay>();
  deleteClick = output<string>();

  initials() {
    return this.nomination().nomineeName.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
  }
}
