import { Component, OnInit, OnDestroy, inject, signal, effect, afterEveryRender, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { DiagramExportService, DiagramFormat } from '../../../core/services/diagram-export.service';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { ProcessFlowService } from '../../../core/services/process-flow.service';
import { ProcessFlowSession, ProcessFlowSessionSummary, ProcessFlowNode, ProcessFlowEdge } from '../../../core/models/process-flow.model';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NavService } from '../../../core/nav/nav.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CanvasBoardComponent, CanvasNode, CanvasEdge } from '../../../core/components/canvas-board/canvas-board.component';

@Component({
  selector: 'app-process-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule, MatMenuModule, CanvasBoardComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    :host { display:block;height:100%; }
    .lobby-wrap { padding:8px 0; }
    .lobby-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
    .lobby-title { font-size:1.1rem;font-weight:600;color:rgba(255,255,255,0.9); }
    .session-list { display:flex;flex-direction:column;gap:10px; }
    .session-card {
      display:flex;align-items:flex-start;justify-content:space-between;gap:8px;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:10px;padding:14px 16px;cursor:pointer;
      transition:background 0.15s,border-color 0.15s;
    }
    .session-card:hover { background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15); }
    .session-card-title { font-weight:600;color:#fff; }
    .session-card-meta { display:flex;gap:10px;font-size:0.75rem;color:rgba(255,255,255,0.45);margin-top:4px; }
    .empty-state { text-align:center;padding:32px;color:rgba(255,255,255,0.4); }
    .board-wrap { display:flex;flex-direction:column;height:calc(100vh - 100px); }
    .board-header { display:flex;align-items:center;gap:8px;padding:8px 0; }
    .board-title { font-weight:600;font-size:1rem;color:#fff; }
    .board-hint { font-size:0.75rem;color:rgba(255,255,255,0.4);margin-left:auto; }
    .board-canvas { position:relative;flex:1;min-height:0;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.08); }
    .active-toggle { color:#64b5f6; }
    .code-panel {
      position:absolute;top:0;right:0;bottom:0;width:min(420px, 90%);z-index:20;
      display:flex;flex-direction:column;
      background:#1b1f28;border-left:1px solid rgba(255,255,255,0.12);
      box-shadow:-6px 0 20px rgba(0,0,0,0.4);
    }
    .code-panel-head { display:flex;align-items:center;gap:2px;padding:4px 6px 4px 12px;border-bottom:1px solid rgba(255,255,255,0.08); }
    .code-panel-title { font-size:0.8rem;font-weight:600;color:#fff;margin-right:auto;letter-spacing:0.04em; }
    .code-apply { height:30px;line-height:30px;font-size:0.78rem;padding:0 12px;min-width:0; }
    .code-apply mat-spinner { display:inline-block;vertical-align:middle;margin-right:4px; }
    .code-apply mat-icon { font-size:18px;height:18px;width:18px;vertical-align:middle; }
    .code-textarea {
      flex:1;min-height:0;resize:none;border:none;outline:none;
      background:#12151c;color:#d7e0ea;padding:12px;
      font-family:'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size:0.78rem;line-height:1.5;white-space:pre;tab-size:2;
    }
    .code-panel-hint { padding:8px 12px;font-size:0.68rem;color:rgba(255,255,255,0.4);border-top:1px solid rgba(255,255,255,0.08); }
  `],
  template: `
    @if (!session()) {
      <div class="lobby-wrap">
        <div class="lobby-header">
          <span class="lobby-title">Process Flows</span>
          <button mat-flat-button color="primary" (click)="createSession()" [disabled]="creating()">
            <mat-icon>add</mat-icon> New Flow
          </button>
        </div>
        @if (loading()) {
          <div style="text-align:center;padding:32px"><mat-spinner diameter="32" style="margin:0 auto" /></div>
        } @else {
          @if (sessions().length === 0) {
            <div class="empty-state">No process flows yet. Start one!</div>
          }
          <div class="session-list">
            @for (s of sessions(); track s.id) {
              <div class="session-card" (click)="openSession(s.id)">
                <div>
                  <div class="session-card-title">{{ s.title || 'Untitled Flow' }}</div>
                  <div class="session-card-meta">
                    <span>by {{ s.createdByName }}</span>
                    <span>{{ s.nodeCount }} node{{ s.nodeCount !== 1 ? 's' : '' }}</span>
                  </div>
                </div>
                @if (s.createdByMemberId === authSvc.me?.id) {
                  <button mat-icon-button title="Delete flow" (click)="deleteSession($event, s)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>
    } @else {
      <div class="board-wrap">
        <div class="board-header">
          <button mat-icon-button (click)="backToList()"><mat-icon>arrow_back</mat-icon></button>
          <span class="board-title">{{ session()!.title || 'Untitled Flow' }}</span>
          <span class="board-hint">Double-click canvas to add a step. Drag a node's dot to connect it to another.</span>
          <button mat-icon-button title="PlantUML code" [class.active-toggle]="codeOpen()"
                  (click)="toggleCodePanel()" [disabled]="!session()?.nodes?.length"><mat-icon>code</mat-icon></button>
          <button mat-icon-button title="Download diagram" [matMenuTriggerFor]="dlMenu"
                  [disabled]="!session()?.nodes?.length"><mat-icon>download</mat-icon></button>
          <mat-menu #dlMenu="matMenu">
            <button mat-menu-item (click)="exportDiagram('png')"><mat-icon>image</mat-icon> PNG image</button>
            <button mat-menu-item (click)="exportDiagram('svg')"><mat-icon>shape_line</mat-icon> SVG (vector)</button>
            <button mat-menu-item (click)="exportDiagram('drawio')"><mat-icon>account_tree</mat-icon> draw.io (editable)</button>
            <button mat-menu-item (click)="exportDiagram('mermaid')"><mat-icon>code</mat-icon> Mermaid</button>
            <button mat-menu-item (click)="exportDiagram('plantuml')"><mat-icon>code</mat-icon> PlantUML</button>
          </mat-menu>
        </div>
        <div class="board-canvas">
          <app-canvas-board
            [nodes]="canvasNodes()"
            [edges]="canvasEdges()"
            [connectMode]="true"
            [resizable]="true"
            [colorPicker]="true"
            [editNodeId]="editNodeId()"
            (canvasDoubleClicked)="onCanvasDoubleClicked($event)"
            (nodeMoved)="onNodeMoved($event)"
            (nodeResized)="onNodeResized($event)"
            (nodeColorChanged)="onNodeColorChanged($event)"
            (labelCommitted)="onLabelCommitted($event)"
            (connectorDrawn)="onConnectorDrawn($event)"
            (connectorDroppedOnEmpty)="onConnectorDroppedOnEmpty($event)"
            (edgeReshaped)="onEdgeReshaped($event)"
            (edgeEndpointRetargeted)="onEdgeEndpointRetargeted($event)"
            (edgeColorChanged)="onEdgeColorChanged($event)"
            (edgeClicked)="onEdgeClicked($event)" />
          @if (codeOpen()) {
            <div class="code-panel">
              <div class="code-panel-head">
                <span class="code-panel-title">PlantUML</span>
                <button mat-flat-button color="primary" class="code-apply" (click)="applyCode()"
                        [disabled]="applyingCode() || !codeEdited()">
                  @if (applyingCode()) { <mat-spinner diameter="16" /> } @else { <mat-icon>play_arrow</mat-icon> } Apply
                </button>
                <button mat-icon-button title="Regenerate from diagram" (click)="regenerateCode()" [disabled]="applyingCode()"><mat-icon>refresh</mat-icon></button>
                <button mat-icon-button title="Copy" (click)="copyCode()"><mat-icon>content_copy</mat-icon></button>
                <button mat-icon-button title="Close" (click)="codeOpen.set(false)"><mat-icon>close</mat-icon></button>
              </div>
              <textarea class="code-textarea" spellcheck="false" [value]="codeText()"
                        (input)="onCodeEdited($any($event.target).value)" [disabled]="applyingCode()"></textarea>
              <div class="code-panel-hint">Edit the code, then <strong>Apply</strong> to update the diagram (renames, colours, and added/removed nodes &amp; arrows). New nodes get an auto position; Regenerate re-syncs from the diagram.</div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ProcessFlowComponent implements OnInit, OnDestroy {
  private svc = inject(ProcessFlowService);
  private wsSvc = inject(WebSocketService);
  authSvc = inject(AuthService);
  private navSvc = inject(NavService);
  private elRef = inject(ElementRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private exportSvc = inject(DiagramExportService);

  sessions = signal<ProcessFlowSessionSummary[]>([]);
  session = signal<ProcessFlowSession | null>(null);
  loading = signal(false);
  creating = signal(false);

  private destroy$ = new Subject<void>();
  private currentBoardSessionId: string | null = null;
  private connectedSub: ReturnType<typeof this.wsSvc.connected$.subscribe> | null = null;
  private lastWsSeq = -1;

  canvasNodes = signal<CanvasNode[]>([]);
  canvasEdges = signal<CanvasEdge[]>([]);
  editNodeId = signal<string | null>(null);

  /** Hide the Pulse hub's tab row + width cap while a flow is open, so the canvas goes full-bleed (matches Retro). */
  private hideSubNavEffect = effect(() => {
    this.navSvc.hideSubNav.set(!!this.session());
  });

  // Break the board out of the centered page-wrap padding/max-width so the canvas spans the full
  // content area (edge to edge, like the retro board). Negative margins are measured against the
  // scroll container because the amount depends on the sidebar width + how the page-wrap centers.
  private bleedEffect = afterEveryRender(() => this.applyBleed());

  @HostListener('window:resize')
  onResize(): void { this.applyBleed(); }

  private applyBleed(): void {
    const host = this.elRef.nativeElement as HTMLElement;
    const board = host.querySelector('.board-canvas') as HTMLElement | null;
    if (!board) return;
    const content = host.closest('.content') as HTMLElement | null;
    const cl = content ? content.getBoundingClientRect().left : 0;
    const cr = content ? content.getBoundingClientRect().right : window.innerWidth;
    // Measure the host (page-wrap content column) -- it stays put regardless of the board margins,
    // so this converges instead of oscillating.
    const r = host.getBoundingClientRect();
    const gutter = 8;
    const ml = `${-(r.left - cl - gutter)}px`, mr = `${-(cr - r.right - gutter)}px`;
    // Only write when it actually changes, so this render-loop hook doesn't thrash layout.
    if (board.style.marginLeft !== ml) board.style.marginLeft = ml;
    if (board.style.marginRight !== mr) board.style.marginRight = mr;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.openSession(id);
    } else {
      this.loadSessions();
    }
    this.wsSvc.connect();
    this.wsSvc.messages$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (!msg) return;
      const s = this.session();
      if (!s) return;
      try {
        if (typeof msg.seq === 'number') {
          if (msg.seq <= this.lastWsSeq) return;
          this.lastWsSeq = msg.seq;
        }
        switch (msg.type) {
          case 'process_flow_node_added':
            if (msg.data['sessionId'] === s.id && msg.data['node']) {
              const node = msg.data['node'] as ProcessFlowNode;
              this.session.update(cur => cur && !cur.nodes.some(n => n.id === node.id)
                ? { ...cur, nodes: [...cur.nodes, node] } : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_node_moved':
            if (msg.data['sessionId'] === s.id) {
              const nodeId = msg.data['nodeId'] as string;
              const positionX = msg.data['positionX'] as number;
              const positionY = msg.data['positionY'] as number;
              this.session.update(cur => cur
                ? { ...cur, nodes: cur.nodes.map(n => n.id === nodeId ? { ...n, positionX, positionY } : n) }
                : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_node_resized':
            if (msg.data['sessionId'] === s.id) {
              const nodeId = msg.data['nodeId'] as string;
              const width = msg.data['width'] as number;
              const height = msg.data['height'] as number;
              this.session.update(cur => cur
                ? { ...cur, nodes: cur.nodes.map(n => n.id === nodeId ? { ...n, width, height } : n) }
                : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_node_color_changed':
            if (msg.data['sessionId'] === s.id) {
              const nodeId = msg.data['nodeId'] as string;
              const color = (msg.data['color'] as string | null) ?? null;
              this.session.update(cur => cur
                ? { ...cur, nodes: cur.nodes.map(n => n.id === nodeId ? { ...n, color } : n) }
                : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_node_text_updated':
            if (msg.data['sessionId'] === s.id) {
              const nodeId = msg.data['nodeId'] as string;
              const label = msg.data['label'] as string;
              this.session.update(cur => cur
                ? { ...cur, nodes: cur.nodes.map(n => n.id === nodeId ? { ...n, label } : n) }
                : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_node_deleted':
            if (msg.data['sessionId'] === s.id) {
              const nodeId = msg.data['nodeId'] as string;
              const removedEdgeIds = (msg.data['removedEdgeIds'] as string[]) ?? [];
              this.session.update(cur => cur
                ? { ...cur, nodes: cur.nodes.filter(n => n.id !== nodeId), edges: cur.edges.filter(e => !removedEdgeIds.includes(e.id)) }
                : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_edge_added':
            if (msg.data['sessionId'] === s.id && msg.data['edge']) {
              const raw = msg.data['edge'] as ProcessFlowEdge;
              const edge: ProcessFlowEdge = { ...raw, waypoints: raw.waypoints ?? [] };
              this.session.update(cur => cur && !cur.edges.some(e => e.id === edge.id)
                ? { ...cur, edges: [...cur.edges, edge] } : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_edge_reshaped':
            if (msg.data['sessionId'] === s.id) {
              const edgeId = msg.data['edgeId'] as string;
              const waypoints = (msg.data['waypoints'] as { x: number; y: number }[]) ?? [];
              this.session.update(cur => cur
                ? { ...cur, edges: cur.edges.map(e => e.id === edgeId ? { ...e, waypoints } : e) }
                : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_edge_color_changed':
            if (msg.data['sessionId'] === s.id) {
              const edgeId = msg.data['edgeId'] as string;
              const color = (msg.data['color'] as string | null) ?? null;
              this.session.update(cur => cur
                ? { ...cur, edges: cur.edges.map(e => e.id === edgeId ? { ...e, color } : e) }
                : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_edge_endpoints_changed':
            if (msg.data['sessionId'] === s.id) {
              const edgeId = msg.data['edgeId'] as string;
              const fromNodeId = msg.data['fromNodeId'] as string;
              const toNodeId = msg.data['toNodeId'] as string;
              this.session.update(cur => cur
                ? { ...cur, edges: cur.edges.map(e => e.id === edgeId ? { ...e, fromNodeId, toNodeId, waypoints: [] } : e) }
                : cur);
              this.syncCanvas();
            }
            break;
          case 'process_flow_edge_deleted':
            if (msg.data['sessionId'] === s.id) {
              const edgeId = msg.data['edgeId'] as string;
              this.session.update(cur => cur ? { ...cur, edges: cur.edges.filter(e => e.id !== edgeId) } : cur);
              this.syncCanvas();
            }
            break;
        }
      } catch { /* one malformed broadcast must never take the whole stream down */ }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.connectedSub?.unsubscribe();
    this.navSvc.hideSubNav.set(false);
    if (this.currentBoardSessionId) this.wsSvc.send({ type: 'leave_board' });
  }

  private syncCanvas(): void {
    const s = this.session();
    if (!s) return;
    this.canvasNodes.set(s.nodes.map(n => ({ id: n.id, x: n.positionX, y: n.positionY, label: n.label, color: n.color ?? undefined, width: n.width, height: n.height })));
    this.canvasEdges.set(s.edges.map(e => ({ id: e.id, fromId: e.fromNodeId, toId: e.toNodeId, color: e.color ?? undefined, waypoints: e.waypoints ?? [] })));
  }

  private joinBoardPresence(sessionId: string): void {
    this.currentBoardSessionId = sessionId;
    this.connectedSub?.unsubscribe();
    this.connectedSub = this.wsSvc.connected$.pipe(filter(c => c), takeUntil(this.destroy$)).subscribe(() => {
      if (!this.currentBoardSessionId) return;
      this.lastWsSeq = -1;
      this.wsSvc.send({ type: 'join_board', sessionId: this.currentBoardSessionId });
    });
  }

  loadSessions(): void {
    this.loading.set(true);
    this.svc.getSessions().subscribe({
      next: list => { this.sessions.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load process flows', 'OK', { duration: 3000 }); },
    });
  }

  createSession(): void {
    this.creating.set(true);
    this.svc.createSession().subscribe({
      next: s => {
        this.creating.set(false);
        this.lastWsSeq = -1;
        this.session.set(s);
        this.syncCanvas();
        this.router.navigate(['/pulse/process-flows', s.id], { replaceUrl: true });
        this.joinBoardPresence(s.id);
      },
      error: () => {
        this.creating.set(false);
        this.snackBar.open('Failed to create process flow', 'OK', { duration: 3000 });
      },
    });
  }

  openSession(id: string): void {
    this.loading.set(true);
    this.svc.getSession(id).subscribe({
      next: s => {
        this.lastWsSeq = -1;
        this.session.set(s);
        this.syncCanvas();
        this.loading.set(false);
        this.router.navigate(['/pulse/process-flows', s.id], { replaceUrl: true });
        this.joinBoardPresence(s.id);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load process flow', 'OK', { duration: 3000 });
        this.loadSessions();
      },
    });
  }

  backToList(): void {
    if (this.currentBoardSessionId) {
      this.wsSvc.send({ type: 'leave_board' });
      this.currentBoardSessionId = null;
    }
    this.connectedSub?.unsubscribe();
    this.session.set(null);
    this.router.navigate(['/pulse/process-flows'], { replaceUrl: true });
    this.loadSessions();
  }

  deleteSession(event: Event, s: ProcessFlowSessionSummary): void {
    event.stopPropagation();
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: `Delete "${s.title || 'Untitled Flow'}"?`, message: "This can't be undone.", danger: true },
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.deleteSession(s.id).subscribe({
        next: () => this.sessions.update(list => list.filter(x => x.id !== s.id)),
        error: () => this.snackBar.open('Failed to delete process flow', 'OK', { duration: 3000 }),
      });
    });
  }

  onCanvasDoubleClicked(p: { x: number; y: number }): void {
    const s = this.session();
    if (!s) return;
    this.svc.addNode(s.id, 'Step', p.x, p.y).subscribe({
      next: node => {
        this.session.update(cur => cur && !cur.nodes.some(n => n.id === node.id) ? { ...cur, nodes: [...cur.nodes, node] } : cur);
        this.syncCanvas();
        this.editNodeId.set(node.id);
      },
      error: () => this.snackBar.open('Failed to add node', 'OK', { duration: 3000 }),
    });
  }

  onNodeMoved(e: { id: string; x: number; y: number }): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur
      ? { ...cur, nodes: cur.nodes.map(n => n.id === e.id ? { ...n, positionX: e.x, positionY: e.y } : n) }
      : cur);
    this.syncCanvas();
    this.svc.updateNodePosition(s.id, e.id, e.x, e.y).subscribe({
      error: () => this.snackBar.open('Failed to save node position', 'OK', { duration: 3000 }),
    });
  }

  onNodeResized(e: { id: string; width: number; height: number }): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur
      ? { ...cur, nodes: cur.nodes.map(n => n.id === e.id ? { ...n, width: e.width, height: e.height } : n) }
      : cur);
    this.syncCanvas();
    this.svc.updateNodeSize(s.id, e.id, e.width, e.height).subscribe({
      error: () => this.snackBar.open('Failed to save node size', 'OK', { duration: 3000 }),
    });
  }

  onNodeColorChanged(e: { id: string; color: string }): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur
      ? { ...cur, nodes: cur.nodes.map(n => n.id === e.id ? { ...n, color: e.color } : n) }
      : cur);
    this.syncCanvas();
    this.svc.updateNodeColor(s.id, e.id, e.color).subscribe({
      error: () => this.snackBar.open('Failed to save node colour', 'OK', { duration: 3000 }),
    });
  }

  onLabelCommitted(e: { id: string; label: string }): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur ? { ...cur, nodes: cur.nodes.map(n => n.id === e.id ? { ...n, label: e.label } : n) } : cur);
    this.syncCanvas();
    this.svc.updateNodeText(s.id, e.id, e.label).subscribe({
      error: () => this.snackBar.open('Failed to rename node', 'OK', { duration: 3000 }),
    });
  }

  onConnectorDrawn(e: { fromId: string; toId: string }): void {
    const s = this.session();
    if (!s) return;
    this.svc.addEdge(s.id, e.fromId, e.toId).subscribe({
      next: edge => {
        this.session.update(cur => cur && !cur.edges.some(x => x.id === edge.id) ? { ...cur, edges: [...cur.edges, edge] } : cur);
        this.syncCanvas();
      },
      error: () => this.snackBar.open('Could not connect those nodes', 'OK', { duration: 3000 }),
    });
  }

  onConnectorDroppedOnEmpty(e: { fromId: string; x: number; y: number }): void {
    const s = this.session();
    if (!s) return;
    // Create the target node where the line was dropped, then connect the source to it.
    this.svc.addNode(s.id, 'Step', e.x, e.y).subscribe({
      next: node => {
        this.session.update(cur => cur && !cur.nodes.some(n => n.id === node.id) ? { ...cur, nodes: [...cur.nodes, node] } : cur);
        this.syncCanvas();
        this.editNodeId.set(node.id);
        this.svc.addEdge(s.id, e.fromId, node.id).subscribe({
          next: edge => {
            this.session.update(cur => cur && !cur.edges.some(x => x.id === edge.id) ? { ...cur, edges: [...cur.edges, edge] } : cur);
            this.syncCanvas();
          },
          error: () => this.snackBar.open('Could not connect the new node', 'OK', { duration: 3000 }),
        });
      },
      error: () => this.snackBar.open('Failed to add node', 'OK', { duration: 3000 }),
    });
  }

  onEdgeReshaped(e: { id: string; waypoints: { x: number; y: number }[] }): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur
      ? { ...cur, edges: cur.edges.map(x => x.id === e.id ? { ...x, waypoints: e.waypoints } : x) }
      : cur);
    this.syncCanvas();
    this.svc.updateEdgeWaypoints(s.id, e.id, e.waypoints).subscribe({
      error: () => this.snackBar.open('Failed to save arrow shape', 'OK', { duration: 3000 }),
    });
  }

  onEdgeEndpointRetargeted(e: { id: string; end: 'from' | 'to'; nodeId: string }): void {
    const s = this.session();
    if (!s) return;
    const edge = s.edges.find(x => x.id === e.id);
    if (!edge) return;
    const fromNodeId = e.end === 'from' ? e.nodeId : edge.fromNodeId;
    const toNodeId = e.end === 'to' ? e.nodeId : edge.toNodeId;
    if (fromNodeId === toNodeId) return; // can't point an edge at itself
    // Retargeting drops any manual bends server-side; mirror that locally.
    this.session.update(cur => cur
      ? { ...cur, edges: cur.edges.map(x => x.id === e.id ? { ...x, fromNodeId, toNodeId, waypoints: [] } : x) }
      : cur);
    this.syncCanvas();
    this.svc.updateEdgeEndpoints(s.id, e.id, fromNodeId, toNodeId).subscribe({
      error: () => this.snackBar.open('Could not move that connection', 'OK', { duration: 3000 }),
    });
  }

  // Deletion is one click on the edge's hover trash icon -- deliberate enough to skip a dialog,
  // and re-drawing a connection is trivial.
  private exportData() {
    const s = this.session();
    if (!s) return null;
    return {
      title: s.title || 'process-flow',
      nodes: s.nodes.map(n => ({ id: n.id, label: n.label, x: n.positionX, y: n.positionY, width: n.width, height: n.height, color: n.color })),
      edges: s.edges.map(e => ({ id: e.id, fromId: e.fromNodeId, toId: e.toNodeId, color: e.color, waypoints: e.waypoints ?? [] })),
    };
  }

  exportDiagram(format: DiagramFormat): void {
    const d = this.exportData();
    if (d) this.exportSvc.download(format, d.title, d.nodes, d.edges);
  }

  // ── live, editable PlantUML code panel ────────────────────────────────────
  codeOpen = signal(false);
  codeText = signal('');
  applyingCode = signal(false);
  codeEdited = signal(false);
  // Alias (n0, n1, ...) -> node id, captured whenever the code is (re)generated so an Apply can map
  // edited lines back to the right existing nodes.
  private codeAliasMap: Record<string, string> = {};

  // Keep the panel in sync with the diagram while it's open, unless the user has hand-edited it.
  private codeSyncEffect = effect(() => {
    this.session(); // track diagram changes
    if (this.codeOpen() && !this.codeEdited()) this.codeText.set(this.buildPlantuml());
  });

  private buildPlantuml(): string {
    const s = this.session();
    if (!s) return '';
    this.codeAliasMap = Object.fromEntries(s.nodes.map((n, i) => [`n${i}`, n.id]));
    const d = this.exportData();
    return d ? this.exportSvc.toPlantuml(d.nodes, d.edges) : '';
  }

  toggleCodePanel(): void {
    if (!this.codeOpen()) this.regenerateCode();
    this.codeOpen.update(v => !v);
  }

  regenerateCode(): void { this.codeEdited.set(false); this.codeText.set(this.buildPlantuml()); }

  onCodeEdited(text: string): void { this.codeEdited.set(true); this.codeText.set(text); }

  copyCode(): void {
    navigator.clipboard?.writeText(this.codeText()).then(
      () => this.snackBar.open('PlantUML copied', 'OK', { duration: 2000 }),
      () => this.snackBar.open('Copy failed', 'OK', { duration: 2000 }),
    );
  }

  // Parse the edited PlantUML and reconcile it onto the diagram: rename/recolour matched nodes,
  // create new ones (aliases not seen before), delete removed ones, and add/remove edges to match.
  // Aliases map to existing nodes via codeAliasMap (captured at last generate); server round-trips
  // between phases keep ids/positions authoritative.
  async applyCode(): Promise<void> {
    const s0 = this.session();
    if (!s0 || this.applyingCode()) return;
    const sessionId = s0.id;
    const parsed = this.exportSvc.parsePlantuml(this.codeText());
    if (!parsed.nodes.length) { this.snackBar.open('No nodes found in the code', 'OK', { duration: 3000 }); return; }

    this.applyingCode.set(true);
    try {
      const aliasMap = { ...this.codeAliasMap };
      const idToAlias = new Map(Object.entries(aliasMap).map(([a, id]) => [id, a]));
      const parsedAliases = new Set(parsed.nodes.map(n => n.alias));
      let snap = await firstValueFrom(this.svc.getSession(sessionId));

      // create nodes for aliases we've never seen
      let made = 0;
      for (const pn of parsed.nodes) {
        if (aliasMap[pn.alias]) continue;
        const node = await firstValueFrom(this.svc.addNode(sessionId, pn.label || 'Step', 80 + (made % 6) * 190, 520 + Math.floor(made / 6) * 130));
        aliasMap[pn.alias] = node.id;
        made++;
        if (pn.color) await firstValueFrom(this.svc.updateNodeColor(sessionId, node.id, pn.color));
      }
      // rename / recolour existing nodes
      for (const pn of parsed.nodes) {
        const id = aliasMap[pn.alias];
        const cur = id && snap.nodes.find(n => n.id === id);
        if (!cur) continue;
        if (pn.label && pn.label !== cur.label) await firstValueFrom(this.svc.updateNodeText(sessionId, id, pn.label));
        if ((pn.color || null) !== (cur.color || null)) await firstValueFrom(this.svc.updateNodeColor(sessionId, id, pn.color || ''));
      }
      // delete nodes whose alias was removed from the code
      for (const n of snap.nodes) {
        const al = idToAlias.get(n.id);
        if (al && !parsedAliases.has(al)) await firstValueFrom(this.svc.deleteNode(sessionId, n.id));
      }

      // reconcile edges against fresh server state
      snap = await firstValueFrom(this.svc.getSession(sessionId));
      const want = parsed.edges
        .map(e => ({ from: aliasMap[e.from], to: aliasMap[e.to] }))
        .filter(e => e.from && e.to && e.from !== e.to);
      const seen = new Set<string>();
      for (const w of want) {
        const key = `${w.from}>${w.to}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!snap.edges.some(e => e.fromNodeId === w.from && e.toNodeId === w.to)) {
          await firstValueFrom(this.svc.addEdge(sessionId, w.from, w.to)).catch(() => {});
        }
      }
      for (const e of snap.edges) {
        if (!want.some(w => w.from === e.fromNodeId && w.to === e.toNodeId)) await firstValueFrom(this.svc.deleteEdge(sessionId, e.id));
      }

      const fresh = await firstValueFrom(this.svc.getSession(sessionId));
      this.session.set(fresh);
      this.syncCanvas();
      this.regenerateCode();
      this.snackBar.open('Diagram updated from code', 'OK', { duration: 2500 });
    } catch {
      this.snackBar.open('Could not apply the code', 'OK', { duration: 3000 });
    } finally {
      this.applyingCode.set(false);
    }
  }

  onEdgeColorChanged(e: { id: string; color: string }): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur
      ? { ...cur, edges: cur.edges.map(x => x.id === e.id ? { ...x, color: e.color } : x) }
      : cur);
    this.syncCanvas();
    this.svc.updateEdgeColor(s.id, e.id, e.color).subscribe({
      error: () => this.snackBar.open('Failed to save arrow colour', 'OK', { duration: 3000 }),
    });
  }

  onEdgeClicked(edgeId: string): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur ? { ...cur, edges: cur.edges.filter(e => e.id !== edgeId) } : cur);
    this.syncCanvas();
    this.svc.deleteEdge(s.id, edgeId).subscribe({
      error: () => this.snackBar.open('Failed to remove connection', 'OK', { duration: 3000 }),
    });
  }
}
