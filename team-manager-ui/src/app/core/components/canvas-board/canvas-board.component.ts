import { Component, ChangeDetectionStrategy, ElementRef, HostListener, AfterViewInit, inject, input, output, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
  width?: number;
  height?: number;
}

export interface CanvasEdge {
  id: string;
  fromId: string;
  toId: string;
}

const NODE_W = 160;
const NODE_H = 64;
const MIN_NODE_W = 80;
const MIN_NODE_H = 48;
const MAX_NODE_W = 640;
const MAX_NODE_H = 480;
const CLICK_MOVE_THRESHOLD = 4;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
// Same pastel set the retro sticky cards use, so node colours read consistently across boards.
const NODE_PALETTE = [
  '#fff9c4', '#ffe0b2', '#fce4ec', '#c8e6c9',
  '#bbdefb', '#e1bee7', '#ffcdd2', '#b2dfdb',
  '#f5f5f5', '#ffe082', '#a5d6a7', '#90caf9',
];

// Generic pan/zoom/drag canvas: positions nodes freely in a shared world-coordinate space and
// draws directed edges between them. No domain knowledge of retro/process-flow/personal-maps --
// consumers own what a node *means*, this only owns where it sits and how you get there. The
// pan/zoom/drag math (worldPointFromEvent, zoomAt, clampZoom, drag-with-local-override-until-
// commit) mirrors retro-single-canvas.component.ts's proven implementation; reimplemented rather
// than extracted so the working retro board isn't put at risk by this refactor.
@Component({
  selector: 'app-canvas-board',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    :host { display:block;width:100%;height:100%; }
    .canvas-outer {
      position:relative;width:100%;height:100%;overflow:hidden;cursor:grab;
      background-color:#14171f;
      background-image:radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size:24px 24px;
    }
    .canvas-outer.panning { cursor:grabbing; }
    .canvas-inner { position:absolute;top:0;left:0;transform-origin:0 0; }
    .canvas-svg { position:absolute;top:0;left:0;overflow:visible;pointer-events:none; }
    .canvas-edge-group { cursor:pointer; }
    .canvas-edge { stroke:rgba(255,255,255,0.4);stroke-width:2;fill:none;pointer-events:none; }
    .canvas-edge-hit { stroke:transparent;stroke-width:16;fill:none;pointer-events:stroke; }
    .canvas-edge-group:hover .canvas-edge { stroke:#64b5f6; }
    .canvas-edge-pending { stroke:#64b5f6;stroke-width:2;stroke-dasharray:6 4;fill:none; }
    .canvas-node {
      position:absolute;border-radius:10px;
      background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.18);
      color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;
      padding:8px 12px;cursor:grab;user-select:none;font-size:0.85rem;box-sizing:border-box;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    }
    .canvas-node > span { overflow:hidden;max-width:100%;max-height:100%; }
    .canvas-node:hover { border-color:rgba(100,181,246,0.6); }
    .canvas-node.selected { border-color:#64b5f6;box-shadow:0 0 0 2px rgba(100,181,246,0.4); }
    .canvas-node-label {
      width:100%;background:transparent;border:none;color:inherit;text-align:center;
      font:inherit;resize:none;outline:none;
    }
    .connect-handle {
      position:absolute;width:14px;height:14px;border-radius:50%;background:#64b5f6;
      border:2px solid #14171f;cursor:crosshair;opacity:0;transition:opacity 0.12s;
    }
    .canvas-node:hover .connect-handle, .canvas-node.selected .connect-handle { opacity:1; }
    .connect-handle:hover { transform:scale(1.25); }
    .resize-handle {
      position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;
      opacity:0;transition:opacity 0.12s;
    }
    .resize-handle::after {
      content:'';position:absolute;right:3px;bottom:3px;width:8px;height:8px;
      border-right:2px solid rgba(255,255,255,0.6);border-bottom:2px solid rgba(255,255,255,0.6);
      border-bottom-right-radius:3px;
    }
    .canvas-node:hover .resize-handle, .canvas-node.selected .resize-handle { opacity:1; }
    .color-handle {
      position:absolute;top:-9px;right:-9px;width:18px;height:18px;border-radius:50%;
      border:2px solid #14171f;cursor:pointer;opacity:0;transition:opacity 0.12s;
      background:conic-gradient(#ffcdd2,#ffe082,#a5d6a7,#90caf9,#e1bee7,#ffcdd2);
    }
    .canvas-node:hover .color-handle, .canvas-node.selected .color-handle { opacity:1; }
    .color-picker-popover {
      position:fixed;z-index:1000;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;padding:8px;
      display:grid;grid-template-columns:repeat(4, 22px);gap:6px;
      width:max-content;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .color-swatch {
      width:22px;height:22px;border-radius:50%;cursor:pointer;box-sizing:border-box;
      border:2px solid transparent;transition:border-color 0.1s, transform 0.1s;
    }
    .color-swatch:hover, .color-swatch.active { border-color:rgba(255,255,255,0.7);transform:scale(1.15); }
    .canvas-zoom-controls {
      position:absolute;bottom:12px;right:12px;display:flex;gap:4px;
      background:rgba(20,23,31,0.85);border-radius:8px;padding:4px;
    }
    .cz-btn {
      background:transparent;border:none;color:rgba(255,255,255,0.7);cursor:pointer;
      padding:4px 8px;border-radius:6px;font-size:0.8rem;
    }
    .cz-btn:hover { background:rgba(255,255,255,0.1);color:#fff; }
  `],
  template: `
    <div class="canvas-outer" [class.panning]="panningView()"
         (wheel)="onCanvasWheel($event)"
         (mousedown)="startPan($event)"
         (dblclick)="onCanvasDoubleClick($event)">
      <div class="canvas-inner" [style.transform]="innerTransform()">
        <svg class="canvas-svg" [attr.width]="10" [attr.height]="10" [style.overflow]="'visible'">
          <defs>
            <marker id="cb-arrow" markerWidth="9" markerHeight="9" refX="7.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L0,8 L8,4 z" fill="rgba(255,255,255,0.55)" />
            </marker>
          </defs>
          @for (e of edgeLines(); track e.id) {
            <g class="canvas-edge-group" (click)="edgeClicked.emit(e.id)">
              <line class="canvas-edge-hit" [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" />
              <line class="canvas-edge" [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2"
                    marker-end="url(#cb-arrow)" />
            </g>
          }
          @if (pendingConnectLine(); as pl) {
            <line class="canvas-edge-pending" [attr.x1]="pl.x1" [attr.y1]="pl.y1" [attr.x2]="pl.x2" [attr.y2]="pl.y2" />
          }
        </svg>

        @for (n of renderNodes(); track n.id) {
          <div class="canvas-node" [class.selected]="n.id === selectedId()" [attr.data-node-id]="n.id"
               [style.left.px]="n.x" [style.top.px]="n.y"
               [style.width.px]="n.width" [style.height.px]="n.height"
               [style.background]="n.color ?? null"
               [style.color]="n.color ? '#1a1a1a' : null"
               [style.border-color]="n.color ?? null"
               (mousedown)="startNodeDrag($event, n)">
            @if (editingId() === n.id) {
              <textarea class="canvas-node-label" [value]="editingText()" rows="2"
                        (input)="editingText.set($any($event.target).value)"
                        (blur)="commitLabelEdit(n.id)"
                        (keydown.enter)="$event.preventDefault(); commitLabelEdit(n.id)"
                        (keydown.escape)="editingId.set(null)"
                        (mousedown)="$event.stopPropagation()"></textarea>
            } @else {
              <span (dblclick)="$event.stopPropagation(); startLabelEdit(n)">{{ n.label }}</span>
            }
            @if (connectMode()) {
              <div class="connect-handle" style="right:-7px;top:50%;margin-top:-7px"
                   (mousedown)="startConnect($event, n)"></div>
              <div class="connect-handle" style="left:-7px;top:50%;margin-top:-7px"
                   (mousedown)="startConnect($event, n)"></div>
              <div class="connect-handle" style="top:-7px;left:50%;margin-left:-7px"
                   (mousedown)="startConnect($event, n)"></div>
              <div class="connect-handle" style="bottom:-7px;left:50%;margin-left:-7px"
                   (mousedown)="startConnect($event, n)"></div>
            }
            @if (resizable()) {
              <div class="resize-handle" (mousedown)="startResize($event, n)"></div>
            }
            @if (colorPicker()) {
              <div class="color-handle" title="Change colour"
                   (mousedown)="$event.stopPropagation()"
                   (click)="toggleColorPicker($event, n)"></div>
            }
          </div>
        }
      </div>

      <div class="canvas-zoom-controls" (mousedown)="$event.stopPropagation()">
        <button class="cz-btn" (click)="zoomBy(0.8)">−</button>
        <button class="cz-btn" (click)="resetView()">{{ zoomPercent() }}%</button>
        <button class="cz-btn" (click)="zoomBy(1.25)">+</button>
      </div>

      @if (colorPickerId(); as pickId) {
        @if (colorPickerPos(); as pos) {
          <div class="color-picker-popover" [style.top.px]="pos.top" [style.left.px]="pos.left"
               (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
            @for (swatch of palette; track swatch) {
              <div class="color-swatch" [style.background]="swatch"
                   [class.active]="nodeColor(pickId) === swatch"
                   (click)="pickColor(pickId, swatch)"></div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class CanvasBoardComponent implements AfterViewInit {
  nodes = input.required<CanvasNode[]>();
  edges = input<CanvasEdge[]>([]);
  connectMode = input(false);
  resizable = input(false);
  colorPicker = input(false);
  selectedId = input<string | null>(null);
  // When set to a node id, that node immediately enters label-edit mode (used so a freshly
  // created node opens ready to type). Parent bumps this after adding a node.
  editNodeId = input<string | null>(null);

  nodeMoved = output<{ id: string; x: number; y: number }>();
  nodeResized = output<{ id: string; width: number; height: number }>();
  nodeColorChanged = output<{ id: string; color: string }>();
  nodeSelected = output<string>();
  labelCommitted = output<{ id: string; label: string }>();
  canvasDoubleClicked = output<{ x: number; y: number }>();
  connectorDrawn = output<{ fromId: string; toId: string }>();
  connectorDroppedOnEmpty = output<{ fromId: string; x: number; y: number }>();
  edgeClicked = output<string>();

  private elRef = inject(ElementRef);

  view = signal<{ zoom: number; panX: number; panY: number }>({ zoom: 1, panX: 40, panY: 40 });
  panningView = signal(false);

  private panState: { startMouseX: number; startMouseY: number; startPanX: number; startPanY: number } | null = null;
  private dragState: { id: string; startMouseX: number; startMouseY: number; startX: number; startY: number; moved: boolean } | null = null;
  private resizeState: { id: string; startMouseX: number; startMouseY: number; startW: number; startH: number } | null = null;
  private connectState: { fromId: string; toWorld: { x: number; y: number } } | null = null;
  private connectTick = signal(0); // bumped on mousemove while connecting, to re-render pendingConnectLine

  private localPositions = signal<Record<string, { x: number; y: number }>>({});
  private localSizes = signal<Record<string, { width: number; height: number }>>({});

  editingId = signal<string | null>(null);
  editingText = signal('');

  readonly palette = NODE_PALETTE;
  colorPickerId = signal<string | null>(null);
  colorPickerPos = signal<{ top: number; left: number } | null>(null);

  constructor() {
    // Open a node straight into edit mode when the parent points editNodeId at it (nodes read
    // untracked so unrelated node updates don't yank focus out of an in-progress edit).
    effect(() => {
      const id = this.editNodeId();
      if (!id) return;
      const node = untracked(() => this.nodes()).find(n => n.id === id);
      if (!node) return;
      this.editingId.set(id);
      this.editingText.set(node.label);
      requestAnimationFrame(() => {
        const ta = (this.elRef.nativeElement as HTMLElement).querySelector('.canvas-node-label') as HTMLTextAreaElement | null;
        ta?.focus();
        ta?.select();
      });
    });
  }

  // Effective geometry: always carries a concrete width/height (falling back to defaults), with
  // any in-flight local drag/resize override layered on top until it's committed to the parent.
  renderNodes = computed(() => {
    const pos = this.localPositions();
    const sz = this.localSizes();
    return this.nodes().map(n => ({
      ...n,
      x: pos[n.id]?.x ?? n.x,
      y: pos[n.id]?.y ?? n.y,
      width: sz[n.id]?.width ?? n.width ?? NODE_W,
      height: sz[n.id]?.height ?? n.height ?? NODE_H,
    }));
  });

  innerTransform = computed(() => {
    const v = this.view();
    return `translate(${v.panX}px, ${v.panY}px) scale(${v.zoom})`;
  });

  edgeLines = computed(() => {
    const byId = new Map(this.renderNodes().map(n => [n.id, n]));
    return this.edges()
      .map(e => {
        const from = byId.get(e.fromId);
        const to = byId.get(e.toId);
        if (!from || !to) return null;
        const c1 = this.anchorPoint(from, this.center(to));
        const c2 = this.anchorPoint(to, this.center(from));
        return { id: e.id, x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y };
      })
      .filter((e): e is { id: string; x1: number; y1: number; x2: number; y2: number } => e !== null);
  });

  pendingConnectLine = computed(() => {
    this.connectTick();
    const cs = this.connectState;
    if (!cs) return null;
    const from = this.renderNodes().find(n => n.id === cs.fromId);
    if (!from) return null;
    const start = this.anchorPoint(from, { x: cs.toWorld.x, y: cs.toWorld.y });
    return { x1: start.x, y1: start.y, x2: cs.toWorld.x, y2: cs.toWorld.y };
  });

  private center(node: { x: number; y: number; width?: number; height?: number }): { x: number; y: number } {
    return { x: node.x + (node.width ?? NODE_W) / 2, y: node.y + (node.height ?? NODE_H) / 2 };
  }

  // Point where the line from `from`'s center toward the world point `target` crosses `from`'s
  // rectangular border. Nodes are (resizable) rectangles, so projecting onto a circle left arrows
  // floating off the short top/bottom edges -- scale the direction vector to the nearest border.
  private anchorPoint(from: { x: number; y: number; width?: number; height?: number }, target: { x: number; y: number }): { x: number; y: number } {
    const hw = (from.width ?? NODE_W) / 2;
    const hh = (from.height ?? NODE_H) / 2;
    const cx = from.x + hw;
    const cy = from.y + hh;
    const dx = target.x - cx;
    const dy = target.y - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  private outerEl(): HTMLElement | null {
    return (this.elRef.nativeElement as HTMLElement).querySelector('.canvas-outer');
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => this.resetView());
  }

  private clampZoom(z: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  zoomPercent(): number {
    return Math.round(this.view().zoom * 100);
  }

  resetView(): void {
    this.view.set({ zoom: 1, panX: 40, panY: 40 });
  }

  private zoomAt(factor: number, cx: number, cy: number): void {
    const v = this.view();
    const z = this.clampZoom(v.zoom * factor);
    const wx = (cx - v.panX) / v.zoom;
    const wy = (cy - v.panY) / v.zoom;
    this.view.set({ zoom: z, panX: cx - wx * z, panY: cy - wy * z });
  }

  onCanvasWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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
    const t = e.target as HTMLElement;
    this.closeColorPicker();
    if (t.closest('.canvas-node') || t.closest('.canvas-zoom-controls')) return;
    const v = this.view();
    this.panState = { startMouseX: e.clientX, startMouseY: e.clientY, startPanX: v.panX, startPanY: v.panY };
    this.panningView.set(true);
  }

  private worldPointFromEvent(e: MouseEvent): { x: number; y: number } {
    const outer = this.outerEl();
    if (!outer) return { x: 0, y: 0 };
    const rect = outer.getBoundingClientRect();
    const v = this.view();
    return { x: (e.clientX - rect.left - v.panX) / v.zoom, y: (e.clientY - rect.top - v.panY) / v.zoom };
  }

  onCanvasDoubleClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (t.closest('.canvas-node')) return;
    const p = this.worldPointFromEvent(e);
    this.canvasDoubleClicked.emit(p);
  }

  startNodeDrag(e: MouseEvent, node: CanvasNode): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (this.editingId() === node.id) return;
    this.dragState = { id: node.id, startMouseX: e.clientX, startMouseY: e.clientY, startX: node.x, startY: node.y, moved: false };
  }

  nodeColor(id: string): string | null {
    return this.nodes().find(n => n.id === id)?.color ?? null;
  }

  toggleColorPicker(e: MouseEvent, node: CanvasNode): void {
    e.stopPropagation();
    if (this.colorPickerId() === node.id) { this.closeColorPicker(); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // position:fixed popover anchored to the swatch button's viewport position (a transformed
    // canvas ancestor would break position:absolute), nudged so it doesn't cover the node.
    this.colorPickerPos.set({ top: rect.bottom + 6, left: rect.left });
    this.colorPickerId.set(node.id);
  }

  pickColor(id: string, color: string): void {
    this.nodeColorChanged.emit({ id, color });
    this.closeColorPicker();
  }

  closeColorPicker(): void {
    this.colorPickerId.set(null);
    this.colorPickerPos.set(null);
  }

  startResize(e: MouseEvent, node: CanvasNode): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.resizeState = {
      id: node.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW: node.width ?? NODE_W,
      startH: node.height ?? NODE_H,
    };
  }

  startConnect(e: MouseEvent, node: CanvasNode): void {
    e.stopPropagation();
    e.preventDefault();
    this.connectState = { fromId: node.id, toWorld: { x: node.x, y: node.y } };
  }

  startLabelEdit(node: CanvasNode): void {
    this.editingId.set(node.id);
    this.editingText.set(node.label);
  }

  commitLabelEdit(id: string): void {
    if (this.editingId() !== id) return;
    const text = this.editingText().trim();
    this.editingId.set(null);
    if (text) this.labelCommitted.emit({ id, label: text });
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.panState) {
      const p = this.panState;
      const v = this.view();
      this.view.set({ zoom: v.zoom, panX: p.startPanX + (e.clientX - p.startMouseX), panY: p.startPanY + (e.clientY - p.startMouseY) });
      return;
    }
    if (this.connectState) {
      this.connectState.toWorld = this.worldPointFromEvent(e);
      this.connectTick.update(t => t + 1);
      return;
    }
    if (this.resizeState) {
      const zoom = this.view().zoom;
      const rs = this.resizeState;
      const w = Math.max(MIN_NODE_W, Math.min(MAX_NODE_W, rs.startW + (e.clientX - rs.startMouseX) / zoom));
      const h = Math.max(MIN_NODE_H, Math.min(MAX_NODE_H, rs.startH + (e.clientY - rs.startMouseY) / zoom));
      this.localSizes.update(s => ({ ...s, [rs.id]: { width: w, height: h } }));
      return;
    }
    if (this.dragState) {
      if (!this.dragState.moved) {
        const totalDx = e.clientX - this.dragState.startMouseX;
        const totalDy = e.clientY - this.dragState.startMouseY;
        if (Math.hypot(totalDx, totalDy) > CLICK_MOVE_THRESHOLD) this.dragState.moved = true;
      }
      const zoom = this.view().zoom;
      const dx = (e.clientX - this.dragState.startMouseX) / zoom;
      const dy = (e.clientY - this.dragState.startMouseY) / zoom;
      const x = Math.max(0, this.dragState.startX + dx);
      const y = Math.max(0, this.dragState.startY + dy);
      this.localPositions.update(p => ({ ...p, [this.dragState!.id]: { x, y } }));
      return;
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(e: MouseEvent): void {
    if (this.panState) {
      this.panState = null;
      this.panningView.set(false);
      return;
    }
    if (this.connectState) {
      const fromId = this.connectState.fromId;
      const target = (e.target as HTMLElement).closest('.canvas-node') as HTMLElement | null;
      const toId = target?.getAttribute('data-node-id');
      const dropWorld = this.worldPointFromEvent(e);
      this.connectState = null;
      if (toId && toId !== fromId) {
        this.connectorDrawn.emit({ fromId, toId });
      } else if (!toId) {
        // Dropped on empty canvas -- spawn a new node centred on the cursor and connect to it.
        this.connectorDroppedOnEmpty.emit({ fromId, x: Math.max(0, dropWorld.x - NODE_W / 2), y: Math.max(0, dropWorld.y - NODE_H / 2) });
      }
      return;
    }
    if (this.resizeState) {
      const { id } = this.resizeState;
      const size = this.localSizes()[id];
      this.resizeState = null;
      if (size) {
        this.nodeResized.emit({ id, width: size.width, height: size.height });
        this.localSizes.update(s => { const next = { ...s }; delete next[id]; return next; });
      }
      return;
    }
    if (this.dragState) {
      const { id, moved } = this.dragState;
      if (moved) {
        const pos = this.localPositions()[id];
        if (pos) this.nodeMoved.emit({ id, x: pos.x, y: pos.y });
        this.localPositions.update(p => { const next = { ...p }; delete next[id]; return next; });
      } else {
        this.nodeSelected.emit(id);
      }
      this.dragState = null;
      return;
    }
  }
}
