import { Component, ChangeDetectionStrategy, ElementRef, HostListener, AfterViewInit, inject, input, output, signal, computed, viewChild, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { AvatarCircleComponent } from '../../../core/components/k-picker/avatar-circle.component';
import { FunRetroSession, FunRetroCard, RetroColumn, FunRetroToken, FunRetroTokenSize } from '../../../core/models/fun-retro.model';
import { RetroCanvasSidebarComponent, RetroCanvasTool } from './retro-canvas-sidebar.component';
import { RetroBgStyle } from './retro-constants';

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
         of background-image. The art itself is an SVG (vector pixel-grid rects), so scaling
         it up this much costs nothing in quality -- it stays crisp/blocky at any size. */
      position:absolute;top:0;bottom:0;pointer-events:none;
      /* The art is authored at 3x its original grid density (see retro-constants.ts), so a
         much bigger background-size here reads as a bigger, more detailed watermark instead
         of the same coarse art just stretched blurrier. Percentage-based (not a literal px
         value) so it scales with this zone's own width (ZONE_WIDTH) instead of drifting out
         of proportion with it. */
      background-repeat:no-repeat;background-position:center top 60px;background-size:115% 115%;
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
    /* Both scale via a CSS custom property (--tok-scale / --tw-scale, default 1 = medium) set
       inline per element from sizeScale() -- keeps every dimension proportional from one
       source of truth instead of a separate small/medium/large variant of each rule. */
    /* Same neon-border language as the cards (.sticky) -- a thick colored ring + soft glow --
       so tokens read as part of the same visual system instead of a separate, plainer thing. */
    .retro-token {
      position:absolute;width:calc(128px * var(--tok-scale, 1));height:calc(128px * var(--tok-scale, 1));
      display:flex;align-items:center;justify-content:center;
      font-size:calc(84px * var(--tok-scale, 1));line-height:1;cursor:grab;user-select:none;
      font-family:inherit;font-weight:800;color:#fff;
      background:rgba(30,30,34,0.92);border-radius:50%;
      border:4px solid rgba(100,181,246,0.65);
      box-shadow:0 0 0 1px rgba(100,181,246,0.25),0 3px 8px rgba(0,0,0,0.28);
      transition:transform .1s,border-color .15s,box-shadow .15s;
    }
    .retro-token:hover { transform:scale(1.1); }
    .retro-token.dragging { cursor:grabbing;z-index:50;transition:none; }
    .retro-token.placing-ghost { pointer-events:none;opacity:0.85;z-index:200; }
    .retro-token.selected {
      border-width:6px;border-color:#64b5f6;
      box-shadow:0 0 0 3px rgba(100,181,246,0.9),0 0 22px 6px rgba(100,181,246,0.6);
      z-index:150;
    }
    .retro-token-face-icon {
      font-size:calc(100px * var(--tok-scale, 1));width:calc(100px * var(--tok-scale, 1));
      height:calc(100px * var(--tok-scale, 1));line-height:calc(100px * var(--tok-scale, 1));
      color:rgba(255,255,255,0.95);
    }
    .retro-token-del {
      position:absolute;top:-12px;right:-12px;width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      border-radius:50%;background:rgba(0,0,0,0.7);color:rgba(255,255,255,0.7);
      border:none;font-size:24px;line-height:1;cursor:pointer;opacity:0;
      transition:opacity .12s;
    }
    .retro-token:hover .retro-token-del { opacity:1; }
    .retro-token-del:hover { color:#ef5350; }
    /* Draggable clock so the timer can be parked wherever's convenient on the board instead
       of only living in a header popover -- position is local to this viewer, not persisted. */
    .timer-widget {
      position:absolute;display:flex;align-items:center;gap:calc(30px * var(--tw-scale, 1));
      padding:calc(36px * var(--tw-scale, 1)) calc(66px * var(--tw-scale, 1));
      border-radius:calc(64px * var(--tw-scale, 1));cursor:grab;user-select:none;
      background:rgba(20,20,24,0.9);border:3px solid rgba(255,255,255,0.15);
      color:rgba(255,255,255,0.85);font-size:calc(4.2rem * var(--tw-scale, 1));font-weight:700;font-variant-numeric:tabular-nums;
      box-shadow:0 3px 10px rgba(0,0,0,0.35);z-index:20;
    }
    .timer-widget:active { cursor:grabbing; }
    .timer-widget.placing-ghost { pointer-events:none;opacity:0.85;z-index:200; }
    .timer-widget-danger { border-color:rgba(239,83,80,0.5);color:#ef5350; }
    .timer-widget-icon {
      font-size:calc(92px * var(--tw-scale, 1));width:calc(92px * var(--tw-scale, 1));
      height:calc(92px * var(--tw-scale, 1));line-height:calc(92px * var(--tw-scale, 1));
    }
    .timer-widget-del {
      position:absolute;top:-12px;right:-12px;width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      border-radius:50%;background:rgba(0,0,0,0.7);color:rgba(255,255,255,0.7);
      border:2px solid rgba(255,255,255,0.9);font-size:20px;line-height:1;cursor:pointer;opacity:0;
      transition:opacity .12s;
    }
    .timer-widget:hover .timer-widget-del { opacity:1; }
    .timer-widget-del:hover { color:#ef5350; }
    /* position:fixed (not absolute) and positioned from getBoundingClientRect() -- same
       convention as the color/sticker-palette popovers elsewhere in this file -- so the
       coordinates are viewport-relative and land exactly next to the item regardless of
       where .canvas-outer itself sits on the page. */
    .size-toolbar {
      position:fixed;display:flex;gap:4px;padding:4px;border-radius:8px;z-index:250;
      background:rgba(20,20,24,0.95);border:1px solid rgba(255,255,255,0.15);
      box-shadow:0 4px 12px rgba(0,0,0,0.4);
    }
    .size-toolbar button {
      width:30px;height:26px;border-radius:6px;border:none;background:transparent;
      color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.72rem;font-weight:700;font-family:inherit;
      transition:background .12s,color .12s;
    }
    .size-toolbar button:hover { background:rgba(255,255,255,0.1);color:#fff; }
    .size-toolbar button.active { background:rgba(100,181,246,0.25);color:#64b5f6; }
    /* position:fixed and anchored to placingScreenPos (viewport coordinates), offset up and
       right of the cursor so it sits right next to the ghost without covering it. */
    .size-toolbar-hint {
      position:fixed;z-index:250;
      background:rgba(20,20,24,0.9);border:1px solid rgba(255,255,255,0.15);border-radius:20px;
      padding:6px 14px;font-size:0.75rem;color:rgba(255,255,255,0.7);
      display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.4);
    }
    .size-toolbar-hint button {
      width:26px;height:22px;border-radius:6px;border:none;background:transparent;
      color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.72rem;font-weight:700;font-family:inherit;
      transition:background .12s,color .12s;
    }
    .size-toolbar-hint button:hover { background:rgba(255,255,255,0.1);color:#fff; }
    .size-toolbar-hint button.active { background:rgba(100,181,246,0.25);color:#64b5f6; }
    .sticky {
      position:absolute;box-sizing:border-box;
      width:240px;min-height:220px;
      border-radius:11px;padding:13px 15px;
      border:4px solid rgba(100,181,246,0.65);
      box-shadow:0 0 0 1px rgba(100,181,246,0.25),0 3px 8px rgba(0,0,0,0.28),0 1px 3px rgba(0,0,0,0.22);
      cursor:grab;user-select:none;
      display:flex;flex-direction:column;gap:6px;
      transition:box-shadow 0.15s,transform 0.15s,border-color 0.15s;
    }
    /* A slight per-card tilt (applied inline via cardRotation()) reads as notes actually
       stuck on a board rather than a rigid grid -- straightens out on hover/drag so the
       card you're interacting with feels settled and easy to read. */
    .sticky:hover, .sticky:active, .sticky.dragging { transform:rotate(0deg) !important; }
    .sticky:active, .sticky.dragging { cursor:grabbing;box-shadow:0 8px 20px rgba(0,0,0,0.4),0 2px 6px rgba(0,0,0,0.3);z-index:100; }
    /* Selected: even thicker border plus a full neon glow so the active card reads clearly
       above the rest of the board. */
    .sticky.selected {
      border-width:6px;
      border-color:#64b5f6;
      box-shadow:0 0 0 3px rgba(100,181,246,0.9),0 0 22px 6px rgba(100,181,246,0.6),0 6px 16px rgba(0,0,0,0.35);
      z-index:150;
    }
    .sticky.no-drag { cursor:default; }
    .sticky-text {
      font-size:1.05rem;font-weight:700;color:rgba(0,0,0,0.87);line-height:1.4;flex:1;
      overflow-wrap:anywhere;word-break:break-word;
      font-family:'Kalam','Segoe UI',system-ui,sans-serif;
    }
    /* Redacted-looking stand-in for hidden text -- occupies the same space real text would,
       so a hidden card still reads as "a card with writing on it" rather than a different,
       emptier-looking placeholder box. Each line is a tiled squiggle (a repeating wave, like
       the scribble you'd draw over illegible handwriting) instead of a solid bar. */
    .sticky-text-hidden {
      display:flex;flex-direction:column;gap:10px;flex:1;padding-top:5px;cursor:default;
    }
    .hidden-line {
      height:13px;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 12'%3E%3Cpath d='M0,6 C3,0 9,0 12,6 C15,12 21,12 24,6' stroke='rgba(0,0,0,0.32)' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat:repeat-x;background-size:24px 13px;background-position:left center;
    }
    .sticky-author { font-size:0.65rem;color:rgba(0,0,0,0.45); }
    .sticky-header app-avatar-circle {
      display:inline-flex;border-radius:50%;
      box-shadow:0 0 0 2px rgba(0,0,0,0.16),0 1px 2px rgba(0,0,0,0.2);
    }
    /* Cute circular badge overlapping the top edge, showing whether this card's author is
       still hidden ("locked", pre-reveal) or visible ("unlocked") -- mirrors the same idea
       as Spreo's private-writing lock/unlock indicator. */
    .sticky-lock-badge {
      position:absolute;top:8px;right:8px;
      width:26px;height:26px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 5px rgba(0,0,0,0.35);
      background:#e53935;color:#fff;
      z-index:1;
    }
    .sticky-lock-badge.unlocked { background:#43a047; }
    .sticky-lock-badge mat-icon { font-size:16px;width:16px;height:16px;line-height:16px; }
    .sticky-comment-badge {
      position:absolute;bottom:-10px;right:8px;
      display:flex;align-items:center;gap:2px;
      font-size:0.68rem;font-weight:700;color:#fff;font-family:inherit;
      background:#9c27b0;border:2px solid rgba(255,255,255,0.9);
      border-radius:12px;padding:2px 8px;cursor:pointer;
      box-shadow:0 2px 4px rgba(0,0,0,0.3);
    }
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
    .sticky-assignees { display:flex;align-items:center;gap:3px;flex-wrap:wrap;margin-top:4px; }
    .sticky-assign-btn {
      display:inline-flex;align-items:center;justify-content:center;
      width:20px;height:20px;border-radius:50%;
      border:1px dashed rgba(0,0,0,0.3);background:transparent;color:rgba(0,0,0,0.5);cursor:pointer;padding:0;
    }
    .sticky-assign-btn mat-icon { font-size:14px;width:14px;height:14px; }
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
    .sticky-header { display:flex;align-items:center;gap:5px;margin-bottom:6px;padding-right:28px; }
    .sticky-edit-area {
      width:100%;box-sizing:border-box;border:none;outline:none;resize:none;
      background:transparent;font-size:0.8rem;color:rgba(0,0,0,0.82);line-height:1.4;
      font-family:inherit;padding:0;margin:0;flex:1;min-height:48px;
    }
    /* Single click selects the whole card (same as everywhere else on it); only a
       double-click edits, so this shouldn't look like a plain text input on hover. */
    .sticky-text-editable { cursor:grab; }
    .sticky.pending-sticky { box-shadow:4px 8px 24px rgba(0,0,0,0.5);z-index:150; }
  `],
  template: `
    @let s = session();
    @let cs = cols();
    <div class="canvas-outer" data-single-canvas #canvasOuterEl
         [class.panning]="panningView()"
         [class.tool-add-card]="activeTool() === 'add-card'"
         [style.background-position]="view().panX + 'px ' + view().panY + 'px'"
         [style.background-size]="(40 * view().zoom) + 'px ' + (40 * view().zoom) + 'px'"
         (wheel)="onCanvasWheel($event)"
         (mousedown)="startPan($event)"
         (click)="onCanvasClick($event)"
         (dblclick)="onCanvasDoubleClick($event)">
      <app-retro-canvas-sidebar [activeTool]="activeTool()" [isHost]="s?.isCreator ?? false"
                                [showRevealAction]="showRevealAction()" [timerActive]="timerActive()"
                                (toolSelected)="activeTool.set($event)"
                                (stickerRequested)="requestStickerPalette($event, canvasOuterEl)"
                                (tidyRequested)="arrangeAllZones()"
                                (revealRequested)="revealRequested.emit()"
                                (timerRequested)="timerToggleRequested.emit($event)" />
      <div class="canvas-inner"
           [style.height.px]="canvasHeight()"
           [style.transform]="'translate(' + view().panX + 'px,' + view().panY + 'px) scale(' + view().zoom + ')'">
        @for (col of cs; track col.key; let zi = $index) {
          <div class="zone-color-bg" [style.left.px]="zoneOriginX(zi)" [style.width.px]="ZONE_WIDTH" [style.background]="col.color + '12'"></div>
        }
        @for (col of cs; track col.key; let zi = $index) {
          @if (themeUrl(zi); as bg) {
            <div class="zone-theme-bg" [style.left.px]="zoneOriginX(zi)" [style.width.px]="ZONE_WIDTH" [style.background-image]="bg"
                 [style.opacity]="themeBgStyle(zi)?.opacity ?? null" [style.mix-blend-mode]="themeBgStyle(zi)?.blend ?? null"
                 [style.background-size]="themeBgStyle(zi)?.size ?? null" [style.image-rendering]="themeBgStyle(zi) ? 'auto' : null"></div>
          }
        }
        @for (col of cs; track col.key; let zi = $index) {
          @let zItems = zoneItems()[zi] ?? [];
          <div class="zone-header" [style.left.px]="zoneOriginX(zi)" [style.width.px]="ZONE_WIDTH">
            <span class="zone-title" [style.color]="col.color">{{ col.label }}</span>
            <span class="zone-count">{{ zItems.length }}</span>
          </div>
          @if (zi > 0) {
            <div class="zone-divider" [style.left.px]="zoneOriginX(zi) - ZONE_GAP / 2" [style.height.px]="canvasHeight()"></div>
          }
        }
        @for (item of allItems(); track item.card.id) {
          <div class="sticky"
               [attr.data-card-id]="item.card.id"
               [class.dragging]="draggingId() === item.card.id"
               [class.selected]="selectedCardId() === item.card.id"
               [class.no-drag]="s?.phase === 'done'"
               [style.left.px]="item.x"
               [style.top.px]="item.y"
               [style.background]="resolveCardColor()(item.card)"
               [style.transform]="'rotate(' + cardRotation(item.card.id) + 'deg)'"
               (mousedown)="startDrag($event, item.card, item.x, item.y)">
            <div class="sticky-lock-badge" [class.unlocked]="item.card.text !== null" [title]="item.card.text === null ? 'Hidden until reveal' : 'Visible to everyone'">
              <mat-icon>{{ item.card.text === null ? 'lock' : 'lock_open' }}</mat-icon>
            </div>
            @if (item.card.commentCount > 0) {
              <button class="sticky-comment-badge" (mousedown)="$event.stopPropagation()"
                      (click)="commentThreadRequested.emit({ event: $event, card: item.card })">💬{{ item.card.commentCount }}</button>
            }
            @if (item.card.text === null) {
              <div class="sticky-header">
                <app-avatar-circle [memberId]="item.card.authorId" [name]="item.card.authorName ?? ''" [avatarSeed]="item.card.authorAvatarSeed" [size]="18" />
                <span class="sticky-author" style="flex:1">{{ item.card.authorName }}</span>
              </div>
              <div class="sticky-text-hidden" [title]="'Hidden until reveal'">
                <span class="hidden-line" style="width:88%"></span>
                <span class="hidden-line" style="width:64%"></span>
                <span class="hidden-line" style="width:76%"></span>
              </div>
            } @else {
              @if (item.card.authorName) {
                <div class="sticky-header">
                  <app-avatar-circle [memberId]="item.card.authorId" [name]="item.card.authorName" [avatarSeed]="item.card.authorAvatarSeed" [size]="18" />
                  <span class="sticky-author" style="flex:1">{{ item.card.authorName }}</span>
                </div>
              }
              @if (editingCardId() === item.card.id) {
                <textarea class="sticky-edit-area" #editArea
                          [style.font-size.rem]="cardFontSizeRem(editingText())"
                          [value]="editingText()"
                          (input)="editTextChanged.emit($any($event.target).value)"
                          (blur)="editSaved.emit(item.card)"
                          (keydown.enter)="$event.preventDefault(); editSaved.emit(item.card)"
                          (keydown.escape)="editCancelled.emit()"
                          (mousedown)="$event.stopPropagation()"
                          cdkTextareaAutosize></textarea>
              } @else {
                <div class="sticky-text"
                     [style.font-size.rem]="cardFontSizeRem(item.card.text)"
                     [class.sticky-text-editable]="item.card.isOwn || s?.isCreator"
                     (dblclick)="(item.card.isOwn || s?.isCreator) && item.card.text !== null ? editStarted.emit(item.card) : null">
                  {{ item.card.text }}
                </div>
              }
              @if (s?.phase === 'vote' || s?.phase === 'discuss' || s?.phase === 'done') {
                <div class="sticky-footer">
                  <div class="sticky-vote-row">
                    @if (s?.phase === 'vote') {
                      <button class="sticky-vdec-btn" [disabled]="item.card.myVoteCount === 0"
                              (mousedown)="$event.stopPropagation()" (click)="voteToggled.emit({ card: item.card, remove: true })">−</button>
                    }
                    <span class="sticky-vote-count" [class.has-votes]="item.card.voteCount > 0">{{ item.card.voteCount }}</span>
                    @if (s?.phase === 'vote') {
                      <button class="sticky-vinc-btn" [disabled]="voteBudget() <= 0 || item.card.myVoteCount >= (s?.maxVotesPerCard ?? 1)"
                              (mousedown)="$event.stopPropagation()" (click)="voteToggled.emit({ card: item.card, remove: false })">+</button>
                    }
                  </div>
                </div>
              }
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
              @if (item.card.column === 'action' && (item.card.assignees.length > 0 || s?.phase === 'discuss' || s?.phase === 'done')) {
                <div class="sticky-assignees" (mousedown)="$event.stopPropagation()">
                  @for (a of item.card.assignees; track a.memberId) {
                    <app-avatar-circle [memberId]="a.memberId" [name]="a.name" [avatarSeed]="a.avatarSeed" [size]="18" [title]="a.name" />
                  }
                  @if (s?.phase === 'discuss' || s?.phase === 'done') {
                    <button class="sticky-assign-btn" title="Assign people" (click)="assignRequested.emit(item.card)">
                      <mat-icon>person_add</mat-icon>
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
                      autofocus
                      [style.font-size.rem]="cardFontSizeRem(p.text)"
                      [value]="p.text"
                      (input)="pendingCard.set({ ...p, text: $any($event.target).value })"
                      (blur)="confirmPendingCard()"
                      (keydown.enter)="$event.preventDefault(); confirmPendingCard()"
                      (keydown.escape)="pendingCard.set(null)"
                      (mousedown)="$event.stopPropagation()"
                      cdkTextareaAutosize></textarea>
          </div>
        }
        @for (t of allTokenItems(); track t.token.id) {
          <div class="retro-token"
               [class.selected]="selectedTokenId() === t.token.id"
               [attr.data-token-id]="t.token.id"
               [class.dragging]="draggingTokenId() === t.token.id"
               [style.left.px]="t.x" [style.top.px]="t.y"
               [style.--tok-scale]="sizeScale(t.token.size)"
               [style.background]="faceColor(t.token.emoji)"
               [style.font-size.px]="faceColor(t.token.emoji) ? null : 128 * sizeScale(t.token.size) * tokenFontRatio(t.token.emoji)"
               (mousedown)="startTokenDrag($event, t.token, t.x, t.y)">
            @if (faceIcon(t.token.emoji); as icon) {
              <mat-icon class="retro-token-face-icon">{{ icon }}</mat-icon>
            } @else {
              {{ t.token.emoji }}
            }
            <button class="retro-token-del" (mousedown)="$event.stopPropagation()" (click)="tokenDeleteRequested.emit(t.token)">×</button>
          </div>
        }
        @if (timerLabel(); as label) {
          @if (timerNeedsPlacement()) {
            @if (placingWorld(); as p) {
              <div class="timer-widget placing-ghost" [class.timer-widget-danger]="timerDanger()"
                   [style.left.px]="p.x" [style.top.px]="p.y" [style.--tw-scale]="sizeScale(timerSize())">
                <mat-icon class="timer-widget-icon">timer</mat-icon>{{ label }}
              </div>
            }
          } @else {
            <div class="timer-widget" [class.timer-widget-danger]="timerDanger()"
                 [style.left.px]="timerWidgetPos().x" [style.top.px]="timerWidgetPos().y" [style.--tw-scale]="sizeScale(timerSize())"
                 (mousedown)="startTimerWidgetDrag($event)">
              <mat-icon class="timer-widget-icon">timer</mat-icon>{{ label }}
              <button class="timer-widget-del" (mousedown)="$event.stopPropagation()" (click)="timerRemoveRequested.emit()">×</button>
            </div>
          }
        }
        @if (placingStickerEmoji(); as emoji) {
          @if (placingWorld(); as p) {
            <div class="retro-token placing-ghost" [style.left.px]="p.x" [style.top.px]="p.y"
                 [style.--tok-scale]="sizeScale(placingStickerSize())"
                 [style.background]="faceColor(emoji)"
                 [style.font-size.px]="faceColor(emoji) ? null : 128 * sizeScale(placingStickerSize()) * tokenFontRatio(emoji)">
              @if (faceIcon(emoji); as icon) {
                <mat-icon class="retro-token-face-icon">{{ icon }}</mat-icon>
              } @else {
                {{ emoji }}
              }
            </div>
          }
        }
      </div>
      <!-- Size toolbar: shown while a sticker/timer is stuck to the cursor waiting for a
           placement click (fixed near the top, since the cursor position isn't a stable
           anchor), or after clicking an already-placed token/timer to resize it in place. -->
      @if (placingScreenPos(); as sp) {
        @if (placingStickerEmoji() || timerNeedsPlacement()) {
          <div class="size-toolbar-hint" [style.top.px]="sp.y - 20" [style.left.px]="sp.x + 24"
               (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
            Size:
            @for (size of tokenSizes; track size) {
              @if (placingStickerEmoji()) {
                <button [class.active]="placingStickerSize() === size" (click)="placingStickerSize.set(size)">{{ size.charAt(0).toUpperCase() }}</button>
              } @else {
                <button [class.active]="timerSize() === size" (click)="chooseTimerSize(size)">{{ size.charAt(0).toUpperCase() }}</button>
              }
            }
          </div>
        }
      }
      @if (selectedTokenId(); as tokenId) {
        @if (selectedTokenToolbarPos(); as pos) {
          <div class="size-toolbar" [style.top.px]="pos.top" [style.left.px]="pos.left" (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
            @for (size of tokenSizes; track size) {
              <button [class.active]="allTokenItems().find(t => t.token.id === tokenId)?.token?.size === size"
                      (click)="chooseTokenSize(tokenId, size)">{{ size.charAt(0).toUpperCase() }}</button>
            }
          </div>
        }
      }
      @if (timerToolbarOpen()) {
        @if (timerToolbarPos(); as pos) {
          <div class="size-toolbar" [style.top.px]="pos.top" [style.left.px]="pos.left" (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
            @for (size of tokenSizes; track size) {
              <button [class.active]="timerSize() === size" (click)="chooseTimerSize(size)">{{ size.charAt(0).toUpperCase() }}</button>
            }
          </div>
        }
      }
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

  // The `autofocus` attribute on the pending-card textarea only reliably fires the first
  // time a card is placed -- browsers only honor autofocus for a dynamically-inserted
  // element within a short window after page load (to prevent focus-stealing abuse), so
  // every card after the first silently doesn't get it. Focus it explicitly instead,
  // re-running whenever a new pending card appears (viewChild's signal updates to the
  // freshly-created textarea each time the @if block recreates it).
  private pendingInputEl = viewChild<ElementRef<HTMLTextAreaElement>>('pendingInput');
  // Same fix as pendingInputEl above, for double-clicking an existing card's text into edit
  // mode -- a bare `autofocus` attribute only reliably fires once per page load, not on
  // every dynamically-inserted textarea.
  private editAreaEl = viewChild<ElementRef<HTMLTextAreaElement>>('editArea');

  constructor() {
    effect(() => {
      const p = this.pendingCard();
      const el = this.pendingInputEl();
      if (p && el) el.nativeElement.focus();
    });
    effect(() => {
      const id = this.editingCardId();
      const el = this.editAreaEl();
      if (id && el) el.nativeElement.focus();
    });
    // A freshly-started timer should stick to the cursor for one placement click, same as a
    // sticker -- but only for the participant who actually clicked "start". timerLabel is
    // shared session state broadcast to everyone over the websocket, so driving placement off
    // *it* meant anyone already viewing the board (or joining an in-progress retro that already
    // had a running timer) got the widget glued to their own cursor too. timerPlaceTrigger is a
    // local-action counter the parent bumps only inside its own start-timer handler, so it only
    // ever fires for the person who pressed the button.
    effect(() => {
      const trigger = this.timerPlaceTrigger();
      if (trigger !== this.lastTimerPlaceTrigger) {
        this.lastTimerPlaceTrigger = trigger;
        if (trigger > 0) this.timerNeedsPlacement.set(true);
      }
    });
    effect(() => {
      if (!this.timerLabel()) this.timerNeedsPlacement.set(false);
    });
    // Adopt the synced position broadcast from another participant's drag -- but never while
    // this viewer is mid-drag themselves (would fight the local mousemove updates) or mid
    // placement (would yank the cursor-following ghost to a stale spot).
    effect(() => {
      const pos = this.timerPosition();
      if (pos && !this.timerDragState && !this.timerNeedsPlacement()) this.timerWidgetPos.set(pos);
    });
    // Each new sticker placement starts fresh at medium -- the size toolbar next to the
    // cursor-following ghost lets you change it before the placement click.
    effect(() => {
      if (this.placingStickerEmoji()) this.placingStickerSize.set('small');
    });
  }

  session = input.required<FunRetroSession | null>();
  cols = input.required<RetroColumn[]>();
  voteBudget = input.required<number>();
  editingCardId = input.required<string | null>();
  editingText = input.required<string>();
  resolveCardColor = input.required<(card: FunRetroCard) => string>();
  showRevealAction = input<boolean>(false);
  timerLabel = input<string | null>(null);
  timerDanger = input<boolean>(false);
  timerPlaceTrigger = input<number>(0);
  timerActive = input<boolean>(false);
  timerPosition = input<{ x: number; y: number } | null>(null);
  placingStickerEmoji = input<string | null>(null);
  selectedCardId = input<string | null>(null);

  voteToggled = output<{ card: FunRetroCard; remove: boolean }>();
  assignRequested = output<FunRetroCard>();
  reactionToggled = output<{ card: FunRetroCard; emoji: string }>();
  editStarted = output<FunRetroCard>();
  editTextChanged = output<string>();
  editSaved = output<FunRetroCard>();
  editCancelled = output<void>();
  addCardRequested = output<{ column: string; text: string; x: number; y: number }>();
  positionCommitted = output<{ cardId: string; x: number; y: number }>();
  cardSelected = output<FunRetroCard>();
  commentThreadRequested = output<{ event: MouseEvent; card: FunRetroCard }>();
  stickerPaletteRequested = output<{ event: MouseEvent; column: string; x: number; y: number }>();
  tokenPositionCommitted = output<{ tokenId: string; x: number; y: number }>();
  timerPositionCommitted = output<{ x: number; y: number }>();
  tokenDeleteRequested = output<FunRetroToken>();
  tokenResizeRequested = output<{ tokenId: string; size: FunRetroTokenSize }>();
  revealRequested = output<void>();
  timerToggleRequested = output<MouseEvent>();
  timerRemoveRequested = output<void>();
  stickerPlaceRequested = output<{ emoji: string; column: string; x: number; y: number; size: FunRetroTokenSize }>();
  stickerPlacementCancelled = output<void>();

  readonly tokenSizes: FunRetroTokenSize[] = ['small', 'medium', 'large'];
  private static readonly SIZE_SCALE: Record<FunRetroTokenSize, number> = { small: 0.5, medium: 1, large: 1.5 };
  sizeScale(size: FunRetroTokenSize): number {
    return RetroSingleCanvasComponent.SIZE_SCALE[size];
  }

  /** Story Points/Letters values are plain ASCII (numbers, words, punctuation) -- distinct
   *  enough from every emoji/color-circle option (all non-ASCII) that this is a reliable way
   *  to tell them apart without threading a separate "category" field through the token. */
  isTextToken(value: string): boolean {
    return /^[A-Za-z0-9?!*/=.-]+$/.test(value);
  }

  /** "face:<icon>:#hex" values (the Faces category) render as an expression icon on a
   *  colored circle instead of literal text -- icon name / hex color, or null if this isn't
   *  one of those tokens. */
  faceIcon(value: string): string | null {
    return value.startsWith('face:') ? value.split(':')[1] ?? null : null;
  }
  faceColor(value: string): string | null {
    return value.startsWith('face:') ? value.split(':')[2] ?? null : null;
  }

  /** A single emoji glyph reads fine at the token's full size, but a word/number sticker
   *  (Story Points, Letters) needs to shrink to actually fit inside the circle instead of
   *  overflowing it -- scales down further the longer the text gets. */
  tokenFontRatio(value: string): number {
    if (!this.isTextToken(value)) return 0.78; // a single emoji glyph, big enough to fill most of the circle
    const len = value.length;
    if (len <= 1) return 0.58;
    if (len <= 3) return 0.48;
    return 0.34;
  }

  // Size chosen while a sticker is stuck to the cursor, waiting for a placement click.
  placingStickerSize = signal<FunRetroTokenSize>('small');
  // The timer widget's size is a per-viewer preference, not synced -- same as its position.
  timerSize = signal<FunRetroTokenSize>('small');

  // Clicking (not dragging) an existing token or the timer opens a small toolbar to resize it.
  selectedTokenId = signal<string | null>(null);
  selectedTokenToolbarPos = signal<{ top: number; left: number } | null>(null);
  timerToolbarOpen = signal(false);
  timerToolbarPos = signal<{ top: number; left: number } | null>(null);

  private closeSizeToolbars(): void {
    this.selectedTokenId.set(null);
    this.selectedTokenToolbarPos.set(null);
    this.timerToolbarOpen.set(false);
    this.timerToolbarPos.set(null);
  }

  // Toolbar sits just above the item's own top edge -- 8px clearance plus its own ~34px
  // height, so it reads as attached to what it's resizing rather than floating nearby.
  private static readonly TOOLBAR_GAP = 42;
  private static readonly TOOLBAR_HALF_WIDTH = 54;

  selectToken(tokenId: string, el: HTMLElement): void {
    this.closeSizeToolbars();
    const rect = el.getBoundingClientRect();
    this.selectedTokenId.set(tokenId);
    this.selectedTokenToolbarPos.set({
      top: rect.top - RetroSingleCanvasComponent.TOOLBAR_GAP,
      left: rect.left + rect.width / 2 - RetroSingleCanvasComponent.TOOLBAR_HALF_WIDTH,
    });
  }

  selectTimer(el: HTMLElement): void {
    this.closeSizeToolbars();
    const rect = el.getBoundingClientRect();
    this.timerToolbarOpen.set(true);
    this.timerToolbarPos.set({
      top: rect.top - RetroSingleCanvasComponent.TOOLBAR_GAP,
      left: rect.left + rect.width / 2 - RetroSingleCanvasComponent.TOOLBAR_HALF_WIDTH,
    });
  }

  chooseTokenSize(tokenId: string, size: FunRetroTokenSize): void {
    this.tokenResizeRequested.emit({ tokenId, size });
    // The item's box changes size right away (optimistic update), which would leave the
    // toolbar (positioned from the old box) looking off-center -- follow it once the new
    // size has actually painted.
    requestAnimationFrame(() => {
      const el = (this.elRef.nativeElement as HTMLElement).querySelector(`[data-token-id="${tokenId}"]`) as HTMLElement | null;
      if (el && this.selectedTokenId() === tokenId) this.selectToken(tokenId, el);
    });
  }

  chooseTimerSize(size: FunRetroTokenSize): void {
    this.timerSize.set(size);
    requestAnimationFrame(() => {
      const el = (this.elRef.nativeElement as HTMLElement).querySelector('.timer-widget:not(.placing-ghost)') as HTMLElement | null;
      if (el && this.timerToolbarOpen()) this.selectTimer(el);
    });
  }

  readonly reactionEmojis = REACTION_EMOJIS;
  // Wide enough for 3 sticky-columns per zone (200px cards) instead of 2 -- panning/zooming
  // is how the whole board gets navigated anyway, so there's no reason to cram zones as
  // tight as if they had to fit a fixed viewport like the old per-column canvases did.
  readonly ZONE_WIDTH = 2040;
  readonly ZONE_GAP = 48;
  private readonly STICKY_W = 240;
  private readonly STICKY_GAP = 16;
  private readonly STICKY_MARGIN = 10;
  private readonly STICKY_MIN_H = 220;
  // Vertical space reserved at the top of every zone for its header (label/count/Tidy) --
  // rendered inside the pannable canvas content (not above it, unlike the old per-column
  // header which lived in its own DOM row outside a clipped .canvas-outer), so cards must
  // start below it or they'd overlap.
  private readonly ZONE_TOP_PAD = 40;
  private readonly MIN_ZOOM = 0.15;
  private readonly MAX_ZOOM = 2;

  activeTool = signal<RetroCanvasTool>('select');
  view = signal<{ zoom: number; panX: number; panY: number }>({ zoom: 1, panX: 0, panY: 0 });
  panningView = signal(false);
  draggingId = signal<string | null>(null);
  localPositions = signal<Record<string, { x: number; y: number }>>({});
  pendingCard = signal<{ x: number; y: number; text: string } | null>(null);

  private panState: { startMouseX: number; startMouseY: number; startPanX: number; startPanY: number } | null = null;
  private dragState: {
    id: string; startMouseX: number; startMouseY: number; startX: number; startY: number; moved: boolean;
    pinnedTokens: { id: string; startX: number; startY: number }[];
  } | null = null;
  private static readonly CLICK_MOVE_THRESHOLD = 4; // px

  localTokenPositions = signal<Record<string, { x: number; y: number }>>({});
  draggingTokenId = signal<string | null>(null);
  private tokenDragState: { id: string; startMouseX: number; startMouseY: number; startX: number; startY: number; moved: boolean } | null = null;

  // Draggable timer widget position. Synced across viewers via `timerPosition` (patched in by
  // the effect below) once the widget has been placed/dragged; defaults locally until then.
  timerWidgetPos = signal<{ x: number; y: number }>({ x: 20, y: 20 });
  private timerDragState: { startMouseX: number; startMouseY: number; startX: number; startY: number; moved: boolean } | null = null;

  // World-space cursor position while a sticker or a freshly-started timer is "stuck to the
  // cursor" waiting for a click to drop it -- see onMouseMove/onCanvasClick.
  placingWorld = signal<{ x: number; y: number } | null>(null);
  placingScreenPos = signal<{ x: number; y: number } | null>(null);
  timerNeedsPlacement = signal(false);
  private lastTimerPlaceTrigger = 0;

  startTimerWidgetDrag(e: MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const p = this.timerWidgetPos();
    this.timerDragState = { startMouseX: e.clientX, startMouseY: e.clientY, startX: p.x, startY: p.y, moved: false };
  }

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

  // The parent owns theme resolution -- it has the HttpClient access to the auth-gated theme
  // library endpoints (and the fetched-blob object-URL cache) that a custom library theme needs,
  // on top of the fixed built-in themes this component used to look up on its own. Delegating
  // both to parent-supplied functions keeps that lookup (built-in vs. custom, fallback variants)
  // in one place instead of duplicated between this component and retro.component.ts.
  resolveThemeUrl = input<(zoneIndex: number) => string | null>(() => null);
  resolveThemeStyle = input<(zoneIndex: number) => RetroBgStyle | null>(() => null);

  themeUrl(zoneIndex: number): string | null {
    return this.resolveThemeUrl()(zoneIndex);
  }

  themeBgStyle(zoneIndex: number): RetroBgStyle | null {
    return this.resolveThemeStyle()(zoneIndex);
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
          // Sessions created back when this column had its own separate small canvas stored
          // positions local to it (0..~800ish), not in this shared board's coordinate space --
          // any such value is well short of where this zone actually starts, so it'd otherwise
          // render inside zone 0 regardless of its real column. Shift it into this zone's
          // strip once; dragging the card afterward commits a proper absolute position.
          const x = card.positionX < zoneX0 ? card.positionX + zoneX0 : card.positionX;
          const pos = { x, y: card.positionY };
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

  allTokenItems = computed<{ token: FunRetroToken; x: number; y: number }[]>(() => {
    const s = this.session();
    if (!s) return [];
    const localPos = this.localTokenPositions();
    const cs = this.cols();
    return s.tokens.map(t => {
      const local = localPos[t.id];
      if (local) return { token: t, x: local.x, y: local.y };
      // Same legacy-position fixup as zoneItems() above, for stickers placed back when this
      // column had its own separate small canvas.
      const zi = cs.findIndex(c => c.key === t.column);
      const zoneX0 = zi >= 0 ? this.zoneOriginX(zi) : 0;
      const x = t.positionX < zoneX0 ? t.positionX + zoneX0 : t.positionX;
      return { token: t, x, y: t.positionY };
    });
  });

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
    // Content starts at world (0,0) with nothing before it -- panning past panX/panY = 0
    // would reveal grid background to the left/above that no card or sticker can ever
    // actually occupy (they clamp at 0 too), so cap the pan there instead of leaving a
    // pannable-but-dead strip. (The `outerW - margin` fallback only kicks in on a viewport
    // so small that even that would clip too much of the content.)
    const maxPanX = Math.min(0, outerW - margin);
    const minPanX = margin - scaledW;
    const maxPanY = Math.min(0, outerH - margin);
    const minPanY = margin - scaledH;
    // Once the whole board (a zone axis) has zoomed down small enough to fit inside the
    // viewport, centre it on that axis instead of leaving it pinned to whichever edge the
    // cursor-anchored zoom-out dragged it to -- keeps the content that matters framed rather
    // than shoved into a corner with dead grid on the other side.
    return {
      panX: scaledW <= outerW ? (outerW - scaledW) / 2 : Math.min(maxPanX, Math.max(minPanX, panX)),
      panY: scaledH <= outerH ? (outerH - scaledH) / 2 : Math.min(maxPanY, Math.max(minPanY, panY)),
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

  /** Starting view: zoomed in on just the first column (an obvious, focused starting point
   *  for adding cards to it) rather than either a cramped 100% or a zoomed-so-far-out-it's-
   *  illegible view of every zone at once. Panning/zooming to the other columns from there
   *  is one scroll away. */
  private overviewView(): { zoom: number; panX: number; panY: number } {
    const outer = this.outerEl();
    const pad = 24;
    if (!outer || this.ZONE_WIDTH <= 0) return { zoom: 1, panX: pad, panY: pad };
    const zoom = this.clampZoom(Math.min((outer.clientWidth - pad * 2) / this.ZONE_WIDTH, 1));
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
    // Normalise delta across input devices: mouse wheels report in lines (deltaMode 1) with
    // big per-notch values, trackpads in pixels (deltaMode 0) with small ones, some in pages
    // (deltaMode 2). Convert to a rough pixel amount, then map to an exponential zoom factor
    // so the step scales with how hard you scroll -- smooth on a trackpad, still snappy on a
    // wheel -- instead of a fixed 1.1x jump that feels jerky and drops context.
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1;
    const px = Math.max(-120, Math.min(120, e.deltaY * unit));
    const factor = Math.exp(-px * 0.0025);
    this.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
  }

  zoomBy(factor: number): void {
    const outer = this.outerEl();
    this.zoomAt(factor, (outer?.clientWidth ?? 0) / 2, (outer?.clientHeight ?? 0) / 2);
  }

  startPan(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (this.placingStickerEmoji() || this.timerNeedsPlacement()) return;
    const t = e.target as HTMLElement;
    if (t.closest('.sticky') || t.closest('.canvas-zoom-controls') || t.closest('app-retro-canvas-sidebar')) return;
    this.closeSizeToolbars();
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

  /** Sidebar's single Tidy button now covers every column at once, replacing the old
   *  per-zone buttons that used to live in each zone header. */
  arrangeAllZones(): void {
    this.cols().forEach((_, zi) => this.arrangeZone(zi));
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

    for (const u of updates) {
      this.positionCommitted.emit({ cardId: u.id, x: u.x, y: u.y });
    }
    // Tidy commits every card's new slot straight to shared session state through the parent, so
    // drop any transient drag overrides for these ids and let them render from session -- keeping a
    // local entry here is exactly what made Tidy'd cards stop reflecting other users' moves.
    this.clearLocalPositions(updates.map(u => u.id));
  }

  startDrag(e: MouseEvent, card: FunRetroCard, x: number, y: number): void {
    if (e.button !== 0) return;
    e.preventDefault();
    // Stickers sitting on top of the card at the moment the drag starts ride along with it --
    // reads as "pinned to the card" -- rather than staying put while the card slides out from
    // under them. Only a loose bounding-box check (plus a little slack), not true parenting:
    // this is just a one-off carry for the duration of this drag.
    const el = (this.elRef.nativeElement as HTMLElement).querySelector(`[data-card-id="${card.id}"]`) as HTMLElement | null;
    const width = el?.offsetWidth ?? this.STICKY_W;
    const height = el?.offsetHeight ?? this.STICKY_MIN_H;
    const slack = 24;
    const pinnedTokens = this.allTokenItems()
      .filter(t => t.x >= x - slack && t.x <= x + width + slack && t.y >= y - slack && t.y <= y + height + slack)
      .map(t => ({ id: t.token.id, startX: t.x, startY: t.y }));
    this.dragState = { id: card.id, startMouseX: e.clientX, startMouseY: e.clientY, startX: x, startY: y, moved: false, pinnedTokens };
    this.draggingId.set(card.id);
  }

  onCanvasClick(e: MouseEvent): void {
    if (this.placingStickerEmoji()) { this.confirmStickerPlacement(); return; }
    if (this.timerNeedsPlacement()) { this.confirmTimerPlacement(); return; }
    if (this.activeTool() !== 'add-card') return;
    if ((e.target as HTMLElement).closest('.sticky')) return;
    // Unlike a bare double-click (see below), picking the Add-Card tool and clicking is a
    // deliberate "put a card down" action -- it should always succeed, clamped into the
    // nearest column if you clicked outside every zone's strip, not silently do nothing.
    this.placeCardAt(e, true);
    this.activeTool.set('select');
  }

  /** Double-click empty canvas always adds a card here, regardless of which sidebar tool is
   *  active -- picking the Add-Card tool first was an unnecessary extra step for something
   *  this common, and double-click doesn't collide with panning (a plain drag) or dragging
   *  an existing card (guarded by the .sticky check, same as onCanvasClick). */
  onCanvasDoubleClick(e: MouseEvent): void {
    if (this.placingStickerEmoji() || this.timerNeedsPlacement()) return;
    if ((e.target as HTMLElement).closest('.sticky')) return;
    this.placeCardAt(e, false);
  }

  private worldPointFromEvent(e: MouseEvent): { x: number; y: number } {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const v = this.view();
    return { x: (e.clientX - rect.left - v.panX) / v.zoom, y: (e.clientY - rect.top - v.panY) / v.zoom };
  }

  /** @param clampToNearestZone When false (a bare double-click), a click outside every zone's
   *  actual strip (the blank margin past the last column, or before the first) is a no-op --
   *  zoneIndexForX would otherwise silently clamp it into whichever zone is nearest, which
   *  reads as "the card I placed way over here jumped into some other column." When true (the
   *  explicit Add-Card tool), that same clamp is exactly what you want instead: the click was
   *  a deliberate "add a card" and should always land somewhere, not do nothing. */
  private placeCardAt(e: MouseEvent, clampToNearestZone: boolean): void {
    let { x: worldX, y: worldY } = this.worldPointFromEvent(e);
    const stripWidth = this.cols().length * (this.ZONE_WIDTH + this.ZONE_GAP) - this.ZONE_GAP;
    if (worldX < 0 || worldX > stripWidth) {
      if (!clampToNearestZone) return;
      worldX = Math.max(0, Math.min(stripWidth, worldX));
    }
    this.pendingCard.set({ x: worldX, y: worldY, text: '' });
  }

  private confirmStickerPlacement(): void {
    const p = this.placingWorld();
    const emoji = this.placingStickerEmoji();
    const size = this.placingStickerSize();
    this.placingWorld.set(null);
    this.placingScreenPos.set(null);
    if (!p || !emoji) return;
    const col = this.cols()[this.zoneIndexForX(p.x)];
    if (!col) return;
    this.stickerPlaceRequested.emit({ emoji, column: col.key, x: p.x, y: p.y, size });
  }

  private confirmTimerPlacement(): void {
    const p = this.placingWorld();
    this.placingWorld.set(null);
    this.placingScreenPos.set(null);
    this.timerNeedsPlacement.set(false);
    if (p) {
      this.timerWidgetPos.set(p);
      this.timerPositionCommitted.emit(p);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.timerNeedsPlacement()) { this.timerNeedsPlacement.set(false); this.placingWorld.set(null); this.placingScreenPos.set(null); }
    if (this.placingStickerEmoji()) { this.placingWorld.set(null); this.placingScreenPos.set(null); this.stickerPlacementCancelled.emit(); }
    this.closeSizeToolbars();
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

  requestStickerPalette(e: MouseEvent, canvasOuter: HTMLElement): void {
    const rect = canvasOuter.getBoundingClientRect();
    const v = this.view();
    const worldX = (rect.width / 2 - v.panX) / v.zoom;
    const worldY = (rect.height / 2 - v.panY) / v.zoom;
    const col = this.cols()[this.zoneIndexForX(worldX)];
    if (!col) return;
    this.stickerPaletteRequested.emit({ event: e, column: col.key, x: worldX, y: worldY });
  }

  startTokenDrag(e: MouseEvent, token: FunRetroToken, x: number, y: number): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.closeSizeToolbars();
    this.tokenDragState = { id: token.id, startMouseX: e.clientX, startMouseY: e.clientY, startX: x, startY: y, moved: false };
    this.draggingTokenId.set(token.id);
  }

  getReaction(card: FunRetroCard, emoji: string) {
    return card.reactions?.find(r => r.emoji === emoji);
  }

  getReactionCount(card: FunRetroCard, emoji: string): number {
    return card.reactions?.find(r => r.emoji === emoji)?.count ?? 0;
  }

  /** Small deterministic tilt per card (-1.5deg to 1.5deg, stable across re-renders since
   *  it's derived from the card's own id) so cards read as notes stuck on a board instead
   *  of a rigid grid. */
  cardRotation(cardId: string): number {
    let hash = 0;
    for (let i = 0; i < cardId.length; i++) hash = (hash * 31 + cardId.charCodeAt(i)) | 0;
    return ((Math.abs(hash) % 300) / 100) - 1.5;
  }

  // Mirrors FunRetroComponent.cardFontSizeRem -- starts big for a short card and linearly
  // shrinks as text grows, down to a floor that's still comfortably readable. Used while
  // typing (both a fresh card and editing an existing one) and on the saved, read-only text.
  private static readonly CARD_FONT_MAX_REM = 1.3;
  private static readonly CARD_FONT_MIN_REM = 0.7;
  private static readonly CARD_FONT_SHRINK_START = 40; // chars
  private static readonly CARD_FONT_SHRINK_END = 220; // chars
  cardFontSizeRem(text: string | null | undefined): number {
    const len = text?.length ?? 0;
    const { CARD_FONT_MAX_REM: max, CARD_FONT_MIN_REM: min, CARD_FONT_SHRINK_START: start, CARD_FONT_SHRINK_END: end } = RetroSingleCanvasComponent;
    if (len <= start) return max;
    if (len >= end) return min;
    const t = (len - start) / (end - start);
    return max - t * (max - min);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.placingStickerEmoji() || this.timerNeedsPlacement()) {
      const outer = this.outerEl();
      if (outer) {
        const rect = outer.getBoundingClientRect();
        const v = this.view();
        this.placingWorld.set({ x: (e.clientX - rect.left - v.panX) / v.zoom, y: (e.clientY - rect.top - v.panY) / v.zoom });
        // Screen-space (not world-space) so the size hint can track the cursor directly
        // without re-deriving the pan/zoom transform just to place a fixed-size UI element.
        this.placingScreenPos.set({ x: e.clientX, y: e.clientY });
      }
      return;
    }
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
    if (this.tokenDragState) {
      if (!this.tokenDragState.moved) {
        const totalDx = e.clientX - this.tokenDragState.startMouseX;
        const totalDy = e.clientY - this.tokenDragState.startMouseY;
        if (Math.hypot(totalDx, totalDy) > RetroSingleCanvasComponent.CLICK_MOVE_THRESHOLD) this.tokenDragState.moved = true;
      }
      const zoom = this.view().zoom;
      const dx = (e.clientX - this.tokenDragState.startMouseX) / zoom;
      const dy = (e.clientY - this.tokenDragState.startMouseY) / zoom;
      const x = Math.max(0, this.tokenDragState.startX + dx);
      const y = Math.max(0, this.tokenDragState.startY + dy);
      this.localTokenPositions.update(p => ({ ...p, [this.tokenDragState!.id]: { x, y } }));
      return;
    }
    if (this.timerDragState) {
      if (!this.timerDragState.moved) {
        const totalDx = e.clientX - this.timerDragState.startMouseX;
        const totalDy = e.clientY - this.timerDragState.startMouseY;
        if (Math.hypot(totalDx, totalDy) > RetroSingleCanvasComponent.CLICK_MOVE_THRESHOLD) this.timerDragState.moved = true;
      }
      const zoom = this.view().zoom;
      const dx = (e.clientX - this.timerDragState.startMouseX) / zoom;
      const dy = (e.clientY - this.timerDragState.startMouseY) / zoom;
      this.timerWidgetPos.set({
        x: Math.max(0, this.timerDragState.startX + dx),
        y: Math.max(0, this.timerDragState.startY + dy),
      });
      return;
    }
    if (!this.dragState) return;
    if (!this.dragState.moved) {
      const totalDx = e.clientX - this.dragState.startMouseX;
      const totalDy = e.clientY - this.dragState.startMouseY;
      if (Math.hypot(totalDx, totalDy) > RetroSingleCanvasComponent.CLICK_MOVE_THRESHOLD) this.dragState.moved = true;
    }
    if (this.session()?.phase === 'done') return;
    const zoom = this.view().zoom;
    const dx = (e.clientX - this.dragState.startMouseX) / zoom;
    const dy = (e.clientY - this.dragState.startMouseY) / zoom;
    const x = Math.max(0, this.dragState.startX + dx);
    const y = Math.max(0, this.dragState.startY + dy);
    this.localPositions.update(p => ({ ...p, [this.dragState!.id]: { x, y } }));
    if (this.dragState.pinnedTokens.length) {
      this.localTokenPositions.update(p => {
        const next = { ...p };
        for (const t of this.dragState!.pinnedTokens) next[t.id] = { x: Math.max(0, t.startX + dx), y: Math.max(0, t.startY + dy) };
        return next;
      });
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.panState) {
      this.panState = null;
      this.panningView.set(false);
      return;
    }
    if (this.tokenDragState) {
      const { id, moved } = this.tokenDragState;
      if (moved) {
        const pos = this.localTokenPositions()[id];
        // Emit first (the parent folds the position into shared session state synchronously),
        // then drop the local override so the token renders from session and a later remote
        // fun_retro_token_moved isn't shadowed by a stale local entry.
        if (pos) this.tokenPositionCommitted.emit({ tokenId: id, x: pos.x, y: pos.y });
        this.clearLocalTokenPositions([id]);
      } else {
        const el = (this.elRef.nativeElement as HTMLElement).querySelector(`[data-token-id="${id}"]`) as HTMLElement | null;
        if (el) this.selectToken(id, el);
      }
      this.tokenDragState = null;
      this.draggingTokenId.set(null);
      return;
    }
    if (this.timerDragState) {
      const { moved } = this.timerDragState;
      if (moved) {
        this.timerPositionCommitted.emit(this.timerWidgetPos());
      } else {
        const el = (this.elRef.nativeElement as HTMLElement).querySelector('.timer-widget:not(.placing-ghost)') as HTMLElement | null;
        if (el) this.selectTimer(el);
      }
      this.timerDragState = null;
      return;
    }
    if (!this.dragState) return;
    const { id, moved, pinnedTokens } = this.dragState;
    if (moved) {
      const pos = this.localPositions()[id];
      // Emit commits first (the parent folds each position into shared session state
      // synchronously), then drop the local overrides so the card and its pinned tokens render
      // from session -- otherwise the local entries would permanently shadow later remote
      // fun_retro_card_moved / fun_retro_token_moved broadcasts for these ids.
      if (pos) this.positionCommitted.emit({ cardId: id, x: pos.x, y: pos.y });
      const tokenPositions = this.localTokenPositions();
      for (const t of pinnedTokens) {
        const tPos = tokenPositions[t.id];
        if (tPos) this.tokenPositionCommitted.emit({ tokenId: t.id, x: tPos.x, y: tPos.y });
      }
      this.clearLocalPositions([id]);
      this.clearLocalTokenPositions(pinnedTokens.map(t => t.id));
    } else {
      const card = this.session()?.cards.find(c => c.id === id);
      if (card) this.cardSelected.emit(card);
    }
    this.dragState = null;
    this.draggingId.set(null);
  }

  // Drag overrides (localPositions / localTokenPositions) are transient: they exist only to drive
  // the visual during an in-flight drag/Tidy and are dropped the moment the position is committed,
  // so that `session` -- fed by the server and by remote move broadcasts -- stays the single source
  // of truth. A lingering entry here would make zoneItems()/allTokenItems() keep rendering the
  // local value and silently ignore every remote move for that id.
  private clearLocalPositions(ids: string[]): void {
    if (!ids.length) return;
    this.localPositions.update(p => {
      const next = { ...p };
      for (const id of ids) delete next[id];
      return next;
    });
  }

  private clearLocalTokenPositions(ids: string[]): void {
    if (!ids.length) return;
    this.localTokenPositions.update(p => {
      const next = { ...p };
      for (const id of ids) delete next[id];
      return next;
    });
  }
}
