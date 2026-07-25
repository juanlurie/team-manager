import { Injectable } from '@angular/core';

export interface WinnerCardData {
  name: string;
  title?: string | null;
  story?: string | null;
}

// Renders the Win of the Week winner as a self-contained PNG (no DOM-capture dependency) and
// provides copy-to-clipboard (for pasting into Teams) and share/download (WhatsApp on mobile via
// the Web Share API, download fallback on desktop). Drawing the card programmatically keeps the
// output crisp and deterministic regardless of the surrounding page styles.
@Injectable({ providedIn: 'root' })
export class WinnerImageService {
  private readonly scale = 2;         // render at 2x for crisp output
  private readonly width = 640;       // logical width in px
  private readonly pad = 40;

  async buildCard(data: WinnerCardData): Promise<Blob> {
    // Pass 1: lay text out on a throwaway context to measure the needed height.
    const measure = document.createElement('canvas').getContext('2d')!;
    const titleLines = data.title ? this.wrap(measure, data.title, '600 18px system-ui, sans-serif', this.width - this.pad * 2) : [];
    const storyInnerWidth = this.width - this.pad * 2 - 32; // story box has its own 16px padding
    const storyLines = data.story ? this.wrap(measure, data.story, '16px system-ui, sans-serif', storyInnerWidth) : [];

    let y = this.pad;
    y += 60;                    // trophy
    y += 40;                    // name
    if (titleLines.length) y += titleLines.length * 26 + 6;
    let storyBoxTop = 0, storyBoxHeight = 0;
    if (storyLines.length) {
      y += 20;
      storyBoxTop = y;
      storyBoxHeight = 16 + 24 + storyLines.length * 26 + 16; // pad + label + lines + pad
      y += storyBoxHeight;
    }
    y += 16 + 20;               // footer gap + footer text
    const totalHeight = y + 8;

    const canvas = document.createElement('canvas');
    canvas.width = this.width * this.scale;
    canvas.height = totalHeight * this.scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(this.scale, this.scale);
    ctx.textBaseline = 'top';

    // Background — dark card with a gold gradient wash and border.
    ctx.fillStyle = '#12121a';
    this.roundRect(ctx, 0, 0, this.width, totalHeight, 0);
    ctx.fill();
    const grad = ctx.createLinearGradient(0, 0, this.width, totalHeight);
    grad.addColorStop(0, 'rgba(255,215,0,0.14)');
    grad.addColorStop(1, 'rgba(255,165,0,0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, totalHeight);
    ctx.strokeStyle = 'rgba(255,215,0,0.35)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 1, 1, this.width - 2, totalHeight - 2, 16);
    ctx.stroke();

    let cy = this.pad;
    ctx.textAlign = 'center';
    const cx = this.width / 2;

    // Trophy
    ctx.font = '46px system-ui, sans-serif';
    ctx.fillText('🏆', cx, cy);
    cy += 60;

    // Name
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(this.truncate(measure, data.name, '800 30px system-ui, sans-serif', this.width - this.pad * 2), cx, cy);
    cy += 40;

    // Title
    if (titleLines.length) {
      cy += 6;
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      for (const line of titleLines) { ctx.fillText(line, cx, cy); cy += 26; }
    }

    // Story box
    if (storyLines.length) {
      cy += 20;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      this.roundRect(ctx, this.pad, storyBoxTop, this.width - this.pad * 2, storyBoxHeight, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,0,0.22)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, this.pad, storyBoxTop, this.width - this.pad * 2, storyBoxHeight, 12);
      ctx.stroke();

      const left = this.pad + 16;
      let sy = storyBoxTop + 16;
      ctx.textAlign = 'left';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,215,0,0.75)';
      ctx.fillText('✨ HERO STORY', left, sy);
      sy += 24;
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const line of storyLines) { ctx.fillText(line, left, sy); sy += 26; }
    }

    // Footer
    ctx.textAlign = 'center';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,215,0,0.55)';
    ctx.fillText('WINNER OF THE WEEK', cx, totalHeight - this.pad - 4);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not render image')), 'image/png'));
  }

  canShareFiles(blob: Blob): boolean {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof navigator.share !== 'function' || typeof nav.canShare !== 'function') return false;
    try {
      return nav.canShare({ files: [new File([blob], 'winner.png', { type: 'image/png' })] });
    } catch { return false; }
  }

  // Whether the browser can share image files via the native sheet — true on most mobile browsers,
  // false on typical desktop browsers. Used to pick the button set (native share vs desktop paths).
  canShareImages(): boolean {
    return this.canShareFiles(new Blob([new Uint8Array([0])], { type: 'image/png' }));
  }

  async copyImage(blob: Blob): Promise<void> {
    const w = window as unknown as { ClipboardItem?: typeof ClipboardItem };
    if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || !w.ClipboardItem) {
      throw new Error('Clipboard image copy is not supported in this browser');
    }
    await navigator.clipboard.write([new w.ClipboardItem({ 'image/png': blob })]);
  }

  async share(blob: Blob, filename: string, text: string): Promise<void> {
    const file = new File([blob], filename, { type: 'image/png' });
    await navigator.share({ files: [file], text });
  }

  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // --- text helpers ---

  private wrap(ctx: CanvasRenderingContext2D, text: string, font: string, maxWidth: number): string[] {
    ctx.font = font;
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      if (paragraph === '') { lines.push(''); continue; }
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  private truncate(ctx: CanvasRenderingContext2D, text: string, font: string, maxWidth: number): string {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
