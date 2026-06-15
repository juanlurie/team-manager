import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { getAvatarColor, getInitials } from './k-picker.utils';

@Component({
  selector: 'app-avatar-circle',
  standalone: true,
  template: `
    <div class="k-avatar" [style.width.px]="size()" [style.height.px]="size()"
         [style.background-color]="bgColor()" [style.font-size.px]="fontSize()"
         [title]="name()">
      {{ initials() }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .k-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: #FFFFFF;
      font-weight: 600;
      line-height: normal;
      flex-shrink: 0;
      user-select: none;
      overflow: hidden;
    }
  `]
})
export class AvatarCircleComponent {
  /** Team member ID (used for deterministic color hash) */
  readonly memberId = input.required<string>();
  /** Full display name (used for initials extraction and tooltip) */
  readonly name = input.required<string>();
  /** Avatar size in pixels (default: 20) */
  readonly size = input<number>(20);

  protected initials = computed(() => {
    const parts = this.name().split(' ').filter(Boolean);
    const first = parts[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    return getInitials(first, last);
  });

  protected bgColor = computed(() => getAvatarColor(this.memberId()));

  protected fontSize = computed(() => Math.max(8, Math.round(this.size() * 0.45)));
}
