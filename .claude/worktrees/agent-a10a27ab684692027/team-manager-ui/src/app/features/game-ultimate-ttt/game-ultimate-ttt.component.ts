import {
  Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GameUltimateTttService } from '../../core/services/game-ultimate-ttt.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';
import { GameUltimateTttSession, GameUltimateTttSessionSummary } from '../../core/models/game-ultimate-ttt.model';

const INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  selector: 'app-game-ultimate-ttt',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="page">

      @if (!session()) {
        <!-- ── LOBBY ── -->
        <div class="lobby-header">
          <div class="lobby-badge">
            <mat-icon>grid_on</mat-icon>
          </div>
          <div>
            <h2 class="lobby-title">Ultimate Tic Tac Toe</h2>
            <span class="lobby-sub">Win 3 boards in a row to claim the meta-board</span>
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
            <div class="rules-title">How to play Ultimate Tic Tac Toe</div>
            <ul class="rules-list">
              <li>The board is a <strong>3×3 grid of mini Tic Tac Toe boards</strong>.</li>
              <li>Where you play inside a mini-board <strong>determines which mini-board your opponent must play in next</strong>.</li>
              <li>If sent to an already-won or full board, your opponent may <strong>play anywhere</strong>.</li>
              <li>Win a mini-board by getting <strong>3 in a row</strong> — just like regular Tic Tac Toe.</li>
              <li>Win the game by claiming <strong>3 mini-boards in a row</strong> on the meta-board.</li>
              <li>You can also play against the <strong>AI opponent</strong> when creating a game.</li>
            </ul>
          </div>
        }

        @if (showCreate) {
          <div class="create-form">
            <input class="title-input" placeholder="Game title (optional)" [(ngModel)]="newTitle" />
            <label class="ai-toggle">
              <input type="checkbox" [(ngModel)]="vsAi" />
              <span class="ai-toggle-label">
                <mat-icon>smart_toy</mat-icon> Play vs AI
              </span>
            </label>
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
            <mat-icon>grid_on</mat-icon>
            <p>No open games</p>
            @if (canHost()) { <p class="hint">Create one above to get started.</p> }
          </div>
        } @else {
          <div class="session-list">
            @for (s of sessions(); track s.id) {
              <div class="session-card" (click)="openSession(s.id)">
                <div class="sc-icon"><mat-icon>grid_on</mat-icon></div>
                <div class="sc-info">
                  <div class="sc-title">{{ s.title || 'Untitled Game' }}</div>
                  <div class="sc-meta">by {{ s.createdByName }} · {{ s.playerCount }}/2 players</div>
                </div>
                <span class="sc-status" [class.waiting]="s.status === 'waiting'" [class.inprogress]="s.status === 'inprogress'">
                  {{ s.status === 'waiting' ? 'Waiting for opponent' : 'In progress' }}
                </span>
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
            <span class="game-title">{{ s.title || 'Ultimate Tic Tac Toe' }}</span>
            <button class="help-btn" (click)="showRules = !showRules" [class.active]="showRules" title="How to play">?</button>
            @if (!alreadyJoined() && s.status === 'waiting') {
              <button class="action-btn primary" (click)="joinGame()" [disabled]="joining()">
                {{ joining() ? 'Joining…' : 'Join Game' }}
              </button>
            }
          </div>

          @if (showRules) {
            <div class="rules-panel">
              <div class="rules-title">How to play Ultimate Tic Tac Toe</div>
              <ul class="rules-list">
                <li>The board is a <strong>3×3 grid of mini Tic Tac Toe boards</strong>.</li>
                <li>Where you play inside a mini-board <strong>determines which mini-board your opponent must play in next</strong>.</li>
                <li>If sent to an already-won or full board, your opponent may <strong>play anywhere</strong>.</li>
                <li>Win a mini-board by getting <strong>3 in a row</strong> — just like regular Tic Tac Toe.</li>
                <li>Win the game by claiming <strong>3 mini-boards in a row</strong> on the meta-board.</li>
                <li>You can also play against the <strong>AI opponent</strong> when creating a game.</li>
              </ul>
            </div>
          }

          <!-- Players -->
          <div class="scoreboard">
            @for (p of s.participants; track p.id) {
              <div class="player-chip" [class.me]="p.isMe" [class.active-turn]="s.currentTurnMemberId === p.memberId && s.status === 'inprogress'">
                <span class="mark" [class.x]="p.order === 0" [class.o]="p.order === 1">{{ p.order === 0 ? 'X' : 'O' }}</span>
                @if (p.isAi) { <mat-icon class="ai-icon">smart_toy</mat-icon> }
                <span class="player-name">{{ p.displayName }}{{ p.isMe ? ' (you)' : '' }}</span>
                @if (p.isWinner) { <mat-icon class="won-icon">emoji_events</mat-icon> }
                <span class="board-count">{{ p.score }}</span>
              </div>
            }
            @if (s.participants.length < 2 && s.status === 'waiting') {
              <div class="player-chip waiting-slot">
                <span class="mark o">O</span>
                <span class="player-name waiting-text">Waiting for opponent…</span>
              </div>
            }
          </div>

          <!-- Status bar -->
          @if (s.status === 'completed') {
            @let winner = gameWinner();
            <div class="status-bar completed">
              <mat-icon>emoji_events</mat-icon>
              @if (winner) {
                {{ winner.isMe ? 'You win!' : winner.displayName + ' wins!' }}
              } @else {
                It's a draw!
              }
            </div>
          } @else if (s.status === 'waiting') {
            <div class="status-bar waiting">
              <mat-icon>hourglass_empty</mat-icon> Waiting for a second player to join
            </div>
          } @else if (isMyTurn()) {
            <div class="status-bar my-turn">
              <span class="mark-inline" [class.x]="myMark() === 1" [class.o]="myMark() === 2">{{ myMark() === 1 ? 'X' : 'O' }}</span>
              Your turn{{ s.nextBoardIndex === -1 ? ' — play anywhere' : '' }}
            </div>
          } @else {
            @let turnPlayer = turnParticipant();
            <div class="status-bar waiting">
              <span class="mark-inline" [class.x]="turnPlayer?.order === 0" [class.o]="turnPlayer?.order === 1">
                {{ turnPlayer?.order === 0 ? 'X' : 'O' }}
              </span>
              {{ turnPlayer?.displayName }}'s turn
            </div>
          }

          <!-- Main board -->
          @if (s.status !== 'waiting') {
            <div class="meta-board">
              @for (bigIdx of INDICES; track bigIdx) {
                @let bigResult = s.bigBoard[bigIdx];
                <div class="small-board-wrap"
                     [class.active-board]="isBoardActive(bigIdx)"
                     [class.won-x]="bigResult === 1"
                     [class.won-o]="bigResult === 2"
                     [class.drawn]="bigResult === 3">
                  @if (bigResult === 1 || bigResult === 2) {
                    <div class="board-result" [class.x]="bigResult === 1" [class.o]="bigResult === 2">
                      {{ bigResult === 1 ? 'X' : 'O' }}
                    </div>
                  } @else if (bigResult === 3) {
                    <div class="board-result draw">–</div>
                  } @else {
                    <div class="small-board">
                      @for (smallIdx of INDICES; track smallIdx) {
                        @let cellIdx = bigIdx * 9 + smallIdx;
                        @let cellVal = s.cells[cellIdx];
                        <div class="cell"
                             [class.x]="cellVal === 1"
                             [class.o]="cellVal === 2"
                             [class.playable]="isCellPlayable(bigIdx, cellVal)"
                             (click)="clickCell(cellIdx)">
                          {{ cellVal === 1 ? 'X' : cellVal === 2 ? 'O' : '' }}
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }

        </div>
      }

    </div>
  `,
  styles: [`
    .page { max-width: 600px; margin: 0 auto; padding: 12px 12px 80px; }
    @media (min-width: 768px) {
      .page { max-width: 760px; }
      .meta-board { gap: 8px; padding: 8px; }
      .small-board-wrap { padding: 5px; }
    }

    /* Lobby */
    .lobby-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .lobby-badge { width: 36px; height: 36px; border-radius: 8px; background: rgba(100,181,246,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .lobby-badge mat-icon { color: #64b5f6; font-size: 22px; width: 22px; height: 22px; }
    .lobby-title { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .lobby-sub { font-size: 0.78rem; color: rgba(255,255,255,0.38); }
    .create-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(100,181,246,0.12); border: 1px solid rgba(100,181,246,0.35); border-radius: 8px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .help-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); font-size: 0.85rem; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; transition: all 0.12s; flex-shrink: 0; }
    .help-btn:hover, .help-btn.active { border-color: #64b5f6; color: #64b5f6; background: rgba(100,181,246,0.1); }
    .rules-panel { background: rgba(100,181,246,0.06); border: 1px solid rgba(100,181,246,0.2); border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; }
    .rules-title { font-size: 0.82rem; font-weight: 700; color: #64b5f6; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .rules-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
    .rules-list li { font-size: 0.82rem; color: rgba(255,255,255,0.65); line-height: 1.5; }
    .rules-list strong { color: rgba(255,255,255,0.9); }
    .create-btn:hover, .create-btn.active { background: rgba(100,181,246,0.22); border-color: #64b5f6; }
    .create-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .create-form { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
    .title-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: rgba(255,255,255,0.85); font-size: 0.85rem; font-family: inherit; outline: none; }
    .title-input:focus { border-color: rgba(100,181,246,0.4); }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .cancel-btn { padding: 6px 14px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.45); font-size: 0.82rem; font-family: inherit; cursor: pointer; }
    .save-btn { padding: 6px 18px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.4); border-radius: 6px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; font-family: inherit; cursor: pointer; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .ai-toggle input[type=checkbox] { width: 15px; height: 15px; accent-color: #64b5f6; cursor: pointer; }
    .ai-toggle-label { display: flex; align-items: center; gap: 5px; font-size: 0.83rem; color: rgba(255,255,255,0.6); }
    .ai-toggle-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #64b5f6; }

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
    .sc-icon { width: 42px; height: 42px; background: rgba(100,181,246,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sc-icon mat-icon { color: #64b5f6; }
    .sc-info { flex: 1; min-width: 0; }
    .sc-title { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .sc-meta { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 2px; }
    .sc-status { font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 10px; white-space: nowrap; }
    .sc-status.waiting { background: rgba(100,181,246,0.12); color: #64b5f6; }
    .sc-status.inprogress { background: rgba(255,167,38,0.12); color: #ffa726; }

    /* Game */
    .game-wrap { display: flex; flex-direction: column; gap: 14px; }
    .game-header { display: flex; align-items: center; gap: 10px; }
    .back-btn { background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; cursor: pointer; color: rgba(255,255,255,0.55); display: flex; align-items: center; transition: all 0.12s; }
    .back-btn:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }
    .back-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .game-title { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.85); }
    .action-btn { padding: 5px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: rgba(255,255,255,0.7); font-size: 0.8rem; font-family: inherit; cursor: pointer; }
    .action-btn.primary { background: rgba(100,181,246,0.15); border-color: rgba(100,181,246,0.4); color: #64b5f6; font-weight: 600; }

    /* Players */
    .scoreboard { display: flex; gap: 8px; flex-wrap: wrap; }
    .player-chip { display: flex; align-items: center; gap: 8px; padding: 7px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; transition: border-color 0.15s; }
    .player-chip.me { background: rgba(255,255,255,0.06); }
    .player-chip.active-turn { border-color: rgba(100,181,246,0.4); }
    .player-chip.waiting-slot { opacity: 0.45; }
    .mark { width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 900; flex-shrink: 0; }
    .mark.x { background: rgba(100,181,246,0.2); color: #64b5f6; }
    .mark.o { background: rgba(255,167,38,0.2); color: #ffa726; }
    .player-name { font-size: 0.8rem; color: rgba(255,255,255,0.7); }
    .waiting-text { color: rgba(255,255,255,0.35); font-style: italic; }
    .won-icon { font-size: 14px; width: 14px; height: 14px; color: #ffa726; }
    .ai-icon { font-size: 14px; width: 14px; height: 14px; color: rgba(255,255,255,0.4); }
    .board-count { font-size: 0.88rem; font-weight: 700; color: rgba(255,255,255,0.85); margin-left: 2px; }

    /* Status bar */
    .status-bar { display: flex; align-items: center; gap: 8px; padding: 9px 14px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 0.83rem; color: rgba(255,255,255,0.5); }
    .status-bar mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .status-bar.my-turn { color: rgba(255,255,255,0.8); font-weight: 600; }
    .status-bar.completed { color: #ffa726; font-weight: 600; }
    .status-bar.completed mat-icon { color: #ffa726; }
    .mark-inline { width: 20px; height: 20px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; flex-shrink: 0; }
    .mark-inline.x { background: rgba(100,181,246,0.2); color: #64b5f6; }
    .mark-inline.o { background: rgba(255,167,38,0.2); color: #ffa726; }

    /* Meta board — 3×3 grid of small boards */
    .meta-board {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      background: rgba(255,255,255,0.12);
      border-radius: 10px;
      padding: 6px;
    }

    .small-board-wrap {
      border-radius: 7px;
      background: rgba(255,255,255,0.04);
      padding: 4px;
      transition: background 0.15s, box-shadow 0.15s;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .small-board-wrap.active-board {
      background: rgba(100,181,246,0.08);
      box-shadow: 0 0 0 2px rgba(100,181,246,0.35);
    }
    .small-board-wrap.won-x { background: rgba(100,181,246,0.12); }
    .small-board-wrap.won-o { background: rgba(255,167,38,0.12); }
    .small-board-wrap.drawn { background: rgba(255,255,255,0.05); }

    .board-result {
      font-size: 2.2rem;
      font-weight: 900;
      line-height: 1;
    }
    .board-result.x { color: #64b5f6; }
    .board-result.o { color: #ffa726; }
    .board-result.draw { color: rgba(255,255,255,0.25); font-size: 2.8rem; }

    .small-board {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3px;
      width: 100%;
    }

    .cell {
      aspect-ratio: 1;
      border-radius: 4px;
      background: rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 900;
      cursor: default;
      transition: background 0.1s;
      min-width: 0;
    }
    .cell.x { color: #64b5f6; background: rgba(100,181,246,0.15); }
    .cell.o { color: #ffa726; background: rgba(255,167,38,0.15); }
    .cell.playable {
      cursor: pointer;
      background: rgba(255,255,255,0.09);
    }
    .cell.playable:hover { background: rgba(100,181,246,0.18); }
  `]
})
export class GameUltimateTttComponent implements OnInit, OnDestroy {
  private svc = inject(GameUltimateTttService);
  private ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private featureAccess = inject(FeatureAccessService);
  nav = inject(NavService);
  private destroy$ = new Subject<void>();

  readonly INDICES = INDICES;

  sessions = signal<GameUltimateTttSessionSummary[]>([]);
  session = signal<GameUltimateTttSession | null>(null);
  loading = signal(false);
  creating = signal(false);
  joining = signal(false);
  moving = signal(false);

  showCreate = false;
  showRules = false;
  newTitle = '';
  vsAi = false;

  canHost = computed(() => this.featureAccess.hasAccess('ultimate-ttt-host'));
  alreadyJoined = computed(() => this.session()?.participants.some(p => p.isMe) ?? false);
  myParticipant = computed(() => this.session()?.participants.find(p => p.isMe) ?? null);
  myMark = computed(() => this.myParticipant()?.order === 0 ? 1 : 2); // 1=X 2=O
  isMyTurn = computed(() => {
    const s = this.session();
    const me = this.myParticipant();
    return s?.status === 'inprogress' && !!me && s.currentTurnMemberId === me.memberId;
  });
  turnParticipant = computed(() => {
    const s = this.session();
    if (!s) return null;
    return s.participants.find(p => p.memberId === s.currentTurnMemberId) ?? null;
  });
  gameWinner = computed(() => {
    const s = this.session();
    if (!s || s.status !== 'completed') return null;
    return s.participants.find(p => p.isWinner) ?? null;
  });

  ngOnInit() {
    this.loadSessions();
    this.ws.messages$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (!msg) return;
      if (msg.type === 'game_ultimate_ttt_update') {
        const current = this.session();
        if (current) {
          this.svc.getSession(current.id).subscribe(s => this.session.set(s));
        } else {
          this.loadSessions();
        }
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isBoardActive(bigIdx: number): boolean {
    const s = this.session();
    if (!s || s.status !== 'inprogress') return false;
    if (s.bigBoard[bigIdx] !== 0) return false;
    return s.nextBoardIndex === -1 || s.nextBoardIndex === bigIdx;
  }

  isCellPlayable(bigIdx: number, cellVal: number): boolean {
    return this.isMyTurn() && !this.moving() && cellVal === 0 && this.isBoardActive(bigIdx);
  }

  clickCell(cellIdx: number) {
    const s = this.session();
    if (!s || this.moving()) return;
    const bigIdx = Math.floor(cellIdx / 9);
    const cellVal = s.cells[cellIdx];
    if (!this.isCellPlayable(bigIdx, cellVal)) return;

    // Optimistically show the mark immediately
    const prevSession = s;
    const optimisticCells = [...s.cells];
    optimisticCells[cellIdx] = this.myMark();
    this.session.set({ ...s, cells: optimisticCells });

    this.moving.set(true);
    this.svc.makeMove(s.id, cellIdx).subscribe({
      next: updated => { this.session.set(updated); this.moving.set(false); },
      error: err => {
        this.session.set(prevSession);
        this.moving.set(false);
        this.snackBar.open(err?.error?.error ?? 'Move failed', 'OK', { duration: 3000 });
      },
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
    this.svc.createSession({ title: this.newTitle.trim() || undefined, vsAi: this.vsAi }).subscribe({
      next: s => {
        this.creating.set(false);
        this.showCreate = false;
        this.newTitle = '';
        this.vsAi = false;
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
      error: err => { this.joining.set(false); this.snackBar.open(err?.error?.error ?? 'Failed to join', 'OK', { duration: 3000 }); },
    });
  }
}
