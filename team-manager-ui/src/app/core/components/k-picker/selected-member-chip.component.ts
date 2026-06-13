import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TeamMember } from '../../models/team-member.model';
import { AvatarCircleComponent } from './avatar-circle.component';

@Component({
  selector: 'app-selected-member-chip',
  standalone: true,
  imports: [AvatarCircleComponent],
  template: `
    <span class="k-chip" [title]="member().firstName + ' ' + member().lastName">
      <app-avatar-circle [memberId]="member().id"
                          [name]="member().firstName + ' ' + member().lastName"
                          [size]="16" />
      <span class="k-chip-label">{{ member().firstName }} {{ member().lastName }}</span>
      <button class="k-chip-remove" (click)="onRemove($event)"
              [attr.aria-label]="'Remove ' + member().firstName + ' ' + member().lastName"
              tabindex="0">×</button>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .k-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #1A1E2C;
      border-radius: 6px;
      padding: 2px 6px 2px 2px;
      font-size: 12px;
      color: #E7E9F2;
      max-width: 160px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .k-chip-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
    }
    .k-chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: #8B90A8;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      opacity: 0.6;
      transition: opacity 100ms ease, background-color 100ms ease, color 100ms ease;
      flex-shrink: 0;
    }
    .k-chip-remove:hover {
      opacity: 1;
      background: rgba(255,255,255,0.1);
      color: #E7E9F2;
    }
    .k-chip-remove:focus-visible {
      outline: 2px solid #528BFF;
      outline-offset: 1px;
    }
  `]
})
export class SelectedMemberChipComponent {
  readonly member = input.required<TeamMember>();
  readonly remove = output<TeamMember>();

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.remove.emit(this.member());
  }
}
