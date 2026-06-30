import { Component, input, output, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { WowNominationDisplay, WowPowerUp, WowChaosCard } from '../../../core/models/win-week.model';

export interface ReactionBurst { id: string; emoji: string; }

const REACTION_EMOJIS = ['😂', '🔥', '👏', '❤️', '😮'];

const AUTOCORRECT_SWAPS: Record<string, string> = {
  'fixed': 'fiksed', 'deployed': 'depoly', 'helped': 'halped', 'great': 'graet',
  'the': 'teh', 'and': 'nad', 'done': 'doen', 'code': 'c0de', 'build': 'bild',
  'issue': 'isssue', 'problem': 'problam', 'team': 'tame', 'work': 'wrk', 'amazing': 'amzaing'
};
function autocorrect(text: string, seed: string): string {
  const words = text.split(' ');
  const idxA = Math.abs([...seed].reduce((a, c) => (a * 17 + c.charCodeAt(0)) | 0, 0)) % words.length;
  const idxB = Math.abs([...seed].reduce((a, c) => (a * 23 + c.charCodeAt(0)) | 0, 1)) % words.length;
  const trySwap = (w: string) => AUTOCORRECT_SWAPS[w.toLowerCase()] ?? (w.length > 4 ? w.slice(0, -2) + w.slice(-1) + w.slice(-2, -1) : w + w.slice(-1));
  return words.map((w, i) => (i === idxA || i === idxB) ? trySwap(w) : w).join(' ');
}

function randomCase(text: string): string {
  return [...text].map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('');
}

function hangman(text: string, seed: string): string {
  const h = Math.abs([...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));
  return [...text].map((c, i) => {
    if (c === ' ') return ' ';
    const keep = ((h + i * 7) % 3) !== 0;
    return keep ? c : '_';
  }).join('');
}

const POWER_UP_META: Record<WowPowerUp, { icon: string; label: string; bg: string; color: string }> = {
  Spotlight: { icon: '⭐', label: 'Spotlight', bg: 'rgba(255,215,0,0.15)', color: '#FFD700' }
};

const CHAOS_CARD_META: Record<WowChaosCard, { label: string }> = {
  TinyText:       { label: 'Tiny Text' },
  Autocorrect:    { label: 'Autocorrect' },
  RandomCase:     { label: 'RaNdOm CaSe' },
  Hangman:        { label: 'Hangman' }
};

@Component({
  selector: 'app-wow-nomination-card',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    /* z-index:0 forces .card to establish its own stacking context, so .hype-fill's
       z-index:-1 stays scoped to this card instead of escaping to the shared list-level
       context and landing behind every card's own background. */
    .card { transition: border 0.3s, background 0.3s, transform 0.3s; position: relative; z-index: 0; }
    .card.tiny { transform: scale(0.62); transform-origin: top left; }
    .card.spotlight { border-color: rgba(255,215,0,0.5) !important; }
    .apply-menu-btn { font-size: 0.72rem; height: 26px; line-height: 26px; padding: 0 8px; opacity: 0.7; white-space: nowrap; flex-shrink: 0; }
    .hype-fill { position: absolute; top: 0; left: 0; bottom: 0; z-index: -1; border-radius: 12px; transition: width 0.6s ease; background: linear-gradient(90deg, rgba(255,87,34,0.4), rgba(255,214,0,0.22)); }
    .hype-btn-big { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; flex-shrink: 0; width: 64px; height: 64px; border-radius: 50%; border: 2px solid rgba(255,87,34,0.5); background: rgba(255,87,34,0.2); cursor: pointer; touch-action: manipulation; transition: background 0.15s, transform 0.1s; }
    .hype-btn-big:hover { background: rgba(255,87,34,0.32); }
    .hype-btn-big:active { transform: scale(0.92); }
    .hype-btn-big .flame-icon-big { font-size: 1.9rem; line-height: 1; }
    .hype-btn-big .hype-count-big { font-size: 0.78rem; font-weight: 800; color: #ff7043; }
    .reaction-burst-layer { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
    @keyframes burstRise {
      0%   { transform: translate(var(--burst-x, 0px), 0) scale(0.6); opacity: 0; }
      15%  { opacity: 1; transform: translate(var(--burst-x, 0px), -10px) scale(1.2); }
      100% { transform: translate(var(--burst-x, 0px), -90px) scale(1); opacity: 0; }
    }
    .reaction-burst { position: absolute; left: 50%; bottom: 8px; font-size: 1.6rem; animation: burstRise 1.6s ease-out forwards; }
    .reaction-row { display: flex; gap: 4px; margin-top: 8px; }
    .reaction-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 30px; height: 30px; font-size: 1rem; cursor: pointer; touch-action: manipulation; transition: background 0.15s, transform 0.1s; display: flex; align-items: center; justify-content: center; padding: 0; }
    .reaction-btn:hover { background: rgba(255,255,255,0.12); }
    .reaction-btn:active { transform: scale(0.85); }
  `],
  template: `
    @let nom = nomination();
    @let pu = nom.powerUp;
    @let cc = nom.chaosCard;
    @let showEffects = weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath' || weekStatus() === 'Closed';
    @let isTiny = showEffects && cc === 'TinyText';
    @let isSpot = pu === 'Spotlight';
    @let displayTitle = showEffects ? transformedTitle() : nom.title;
    @let flamePct = hypeBattleActive() && hypeBattleTotal() > 0 ? Math.round(nom.hypeMeterCount / hypeBattleTotal() * 100) : 0;
    @let isHypeMode = hypeBattleActive() && (weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath');

    <div [class.tiny]="isTiny" [class.spotlight]="isSpot"
         [style.border]="cardBorder()" [style.background]="cardBg()"
         [style.cursor]="canEdit() && weekStatus() === 'Nominating' ? 'pointer' : 'default'"
         (click)="canEdit() && weekStatus() === 'Nominating' && editClick.emit(nom)"
         class="card" style="display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:12px">

      <!-- Spotlight pin -->
      @if (isSpot) {
        <div style="position:absolute;top:0;left:0;right:0;height:3px;border-radius:12px 12px 0 0;background:linear-gradient(90deg,#FFD700,rgba(255,215,0,0.2))"></div>
      }

      <!-- Hype Battle: whole-card fill showing this nomination's share of taps -->
      @if (isHypeMode) {
        <div class="hype-fill" [style.width]="flamePct + '%'"></div>
      }

      <!-- Floating reaction bursts -->
      <div class="reaction-burst-layer">
        @for (burst of activeBursts(); track burst.id) {
          <span class="reaction-burst" [style.--burst-x]="burst.x + 'px'">{{burst.emoji}}</span>
        }
      </div>

      <!-- Avatar -->
      <div [style.background]="avatarBg()" [style.color]="avatarColor()" [style.border]="avatarBorder()"
           style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.85rem;font-weight:700">
        {{initials()}}
      </div>

      <!-- Content -->
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.95rem">
          {{nom.nomineeName}}
        </div>
        <div class="card-title" style="font-weight:600;font-size:0.85rem;margin-top:2px">
          {{displayTitle}}
        </div>
        @if (nom.description) {
          <div style="font-size:0.8rem;opacity:0.55;margin-top:4px;line-height:1.4">{{nom.description}}</div>
        }
        <div style="font-size:0.7rem;opacity:0.35;margin-top:6px">Nominated by {{nom.nominatorName}}</div>

        <!-- Reactions: purely cosmetic, no effect on votes/outcome -->
        @if (weekStatus() !== 'Nominating') {
          <div class="reaction-row">
            @for (emoji of REACTION_EMOJIS; track emoji) {
              <button class="reaction-btn" (click)="reactionClick.emit({ nominationId: nom.id, emoji }); $event.stopPropagation()">{{emoji}}</button>
            }
          </div>
        }

        <!-- Badges row -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center">
          <!-- Power-up badge -->
          @if (pu) {
            @let puMeta = powerUpMeta(pu);
            <span [style.background]="puMeta.bg" [style.color]="puMeta.color"
                  style="font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:4px">
              {{puMeta.icon}} {{puMeta.label}}
            </span>
          }

          <!-- Chaos card badge -->
          @if (cc) {
            <span style="background:rgba(255,87,34,0.1);color:#ff7043;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:20px">
              🌶️ {{chaosCardLabel(cc)}}
            </span>
          }

        </div>

        <!-- Apply card buttons (during voting, for other members) -->
        @if ((weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath') && !nom.isOwned && canApplyCards() && !pu && !cc) {
          <div style="display:flex;gap:6px;margin-top:10px">
            <button mat-stroked-button class="apply-menu-btn" [matMenuTriggerFor]="puMenu"
                    (click)="$event.stopPropagation()"
                    matTooltip="Spend a token to apply a Power-up">
              ⚡ Power-up
            </button>
            <button mat-stroked-button class="apply-menu-btn" [matMenuTriggerFor]="ccMenu"
                    (click)="$event.stopPropagation()"
                    matTooltip="Spend a token to apply a Chaos Card">
              🌶️ Chaos Card
            </button>
          </div>
        }
        @if ((weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath') && !nom.isOwned && canApplyCards() && (pu || cc)) {
          <div style="margin-top:8px;font-size:0.7rem;opacity:0.45">Card applied ✓</div>
        }
      </div>

      <!-- Delete (owner, nominating phase) -->
      @if (canEdit() && weekStatus() === 'Nominating') {
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button mat-icon-button matTooltip="Delete nomination" (click)="deleteClick.emit(nomination().id); $event.stopPropagation()">
            <mat-icon style="font-size:18px;color:rgba(239,83,80,0.6)">delete</mat-icon>
          </button>
        </div>
      }

      <!-- Hype Battle: big flame tap button, replaces votes while it's running -->
      @if (isHypeMode) {
        <button class="hype-btn-big" (click)="hypeClick.emit(nom.id); $event.stopPropagation()">
          <span class="flame-icon-big">🔥</span>
          <span class="hype-count-big">{{nom.hypeMeterCount}}</span>
        </button>
      } @else if (weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath' || weekStatus() === 'Closed') {
        <!-- Vote section -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;min-width:64px">
          @if (hideVoteCounts() && (weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath')) {
            <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem;opacity:0.35" matTooltip="Vote counts are hidden until voting closes">lock</mat-icon>
            <div style="font-size:0.6rem;opacity:0.4;text-transform:uppercase">hidden</div>
          } @else {
            <div style="font-size:1.1rem;font-weight:800;opacity:0.8">
              {{nom.voteCount}}
            </div>
            <div style="font-size:0.6rem;opacity:0.4;text-transform:uppercase">votes</div>
          }
          @if (weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath') {
            @if (nom.hasVoted) {
              <button mat-stroked-button color="warn" (click)="removeVoteClick.emit(nom.id)"
                      style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                Voted ✓
              </button>
            } @else if (votesRemaining() > 0) {
              <button mat-stroked-button color="primary" (click)="voteClick.emit(nom.id)"
                      style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                Vote
              </button>
            } @else {
              <button mat-stroked-button disabled
                      style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                Max votes
              </button>
            }
          }
        </div>
      }
    </div>

    <!-- Power-up menu -->
    <mat-menu #puMenu="matMenu">
      <button mat-menu-item (click)="applyPowerUpClick.emit({ nominationId: nom.id, type: 'Spotlight' })">
        ⭐ Spotlight — pins to top
      </button>
    </mat-menu>

    <!-- Chaos card menu -->
    <mat-menu #ccMenu="matMenu">
      <button mat-menu-item (click)="applyChaosCardClick.emit({ nominationId: nom.id, type: 'TinyText' })">
        🔬 Tiny Text — comically small
      </button>
      <button mat-menu-item (click)="applyChaosCardClick.emit({ nominationId: nom.id, type: 'Autocorrect' })">
        📱 Autocorrect — scrambled words
      </button>
      <button mat-menu-item (click)="applyChaosCardClick.emit({ nominationId: nom.id, type: 'RandomCase' })">
        🔡 RaNdOm CaSe — aLtErNaTiNg CaPs
      </button>
      <button mat-menu-item (click)="applyChaosCardClick.emit({ nominationId: nom.id, type: 'Hangman' })">
        🪤 Hangman — partially obscured text
      </button>
    </mat-menu>
  `
})
export class WowNominationCardComponent {
  nomination      = input.required<WowNominationDisplay>();
  weekStatus      = input.required<'Nominating' | 'Voting' | 'SuddenDeath' | 'Closed'>();
  canEdit         = input(false);
  votesRemaining  = input(0);
  isTied          = input(false);
  canApplyCards   = input(false);
  isHost          = input(false);
  hypeBattleActive = input(false);
  hypeBattleTotal  = input(0);
  hideVoteCounts   = input(false);
  reactionBursts   = input<ReactionBurst[]>([]);

  voteClick           = output<string>();
  removeVoteClick     = output<string>();
  editClick           = output<WowNominationDisplay>();
  deleteClick         = output<string>();
  hypeClick           = output<string>();
  applyPowerUpClick   = output<{ nominationId: string; type: string }>();
  applyChaosCardClick = output<{ nominationId: string; type: string }>();
  reactionClick       = output<{ nominationId: string; emoji: string }>();

  readonly Math = Math;
  readonly REACTION_EMOJIS = REACTION_EMOJIS;
  readonly activeBursts = signal<(ReactionBurst & { x: number })[]>([]);
  private seenBurstIds = new Set<string>();

  constructor() {
    effect(() => {
      for (const burst of this.reactionBursts()) {
        if (this.seenBurstIds.has(burst.id)) continue;
        this.seenBurstIds.add(burst.id);
        const withX = { ...burst, x: Math.round(Math.random() * 60 - 30) };
        this.activeBursts.update(list => [...list, withX]);
        setTimeout(() => this.activeBursts.update(list => list.filter(b => b.id !== burst.id)), 1600);
      }
    });
  }

  readonly transformedTitle = computed(() => {
    const nom = this.nomination();
    switch (nom.chaosCard) {
      case 'Autocorrect': return autocorrect(nom.title, nom.id);
      case 'RandomCase':  return randomCase(nom.title);
      case 'Hangman':     return hangman(nom.title, nom.id);
      default:            return nom.title;
    }
  });

  powerUpMeta(pu: WowPowerUp) {
    // Falls back gracefully for retired power-up types (e.g. HypeMeter) still on old data.
    return POWER_UP_META[pu] ?? { icon: '✨', label: pu, bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' };
  }
  chaosCardLabel(cc: WowChaosCard) {
    // Falls back gracefully for retired chaos cards (e.g. ClownMode, DramaticReading) still on old data.
    return CHAOS_CARD_META[cc]?.label ?? cc;
  }

  initials() {
    return this.nomination().nomineeName.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
  }

  cardBorder() {
    const nom = this.nomination();
    if (this.isTied()) return '1px solid rgba(255,87,34,0.4)';
    if (nom.powerUp === 'Spotlight') return '1px solid rgba(255,215,0,0.4)';
    return '1px solid rgba(255,255,255,0.08)';
  }

  cardBg() {
    const nom = this.nomination();
    if (this.isTied()) return 'rgba(255,87,34,0.06)';
    if (nom.powerUp === 'Spotlight') return 'rgba(255,215,0,0.05)';
    return 'rgba(255,255,255,0.03)';
  }

  avatarBg() {
    if (this.isTied()) return 'rgba(255,87,34,0.15)';
    if (this.nomination().powerUp === 'Spotlight') return 'rgba(255,215,0,0.2)';
    return 'rgba(255,215,0,0.12)';
  }

  avatarColor() {
    if (this.isTied()) return '#ff7043';
    return '#FFD700';
  }

  avatarBorder() {
    if (this.isTied()) return '1px solid rgba(255,87,34,0.4)';
    if (this.nomination().powerUp === 'Spotlight') return '1px solid rgba(255,215,0,0.5)';
    return '1px solid rgba(255,215,0,0.3)';
  }
}
