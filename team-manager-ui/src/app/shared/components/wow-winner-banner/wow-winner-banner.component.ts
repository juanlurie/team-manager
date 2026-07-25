import { Component, input, output, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AiBadgeComponent } from '../ai-badge/ai-badge.component';
import { WinnerImageService } from '../../services/winner-image.service';

@Component({
  selector: 'app-wow-winner-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, AiBadgeComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="background:linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,165,0,0.08));border:1px solid rgba(255,215,0,0.35);border-radius:14px;padding:20px 24px;margin-bottom:20px;text-align:center">
      <div style="font-size:2.4rem;margin-bottom:4px">🏆</div>
      <div style="font-size:1.2rem;font-weight:800;color:#FFD700">{{winnerNomineeName()}}</div>
      @if (winnerTitle()) {
        <div style="font-size:0.95rem;opacity:0.8;margin-top:4px">{{winnerTitle()}}</div>
      }
      @if (showPoints()) {
        <div style="margin-top:12px;display:inline-block;background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.4);border-radius:8px;padding:8px 14px">
          <span style="font-size:0.85rem;font-weight:700;color:#B8860B">🏅 Weekly Champion +10 points</span>
        </div>
      }
      @if (winnerStory()) {
        <div style="margin-top:16px;background:rgba(0,0,0,0.25);border:1px solid rgba(255,215,0,0.2);border-radius:10px;padding:14px 16px;text-align:left">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:#FFD700;opacity:0.7;margin-bottom:8px">✨ Hero Story<app-ai-badge /></div>
          <div style="font-size:0.88rem;line-height:1.6;opacity:0.85;white-space:pre-wrap">{{winnerStory()}}</div>
          <button mat-stroked-button (click)="copyStory.emit(winnerStory()!)"
                  style="margin-top:10px;font-size:0.75rem;height:28px;line-height:28px;min-width:0;padding:0 12px;color:rgba(255,215,0,0.8);border-color:rgba(255,215,0,0.3)">
            <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;margin-right:4px">content_copy</mat-icon>
            Copy story
          </button>
        </div>
      }
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px">
        <button mat-stroked-button (click)="copyImage()" [disabled]="copying() || sharing()"
                style="font-size:0.75rem;height:30px;line-height:30px;min-width:0;padding:0 12px;color:rgba(255,215,0,0.85);border-color:rgba(255,215,0,0.3)">
          <mat-icon style="font-size:15px;width:15px;height:15px;vertical-align:middle;margin-right:4px">image</mat-icon>
          {{ copying() ? 'Copying…' : 'Copy image' }}
        </button>
        <button mat-stroked-button (click)="shareImage()" [disabled]="copying() || sharing()"
                style="font-size:0.75rem;height:30px;line-height:30px;min-width:0;padding:0 12px;color:rgba(255,215,0,0.85);border-color:rgba(255,215,0,0.3)">
          <mat-icon style="font-size:15px;width:15px;height:15px;vertical-align:middle;margin-right:4px">share</mat-icon>
          {{ sharing() ? 'Preparing…' : 'Share image' }}
        </button>
      </div>

      <div style="font-size:0.75rem;opacity:0.45;margin-top:12px">Winner of the Week</div>
    </div>
  `
})
export class WowWinnerBannerComponent {
  private images = inject(WinnerImageService);
  private snack = inject(MatSnackBar);

  winnerNomineeName = input.required<string>();
  winnerTitle = input<string | null>(null);
  winnerStory = input<string | null>(null);
  showPoints = input(true);

  copyStory = output<string>();

  copying = signal(false);
  sharing = signal(false);

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
}
