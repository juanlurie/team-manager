import { Component, input, output, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { TeamMember } from '../../models/team-member.model';
import { AvatarCircleComponent } from './avatar-circle.component';

@Component({
  selector: 'app-member-row',
  standalone: true,
  imports: [AvatarCircleComponent],
  template: `
    <div class="k-row" [class.active]="isActive()" [class.selected]="isSelected()"
         [id]="rowId" role="option" [attr.aria-selected]="isSelected()"
         (click)="onSelect()" (mouseenter)="onHover()">
      <app-avatar-circle [memberId]="member().id"
                          [name]="member().firstName + ' ' + member().lastName"
                          [size]="20" />
      <span class="k-row-name" [title]="member().firstName + ' ' + member().lastName">
        {{ member().firstName }} {{ member().lastName }}
      </span>
      <span class="k-row-meta">{{ memberMeta() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .k-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      color: #E7E9F2;
      transition: background-color 100ms ease;
      min-height: 32px;
    }
    .k-row:hover, .k-row.active {
      background: #252A3D;
    }
    .k-row.selected .k-row-name::after {
      content: ' ✓';
      color: #98C379;
      font-size: 11px;
    }
    .k-row-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }
    .k-row-meta {
      font-size: 11px;
      font-weight: 500;
      color: #6F7693;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
      flex-shrink: 0;
    }
  `]
})
export class MemberRowComponent {
  readonly member = input.required<TeamMember>();
  readonly isActive = input<boolean>(false);
  readonly isSelected = input<boolean>(false);

  readonly select = output<TeamMember>();
  readonly hover = output<void>();

  get rowId(): string {
    return `member-row-${this.member().id}`;
  }

  protected memberMeta = () => {
    const m = this.member();
    const squads = m.squads?.map(s => s.name).filter(Boolean) || [];
    if (squads.length > 0) return squads.join(', ');
    if (m.role) return m.role;
    return '';
  };

  onSelect(): void {
    this.select.emit(this.member());
  }

  @HostListener('mouseenter')
  onHover(): void {
    this.hover.emit();
  }
}
