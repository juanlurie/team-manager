import {
  Component, inject, signal, computed, OnInit, OnDestroy, AfterViewInit,
  HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Game2048Service } from '../../core/services/game-2048.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';
import { Game2048Session, Game2048SessionSummary } from '../../core/models/game-2048.model';

const TILE_COLORS: Record<number, string> = {
  0:    'rgba(255,255,255,0.04)',
  2:    '#eee4da', 4:    '#ede0c8', 8:    '#f2b179', 16:   '#f59563',
  32:   '#f67c5f', 64:   '#f65e3b', 128:  '#edcf72', 256:  '#edcc61',
  512:  '#edc850', 1024: '#edc53f', 2048: '#edc22e',
};

const TILE_TEXT: Record<number, string> = {
  0:    'transparent', 2: '#776e65', 4: '#776e65',
  8:    '#f9f6f2', 16: '#f9f6f2', 32: '#f9f6f2', 64: '#f9f6f2',
  128:  '#f9f6f2', 256: '#f9f6f2', 512: '#f9f6f2', 1024: '#f9f6f2', 2048: '#f9f6f2',
};

const PLAYER_COLORS = ['#64b5f6', '#ffa726', '#81c784', '#f48fb1', '#ce93d8', '#80cbc4'];

interface AnimTile {
  id: number;
  value: number;
  row: number;
  col: number;
  state: 'idle' | 'appearing' | 'merged';
}

interface SimMove { fromIdx: number; toIdx: number; willMerge: boolean; }

