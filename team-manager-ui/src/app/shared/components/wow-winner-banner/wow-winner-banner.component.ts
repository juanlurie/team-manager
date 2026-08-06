import { Component, input, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AiBadgeComponent } from '../ai-badge/ai-badge.component';
import { AvatarCircleComponent } from '../../../core/components/k-picker/avatar-circle.component';
import { WinnerImageService } from '../../services/winner-image.service';

// 14 pieces on a ~2.6s loop. Left position, color, delay (so several are always mid-fall from
// the moment the banner mounts) and fall duration are all randomized per piece so the rain
// looks organic instead of a evenly-spaced sweep.
const CONFETTI_COLORS = ['var(--ds-gold)', 'var(--ds-primary)', 'var(--ds-accent)', 'var(--ds-success)', 'var(--ds-info)'];
function makeConfetti() {
  return Array.from({ length: 14 }, () => ({
    left: `${Math.random() * 96}%`,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: `${(-Math.random() * 2.6).toFixed(2)}s`,
    duration: `${(2.1 + Math.random() * 1.4).toFixed(2)}s`,
  }));
}

@Component({
  selector: 'app-wow-winner-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatMenuModule, AiBadgeComponent, AvatarCircleComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    :host { display: block; }
    .card {
      position: relative; overflow: hidden; text-align: center;
      padding: 26px 18px; margin-bottom: 20px; border-radius: 16px;
      background: radial-gradient(120% 100% at 50% -10%, rgba(245,197,66,0.18), rgba(245,197,66,0.03) 60%);
      border: 1px solid rgba(245,197,66,0.35);
    }
    .confetti { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
    /* Deliberately unconditional (not gated behind prefers-reduced-motion): on Linux without a
       running desktop settings portal (common on tiling-WM setups), Chromium/Firefox default
       that media feature to "reduce" even when nobody enabled it, which silently killed this
       for a real user. Not worth the accessibility nicety losing the feature outright for a
       celebratory, non-critical animation. */
    .confetti span { position: absolute; top: 0; width: 6px; height: 10px; opacity: 0; animation-name: confettiFall; animation-timing-function: ease-in; animation-iteration-count: infinite; }
    @keyframes confettiFall {
      0%   { transform: translateY(-40px) rotate(0deg); opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(220deg); opacity: 0; }
    }
    .ring-outer {
      position: relative; z-index: 1; width: 76px; height: 76px; border-radius: 50%;
      margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;
      background: conic-gradient(from 0deg, var(--ds-gold), #fff3c4, var(--ds-gold));
      box-shadow: 0 0 30px rgba(245,197,66,0.4);
      animation: ringSpin 6s linear infinite;
    }
    @keyframes ringSpin { to { transform: rotate(360deg); } }
    .ring-inner {
      width: 64px; height: 64px; border-radius: 50%; background: var(--ds-surface-sunken, #12141b);
      display: flex; align-items: center; justify-content: center; font-size: 1.8rem;
      transform: rotate(0deg); /* counter-rotation not needed: emoji/avatar reads fine spinning with the ring */
      overflow: hidden;
    }
    .trophy-badge {
      position: absolute; bottom: -2px; right: -2px; z-index: 2; font-size: 1.05rem; line-height: 1;
      background: var(--ds-surface-sunken, #12141b); border-radius: 50%; padding: 3px;
      box-shadow: 0 0 0 2px var(--ds-surface-sunken, #12141b);
    }
    .name { position: relative; z-index: 1; font-weight: 800; font-size: 1.1rem; }
    .title { position: relative; z-index: 1; font-size: 0.85rem; color: var(--ds-text-muted); margin-top: 2px; }
    .points-chip {
      position: relative; z-index: 1; margin-top: 12px; display: inline-block;
      background: rgba(245,197,66,0.15); border: 1px solid rgba(245,197,66,0.4); border-radius: 8px; padding: 8px 14px;
    }
    .runners-up { position: relative; z-index: 1; display: flex; gap: 8px; margin-top: 16px; }
    .runner-card {
      flex: 1; background: rgba(255,255,255,0.03); border: 1px solid var(--ds-border);
      border-radius: 10px; padding: 9px; font-size: 0.72rem; text-align: center; color: var(--ds-text-muted);
    }
    .runner-name { color: rgba(255,255,255,0.75); font-weight: 600; }
    .story-block {
      position: relative; z-index: 1; margin-top: 16px; background: rgba(0,0,0,0.25);
      border: 1px solid rgba(245,197,66,0.2); border-radius: 10px; padding: 14px 16px; text-align: left;
    }
    .story-brewing {
      position: relative; z-index: 1; margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 10px;
      background: rgba(0,0,0,0.25); border: 1px solid rgba(245,197,66,0.2); border-radius: 10px; padding: 14px 16px;
      font-size: 0.82rem; color: var(--ds-text-muted); font-style: italic;
    }
    @keyframes brewPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
    .story-brewing span { animation: brewPulse 1.6s ease-in-out infinite; }
    .actions { position: relative; z-index: 1; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 16px; }
  `],
  template: `
    <div class="card">
      <div class="confetti">
        @for (c of confetti; track $index) {
          <span [style.left]="c.left" [style.background]="c.color"
                [style.animation-delay]="c.delay" [style.animation-duration]="c.duration"></span>
        }
      </div>

      <div class="ring-outer" style="position:relative">
        <div class="ring-inner">
          @if (winnerMemberId()) {
            <app-avatar-circle [memberId]="winnerMemberId()!" [name]="winnerNomineeName()" [avatarSeed]="winnerAvatarSeed()" [size]="64" />
          } @else {
            🏆
          }
        </div>
        @if (winnerMemberId()) {
          <span class="trophy-badge">🏆</span>
        }
      </div>

      <div class="name">{{winnerNomineeName()}}</div>
      @if (winnerTitle()) {
        <div class="title">{{winnerTitle()}}</div>
      }
      @if (showPoints()) {
        <div class="points-chip">
          <span style="font-size:0.85rem;font-weight:700;color:var(--ds-gold)">🏅 Weekly Champion +10 points</span>
        </div>
      }

      @if (runnersUp().length > 0) {
        <div class="runners-up">
          @for (r of runnersUp(); track r.name; let i = $index) {
            <div class="runner-card">
              <div><span class="runner-name">{{ i === 0 ? '🥈' : '🥉' }} {{ r.name }}</span></div>
              <div>{{ r.voteCount }} vote{{ r.voteCount === 1 ? '' : 's' }}</div>
            </div>
          }
        </div>
      }

      @if (!winnerStory() && storyPending()) {
        <div class="story-brewing">
          <mat-spinner diameter="16" strokeWidth="2" />
          <span>✨ Hero story brewing…</span>
        </div>
      }
      @if (winnerStory()) {
        <div class="story-block">
          <div style="display:flex;align-items:center;gap:6px;font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--ds-gold);opacity:0.7;margin-bottom:8px">
            <span>✨ Hero Story</span><app-ai-badge />
          </div>
          <div style="font-size:0.88rem;line-height:1.6;opacity:0.85;white-space:pre-wrap">{{winnerStory()}}</div>
        </div>
      }

      <div class="actions">
        @if (nativeShare) {
          <!-- Mobile: one tap straight into the OS share sheet, no menu needed. -->
          <button mat-stroked-button (click)="shareImage()" [disabled]="busy()"
                  style="font-size:0.75rem;height:30px;line-height:30px;min-width:0;padding:0 12px;color:rgba(245,197,66,0.85);border-color:rgba(245,197,66,0.3)">
            <mat-icon style="font-size:15px;width:15px;height:15px;vertical-align:middle;margin-right:4px">share</mat-icon>
            {{ sharing() ? 'Preparing…' : 'Share' }}
          </button>
        } @else {
          <!-- Desktop: no native file share, so one Share button opens a menu with the
               Copy/WhatsApp/Download paths instead of three separate buttons. -->
          <button mat-stroked-button [matMenuTriggerFor]="shareMenu" [disabled]="busy()"
                  style="font-size:0.75rem;height:30px;line-height:30px;min-width:0;padding:0 12px;color:rgba(245,197,66,0.85);border-color:rgba(245,197,66,0.3)">
            <mat-icon style="font-size:15px;width:15px;height:15px;vertical-align:middle;margin-right:4px">share</mat-icon>
            {{ busy() ? 'Working…' : 'Share' }}
          </button>
          <mat-menu #shareMenu="matMenu">
            <button mat-menu-item (click)="copyImage()">
              <mat-icon>content_copy</mat-icon>
              <span>Copy image</span>
            </button>
            <button mat-menu-item (click)="shareWhatsApp()">
              <mat-icon>chat</mat-icon>
              <span>WhatsApp</span>
            </button>
            <button mat-menu-item (click)="downloadImage()">
              <mat-icon>download</mat-icon>
              <span>Download</span>
            </button>
          </mat-menu>
        }
      </div>

      <div style="position:relative;z-index:1;font-size:0.75rem;opacity:0.45;margin-top:12px">Winner of the Week</div>
    </div>
  `
})
export class WowWinnerBannerComponent {
  private images = inject(WinnerImageService);
  private snack = inject(MatSnackBar);

  winnerNomineeName = input.required<string>();
  winnerMemberId = input<string | null>(null);
  winnerAvatarSeed = input<string | null>(null);
  winnerTitle = input<string | null>(null);
  winnerStory = input<string | null>(null);
  showPoints = input(true);
  runnersUp = input<{ name: string; voteCount: number }[]>([]);
  storyPending = input(false);

  readonly confetti = makeConfetti();

  copying = signal(false);
  sharing = signal(false);
  downloading = signal(false);

  // Picks the button set: native share sheet on mobile, desktop-specific paths otherwise.
  readonly nativeShare = this.images.canShareImages();

  busy() { return this.copying() || this.sharing() || this.downloading(); }

  private cardData() {
    return { name: this.winnerNomineeName(), title: this.winnerTitle(), story: this.winnerStory() };
  }

  private fileName() {
    return `winner-${this.winnerNomineeName().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'of-the-week'}.png`;
  }

  async copyImage() {
    if (this.copying()) return;
    this.copying.set(true);
    try {
      const blob = await this.images.buildCard(this.cardData());
      try {
        await this.images.copyImage(blob);
        this.snack.open('Winner image copied — paste it into Teams', 'OK', { duration: 3500 });
      } catch {
        // Clipboard image copy unsupported (e.g. Firefox) — fall back to a download.
        this.images.download(blob, this.fileName());
        this.snack.open("Your browser can't copy images — downloaded instead; attach it in Teams", 'OK', { duration: 5000 });
      }
    } catch {
      this.snack.open('Could not create the winner image', 'OK', { duration: 3500 });
    } finally {
      this.copying.set(false);
    }
  }

  async shareImage() {
    if (this.sharing()) return;
    this.sharing.set(true);
    try {
      const blob = await this.images.buildCard(this.cardData());
      const text = `🏆 Winner of the Week: ${this.winnerNomineeName()}`;
      if (this.images.canShareFiles(blob)) {
        try {
          await this.images.share(blob, this.fileName(), text);
        } catch (e: unknown) {
          // A user cancel (AbortError) is not an error worth reporting.
          if ((e as { name?: string })?.name !== 'AbortError') {
            this.images.download(blob, this.fileName());
            this.snack.open('Sharing failed — image downloaded; attach it in WhatsApp/Teams', 'OK', { duration: 5000 });
          }
        }
      } else {
        // Desktop browsers can't share a file to WhatsApp directly — download and let the user attach.
        this.images.download(blob, this.fileName());
        this.snack.open('Image downloaded — attach it in WhatsApp or Teams', 'OK', { duration: 5000 });
      }
    } catch {
      this.snack.open('Could not create the winner image', 'OK', { duration: 3500 });
    } finally {
      this.sharing.set(false);
    }
  }

  // Desktop WhatsApp: it can't receive a file via a URL, but WhatsApp Web accepts a pasted image.
  // So copy the image to the clipboard, open the web chat, and tell the user to paste.
  async shareWhatsApp() {
    if (this.busy()) return;
    this.sharing.set(true);
    try {
      const blob = await this.images.buildCard(this.cardData());
      try {
        await this.images.copyImage(blob);
        window.open('https://web.whatsapp.com/', '_blank', 'noopener');
        this.snack.open('Image copied — pick a chat in WhatsApp and paste it (Ctrl/Cmd+V)', 'OK', { duration: 6000 });
      } catch {
        // No clipboard image support — download and let the user attach it in WhatsApp Web.
        this.images.download(blob, this.fileName());
        window.open('https://web.whatsapp.com/', '_blank', 'noopener');
        this.snack.open('Image downloaded — attach it in the WhatsApp chat', 'OK', { duration: 6000 });
      }
    } catch {
      this.snack.open('Could not create the winner image', 'OK', { duration: 3500 });
    } finally {
      this.sharing.set(false);
    }
  }

  async downloadImage() {
    if (this.busy()) return;
    this.downloading.set(true);
    try {
      const blob = await this.images.buildCard(this.cardData());
      this.images.download(blob, this.fileName());
    } catch {
      this.snack.open('Could not create the winner image', 'OK', { duration: 3500 });
    } finally {
      this.downloading.set(false);
    }
  }
}
