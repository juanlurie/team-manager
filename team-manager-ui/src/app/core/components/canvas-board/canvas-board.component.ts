import { Component, ChangeDetectionStrategy, ElementRef, HostListener, AfterViewInit, inject, input, output, signal, computed, effect, untracked, afterEveryRender } from '@angular/core';
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

export interface CanvasPoint { x: number; y: number; }

export interface CanvasEdge {
  id: string;
  fromId: string;
  toId: string;
  waypoints?: CanvasPoint[];
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
    .edge-handle { opacity:0;pointer-events:none;transition:opacity 0.12s; }
    .canvas-edge-group:hover .edge-handle { opacity:1;pointer-events:all; }
    .edge-waypoint { fill:#64b5f6;stroke:#14171f;stroke-width:2;cursor:grab; }
    .edge-midpoint { fill:rgba(100,181,246,0.45);stroke:#14171f;stroke-width:1.5;cursor:copy; }
    .edge-midpoint:hover { fill:#64b5f6; }
    .edge-endpoint { fill:#fff;stroke:#64b5f6;stroke-width:2.5;cursor:grab; }
    .edge-delete { cursor:pointer; }
    .edge-delete-bg { fill:#ef5350;stroke:#14171f;stroke-width:1.5; }
    .edge-delete-x { stroke:#fff;stroke-width:1.6;stroke-linecap:round;pointer-events:none; }
    .edge-delete:hover .edge-delete-bg { fill:#f77; }
    .canvas-node {
      position:absolute;border-radius:10px;
      background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.22);
      color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;
      padding:8px 12px;cursor:grab;user-select:none;font-size:0.85rem;box-sizing:border-box;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    }
    /* Coloured cards get a thicker, glowing neon edge in their own colour. */
    .canvas-node.neon { border-width:3px; }
    .canvas-node > span { max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere; }
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
          @for (e of edgePaths(); track e.id) {
            <g class="canvas-edge-group">
              <path class="canvas-edge-hit" [attr.d]="e.d" />
              <path class="canvas-edge" [attr.d]="e.d" marker-end="url(#cb-arrow)" />
              @if (connectMode()) {
                @for (mp of e.midpoints; track mp.segIndex) {
                  <circle class="edge-handle edge-midpoint" [attr.cx]="mp.x" [attr.cy]="mp.y" r="5"
                          (mousedown)="startWaypointInsert($event, e.id, mp.segIndex, mp.x, mp.y)" />
                }
                @for (wp of e.waypoints; track wp.index) {
                  <circle class="edge-handle edge-waypoint" [attr.cx]="wp.x" [attr.cy]="wp.y" r="6"
                          (mousedown)="startWaypointDrag($event, e.id, wp.index)"
                          (dblclick)="removeWaypoint($event, e.id, wp.index)" />
                }
                <circle class="edge-handle edge-endpoint" [attr.cx]="e.fromX" [attr.cy]="e.fromY" r="6"
                        (mousedown)="startEndpointDrag($event, e.id, 'from')" />
                <circle class="edge-handle edge-endpoint" [attr.cx]="e.toX" [attr.cy]="e.toY" r="6"
                        (mousedown)="startEndpointDrag($event, e.id, 'to')" />
                <g class="edge-handle edge-delete" (mousedown)="$event.stopPropagation()" (click)="edgeClicked.emit(e.id)">
                  <circle class="edge-delete-bg" [attr.cx]="e.labelX" [attr.cy]="e.labelY" r="8" />
                  <line class="edge-delete-x" [attr.x1]="e.labelX - 3" [attr.y1]="e.labelY - 3" [attr.x2]="e.labelX + 3" [attr.y2]="e.labelY + 3" />
                  <line class="edge-delete-x" [attr.x1]="e.labelX - 3" [attr.y1]="e.labelY + 3" [attr.x2]="e.labelX + 3" [attr.y2]="e.labelY - 3" />
                </g>
              }
            </g>
          }
          @if (pendingConnectLine(); as pl) {
            <line class="canvas-edge-pending" [attr.x1]="pl.x1" [attr.y1]="pl.y1" [attr.x2]="pl.x2" [attr.y2]="pl.y2" />
          }
          @if (endpointPendingLine(); as pl) {
            <line class="canvas-edge-pending" [attr.x1]="pl.x1" [attr.y1]="pl.y1" [attr.x2]="pl.x2" [attr.y2]="pl.y2" />
          }
        </svg>

        @for (n of renderNodes(); track n.id) {
          <div class="canvas-node" [class.selected]="n.id === selectedId()" [class.neon]="!!n.color" [attr.data-node-id]="n.id"
               [style.left.px]="n.x" [style.top.px]="n.y"
               [style.width.px]="n.width" [style.min-height.px]="n.storedHeight"
               [style.background]="n.color ?? null"
               [style.color]="n.color ? '#1a1a1a' : null"
               [style.border-color]="n.color ?? null"
               [style.box-shadow]="n.color ? ('0 0 16px ' + n.color + ', 0 0 6px ' + n.color) : null"
               (mousedown)="startNodeDrag($event, n)">
            @if (editingId() === n.id) {
              <textarea class="canvas-node-label" [value]="editingText()" rows="2"
                        (input)="editingText.set($any($event.target).value)"
                        (blur)="commitLabelEdit(n.id)"
                        (keydown.enter)="$event.preventDefault(); commitLabelEdit(n.id)"
                        (keydown.escape)="editingId.set(null)"
                        (mousedown)="startNodeDrag($event, n)"></textarea>
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
  edgeReshaped = output<{ id: string; waypoints: CanvasPoint[] }>();
  edgeEndpointRetargeted = output<{ id: string; end: 'from' | 'to'; nodeId: string }>();

  private elRef = inject(ElementRef);

  view = signal<{ zoom: number; panX: number; panY: number }>({ zoom: 1, panX: 40, panY: 40 });
  panningView = signal(false);

  private panState: { startMouseX: number; startMouseY: number; startPanX: number; startPanY: number } | null = null;
  private dragState: { id: string; startMouseX: number; startMouseY: number; startX: number; startY: number; moved: boolean; editing: boolean } | null = null;
  private resizeState: { id: string; startMouseX: number; startMouseY: number; startW: number; startH: number } | null = null;
  private connectState: { fromId: string; toWorld: { x: number; y: number } } | null = null;
  private connectTick = signal(0); // bumped on mousemove while connecting, to re-render pendingConnectLine

  private localPositions = signal<Record<string, { x: number; y: number }>>({});
  private localSizes = signal<Record<string, { width: number; height: number }>>({});
  // In-flight waypoint edits, keyed by edge id, layered over edge.waypoints until committed.
  private localWaypoints = signal<Record<string, CanvasPoint[]>>({});
  private edgeDragState: { edgeId: string; index: number } | null = null;
  private endpointDragState: { edgeId: string; end: 'from' | 'to'; toWorld: CanvasPoint } | null = null;
  private endpointTick = signal(0); // bumped on mousemove while re-targeting, to re-render the pending line

  editingId = signal<string | null>(null);
  editingText = signal('');

  readonly palette = NODE_PALETTE;
  colorPickerId = signal<string | null>(null);
  colorPickerPos = signal<{ top: number; left: number } | null>(null);

  // Actual rendered node heights (a node auto-grows past its stored height when its label wraps).
  // Fed back into the geometry so edge anchors land on the real border, not the stored rectangle.
  private measuredHeights = signal<Record<string, number>>({});

  constructor() {
    // After each render, read the DOM height of every node (offsetHeight is the unscaled layout
    // size -- the canvas zoom is a CSS transform and doesn't affect it). Only write when something
    // changed so this doesn't spin the change-detection loop.
    afterEveryRender(() => {
      const els = (this.elRef.nativeElement as HTMLElement).querySelectorAll('.canvas-node[data-node-id]');
      const next: Record<string, number> = {};
      els.forEach(el => {
        const id = el.getAttribute('data-node-id');
        if (id) next[id] = (el as HTMLElement).offsetHeight;
      });
      const cur = this.measuredHeights();
      const ids = new Set([...Object.keys(cur), ...Object.keys(next)]);
      let changed = false;
      for (const id of ids) { if (cur[id] !== next[id]) { changed = true; break; } }
      if (changed) this.measuredHeights.set(next);
    });

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
    const measured = this.measuredHeights();
    return this.nodes().map(n => {
      const storedH = sz[n.id]?.height ?? n.height ?? NODE_H;
      return {
        ...n,
        x: pos[n.id]?.x ?? n.x,
        y: pos[n.id]?.y ?? n.y,
        width: sz[n.id]?.width ?? n.width ?? NODE_W,
        // stored height is the min-height binding; the rendered box may be taller when text wraps.
        storedHeight: storedH,
        height: Math.max(storedH, measured[n.id] ?? 0),
      };
    });
  });

  innerTransform = computed(() => {
    const v = this.view();
    return `translate(${v.panX}px, ${v.panY}px) scale(${v.zoom})`;
  });

  private resolvedWaypoints(edge: CanvasEdge): CanvasPoint[] {
    return this.localWaypoints()[edge.id] ?? edge.waypoints ?? [];
  }

  private nodeById(id: string): { x: number; y: number; width?: number; height?: number } | undefined {
    return this.renderNodes().find(n => n.id === id);
  }

  // Auto orthogonal (Manhattan) route between two nodes: leaves/enters the facing side and turns
  // with one or two right-angle bends. Used only when an edge has no manual waypoints, so a fresh
  // connection reads as clean horizontal/vertical segments and stays that way as nodes move.
  private orthoRoute(from: { x: number; y: number; width?: number; height?: number }, to: { x: number; y: number; width?: number; height?: number }): CanvasPoint[] {
    const fhw = (from.width ?? NODE_W) / 2, fhh = (from.height ?? NODE_H) / 2;
    const thw = (to.width ?? NODE_W) / 2, thh = (to.height ?? NODE_H) / 2;
    const fc = { x: from.x + fhw, y: from.y + fhh }, tc = { x: to.x + thw, y: to.y + thh };
    const dx = tc.x - fc.x, dy = tc.y - fc.y;
    let pts: CanvasPoint[];
    if (Math.abs(dx) >= Math.abs(dy)) {
      const sgn = dx >= 0 ? 1 : -1;
      const sx = fc.x + sgn * fhw, tx = tc.x - sgn * thw, midx = (sx + tx) / 2;
      pts = [{ x: sx, y: fc.y }, { x: midx, y: fc.y }, { x: midx, y: tc.y }, { x: tx, y: tc.y }];
    } else {
      const sgn = dy >= 0 ? 1 : -1;
      const sy = fc.y + sgn * fhh, ty = tc.y - sgn * thh, midy = (sy + ty) / 2;
      pts = [{ x: fc.x, y: sy }, { x: fc.x, y: midy }, { x: tc.x, y: midy }, { x: tc.x, y: ty }];
    }
    // Drop consecutive duplicates so the final segment always has length (arrowhead needs a
    // direction to orient to).
    return pts.filter((p, i) => i === 0 || Math.abs(p.x - pts[i - 1].x) > 0.5 || Math.abs(p.y - pts[i - 1].y) > 0.5);
  }

  // Build an SVG path through the points, rounding each interior corner with a quadratic arc so
  // bends read as smooth curves rather than hard right angles. The corner radius is capped at half
  // the shorter adjacent segment so tight bends don't overshoot.
  private roundedPath(pts: CanvasPoint[], radius = 14): string {
    if (pts.length < 3) return 'M' + pts.map(p => `${p.x},${p.y}`).join(' L');
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const trim = (from: CanvasPoint, toward: CanvasPoint): CanvasPoint => {
        const dx = toward.x - from.x, dy = toward.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const r = Math.min(radius, len / 2);
        return { x: from.x + (dx / len) * r, y: from.y + (dy / len) * r };
      };
      const a = trim(p1, p0), b = trim(p1, p2);
      d += ` L${a.x},${a.y} Q${p1.x},${p1.y} ${b.x},${b.y}`;
    }
    const last = pts[pts.length - 1];
    d += ` L${last.x},${last.y}`;
    return d;
  }

  // Resolved point list + interior bends for an edge. Manual waypoints win; otherwise an auto
  // orthogonal route. `interior` is what a bend-insert bakes into, so auto edges convert to manual
  // cleanly on first drag.
  private edgeGeometry(edge: CanvasEdge, from: { x: number; y: number; width?: number; height?: number }, to: { x: number; y: number; width?: number; height?: number }): { points: CanvasPoint[]; interior: CanvasPoint[]; auto: boolean } {
    const wps = this.resolvedWaypoints(edge);
    if (wps.length) {
      const src = this.anchorPoint(from, wps[0]);
      const tgt = this.anchorPoint(to, wps[wps.length - 1]);
      return { points: [src, ...wps, tgt], interior: [...wps], auto: false };
    }
    const pts = this.orthoRoute(from, to);
    return { points: pts, interior: pts.slice(1, -1), auto: true };
  }

  edgePaths = computed(() => {
    const byId = new Map(this.renderNodes().map(n => [n.id, n]));
    return this.edges()
      .map(e => {
        const from = byId.get(e.fromId);
        const to = byId.get(e.toId);
        if (!from || !to) return null;
        const g = this.edgeGeometry(e, from, to);
        const pts = g.points;
        const d = this.roundedPath(pts);
        const midpoints = pts.slice(0, -1).map((p, i) => ({
          segIndex: i, x: (p.x + pts[i + 1].x) / 2, y: (p.y + pts[i + 1].y) / 2,
        }));
        // Only manual bends get move/remove handles; auto-route bends aren't real waypoints yet.
        const waypoints = g.auto ? [] : g.interior.map((p, i) => ({ index: i, x: p.x, y: p.y }));
        // Delete icon sits on the middle segment so it lands on the visible line.
        const mseg = Math.floor((pts.length - 1) / 2);
        const label = { x: (pts[mseg].x + pts[mseg + 1].x) / 2, y: (pts[mseg].y + pts[mseg + 1].y) / 2 };
        return {
          id: e.id, d, midpoints, waypoints,
          labelX: label.x, labelY: label.y,
          fromX: pts[0].x, fromY: pts[0].y, toX: pts[pts.length - 1].x, toY: pts[pts.length - 1].y,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  });

  endpointPendingLine = computed(() => {
    this.endpointTick();
    const s = this.endpointDragState;
    if (!s) return null;
    const edge = this.edges().find(ed => ed.id === s.edgeId);
    if (!edge) return null;
    const fixed = this.nodeById(s.end === 'from' ? edge.toId : edge.fromId);
    if (!fixed) return null;
    const anchor = this.anchorPoint(fixed, s.toWorld);
    return { x1: anchor.x, y1: anchor.y, x2: s.toWorld.x, y2: s.toWorld.y };
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
    // Note: this also fires from the edit textarea (so a fresh auto-editing node isn't trapped).
    // We don't preventDefault, so a plain click still places the text cursor; only once the pointer
    // actually moves past the threshold do we commit the edit and turn it into a real drag.
    this.dragState = {
      id: node.id, startMouseX: e.clientX, startMouseY: e.clientY,
      startX: node.x, startY: node.y, moved: false, editing: this.editingId() === node.id,
    };
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

  startWaypointDrag(e: MouseEvent, edgeId: string, index: number): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    this.edgeDragState = { edgeId, index };
  }

  startWaypointInsert(e: MouseEvent, edgeId: string, segIndex: number, x: number, y: number): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const edge = this.edges().find(ed => ed.id === edgeId);
    const from = edge && this.nodeById(edge.fromId);
    const to = edge && this.nodeById(edge.toId);
    if (!edge || !from || !to) return;
    // Bake the current route's interior bends (manual waypoints, or the auto-orthogonal bends)
    // then insert the new one, so an auto edge becomes an editable manual path on first drag.
    const interior = [...this.edgeGeometry(edge, from, to).interior];
    interior.splice(segIndex, 0, { x, y });
    this.localWaypoints.update(m => ({ ...m, [edgeId]: interior }));
    this.edgeDragState = { edgeId, index: segIndex }; // start dragging the just-inserted bend
  }

  startEndpointDrag(e: MouseEvent, edgeId: string, end: 'from' | 'to'): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    this.endpointDragState = { edgeId, end, toWorld: this.worldPointFromEvent(e) };
    this.endpointTick.update(t => t + 1);
  }

  removeWaypoint(e: MouseEvent, edgeId: string, index: number): void {
    e.stopPropagation();
    e.preventDefault();
    const edge = this.edges().find(ed => ed.id === edgeId);
    if (!edge) return;
    const wps = this.resolvedWaypoints(edge).filter((_, i) => i !== index);
    this.localWaypoints.update(m => { const next = { ...m }; delete next[edgeId]; return next; });
    this.edgeReshaped.emit({ id: edgeId, waypoints: wps });
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
    if (this.endpointDragState) {
      this.endpointDragState.toWorld = this.worldPointFromEvent(e);
      this.endpointTick.update(t => t + 1);
      return;
    }
    if (this.edgeDragState) {
      const { edgeId, index } = this.edgeDragState;
      const p = this.worldPointFromEvent(e);
      this.localWaypoints.update(m => {
        const wps = [...(m[edgeId] ?? [])];
        if (!wps[index]) return m;
        wps[index] = { x: Math.max(0, p.x), y: Math.max(0, p.y) };
        return { ...m, [edgeId]: wps };
      });
      return;
    }
    if (this.dragState) {
      if (!this.dragState.moved) {
        const totalDx = e.clientX - this.dragState.startMouseX;
        const totalDy = e.clientY - this.dragState.startMouseY;
        if (Math.hypot(totalDx, totalDy) > CLICK_MOVE_THRESHOLD) {
          this.dragState.moved = true;
          // Turn an in-progress edit into a move: commit the text and stop the textarea from
          // running a text selection under the drag.
          if (this.dragState.editing) { this.commitLabelEdit(this.dragState.id); this.dragState.editing = false; }
        } else {
          return; // below threshold -- treat as a potential click/caret placement, don't nudge
        }
      }
      e.preventDefault();
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
    if (this.endpointDragState) {
      const { edgeId, end } = this.endpointDragState;
      const target = (e.target as HTMLElement).closest('.canvas-node') as HTMLElement | null;
      const nodeId = target?.getAttribute('data-node-id');
      this.endpointDragState = null;
      this.endpointTick.update(t => t + 1);
      // Dropped on a node -> ask the parent to re-point that end; dropped anywhere else -> no-op
      // and the edge snaps back to its original endpoints.
      if (nodeId) this.edgeEndpointRetargeted.emit({ id: edgeId, end, nodeId });
      return;
    }
    if (this.edgeDragState) {
      const { edgeId } = this.edgeDragState;
      const wps = this.localWaypoints()[edgeId];
      this.edgeDragState = null;
      if (wps) {
        this.edgeReshaped.emit({ id: edgeId, waypoints: wps });
        this.localWaypoints.update(m => { const next = { ...m }; delete next[edgeId]; return next; });
      }
      return;
    }
    if (this.dragState) {
      const { id, moved, editing } = this.dragState;
      this.dragState = null;
      if (moved) {
        const pos = this.localPositions()[id];
        if (pos) this.nodeMoved.emit({ id, x: pos.x, y: pos.y });
        this.localPositions.update(p => { const next = { ...p }; delete next[id]; return next; });
      } else if (!editing) {
        // A plain click on a non-editing node selects it. A click on an editing node is left
        // alone so the caret stays where the user placed it.
        this.nodeSelected.emit(id);
      }
      return;
    }
  }
}
