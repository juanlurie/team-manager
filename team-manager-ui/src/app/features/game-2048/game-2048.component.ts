import {
  Component, inject, signal, computed, OnInit, OnDestroy,
  HostListener, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Game2048Service } from '../../core/services/game-2048.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { Game2048Session, Game2048SessionSummary, Game2048Participant } from '../../core/models/game-2048.model';

const TILE_COLORS: Record<number, string> = {
  0:    'rgba(255,255,255,0.04)',
  2:    '#eee4da',
  4:    '#ede0c8',
  8:    '#f2b179',
  16:   '#f59563',
  32:   '#f67c5f',
  64:   '#f65e3b',
  128:  '#edcf72',
  256:  '#edcc61',
  512:  '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

const TILE_TEXT: Record<number, string> = {
  0:    'transparent',
  2:    '#776e65',
  4:    '#776e65',
  8:    '#f9f6f2',
  16:   '#f9f6f2',
  32:   '#f9f6f2',
  64:   '#f9f6f2',
  128:  '#f9f6f2',
  256:  '#f9f6f2',
  512:  '#f9f6f2',
  1024: '#f9f6f2',
  2048: '#f9f6f2',
};

const PLAYER_COLORS = ['#64b5f6', '#ffa726', '#81c784', '#f48fb1', '#ce93d8', '#80cbc4'];

@Component({
  selector: 'app-game-2048',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="page" #pageEl [class.no-scroll]="activePlaying()">

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
              @if (winner) {
                <mat-icon>emoji_events</mat-icon>
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
                  @for (cell of p.board; track $index) {
                    <div class="cell" [style.background]="tileColor(cell)" [style.color]="tileText(cell)" [class.big]="cell >= 1000">
                      {{ cell || '' }}
                    </div>
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

    .board-wrap { display: flex; flex-direction: column; gap: 6px; }
    .board-wrap.gameover .board { opacity: 0.45; }
    .board-wrap.me .board { box-shadow: 0 0 0 2px rgba(100,181,246,0.4); }

    .board-label { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: rgba(255,255,255,0.55); min-width: 0; }
    .board-player-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .board-score { margin-left: auto; font-weight: 700; color: rgba(255,255,255,0.8); font-size: 0.82rem; }
    .board-over { font-size: 0.62rem; font-weight: 700; color: rgba(255,255,255,0.35); letter-spacing: 0.5px; }
    .board-won { font-size: 14px; width: 14px; height: 14px; color: #ffa726; }

    .board {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 8px;
      aspect-ratio: 1;
    }

    .cell {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-weight: 800;
      font-size: 1.1rem;
      transition: background 0.08s, color 0.08s;
      aspect-ratio: 1;
      min-width: 0;
    }
    .cell.big { font-size: 0.85rem; }
  `]
})
export class Game2048Component implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('pageEl') pageEl!: ElementRef<HTMLDivElement>;

  private svc = inject(Game2048Service);
  private ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private featureAccess = inject(FeatureAccessService);
  private destroy$ = new Subject<void>();

  sessions = signal<Game2048SessionSummary[]>([]);
  session = signal<Game2048Session | null>(null);
  loading = signal(false);
  creating = signal(false);
  joining = signal(false);

  showCreate = false;
  newTitle = '';

  // Touch tracking for swipe
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
    this.pageEl.nativeElement.focus();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('keydown', ['$event'])
  onKey(event: KeyboardEvent) {
    const s = this.session();
    if (!s || s.status !== 'inprogress') return;
    const me = this.myParticipant();
    if (!me || me.isGameOver) return;

    const dirMap: Record<string, 'left' | 'right' | 'up' | 'down'> = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
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

    if (Math.abs(dx) > Math.abs(dy)) {
      this.move(dx > 0 ? 'right' : 'left');
    } else {
      this.move(dy > 0 ? 'down' : 'up');
    }
  }

  private move(direction: 'left' | 'right' | 'up' | 'down') {
    const s = this.session();
    if (!s) return;
    this.svc.makeMove(s.id, direction).subscribe({
      next: updated => this.session.set(updated),
      error: () => {},
    });
  }

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
      next: s => { this.session.set(s); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load game', 'OK', { duration: 3000 }); },
    });
  }

  backToLobby() {
    this.session.set(null);
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
      },
      error: () => { this.creating.set(false); this.snackBar.open('Failed to create game', 'OK', { duration: 3000 }); },
    });
  }

  joinGame() {
    const s = this.session();
    if (!s) return;
    this.joining.set(true);
    this.svc.joinSession(s.id).subscribe({
      next: updated => { this.session.set(updated); this.joining.set(false); },
      error: (err) => { this.joining.set(false); this.snackBar.open(err?.error?.error ?? 'Failed to join game', 'OK', { duration: 3000 }); },
    });
  }

  tileColor(value: number): string {
    return TILE_COLORS[value] ?? '#3c3a32';
  }

  tileText(value: number): string {
    return TILE_TEXT[value] ?? '#f9f6f2';
  }

  playerColor(order: number): string {
    return PLAYER_COLORS[order % PLAYER_COLORS.length];
  }
}
