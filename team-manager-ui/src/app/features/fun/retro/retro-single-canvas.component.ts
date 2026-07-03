import { Component, ChangeDetectionStrategy, ElementRef, HostListener, AfterViewInit, inject, input, output, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { AvatarCircleComponent } from '../../../core/components/k-picker/avatar-circle.component';
import { FunRetroSession, FunRetroCard, RetroColumn } from '../../../core/models/fun-retro.model';
import { RetroCanvasSidebarComponent, RetroCanvasTool } from './retro-canvas-sidebar.component';
import { RETRO_THEMES } from './retro-constants';

interface ZoneCardItem {
  card: FunRetroCard;
  x: number;
  y: number;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔'];

/**
 * One shared freeform pan/zoom canvas for the whole retro board, instead of a separate
 * canvas per column. Columns are laid out as fixed-width vertical "zones" sharing one
 * coordinate space -- zone membership (a card's `column`) is set once at creation and never
 * changes from where a card is dragged to; position is purely visual/layout.
 */
@Component({
  selector: 'app-retro-single-canvas',
  standalone: true,
  imports: [MatIconModule, CdkTextareaAutosize, AvatarCircleComponent, RetroCanvasSidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display:block; }
    .canvas-outer {
      position:relative;
      overflow:hidden;border:1px solid rgba(255,255,255,0.07);
      border-radius:10px;background:rgba(0,0,0,0.15);
      background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size:40px 40px;
      height:var(--canvas-height, calc(100vh - 260px));
      min-height:320px;
      cursor:grab;
    }
    .canvas-outer.panning { cursor:grabbing; }
    .canvas-outer.tool-add-card { cursor:crosshair; }
    .canvas-inner {
      position:absolute;top:0;left:0;
      transform-origin:0 0;will-change:transform;
      width:100%;min-height:100%;
    }
    .zone-color-bg {
      position:absolute;top:0;bottom:0;pointer-events:none;
    }
    .zone-theme-bg {
      /* top+bottom (not top alone) so this empty div actually has a nonzero box to paint a
         background into -- it previously only set top:0, which collapses an empty
         absolutely-positioned element to zero height, making the art invisible regardless
         of background-image. */
      position:absolute;top:0;bottom:0;pointer-events:none;
      background-repeat:no-repeat;background-position:center top 60px;background-size:240px 240px;
      opacity:0.16;image-rendering:pixelated;
    }
    .zone-divider {
      position:absolute;top:0;width:1px;background:rgba(255,255,255,0.08);pointer-events:none;
    }
    .zone-header {
      position:absolute;top:8px;display:flex;align-items:center;gap:6px;
    }
    .zone-title { font-size:0.82rem;font-weight:700; }
    .zone-count {
      font-size:0.7rem;padding:2px 7px;border-radius:12px;
      background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);
    }
    .zone-tidy-btn {
      display:inline-flex;align-items:center;gap:3px;
      background:transparent;border:none;
      border-radius:6px;color:rgba(255,255,255,0.7);cursor:pointer;
      font-size:0.7rem;font-family:inherit;font-weight:600;padding:0 7px 0 5px;
      height:22px;transition:background .12s,color .12s;
    }
    .zone-tidy-btn:hover { background:rgba(255,255,255,0.12);color:#fff; }
    .zone-tidy-btn mat-icon { font-size:13px;width:13px;height:13px;line-height:13px; }
    .canvas-zoom-controls {
      position:absolute;bottom:10px;right:10px;z-index:200;
      display:flex;align-items:center;gap:2px;
      background:rgba(20,20,24,0.85);border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;padding:2px;backdrop-filter:blur(4px);
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    }
    .cz-btn {
      display:inline-flex;align-items:center;justify-content:center;
      min-width:26px;height:26px;padding:0 6px;
      background:transparent;border:none;border-radius:6px;cursor:pointer;
      color:rgba(255,255,255,0.7);font-size:1rem;font-family:inherit;line-height:1;
      transition:background .12s,color .12s;
    }
    .cz-btn:hover { background:rgba(255,255,255,0.12);color:#fff; }
    .cz-pct { font-size:0.72rem;font-weight:600;min-width:42px;font-variant-numeric:tabular-nums; }
    .cz-fit mat-icon { font-size:16px;width:16px;height:16px;line-height:16px; }
    .cz-divider { width:1px;height:16px;background:rgba(255,255,255,0.15);margin:0 2px;flex-shrink:0; }
    .sticky {
      position:absolute;box-sizing:border-box;
      width:200px;min-height:90px;
      border-radius:4px;padding:10px 12px;
      box-shadow:2px 4px 12px rgba(0,0,0,0.35);
      cursor:grab;user-select:none;
      display:flex;flex-direction:column;gap:6px;
      transition:box-shadow 0.1s;
    }
    .sticky:active, .sticky.dragging { cursor:grabbing;box-shadow:4px 8px 24px rgba(0,0,0,0.5);z-index:100; }
    .sticky.no-drag { cursor:default; }
    .sticky-text { font-size:0.8rem;color:rgba(0,0,0,0.82);line-height:1.4;flex:1;overflow-wrap:anywhere;word-break:break-word; }
    .sticky-author { font-size:0.65rem;color:rgba(0,0,0,0.45); }
    .sticky-footer { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px; }
    .sticky-vote-row { display:flex;align-items:center;gap:0;margin-top:4px; }
    .sticky-vote-count { min-width:22px;text-align:center;font-size:0.7rem;font-weight:700;color:rgba(0,0,0,0.45);font-variant-numeric:tabular-nums; }
    .sticky-vote-count.has-votes { color:#e65100; }
    .sticky-vinc-btn, .sticky-vdec-btn {
      display:inline-flex;align-items:center;justify-content:center;
      width:22px;height:22px;border-radius:50%;
      border:1px solid rgba(0,0,0,0.18);background:transparent;
      color:rgba(0,0,0,0.4);cursor:pointer;font-size:14px;line-height:1;
      transition:all 0.15s;padding:0;
    }
    .sticky-vinc-btn:hover:not(:disabled) { background:rgba(230,81,0,0.12);border-color:rgba(230,81,0,0.4);color:#e65100; }
    .sticky-vdec-btn:hover:not(:disabled) { background:rgba(0,0,0,0.06);color:rgba(0,0,0,0.65); }
    .sticky-vinc-btn:disabled, .sticky-vdec-btn:disabled { opacity:0.25;cursor:default; }
    .sticky-reactions { display:flex;gap:3px;flex-wrap:wrap;margin-top:4px; }
    .sticky-reaction-btn {
      display:inline-flex;align-items:center;gap:2px;
      font-size:0.68rem;padding:2px 5px;border-radius:10px;
      border:1px solid rgba(0,0,0,0.15);background:transparent;
      color:rgba(0,0,0,0.55);cursor:pointer;
    }
    .sticky-reaction-btn.reacted { border-color:rgba(0,0,0,0.3);background:rgba(0,0,0,0.1); }
    .sticky-del-btn {
      position:absolute;top:6px;right:6px;
      background:transparent;border:none;color:rgba(0,0,0,0.35);
      cursor:pointer;font-size:16px;line-height:1;padding:2px;
      border-radius:4px;transition:color 0.15s;
    }
    .sticky-del-btn:hover { color:rgba(200,0,0,0.7); }
    .sticky-header { display:flex;align-items:center;gap:5px;margin-bottom:6px; }
    .sticky-edit-area {
      width:100%;box-sizing:border-box;border:none;outline:none;resize:none;
      background:transparent;font-size:0.8rem;color:rgba(0,0,0,0.82);line-height:1.4;
      font-family:inherit;padding:0;margin:0;flex:1;min-height:48px;
    }
    .sticky-text-editable { cursor:text; }
    .sticky-text-editable:hover { background:rgba(0,0,0,0.04);border-radius:4px; }
    .sticky-color-trigger { position:relative; margin-left:auto; }
    .sticky-color-dot {
      width:14px;height:14px;border-radius:50%;cursor:pointer;
      border:1.5px solid rgba(0,0,0,0.25);padding:0;transition:transform .1s;
    }
    .sticky-color-dot:hover { transform:scale(1.2); }
    .sticky.pending-sticky { box-shadow:4px 8px 24px rgba(0,0,0,0.5);z-index:150; }
  `],
  template: `
    @let s = session();
    @let cs = cols();
    <div class="canvas-outer" data-single-canvas
         [class.panning]="panningView()"
         [class.tool-add-card]="activeTool() === 'add-card'"
         [style.background-position]="view().panX + 'px ' + view().panY + 'px'"
         [style.background-size]="(40 * view().zoom) + 'px ' + (40 * view().zoom) + 'px'"
         (wheel)="onCanvasWheel($event)"
         (mousedown)="startPan($event)"
         (click)="onCanvasClick($event)"
         (dblclick)="onCanvasDoubleClick($event)">
      <app-retro-canvas-sidebar [activeTool]="activeTool()" (toolSelected)="activeTool.set($event)" />
      <div class="canvas-inner"
           [style.height.px]="canvasHeight()"
           [style.transform]="'translate(' + view().panX + 'px,' + view().panY + 'px) scale(' + view().zoom + ')'">
        @for (col of cs; track col.key; let zi = $index) {
          <div class="zone-color-bg" [style.left.px]="zoneOriginX(zi)" [style.width.px]="ZONE_WIDTH" [style.background]="col.color + '12'"></div>
        }
        @for (col of cs; track col.key; let zi = $index) {
          @if (themeUrl(zi); as bg) {
            <div class="zone-theme-bg" [style.left.px]="zoneOriginX(zi)" [style.width.px]="ZONE_WIDTH" [style.background-image]="bg"></div>
          }
        }
        @for (col of cs; track col.key; let zi = $index) {
          @let zItems = zoneItems()[zi] ?? [];
          <div class="zone-header" [style.left.px]="zoneOriginX(zi)" [style.width.px]="ZONE_WIDTH">
            <span class="zone-title" [style.color]="col.color">{{ col.label }}</span>
            <span class="zone-count">{{ zItems.length }}</span>
            @if (zItems.length > 1) {
              <button class="zone-tidy-btn" title="Arrange this zone's cards neatly" (mousedown)="$event.stopPropagation()" (click)="arrangeZone(zi)">
                <mat-icon>grid_view</mat-icon>Tidy
              </button>
            }
          </div>
          @if (zi > 0) {
            <div class="zone-divider" [style.left.px]="zoneOriginX(zi) - ZONE_GAP / 2" [style.height.px]="canvasHeight()"></div>
          }
        }
        @for (item of allItems(); track item.card.id) {
          <div class="sticky"
               [class.dragging]="draggingId() === item.card.id"
               [class.no-drag]="s?.phase === 'done'"
               [style.left.px]="item.x"
               [style.top.px]="item.y"
               [style.background]="resolveCardColor()(item.card)"
               (mousedown)="startDrag($event, item.card, item.x, item.y)">
            @if (item.card.text === null) {
              <div class="sticky-header">
                <app-avatar-circle [memberId]="item.card.authorId" [name]="item.card.authorName ?? ''" [avatarSeed]="item.card.authorAvatarSeed" [size]="18" />
                <span class="sticky-author" style="flex:1">{{ item.card.authorName }}</span>
              </div>
              <div style="display:flex;align-items:center;gap:5px;opacity:0.4;margin-top:6px">
                <mat-icon style="font-size:14px;height:14px;width:14px">lock</mat-icon>
                <span style="font-size:0.7rem;color:rgba(0,0,0,0.6)">Hidden until reveal</span>
              </div>
            } @else {
              @if (item.card.authorName) {
                <div class="sticky-header">
                  <app-avatar-circle [memberId]="item.card.authorId" [name]="item.card.authorName" [avatarSeed]="item.card.authorAvatarSeed" [size]="18" />
                  <span class="sticky-author" style="flex:1">{{ item.card.authorName }}</span>
                  @if (s?.phase === 'add' && item.card.isOwn) {
                    <button class="sticky-del-btn" (mousedown)="$event.stopPropagation()" (click)="cardDeleted.emit(item.card)">×</button>
                  }
                </div>
              }
              @if (editingCardId() === item.card.id) {
                <textarea class="sticky-edit-area"
                          [value]="editingText()"
                          (input)="editTextChanged.emit($any($event.target).value)"
                          (blur)="editSaved.emit(item.card)"
                          (keydown.enter)="$event.preventDefault(); editSaved.emit(item.card)"
                          (keydown.escape)="editCancelled.emit()"
                          (mousedown)="$event.stopPropagation()"
                          cdkTextareaAutosize></textarea>
              } @else {
                <div class="sticky-text"
                     [class.sticky-text-editable]="item.card.isOwn || s?.isCreator"
                     (mousedown)="$event.stopPropagation()"
                     (click)="(item.card.isOwn || s?.isCreator) && item.card.text !== null ? editStarted.emit(item.card) : null">
                  {{ item.card.text }}
                </div>
              }
              <div class="sticky-footer">
                @if (s?.phase === 'vote' || s?.phase === 'discuss' || s?.phase === 'done') {
                  <div class="sticky-vote-row">
                    @if (s?.phase === 'vote') {
                      <button class="sticky-vdec-btn" [disabled]="item.card.myVoteCount === 0"
                              (mousedown)="$event.stopPropagation()" (click)="voteToggled.emit(item.card)">−</button>
                    }
                    <span class="sticky-vote-count" [class.has-votes]="item.card.voteCount > 0">{{ item.card.voteCount }}</span>
                    @if (s?.phase === 'vote') {
                      <button class="sticky-vinc-btn" [disabled]="voteBudget() === 0 && item.card.myVoteCount === 0"
                              (mousedown)="$event.stopPropagation()" (click)="voteToggled.emit(item.card)">+</button>
                    }
                  </div>
                }
                @if (s?.phase === 'add' || s?.phase === 'vote' || s?.phase === 'discuss') {
                  <div class="sticky-color-trigger" (mousedown)="$event.stopPropagation()">
                    <button class="sticky-color-dot" [style.background]="resolveCardColor()(item.card)"
                            title="Change color" (click)="colorPickerRequested.emit({ event: $event, cardId: item.card.id })"></button>
                  </div>
                }
              </div>
              @if (s?.phase === 'discuss') {
                <div class="sticky-reactions">
                  @for (emoji of reactionEmojis; track emoji) {
                    <button class="sticky-reaction-btn" [class.reacted]="getReaction(item.card, emoji)?.mine"
                            (mousedown)="$event.stopPropagation()" (click)="reactionToggled.emit({ card: item.card, emoji })">
                      {{ emoji }} @if (getReactionCount(item.card, emoji) > 0) { <span>{{ getReactionCount(item.card, emoji) }}</span> }
                    </button>
                  }
                </div>
              }
            }
          </div>
        }
        @if (pendingCard(); as p) {
          <div class="sticky pending-sticky" [style.left.px]="p.x" [style.top.px]="p.y" [style.background]="pendingCardColor()">
            <textarea class="sticky-edit-area" #pendingInput
                      [value]="p.text"
                      (input)="pendingCard.set({ ...p, text: $any($event.target).value })"
                      (blur)="confirmPendingCard()"
                      (keydown.enter)="$event.preventDefault(); confirmPendingCard()"
                      (keydown.escape)="pendingCard.set(null)"
                      (mousedown)="$event.stopPropagation()"
                      cdkTextareaAutosize></textarea>
          </div>
        }
      </div>
      <div class="canvas-zoom-controls" (mousedown)="$event.stopPropagation()" (wheel)="$event.stopPropagation()">
        <button class="cz-btn" title="Zoom out" (click)="zoomBy(0.8)">−</button>
        <button class="cz-btn cz-pct" title="Reset zoom" (click)="resetView()">{{ zoomPercent() }}%</button>
        <button class="cz-btn" title="Zoom in" (click)="zoomBy(1.25)">+</button>
        <button class="cz-btn cz-fit" title="Fit to cards" (click)="fitCanvas()">
          <mat-icon>fit_screen</mat-icon>
        </button>
      </div>
    </div>
  `,
})
export class RetroSingleCanvasComponent implements AfterViewInit {
  private elRef = inject(ElementRef);

  session = input.required<FunRetroSession | null>();
  cols = input.required<RetroColumn[]>();
  voteBudget = input.required<number>();
  editingCardId = input.required<string | null>();
  editingText = input.required<string>();
  resolveCardColor = input.required<(card: FunRetroCard) => string>();

  voteToggled = output<FunRetroCard>();
  reactionToggled = output<{ card: FunRetroCard; emoji: string }>();
  cardDeleted = output<FunRetroCard>();
  colorPickerRequested = output<{ event: MouseEvent; cardId: string }>();
  editStarted = output<FunRetroCard>();
  editTextChanged = output<string>();
  editSaved = output<FunRetroCard>();
  editCancelled = output<void>();
  addCardRequested = output<{ column: string; text: string; x: number; y: number }>();
  positionCommitted = output<{ cardId: string; x: number; y: number }>();

  readonly reactionEmojis = REACTION_EMOJIS;
  // Wide enough for 3 sticky-columns per zone (200px cards) instead of 2 -- panning/zooming
  // is how the whole board gets navigated anyway, so there's no reason to cram zones as
  // tight as if they had to fit a fixed viewport like the old per-column canvases did.
  readonly ZONE_WIDTH = 680;
  readonly ZONE_GAP = 48;
  private readonly STICKY_W = 200;
  private readonly STICKY_GAP = 16;
  private readonly STICKY_MARGIN = 10;
  private readonly STICKY_MIN_H = 90;
  // Vertical space reserved at the top of every zone for its header (label/count/Tidy) --
  // rendered inside the pannable canvas content (not above it, unlike the old per-column
  // header which lived in its own DOM row outside a clipped .canvas-outer), so cards must
  // start below it or they'd overlap.
  private readonly ZONE_TOP_PAD = 40;
  private readonly MIN_ZOOM = 0.3;
  private readonly MAX_ZOOM = 2;

  activeTool = signal<RetroCanvasTool>('select');
  view = signal<{ zoom: number; panX: number; panY: number }>({ zoom: 1, panX: 0, panY: 0 });
  panningView = signal(false);
  draggingId = signal<string | null>(null);
  localPositions = signal<Record<string, { x: number; y: number }>>({});
  pendingCard = signal<{ x: number; y: number; text: string } | null>(null);

  private panState: { startMouseX: number; startMouseY: number; startPanX: number; startPanY: number } | null = null;
  private dragState: { id: string; startMouseX: number; startMouseY: number; startX: number; startY: number } | null = null;

  zoneOriginX(zoneIndex: number): number {
    return zoneIndex * (this.ZONE_WIDTH + this.ZONE_GAP);
  }

  /** Clamped to a valid zone index -- used only for visual purposes (pending-card accent
   *  color, which zone a click-to-place lands in). Never written back to card.column. */
  zoneIndexForX(x: number): number {
    const n = this.cols().length;
    if (n === 0) return 0;
    return Math.max(0, Math.min(n - 1, Math.floor(x / (this.ZONE_WIDTH + this.ZONE_GAP))));
  }

  themeUrl(zoneIndex: number): string | null {
    const theme = this.session()?.theme;
    if (!theme) return null;
    const def = RETRO_THEMES.find(t => t.id === theme);
    return def ? def.variantUrls[Math.min(zoneIndex, 2)] : null;
  }

  /** How many sticky-columns fit across one zone's width -- shared by the fallback grid
   *  below and arrangeZone() so they can't drift out of sync with ZONE_WIDTH. */
  private zoneColumnCount(): number {
    return Math.max(1, Math.floor((this.ZONE_WIDTH - this.STICKY_MARGIN * 2 + this.STICKY_GAP) / (this.STICKY_W + this.STICKY_GAP)));
  }

  zoneItems = computed<ZoneCardItem[][]>(() => {
    const s = this.session();
    const cs = this.cols();
    if (!s) return [];
    const localPos = this.localPositions();
    const numCols = this.zoneColumnCount();
    return cs.map((col, zi) => {
      const occupied: { x: number; y: number }[] = [];
      const result: ZoneCardItem[] = [];
      let idx = 0;
      const zoneX0 = this.zoneOriginX(zi);
      for (const card of s.cards.filter(c => c.column === col.key)) {
        const local = localPos[card.id];
        if (local) { result.push({ card, x: local.x, y: local.y }); occupied.push(local); continue; }
        if (card.positionX != null && card.positionY != null) {
          const pos = { x: card.positionX, y: card.positionY };
          result.push({ card, x: pos.x, y: pos.y }); occupied.push(pos); continue;
        }
        const rowH = this.STICKY_MIN_H + this.STICKY_GAP;
        let x: number, y: number;
        do {
          const c = idx % numCols;
          const row = Math.floor(idx / numCols);
          x = zoneX0 + c * (this.STICKY_W + this.STICKY_GAP) + this.STICKY_MARGIN;
          y = this.ZONE_TOP_PAD + row * rowH;
          idx++;
        } while (occupied.some(p => Math.abs(p.x - x) < (this.STICKY_W + this.STICKY_GAP) && Math.abs(p.y - y) < rowH));
        result.push({ card, x, y });
        occupied.push({ x, y });
      }
      return result;
    });
  });

  allItems = computed<ZoneCardItem[]>(() => this.zoneItems().flat());

  // Minimum height for the zone strip (and its background/theme-art fill) even when mostly
  // empty -- 400 felt cramped once zones got wider, especially with a colored background
  // making the short fill obvious.
  private readonly MIN_CANVAS_HEIGHT = 1200;

  canvasHeight(): number {
    const items = this.allItems();
    if (items.length === 0) return this.MIN_CANVAS_HEIGHT;
    const maxY = Math.max(...items.map(c => c.y + 200));
    return Math.max(this.MIN_CANVAS_HEIGHT, maxY + 20);
  }

  private outerEl(): HTMLElement | null {
    return (this.elRef.nativeElement as HTMLElement).querySelector('.canvas-outer[data-single-canvas]') as HTMLElement | null;
  }

  private setView(v: { zoom: number; panX: number; panY: number }): void {
    const { panX, panY } = this.clampPan(v.zoom, v.panX, v.panY);
    this.view.set({ zoom: v.zoom, panX, panY });
  }

  private clampPan(zoom: number, panX: number, panY: number): { panX: number; panY: number } {
    const outer = this.outerEl();
    if (!outer) return { panX, panY };
    const outerW = outer.clientWidth || 400;
    const outerH = outer.clientHeight || 400;
    const items = this.allItems();
    const cardW = this.STICKY_W;
    const margin = 200;
    const zoneStripW = this.cols().length * (this.ZONE_WIDTH + this.ZONE_GAP);
    const contentMaxX = Math.max(zoneStripW, items.length ? Math.max(...items.map(i => i.x + cardW)) + 20 : 400);
    const contentMaxY = this.canvasHeight();
    const scaledW = contentMaxX * zoom;
    const scaledH = contentMaxY * zoom;
    const maxPanX = outerW - margin;
    const minPanX = margin - scaledW;
    const maxPanY = outerH - margin;
    const minPanY = margin - scaledH;
    return {
      panX: Math.min(maxPanX, Math.max(minPanX, panX)),
      panY: Math.min(maxPanY, Math.max(minPanY, panY)),
    };
  }

  private clampZoom(z: number): number {
    return Math.min(this.MAX_ZOOM, Math.max(this.MIN_ZOOM, z));
  }

  zoomPercent(): number {
    return Math.round(this.view().zoom * 100);
  }

  resetView(): void {
    this.setView(this.overviewView());
  }

  /** Starting view: zoomed out enough to show every zone at once (an overview the host can
   *  then zoom in from), rather than defaulting to 100% -- at 100% only one or two zones
   *  are visible in a typical viewport, and there's no reason to start that cramped when
   *  panning/zooming out is exactly what you'd otherwise have to do immediately anyway. */
  private overviewView(): { zoom: number; panX: number; panY: number } {
    const outer = this.outerEl();
    const pad = 24;
    const totalWidth = this.cols().length * (this.ZONE_WIDTH + this.ZONE_GAP) - this.ZONE_GAP;
    if (!outer || totalWidth <= 0) return { zoom: 1, panX: pad, panY: pad };
    const zoom = this.clampZoom(Math.min((outer.clientWidth - pad * 2) / totalWidth, 1));
    return { zoom, panX: pad, panY: pad };
  }

  ngAfterViewInit(): void {
    // The parent (RetroComponent) sets this canvas's full-bleed margins and height via its
    // own requestAnimationFrame after *its* AfterViewInit -- wait a frame so this reads the
    // settled width instead of the pre-full-bleed one.
    requestAnimationFrame(() => this.setView(this.overviewView()));
  }

  private zoomAt(factor: number, cx: number, cy: number): void {
    const v = this.view();
    const z = this.clampZoom(v.zoom * factor);
    const wx = (cx - v.panX) / v.zoom;
    const wy = (cy - v.panY) / v.zoom;
    this.setView({ zoom: z, panX: cx - wx * z, panY: cy - wy * z });
  }

  onCanvasWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.zoomAt(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - rect.left, e.clientY - rect.top);
  }

  zoomBy(factor: number): void {
    const outer = this.outerEl();
    this.zoomAt(factor, (outer?.clientWidth ?? 0) / 2, (outer?.clientHeight ?? 0) / 2);
  }

  startPan(e: MouseEvent): void {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('.sticky') || t.closest('.canvas-zoom-controls') || t.closest('app-retro-canvas-sidebar')) return;
    const v = this.view();
    this.panState = { startMouseX: e.clientX, startMouseY: e.clientY, startPanX: v.panX, startPanY: v.panY };
    this.panningView.set(true);
  }

  fitCanvas(): void {
    const outer = this.outerEl();
    const items = this.allItems();
    if (!outer || items.length === 0) { this.setView({ zoom: 1, panX: 0, panY: 0 }); return; }
    const inner = outer.querySelector('.canvas-inner') as HTMLElement | null;
    const stickies = inner ? (Array.from(inner.querySelectorAll(':scope > .sticky')) as HTMLElement[]) : [];
    const cardW = this.STICKY_W;
    const pad = 20;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach((item, i) => {
      const h = stickies[i]?.offsetHeight || 90;
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + cardW);
      maxY = Math.max(maxY, item.y + h);
    });
    const contentW = (maxX - minX) + pad * 2;
    const contentH = (maxY - minY) + pad * 2;
    const zoom = this.clampZoom(Math.min(outer.clientWidth / contentW, outer.clientHeight / contentH, 1));
    const slackX = outer.clientWidth - contentW * zoom;
    const slackY = outer.clientHeight - contentH * zoom;
    const offX = slackX > 0 ? slackX / 2 : 0;
    const offY = slackY > 0 ? slackY / 2 : 8;
    this.setView({ zoom, panX: offX - (minX - pad) * zoom, panY: offY - (minY - pad) * zoom });
  }

  arrangeZone(zoneIndex: number): void {
    const s = this.session();
    const col = this.cols()[zoneIndex];
    if (!s || !col) return;
    const items = this.zoneItems()[zoneIndex] ?? [];
    if (items.length === 0) return;

    const el = this.elRef.nativeElement as HTMLElement;
    const inner = el.querySelector('.canvas-outer[data-single-canvas] .canvas-inner') as HTMLElement | null;
    const allStickies = inner ? (Array.from(inner.querySelectorAll(':scope > .sticky')) as HTMLElement[]) : [];
    const allItemsFlat = this.allItems();
    const heightFor = (cardId: string) => {
      const idx = allItemsFlat.findIndex(i => i.card.id === cardId);
      return (idx >= 0 && allStickies[idx]?.offsetHeight) || 90;
    };

    const cardW = this.STICKY_W;
    const gap = this.STICKY_GAP;
    const margin = this.STICKY_MARGIN;
    const zoneX0 = this.zoneOriginX(zoneIndex);
    const numCols = this.zoneColumnCount();

    const colBottom = new Array(numCols).fill(this.ZONE_TOP_PAD);
    const updates: { id: string; x: number; y: number }[] = [];

    items.forEach(item => {
      const h = heightFor(item.card.id);
      let target = 0;
      for (let c = 1; c < numCols; c++) {
        if (colBottom[c] < colBottom[target]) target = c;
      }
      const x = zoneX0 + margin + target * (cardW + gap);
      const y = colBottom[target];
      colBottom[target] = y + h + gap;
      updates.push({ id: item.card.id, x, y });
    });

    this.localPositions.update(p => {
      const next = { ...p };
      for (const u of updates) next[u.id] = { x: u.x, y: u.y };
      return next;
    });
    for (const u of updates) {
      this.positionCommitted.emit({ cardId: u.id, x: u.x, y: u.y });
    }
  }

  startDrag(e: MouseEvent, card: FunRetroCard, x: number, y: number): void {
    const s = this.session();
    if (e.button !== 0 || s?.phase === 'done') return;
    e.preventDefault();
    this.dragState = { id: card.id, startMouseX: e.clientX, startMouseY: e.clientY, startX: x, startY: y };
    this.draggingId.set(card.id);
  }

  onCanvasClick(e: MouseEvent): void {
    if (this.activeTool() !== 'add-card') return;
    if ((e.target as HTMLElement).closest('.sticky')) return;
    this.placeCardAt(e);
    this.activeTool.set('select');
  }

  /** Double-click empty canvas always adds a card here, regardless of which sidebar tool is
   *  active -- picking the Add-Card tool first was an unnecessary extra step for something
   *  this common, and double-click doesn't collide with panning (a plain drag) or dragging
   *  an existing card (guarded by the .sticky check, same as onCanvasClick). */
  onCanvasDoubleClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.sticky')) return;
    this.placeCardAt(e);
  }

  private placeCardAt(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const v = this.view();
    const worldX = (e.clientX - rect.left - v.panX) / v.zoom;
    const worldY = (e.clientY - rect.top - v.panY) / v.zoom;
    this.pendingCard.set({ x: worldX, y: worldY, text: '' });
  }

  pendingCardColor(): string {
    const p = this.pendingCard();
    const col = p ? this.cols()[this.zoneIndexForX(p.x)] : null;
    return col ? col.color + '55' : '#fff9c4';
  }

  confirmPendingCard(): void {
    const p = this.pendingCard();
    if (!p) return;
    const text = p.text.trim();
    this.pendingCard.set(null);
    if (!text) return;
    const col = this.cols()[this.zoneIndexForX(p.x)];
    if (!col) return;
    this.addCardRequested.emit({ column: col.key, text, x: p.x, y: p.y });
  }

  getReaction(card: FunRetroCard, emoji: string) {
    return card.reactions?.find(r => r.emoji === emoji);
  }

  getReactionCount(card: FunRetroCard, emoji: string): number {
    return card.reactions?.find(r => r.emoji === emoji)?.count ?? 0;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.panState) {
      const p = this.panState;
      const v = this.view();
      this.setView({
        zoom: v.zoom,
        panX: p.startPanX + (e.clientX - p.startMouseX),
        panY: p.startPanY + (e.clientY - p.startMouseY),
      });
      return;
    }
    if (!this.dragState) return;
    const zoom = this.view().zoom;
    const dx = (e.clientX - this.dragState.startMouseX) / zoom;
    const dy = (e.clientY - this.dragState.startMouseY) / zoom;
    const x = Math.max(0, this.dragState.startX + dx);
    const y = Math.max(0, this.dragState.startY + dy);
    this.localPositions.update(p => ({ ...p, [this.dragState!.id]: { x, y } }));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.panState) {
      this.panState = null;
      this.panningView.set(false);
      return;
    }
    if (!this.dragState) return;
    const { id } = this.dragState;
    const pos = this.localPositions()[id];
    if (pos) this.positionCommitted.emit({ cardId: id, x: pos.x, y: pos.y });
    this.dragState = null;
    this.draggingId.set(null);
  }
}
