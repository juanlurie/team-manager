import { Component, input, signal, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import QRCode from 'qrcode';

/**
 * Session-platform primitive (part of Session Identity — see docs/session-platform.md):
 * one shared "scan or copy to join" affordance for any session type.
 *
 * Takes the full join URL and renders a QR of it, plus (optionally) the friendly join code
 * with a copy-the-link button. It is deliberately URL-agnostic — it doesn't care whether the
 * URL carries an opaque guest token (WoW) or a friendly slug (Retro), so every session type
 * shares one generator instead of hand-rolling QR logic per feature.
 *
 * The QR is regenerated only when the URL changes (an effect), never on every render.
 */
@Component({
  selector: 'app-session-join',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (qrDataUrl(); as qr) {
      <div class="join">
        <div class="qr-frame">
          <img class="qr" [src]="qr" [style.width.px]="size()" [style.height.px]="size()" alt="Scan to join this session" />
        </div>
        @if (code(); as c) {
          <button class="code" type="button" (click)="copyLink()"
                  [title]="copied() ? 'Copied!' : 'Copy the join link'">
            {{ copied() ? '✓ link copied' : c }}
          </button>
        }
      </div>
    }
  `,
  styles: [`
    .join { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    /* White frame keeps the QR's quiet zone intact and scannable on a dark surface. */
    .qr-frame { background: #fff; padding: 8px; border-radius: 8px; line-height: 0; }
    .qr { display: block; }
    .code {
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 6px 12px;
      border-radius: 999px;
      cursor: pointer;
      color: var(--ds-text, #e6edf3);
      background: var(--ds-surface-2, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--ds-border, rgba(255, 255, 255, 0.15));
      transition: background 0.15s;
    }
    .code:hover { background: var(--ds-surface-3, rgba(255, 255, 255, 0.12)); }
  `]
})
export class SessionJoinComponent {
  /** Full join URL encoded into the QR and copied by the code button. Null renders nothing. */
  url = input<string | null>(null);
  /** Optional friendly join code (e.g. "crisp-gecko"). When set, it shows under the QR as a
   *  copy-the-link button; omit it (WoW's opaque token URL) to render the QR alone. */
  code = input<string | null>(null);
  /** QR side length in px. */
  size = input(200);

  private snack = inject(MatSnackBar);
  readonly qrDataUrl = signal<string | null>(null);
  readonly copied = signal(false);

  constructor() {
    effect(() => {
      const u = this.url();
      if (!u) { this.qrDataUrl.set(null); return; }
      QRCode.toDataURL(u, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(dataUrl => this.qrDataUrl.set(dataUrl))
        .catch(() => this.qrDataUrl.set(null));
    });
  }

  copyLink(): void {
    const u = this.url();
    if (!u) return;
    navigator.clipboard.writeText(u)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1500);
      })
      .catch(() => this.snack.open('Failed to copy link', 'Close', { duration: 3000 }));
  }
}
