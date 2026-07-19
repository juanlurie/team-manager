import {
  Component, inject, signal, computed, OnInit, OnDestroy,
  HostListener, ChangeDetectionStrategy, AfterViewInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GameThreesService } from '../../core/services/game-threes.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { GameThreesEvent, GAME_THREES_EVENT_TYPES } from '../../core/websocket/events/games.events';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';
import { GameThreesSession, GameThreesSessionSummary } from '../../core/models/game-threes.model';

const TILE_COLORS: Record<number, string> = {
  0:    'rgba(255,255,255,0.04)',
  1:    '#f0ece4', 2:    '#aee1f9', 3:    '#f6635c',
  6:    '#f2a45a', 12:   '#f5c842', 24:   '#9dd96c',
  48:   '#5fcfa0', 96:   '#4db6f0', 192:  '#7b88f7',
  384:  '#b580f5', 768:  '#f07ac4', 1536: '#f0425c', 3072: '#ffd700',
};

const TILE_TEXT: Record<number, string> = {
  0: 'transparent', 1: '#8a8077', 2: '#3a85b0',
  3: '#ffffff', 6: '#ffffff', 12: '#ffffff', 24: '#ffffff',
  48: '#ffffff', 96: '#ffffff', 192: '#ffffff', 384: '#ffffff',
  768: '#ffffff', 1536: '#ffffff', 3072: '#776e65',
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
  selector: 'app-game-threes',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="page" [class.no-scroll]="activePlaying()" [class.immersive]="nav.hideNav()">

      @if (!session()) {
        <!-- ── LOBBY ── -->
        <div class="lobby-header">
          <div class="lobby-badge">3</div>
          <div>
            <h2 class="lobby-title">Threes!</h2>
            <span class="lobby-sub">Slide 1s &amp; 2s together — then match threes</span>
          </div>
          <button class="help-btn" (click)="showRules = !showRules" [class.active]="showRules" title="How to play">?</button>
          @if (canHost()) {
            <button class="create-btn" (click)="showCreate = !showCreate" [class.active]="showCreate">
              <mat-icon>add</mat-icon> New Game
            </button>
          }
        </div>

        @if (showRules) {
          <div class="rules-panel">
            <div class="rules-title">How to play Threes!</div>
            <ul class="rules-list">
              <li>Use <strong>arrow keys</strong> or <strong>swipe</strong> to slide the 4×4 grid.</li>
              <li><strong>1 + 2 = 3</strong> — a blue 1 and a red 2 only merge with each other.</li>
              <li><strong>3 + 3 = 6, 6 + 6 = 12…</strong> — multiples of 3 merge with their equal.</li>
              <li>A new tile (peeked at the top) is added from the pushed edge each move.</li>
              <li>The game ends when <strong>no moves remain</strong>.</li>
              <li>Score = sum of all tile values. In multiplayer, <strong>highest score wins</strong>.</li>
            </ul>
          </div>
        }

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
            <div class="empty-badge">3</div>
            <p>No open games</p>
            @if (canHost()) { <p class="hint">Create one above to get started.</p> }
          </div>
        } @else {
          <div class="session-list">
            @for (s of sessions(); track s.id) {
              <div class="session-card" (click)="openSession(s.id)">
                <div class="sc-icon">3</div>
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
            <span class="game-title">{{ s.title || 'Threes!' }}</span>
            <button class="help-btn" (click)="showRules = !showRules" [class.active]="showRules" title="How to play">?</button>
            @if (!alreadyJoined() && s.status === 'inprogress') {
              <button class="action-btn primary" (click)="joinGame()" [disabled]="joining()">
                {{ joining() ? 'Joining…' : 'Join Game' }}
              </button>
            }
          </div>

          @if (showRules) {
            <div class="rules-panel">
              <div class="rules-title">How to play Threes!</div>
              <ul class="rules-list">
                <li>Use <strong>arrow keys</strong> or <strong>swipe</strong> to slide the 4×4 grid.</li>
                <li><strong>1 + 2 = 3</strong> — a blue 1 and a red 2 only merge with each other.</li>
                <li><strong>3 + 3 = 6, 6 + 6 = 12…</strong> — multiples of 3 merge with their equal.</li>
                <li>A new tile (peeked at the top) is added from the pushed edge each move.</li>
                <li>The game ends when <strong>no moves remain</strong>.</li>
                <li>Score = sum of all tile values. In multiplayer, <strong>highest score wins</strong>.</li>
              </ul>
            </div>
          }

          <!-- Scoreboard -->
          <div class="scoreboard">
            @for (p of sortedParticipants(); track p.id) {
              <div class="player-chip" [class.me]="p.isMe" [style.border-color]="playerColor(p.order)">
                <span class="player-dot" [style.background]="playerColor(p.order)"></span>
                <span class="player-name">{{ p.displayName }}{{ p.isMe ? ' (you)' : '' }}</span>
                @if (p.isGameOver) { <span class="over-badge">done</span> }
                <span class="player-score">{{ p.score }}</span>
              </div>
            }
          </div>

          <!-- Status / next tile -->
          @if (s.status === 'completed') {
            @let winner = gameWinner();
            <div class="status-bar completed">
              <mat-icon>emoji_events</mat-icon>
              @if (winner) {
                {{ winner.isMe ? 'You win!' : winner.displayName + ' wins!' }} &nbsp;·&nbsp; {{ winner.score }} pts
              } @else {
                It's a draw!
              }
            </div>
          } @else if (myParticipant()?.isGameOver) {
            <div class="status-bar gameover">
              <mat-icon>sentiment_dissatisfied</mat-icon> Game over — watching others play
            </div>
          } @else if (myParticipant()) {
            @let me = myParticipant()!;
            <div class="status-bar playing">
              <span class="next-label">Next:</span>
              <span class="next-tile" [style.background]="tileColor(me.nextTile)" [style.color]="tileText(me.nextTile)">
                {{ me.nextTile }}
              </span>
              <span class="next-hint">arrow keys or swipe</span>
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
                </div>
                <div class="board">
                  @if (p.isMe) {
                    @for (_ of BOARD_BG; track $index) { <div class="cell-bg"></div> }
                    @for (tile of myAnimTiles(); track tile.id) {
                      <div class="tile-anim"
                           [style.left]="tilePos(tile.col)"
                           [style.top]="tilePos(tile.row)"
                           [style.background]="tileColor(tile.value)"
                           [style.color]="tileText(tile.value)"
                           [class.tile-appear]="tile.state === 'appearing'"
                           [class.tile-merge]="tile.state === 'merged'">
                        {{ tile.value }}
                      </div>
                    }
                  } @else {
                    @for (cell of p.board; track $index) {
                      <div class="cell" [style.background]="tileColor(cell)" [style.color]="tileText(cell)">
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

    .lobby-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .lobby-badge { width: 32px; height: 32px; border-radius: 8px; background: #f6635c; color: #fff; font-size: 1.1rem; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .lobby-title { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .lobby-sub { font-size: 0.78rem; color: rgba(255,255,255,0.38); }
    .create-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(246,99,92,0.12); border: 1px solid rgba(246,99,92,0.35); border-radius: 8px; color: #f6635c; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .help-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); font-size: 0.85rem; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; transition: all 0.12s; flex-shrink: 0; }
    .help-btn:hover, .help-btn.active { border-color: #f6635c; color: #f6635c; background: rgba(246,99,92,0.1); }
    .rules-panel { background: rgba(246,99,92,0.06); border: 1px solid rgba(246,99,92,0.2); border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; }
    .rules-title { font-size: 0.82rem; font-weight: 700; color: #f6635c; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .rules-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
    .rules-list li { font-size: 0.82rem; color: rgba(255,255,255,0.65); line-height: 1.5; }
    .rules-list strong { color: rgba(255,255,255,0.9); }
    .create-btn:hover, .create-btn.active { background: rgba(246,99,92,0.22); border-color: #f6635c; }
    .create-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .create-form { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
    .title-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: rgba(255,255,255,0.85); font-size: 0.85rem; font-family: inherit; outline: none; }
    .title-input:focus { border-color: rgba(246,99,92,0.4); }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .cancel-btn { padding: 6px 14px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.45); font-size: 0.82rem; font-family: inherit; cursor: pointer; }
    .save-btn { padding: 6px 18px; background: rgba(246,99,92,0.15); border: 1px solid rgba(246,99,92,0.4); border-radius: 6px; color: #f6635c; font-size: 0.82rem; font-weight: 600; font-family: inherit; cursor: pointer; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .loading { display: flex; justify-content: center; gap: 6px; padding: 48px; }
    .dot { width: 7px; height: 7px; background: rgba(246,99,92,0.5); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)} }

    .empty-state { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.3); }
    .empty-badge { font-size: 2rem; font-weight: 900; margin-bottom: 12px; color: rgba(246,99,92,0.4); }
    .empty-state p { margin: 0 0 6px; font-size: 0.9rem; }
    .empty-state .hint { font-size: 0.78rem; color: rgba(255,255,255,0.2); }

    .session-list { display: flex; flex-direction: column; gap: 8px; }
    .session-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; cursor: pointer; transition: all 0.12s; }
    .session-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(246,99,92,0.2); }
    .sc-icon { width: 42px; height: 42px; background: rgba(246,99,92,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 900; color: #f6635c; flex-shrink: 0; }
    .sc-info { flex: 1; min-width: 0; }
    .sc-title { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .sc-meta { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 2px; }
    .sc-status { font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 10px; }
    .sc-status.inprogress { background: rgba(255,167,38,0.12); color: #ffa726; }

    .game-wrap { display: flex; flex-direction: column; gap: 14px; }
    .game-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .back-btn { background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; cursor: pointer; color: rgba(255,255,255,0.55); display: flex; align-items: center; transition: all 0.12s; }
    .back-btn:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }
    .back-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .game-title { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.85); }
    .action-btn { padding: 5px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: rgba(255,255,255,0.7); font-size: 0.8rem; font-family: inherit; cursor: pointer; }
    .action-btn.primary { background: rgba(246,99,92,0.15); border-color: rgba(246,99,92,0.4); color: #f6635c; font-weight: 600; }

    .scoreboard { display: flex; flex-wrap: wrap; gap: 8px; }
    .player-chip { display: flex; align-items: center; gap: 7px; padding: 6px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
    .player-chip.me { background: rgba(255,255,255,0.06); }
    .player-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .player-name { font-size: 0.8rem; color: rgba(255,255,255,0.7); }
    .over-badge { font-size: 0.65rem; color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; }
    .player-score { font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.9); margin-left: 4px; }

    .status-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 0.82rem; color: rgba(255,255,255,0.55); }
    .status-bar mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .status-bar.playing { color: rgba(255,255,255,0.7); }
    .status-bar.gameover { color: rgba(255,255,255,0.4); }
    .status-bar.completed { color: #ffa726; font-weight: 600; font-size: 0.9rem; }
    .status-bar.completed mat-icon { color: #ffa726; }
    .next-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
    .next-tile { width: 28px; height: 28px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; flex-shrink: 0; }
    .next-hint { font-size: 0.72rem; color: rgba(255,255,255,0.25); margin-left: 4px; }

    .boards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .boards-grid.solo { grid-template-columns: minmax(200px, 340px); justify-content: center; }
    @media (min-width: 768px) {
      .boards-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      .boards-grid.solo { grid-template-columns: minmax(260px, 500px); }
    }

    .board-wrap { display: flex; flex-direction: column; gap: 6px; }
    .board-wrap.gameover .board { opacity: 0.45; }
    .board-wrap.me .board { box-shadow: 0 0 0 2px rgba(246,99,92,0.4); }

    .board-label { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: rgba(255,255,255,0.55); min-width: 0; }
    .board-player-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .board-score { margin-left: auto; font-weight: 700; color: rgba(255,255,255,0.8); font-size: 0.82rem; }
    .board-over { font-size: 0.62rem; font-weight: 700; color: rgba(255,255,255,0.35); letter-spacing: 0.5px; }

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

    .cell {
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; font-weight: 800; font-size: 1rem;
      transition: background 0.1s; aspect-ratio: 1; min-width: 0;
    }

    .cell-bg {
      background: rgba(255,255,255,0.04);
      border-radius: 4px;
      aspect-ratio: 1;
    }

    .tile-anim {
      position: absolute; z-index: 2;
      width: var(--ts); height: var(--ts);
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; font-weight: 800; font-size: 1rem;
      transition: left 0.12s ease-in-out, top 0.12s ease-in-out;
      will-change: left, top;
    }

    @keyframes tile-appear { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
    @keyframes tile-merge-pop { 0%{transform:scale(1)} 45%{transform:scale(1.2)} 100%{transform:scale(1)} }
    .tile-anim.tile-appear { animation: tile-appear 0.18s ease-out both; }
    .tile-anim.tile-merge  { animation: tile-merge-pop 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }
  `]
})
export class GameThreesComponent implements OnInit, OnDestroy, AfterViewInit {

  private svc = inject(GameThreesService);
  private ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private featureAccess = inject(FeatureAccessService);
  nav = inject(NavService);
  private destroy$ = new Subject<void>();

  sessions = signal<GameThreesSessionSummary[]>([]);
  session = signal<GameThreesSession | null>(null);
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
  showRules = false;
  newTitle = '';

  private touchStartX = 0;
  private touchStartY = 0;

  canHost = computed(() => this.featureAccess.hasAccess('threes-host'));
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
    this.ws.roomEvents<GameThreesEvent>(GAME_THREES_EVENT_TYPES).pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (msg.type === 'game_threes_update') {
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

  private canMerge(a: number, b: number): boolean {
    if (!a || !b) return false;
    if ((a === 1 && b === 2) || (a === 2 && b === 1)) return true;
    return a === b && a >= 3;
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
        if (b && this.canMerge(a.val, b.val)) {
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
        if (m.willMerge) tile.state = 'merged';
        moved.add(tile.id);
      }
    }
    this.myAnimTiles.set(tiles);
  }

  private reconcile(prevBoard: number[], newBoard: number[]) {
    const survivors = this.myAnimTiles().filter(t => t.state !== 'merged');
    const used = new Set<number>();
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

    // Spawned tile: any position in newBoard that no survivor claimed
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
      error: err => { this.joining.set(false); this.snackBar.open(err?.error?.error ?? 'Failed to join', 'OK', { duration: 3000 }); },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  tileColor(value: number): string { return TILE_COLORS[value] ?? '#c3a07a'; }
  tileText(value: number): string  { return TILE_TEXT[value]  ?? '#ffffff'; }
  playerColor(order: number): string { return PLAYER_COLORS[order % PLAYER_COLORS.length]; }
}
