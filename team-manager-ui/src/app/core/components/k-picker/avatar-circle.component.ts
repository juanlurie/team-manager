import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { getAvatarColor, getInitials } from './k-picker.utils';

@Component({
  selector: 'app-avatar-circle',
  standalone: true,
  template: `
    <div class="k-avatar" [style.width.px]="size()" [style.height.px]="size()"
         [style.background-color]="avatarSeed() ? 'transparent' : bgColor()"
         [style.font-size.px]="fontSize()"
         [title]="name()">
      @if (avatarSeed()) {
        <img [src]="avatarUrl()" [alt]="name()" [style.width.px]="size()" [style.height.px]="size()" style="border-radius:50%;object-fit:cover;display:block">
      } @else {
        {{ initials() }}
      }
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
  readonly memberId = input.required<string>();
  readonly name = input.required<string>();
  readonly avatarSeed = input<string | null>(null);
  readonly size = input<number>(20);

  protected initials = computed(() => {
    const parts = this.name().split(' ').filter(Boolean);
    const first = parts[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    return getInitials(first, last);
  });

  protected bgColor = computed(() => getAvatarColor(this.memberId()));
  protected fontSize = computed(() => Math.max(8, Math.round(this.size() * 0.45)));
  protected avatarUrl = computed(() => `https://api.multiavatar.com/${encodeURIComponent(this.avatarSeed()!)}.svg`);
}