@Component({
  selector: 'app-game-2048',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="page" [class.no-scroll]="activePlaying()" [class.immersive]="nav.hideNav()">

      @if (!session()) {
        <!-- ── LOBBY ── -->
        <div class="lobby-header">
          <mat-icon class="lobby-icon">grid_4x4</mat-icon>
          <div>
            <h2 class="lobby-title">2048</h2>
            <span class="lobby-sub">Compete for the highest score</span>
          </div>
          @if (canHost()) {
            <button class="create-btn" (click)="showCreate = !showCreate" [class.active]="showCreate">
              <mat-icon>add</mat-icon> New Game
            </button>
          }
        </div>

        @if (showCreate) {
          <div class="create-form">
            <input class="title-input" placeholder="Game title (optional)" [(ngModel)]="newTitle" />
            <div class="form-actions">
              <button class="cancel-btn" (click)="showCreate = false">Cancel</button>
              <button class="save-btn" (click)="createGame()" [disabled]="creating()">
                {{ creating() ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </div>
        }

        @if (loading()) {
          <div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        } @else if (sessions().length === 0) {
          <div class="empty-state">
            <mat-icon>grid_4x4</mat-icon>
            <p>No open games</p>
            @if (canHost()) { <p class="hint">Create one above to get started.</p> }
          </div>
        } @else {
          <div class="session-list">
            @for (s of sessions(); track s.id) {
              <div class="session-card" (click)="openSession(s.id)">
                <div class="sc-icon">2048</div>
                <div class="sc-info">
                  <div class="sc-title">{{ s.title || 'Untitled Game' }}</div>
                  <div class="sc-meta">by {{ s.createdByName }} · {{ s.playerCount }} player{{ s.playerCount !== 1 ? 's' : '' }}</div>
                </div>
                <span class="sc-status inprogress">In progress · {{ s.playerCount }} playing</span>
              </div>
            }
          </div>
        }

      } @else {
        <!-- ── GAME ── -->
        @let s = session()!;
        <div class="game-wrap">

          <div class="game-header">
            <button class="back-btn" (click)="backToLobby()"><mat-icon>arrow_back</mat-icon></button>
            <span class="game-title">{{ s.title || '2048' }}</span>
            @if (!alreadyJoined() && s.status === 'inprogress') {
              <button class="action-btn primary" (click)="joinGame()" [disabled]="joining()">
                {{ joining() ? 'Joining…' : 'Join Game' }}
              </button>
            }
          </div>

          <!-- Leaderboard -->
          <div class="scoreboard">
            @for (p of sortedParticipants(); track p.id) {
              <div class="player-chip" [class.me]="p.isMe" [style.border-color]="playerColor(p.order)">
                <span class="player-dot" [style.background]="playerColor(p.order)"></span>
                <span class="player-name">{{ p.displayName }}{{ p.isMe ? ' (you)' : '' }}</span>
                @if (p.hasWon) { <mat-icon class="won-icon">emoji_events</mat-icon> }
                @if (p.isGameOver) { <span class="over-badge">done</span> }
                <span class="player-score">{{ p.score }}</span>
              </div>
            }
          </div>

          <!-- Status -->
          @if (s.status === 'completed') {
            @let winner = gameWinner();
            <div class="status-bar completed">
              <mat-icon>emoji_events</mat-icon>
              @if (winner) {
                {{ winner.isMe ? 'You win!' : winner.displayName + ' wins!' }} &nbsp;·&nbsp; {{ winner.score }} pts
              } @else {
                <span>It's a draw!</span>
              }
            </div>
          } @else if (myParticipant()?.isGameOver) {
            <div class="status-bar gameover">
              <mat-icon>sentiment_dissatisfied</mat-icon> Game over — watching others play
            </div>
          } @else {
            <div class="status-bar playing">
              <mat-icon>keyboard</mat-icon> Use arrow keys or swipe to play
            </div>
          }

          <!-- Boards grid -->
          <div class="boards-grid" [class.solo]="s.participants.length === 1">
            @for (p of s.participants; track p.id) {
              <div class="board-wrap" [class.me]="p.isMe" [class.gameover]="p.isGameOver">
                <div class="board-label">
                  <span class="board-player-dot" [style.background]="playerColor(p.order)"></span>
                  {{ p.displayName }}{{ p.isMe ? ' (you)' : '' }}
                  <span class="board-score">{{ p.score }}</span>
                  @if (p.isGameOver) { <span class="board-over">GAME OVER</span> }
                  @if (p.hasWon) { <mat-icon class="board-won">emoji_events</mat-icon> }
                </div>
                <div class="board">
                  @if (p.isMe) {
                    <!-- 16 background slot cells (kept in grid flow) -->
                    @for (_ of BOARD_BG; track $index) { <div class="cell-bg"></div> }
                    <!-- Absolutely-positioned animated tiles -->
                    @for (tile of myAnimTiles(); track tile.id) {
                      <div class="tile-anim"
                           [style.left]="tilePos(tile.col)"
                           [style.top]="tilePos(tile.row)"
                           [style.background]="tileColor(tile.value)"
                           [style.color]="tileText(tile.value)"
                           [class.big]="tile.value >= 1000"
                           [class.tile-appear]="tile.state === 'appearing'"
                           [class.tile-merge]="tile.state === 'merged'">
                        {{ tile.value }}
                      </div>
                    }
                  } @else {
                    @for (cell of p.board; track $index) {
                      <div class="cell" [style.background]="tileColor(cell)" [style.color]="tileText(cell)" [class.big]="cell >= 1000">
                        {{ cell || '' }}
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>

        </div>
      }

    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 12px 12px 80px; outline: none; }
    .page.no-scroll { touch-action: none; }
    .page.immersive { max-width: 100%; padding: 0; }
    .page.immersive .game-wrap { padding: 8px; gap: 8px; }

    /* Lobby */
    .lobby-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .lobby-icon { font-size: 30px; width: 30px; height: 30px; color: #64b5f6; }
    .lobby-title { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .lobby-sub { font-size: 0.78rem; color: rgba(255,255,255,0.38); }
    .create-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(100,181,246,0.12); border: 1px solid rgba(100,181,246,0.35); border-radius: 8px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .create-btn:hover, .create-btn.active { background: rgba(100,181,246,0.22); border-color: #64b5f6; }
    .create-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .create-form { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
    .title-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: rgba(255,255,255,0.85); font-size: 0.85rem; font-family: inherit; outline: none; }
    .title-input:focus { border-color: rgba(100,181,246,0.4); }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .cancel-btn { padding: 6px 14px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.45); font-size: 0.82rem; font-family: inherit; cursor: pointer; }
    .save-btn { padding: 6px 18px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.4); border-radius: 6px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; font-family: inherit; cursor: pointer; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .loading { display: flex; justify-content: center; gap: 6px; padding: 48px; }
    .dot { width: 7px; height: 7px; background: rgba(100,181,246,0.5); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)} }

    .empty-state { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.3); }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 12px; }
    .empty-state p { margin: 0 0 6px; font-size: 0.9rem; }
    .empty-state .hint { font-size: 0.78rem; color: rgba(255,255,255,0.2); }

    .session-list { display: flex; flex-direction: column; gap: 8px; }
    .session-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; cursor: pointer; transition: all 0.12s; }
    .session-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(100,181,246,0.2); }
    .sc-icon { width: 42px; height: 42px; background: rgba(100,181,246,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 900; color: #64b5f6; flex-shrink: 0; letter-spacing: -0.5px; }
    .sc-info { flex: 1; min-width: 0; }
    .sc-title { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .sc-meta { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 2px; }
    .sc-status { font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 10px; }
    .sc-status.waiting { background: rgba(100,181,246,0.12); color: #64b5f6; }
    .sc-status.inprogress { background: rgba(255,167,38,0.12); color: #ffa726; }

    /* Game */
    .game-wrap { display: flex; flex-direction: column; gap: 14px; }
    .game-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .back-btn { background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; cursor: pointer; color: rgba(255,255,255,0.55); display: flex; align-items: center; transition: all 0.12s; }
    .back-btn:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }
    .back-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .game-title { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.85); }
    .action-btn { padding: 5px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: rgba(255,255,255,0.7); font-size: 0.8rem; font-family: inherit; cursor: pointer; }
    .action-btn.primary { background: rgba(100,181,246,0.15); border-color: rgba(100,181,246,0.4); color: #64b5f6; font-weight: 600; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .scoreboard { display: flex; flex-wrap: wrap; gap: 8px; }
    .player-chip { display: flex; align-items: center; gap: 7px; padding: 6px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; transition: border-color 0.15s; }
    .player-chip.me { background: rgba(255,255,255,0.06); }
    .player-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .player-name { font-size: 0.8rem; color: rgba(255,255,255,0.7); }
    .won-icon { font-size: 14px; width: 14px; height: 14px; color: #ffa726; }
    .over-badge { font-size: 0.65rem; color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; }
    .player-score { font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.9); margin-left: 4px; }

    .status-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 0.82rem; color: rgba(255,255,255,0.55); }
    .status-bar mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .status-bar.playing { color: #64b5f6; }
    .status-bar.gameover { color: rgba(255,255,255,0.4); }
    .status-bar.completed { color: #ffa726; font-weight: 600; font-size: 0.9rem; }
    .status-bar.completed mat-icon { color: #ffa726; }

    /* Boards */
    .boards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .boards-grid.solo { grid-template-columns: minmax(200px, 340px); justify-content: center; }
    @media (min-width: 768px) {
      .boards-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      .boards-grid.solo { grid-template-columns: minmax(260px, 500px); }
    }

    .board-wrap { display: flex; flex-direction: column; gap: 6px; }
    .board-wrap.gameover .board { opacity: 0.45; }
    .board-wrap.me .board { box-shadow: 0 0 0 2px rgba(100,181,246,0.4); }

    .board-label { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: rgba(255,255,255,0.55); min-width: 0; }
    .board-player-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .board-score { margin-left: auto; font-weight: 700; color: rgba(255,255,255,0.8); font-size: 0.82rem; }
    .board-over { font-size: 0.62rem; font-weight: 700; color: rgba(255,255,255,0.35); letter-spacing: 0.5px; }
    .board-won { font-size: 14px; width: 14px; height: 14px; color: #ffa726; }

    .board {
      position: relative;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 8px;
      aspect-ratio: 1;
      --ts: calc((100% - 34px) / 4);
      --step: calc(var(--ts) + 6px);
    }

    /* Spectator board cells */
    .cell {
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; font-weight: 800; font-size: 1.1rem;
      transition: background 0.1s; aspect-ratio: 1; min-width: 0;
    }
    .cell.big { font-size: 0.85rem; }

    /* My board: background slots + animated tiles */
    .cell-bg {
      background: rgba(255,255,255,0.04);
      border-radius: 4px;
      aspect-ratio: 1;
    }

    .tile-anim {
      position: absolute; z-index: 2;
      width: var(--ts); height: var(--ts);
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; font-weight: 800; font-size: 1.1rem;
      transition: left 0.12s ease-in-out, top 0.12s ease-in-out;
      will-change: left, top;
    }
    .tile-anim.big { font-size: 0.85rem; }

    @keyframes tile-appear { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
    @keyframes tile-merge-pop { 0%{transform:scale(1)} 45%{transform:scale(1.2)} 100%{transform:scale(1)} }
    .tile-anim.tile-appear { animation: tile-appear 0.18s ease-out both; }
    .tile-anim.tile-merge  { animation: tile-merge-pop 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }
  `]
})
export class Game2048Component implements OnInit, OnDestroy, AfterViewInit {

  private svc = inject(Game2048Service);
  private ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private featureAccess = inject(FeatureAccessService);
  nav = inject(NavService);
  private destroy$ = new Subject<void>();

  sessions = signal<Game2048SessionSummary[]>([]);
  session = signal<Game2048Session | null>(null);
  loading = signal(false);
  creating = signal(false);
  joining = signal(false);

  myAnimTiles = signal<AnimTile[]>([]);
  readonly BOARD_BG = Array.from({ length: 16 }, (_, i) => i);

  private nextTileId = 0;
  private touchBlocker = (e: TouchEvent) => { if (this.activePlaying() && e.touches[0].clientX < 20) e.preventDefault(); };
  private moving = false;
  private slideAnimDone = false;
  private pendingNewBoard: number[] | null = null;
  private prevBoardForAnim: number[] = [];

  showCreate = false;
  newTitle = '';

  private touchStartX = 0;
  private touchStartY = 0;

  canHost = computed(() => this.featureAccess.hasAccess('2048-host'));
  alreadyJoined = computed(() => this.session()?.participants.some(p => p.isMe) ?? false);
  myParticipant = computed(() => this.session()?.participants.find(p => p.isMe) ?? null);

  sortedParticipants = computed(() => {
    const s = this.session();
    if (!s) return [];
    return [...s.participants].sort((a, b) => b.score - a.score);
  });

  activePlaying = computed(() => {
    const s = this.session();
    const me = this.myParticipant();
    return s?.status === 'inprogress' && !!me && !me.isGameOver;
  });

  gameWinner = computed(() => {
    const s = this.session();
    if (!s || s.status !== 'completed') return null;
    const sorted = [...s.participants].sort((a, b) => b.score - a.score);
    if (sorted.length === 0) return null;
    if (sorted.length > 1 && sorted[0].score === sorted[1].score) return null;
    return sorted[0];
  });

  ngOnInit() {
    this.loadSessions();
    this.ws.messages$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (!msg) return;
      if (msg.type === 'game_2048_update') {
        const current = this.session();
        if (current) {
          this.svc.getSession(current.id).subscribe(s => this.session.set(s));
        } else {
          this.loadSessions();
        }
      }
    });
  }

  ngAfterViewInit() {
    document.addEventListener('touchstart', this.touchBlocker, { passive: false });
  }

  ngOnDestroy() {
    this.enterGame(false);
    document.removeEventListener('touchstart', this.touchBlocker);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private enterGame(active: boolean) {
    this.nav.hideNav.set(active);
    document.body.style.overflow = active ? 'hidden' : '';
  }

  // ── Tile positioning ─────────────────────────────────────────────────────────

  tilePos(index: number): string {
    // Returns CSS calc() using the board's --step custom property
    return index === 0 ? '8px' : `calc(8px + ${index} * var(--step))`;
  }

  // ── Tile animation ───────────────────────────────────────────────────────────

  private initMyTiles(board: number[]) {
    this.myAnimTiles.set(
      board.map((val, i) => val === 0 ? null : {
        id: this.nextTileId++,
        value: val,
        row: Math.floor(i / 4),
        col: i % 4,
        state: 'idle' as const,
      }).filter(Boolean) as AnimTile[]
    );
  }

  private simulateSlide(board: number[], direction: string): SimMove[] {
    const moves: SimMove[] = [];
    const isHoriz = direction === 'left' || direction === 'right';
    const reversed = direction === 'right' || direction === 'down';

    for (let line = 0; line < 4; line++) {
      const indices = isHoriz
        ? [0, 1, 2, 3].map(i => line * 4 + i)
        : [0, 1, 2, 3].map(i => i * 4 + line);
      const ordered = reversed ? [...indices].reverse() : indices;
      const cells = ordered.map(idx => ({ idx, val: board[idx] }));
      const nonZero = cells.filter(c => c.val !== 0);
      const outPos = ordered;

      let out = 0, i = 0;
      while (i < nonZero.length) {
        const a = nonZero[i];
        const b = nonZero[i + 1];
        if (b && a.val === b.val) {
          moves.push({ fromIdx: a.idx, toIdx: outPos[out], willMerge: false });
          moves.push({ fromIdx: b.idx, toIdx: outPos[out], willMerge: true });
          out++; i += 2;
        } else {
          moves.push({ fromIdx: a.idx, toIdx: outPos[out], willMerge: false });
          out++; i++;
        }
      }
    }
    return moves;
  }

  private applySlideToTiles(moves: SimMove[]) {
    const tiles: AnimTile[] = this.myAnimTiles().map(t => ({ ...t, state: 'idle' as AnimTile['state'] }));
    const moved = new Set<number>();

    for (const m of moves) {
      const fromRow = Math.floor(m.fromIdx / 4), fromCol = m.fromIdx % 4;
      const toRow   = Math.floor(m.toIdx   / 4), toCol   = m.toIdx   % 4;
      const tile = tiles.find(t => !moved.has(t.id) && t.row === fromRow && t.col === fromCol);
      if (tile) {
        tile.row = toRow;
        tile.col = toCol;
        if (m.willMerge) tile.state = 'merged'; // marks for removal after slide
        moved.add(tile.id);
      }
    }
    this.myAnimTiles.set(tiles);
  }

  private reconcile(prevBoard: number[], newBoard: number[]) {
    // Remove tiles that were consumed by merges (slid into target and disappeared)
    const survivors = this.myAnimTiles().filter(t => t.state !== 'merged');
    const used = new Set<number>(); // flat indices already claimed
    const result: AnimTile[] = [];

    for (const tile of survivors) {
      const posIdx = tile.row * 4 + tile.col;
      if (used.has(posIdx)) continue;
      const newVal = newBoard[posIdx];
      if (!newVal) continue;
      used.add(posIdx);
      result.push(tile.value !== newVal
        ? { ...tile, value: newVal, state: 'merged' }
        : { ...tile, state: 'idle' });
    }

    // Add newly spawned tile: any position in newBoard that no survivor claimed
    for (let i = 0; i < 16; i++) {
      if (newBoard[i] !== 0 && !used.has(i)) {
        result.push({ id: this.nextTileId++, value: newBoard[i], row: Math.floor(i / 4), col: i % 4, state: 'appearing' });
        used.add(i);
      }
    }

    this.myAnimTiles.set(result);
    setTimeout(() => this.myAnimTiles.update(ts => ts.map(t => ({ ...t, state: 'idle' }))), 260);
  }

  // ── Input handlers ───────────────────────────────────────────────────────────

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent) {
    const s = this.session();
    if (!s || s.status !== 'inprogress') return;
    const me = this.myParticipant();
    if (!me || me.isGameOver) return;
    const dirMap: Record<string, 'left' | 'right' | 'up' | 'down'> = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
      A: 'left', D: 'right', W: 'up', S: 'down',
    };
    const dir = dirMap[event.key];
    if (!dir) return;
    event.preventDefault();
    this.move(dir);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    const s = this.session();
    if (!s || s.status !== 'inprogress') return;
    const me = this.myParticipant();
    if (!me || me.isGameOver) return;
    const dx = event.changedTouches[0].clientX - this.touchStartX;
    const dy = event.changedTouches[0].clientY - this.touchStartY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }

  private move(direction: 'left' | 'right' | 'up' | 'down') {
    if (this.moving) return;
    const s = this.session();
    const me = this.myParticipant();
    if (!s || !me) return;
    this.moving = true;

    const prevBoard = [...me.board];
    const moves = this.simulateSlide(prevBoard, direction);
    const willChange = moves.some(m => m.fromIdx !== m.toIdx || m.willMerge);

    if (willChange) {
      this.applySlideToTiles(moves);
      this.slideAnimDone = false;
      this.pendingNewBoard = null;
      this.prevBoardForAnim = prevBoard;

      setTimeout(() => {
        this.slideAnimDone = true;
        this.moving = false;
        if (this.pendingNewBoard) {
          this.reconcile(this.prevBoardForAnim, this.pendingNewBoard);
          this.pendingNewBoard = null;
        }
      }, 120);
    } else {
      this.moving = false;
    }

    this.svc.makeMove(s.id, direction).subscribe({
      next: updated => {
        this.session.set(updated);
        const newBoard = updated.participants.find(p => p.isMe)?.board ?? [];
        if (willChange) {
          if (this.slideAnimDone) {
            this.reconcile(this.prevBoardForAnim, newBoard);
          } else {
            this.pendingNewBoard = newBoard;
          }
        }
      },
      error: () => {
        if (!this.slideAnimDone) this.moving = false;
        this.initMyTiles(prevBoard);
      },
    });
  }

  // ── Lobby / session actions ──────────────────────────────────────────────────

  loadSessions() {
    this.loading.set(true);
    this.svc.getSessions().subscribe({
      next: list => { this.sessions.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  openSession(id: string) {
    this.loading.set(true);
    this.svc.getSession(id).subscribe({
      next: s => {
        this.session.set(s);
        const me = s.participants.find(p => p.isMe);
        if (me) this.initMyTiles(me.board);
        this.loading.set(false);
        this.enterGame(true);
      },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load game', 'OK', { duration: 3000 }); },
    });
  }

  backToLobby() {
    this.enterGame(false);
    this.session.set(null);
    this.myAnimTiles.set([]);
    this.loadSessions();
  }

  createGame() {
    this.creating.set(true);
    this.svc.createSession({ title: this.newTitle.trim() || undefined }).subscribe({
      next: s => {
        this.creating.set(false);
        this.showCreate = false;
        this.newTitle = '';
        this.session.set(s);
        const me = s.participants.find(p => p.isMe);
        if (me) this.initMyTiles(me.board);
        this.enterGame(true);
      },
      error: () => { this.creating.set(false); this.snackBar.open('Failed to create game', 'OK', { duration: 3000 }); },
    });
  }

  joinGame() {
    const s = this.session();
    if (!s) return;
    this.joining.set(true);
    this.svc.joinSession(s.id).subscribe({
      next: updated => {
        this.session.set(updated);
        const me = updated.participants.find(p => p.isMe);
        if (me) this.initMyTiles(me.board);
        this.joining.set(false);
        this.enterGame(true);
      },
      error: err => { this.joining.set(false); this.snackBar.open(err?.error?.error ?? 'Failed to join game', 'OK', { duration: 3000 }); },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  tileColor(value: number): string { return TILE_COLORS[value] ?? '#3c3a32'; }
  tileText(value: number): string  { return TILE_TEXT[value]  ?? '#f9f6f2'; }
  playerColor(order: number): string { return PLAYER_COLORS[order % PLAYER_COLORS.length]; }
}
