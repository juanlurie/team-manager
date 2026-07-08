import { Component, ChangeDetectionStrategy, ElementRef, HostListener, AfterViewInit, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
}

export interface CanvasEdge {
  id: string;
  fromId: string;
  toId: string;
}

const NODE_W = 160;
const NODE_H = 64;
const CLICK_MOVE_THRESHOLD = 4;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;

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
    .canvas-edge { stroke:rgba(255,255,255,0.4);stroke-width:2;fill:none;cursor:pointer;pointer-events:stroke; }
    .canvas-edge:hover { stroke:#64b5f6; }
    .canvas-edge-pending { stroke:#64b5f6;stroke-width:2;stroke-dasharray:6 4;fill:none; }
    .canvas-node {
      position:absolute;width:${NODE_W}px;min-height:${NODE_H}px;border-radius:10px;
      background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.18);
      color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;
      padding:8px 12px;cursor:grab;user-select:none;font-size:0.85rem;box-sizing:border-box;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    }
    .canvas-node:hover { border-color:rgba(100,181,246,0.6); }
    .canvas-node.selected { border-color:#64b5f6;box-shadow:0 0 0 2px rgba(100,181,246,0.4); }
    .canvas-node-label {
      width:100%;background:transparent;border:none;color:inherit;text-align:center;
      font:inherit;resize:none;outline:none;
    }
    .connect-handle {
      position:absolute;width:14px;height:14px;border-radius:50%;background:#64b5f6;
      border:2px solid #14171f;cursor:crosshair;
    }
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
            <marker id="cb-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,255,255,0.5)" />
            </marker>
          </defs>
          @for (e of edgeLines(); track e.id) {
            <line class="canvas-edge" [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2"
                  marker-end="url(#cb-arrow)" (click)="edgeClicked.emit(e.id)" />
          }
          @if (pendingConnectLine(); as pl) {
            <line class="canvas-edge-pending" [attr.x1]="pl.x1" [attr.y1]="pl.y1" [attr.x2]="pl.x2" [attr.y2]="pl.y2" />
          }
        </svg>

        @for (n of renderNodes(); track n.id) {
          <div class="canvas-node" [class.selected]="n.id === selectedId()" [attr.data-node-id]="n.id"
               [style.left.px]="n.x" [style.top.px]="n.y"
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
            }
          </div>
        }
      </div>

      <div class="canvas-zoom-controls" (mousedown)="$event.stopPropagation()">
        <button class="cz-btn" (click)="zoomBy(0.8)">−</button>
        <button class="cz-btn" (click)="resetView()">{{ zoomPercent() }}%</button>
        <button class="cz-btn" (click)="zoomBy(1.25)">+</button>
      </div>
    </div>
  `,
})
export class CanvasBoardComponent implements AfterViewInit {
  nodes = input.required<CanvasNode[]>();
  edges = input<CanvasEdge[]>([]);
  connectMode = input(false);
  selectedId = input<string | null>(null);

  nodeMoved = output<{ id: string; x: number; y: number }>();
  nodeSelected = output<string>();
  labelCommitted = output<{ id: string; label: string }>();
  canvasDoubleClicked = output<{ x: number; y: number }>();
  connectorDrawn = output<{ fromId: string; toId: string }>();
  edgeClicked = output<string>();

  private elRef = inject(ElementRef);

  view = signal<{ zoom: number; panX: number; panY: number }>({ zoom: 1, panX: 40, panY: 40 });
  panningView = signal(false);

  private panState: { startMouseX: number; startMouseY: number; startPanX: number; startPanY: number } | null = null;
  private dragState: { id: string; startMouseX: number; startMouseY: number; startX: number; startY: number; moved: boolean } | null = null;
  private connectState: { fromId: string; toWorld: { x: number; y: number } } | null = null;
  private connectTick = signal(0); // bumped on mousemove while connecting, to re-render pendingConnectLine

  private localPositions = signal<Record<string, { x: number; y: number }>>({});

  editingId = signal<string | null>(null);
  editingText = signal('');

  renderNodes = computed(() => {
    const local = this.localPositions();
    return this.nodes().map(n => local[n.id] ? { ...n, x: local[n.id].x, y: local[n.id].y } : n);
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
        const c1 = this.anchorPoint(from, to);
        const c2 = this.anchorPoint(to, from);
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

  private anchorPoint(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
    const cx = from.x + NODE_W / 2;
    const cy = from.y + NODE_H / 2;
    const dx = to.x - cx;
    const dy = to.y - cy;
    const angle = Math.atan2(dy, dx);
    return { x: cx + Math.cos(angle) * (NODE_W / 2), y: cy + Math.sin(angle) * (NODE_H / 2) };
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
      this.connectState = null;
      if (toId && toId !== fromId) this.connectorDrawn.emit({ fromId, toId });
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
