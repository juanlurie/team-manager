import { Component, OnInit, OnDestroy, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { ProcessFlowService } from '../../../core/services/process-flow.service';
import { ProcessFlowSession, ProcessFlowSessionSummary, ProcessFlowNode } from '../../../core/models/process-flow.model';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NavService } from '../../../core/nav/nav.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CanvasBoardComponent, CanvasNode, CanvasEdge } from '../../../core/components/canvas-board/canvas-board.component';

@Component({
  selector: 'app-process-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule, CanvasBoardComponent],
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
    .board-canvas { flex:1;min-height:0;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.08); }
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
        </div>
        <div class="board-canvas">
          <app-canvas-board
            [nodes]="canvasNodes()"
            [edges]="canvasEdges()"
            [connectMode]="true"
            [resizable]="true"
            (canvasDoubleClicked)="onCanvasDoubleClicked($event)"
            (nodeMoved)="onNodeMoved($event)"
            (nodeResized)="onNodeResized($event)"
            (labelCommitted)="onLabelCommitted($event)"
            (connectorDrawn)="onConnectorDrawn($event)"
            (connectorDroppedOnEmpty)="onConnectorDroppedOnEmpty($event)"
            (edgeClicked)="onEdgeClicked($event)" />
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

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

  /** Hide the Pulse hub's tab row + width cap while a flow is open, so the canvas goes full-bleed (matches Retro). */
  private hideSubNavEffect = effect(() => {
    this.navSvc.hideSubNav.set(!!this.session());
  });

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
              const edge = msg.data['edge'] as { id: string; fromNodeId: string; toNodeId: string; label: string | null; sessionId: string };
              this.session.update(cur => cur && !cur.edges.some(e => e.id === edge.id)
                ? { ...cur, edges: [...cur.edges, edge] } : cur);
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
    this.canvasEdges.set(s.edges.map(e => ({ id: e.id, fromId: e.fromNodeId, toId: e.toNodeId })));
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

  onEdgeClicked(edgeId: string): void {
    const s = this.session();
    if (!s) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '340px',
      data: { title: 'Remove connection?', message: 'This can\'t be undone.', danger: true },
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.deleteEdge(s.id, edgeId).subscribe({
        next: () => {
          this.session.update(cur => cur ? { ...cur, edges: cur.edges.filter(e => e.id !== edgeId) } : cur);
          this.syncCanvas();
        },
        error: () => this.snackBar.open('Failed to remove connection', 'OK', { duration: 3000 }),
      });
    });
  }
}
