import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { WowNominationDisplay, WowPowerUp, WowChaosCard } from '../../../core/models/win-week.model';

const DRAMATIC_VOICES = ['Robot', 'Pirate', 'Newsreader', 'Villain', 'Sports Commentator'];
const AUTOCORRECT_SWAPS: Record<string, string> = {
  'fixed': 'fiksed', 'deployed': 'depoly', 'helped': 'halped', 'great': 'graet',
  'the': 'teh', 'and': 'nad', 'done': 'doen', 'code': 'c0de', 'build': 'bild',
  'issue': 'isssue', 'problem': 'problam', 'team': 'tame', 'work': 'wrk', 'amazing': 'amzaing'
};
const CLOWN_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6FC8'];

function seededPick<T>(arr: T[], seed: string): T {
  const h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  return arr[Math.abs(h) % arr.length];
}

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
  Spotlight: { icon: '⭐', label: 'Spotlight', bg: 'rgba(255,215,0,0.15)', color: '#FFD700' },
  HypeMeter: { icon: '🔥', label: 'Hype Meter', bg: 'rgba(255,87,34,0.12)', color: '#ff7043' },
  Wildcard:  { icon: '🃏', label: 'Wildcard ×2', bg: 'rgba(171,71,188,0.12)', color: '#ce93d8' }
};

const CHAOS_CARD_META: Record<WowChaosCard, { label: string }> = {
  ClownMode:      { label: 'Clown Mode' },
  TinyText:       { label: 'Tiny Text' },
  Autocorrect:    { label: 'Autocorrect' },
  DramaticReading:{ label: 'Dramatic Reading' },
  RandomCase:     { label: 'RaNdOm CaSe' },
  Hangman:        { label: 'Hangman' }
};

@Component({
  selector: 'app-wow-nomination-card',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    @keyframes clownPulse { 0%,100%{filter:hue-rotate(0deg) brightness(1)} 25%{filter:hue-rotate(30deg) brightness(1.1)} 75%{filter:hue-rotate(-30deg) brightness(0.95)} }
    @keyframes clownBorder { 0%,100%{border-color:rgba(255,87,34,0.5)} 33%{border-color:rgba(255,215,0,0.6)} 66%{border-color:rgba(171,71,188,0.5)} }
    .card { transition: border 0.3s, background 0.3s, transform 0.3s; position: relative; }
    .card.tiny { transform: scale(0.62); transform-origin: top left; }
    .card.clown { animation: clownBorder 2s linear infinite; background: rgba(255,87,34,0.07) !important; }
    .card.clown .card-title { animation: clownPulse 3s ease-in-out infinite; }
    .card.spotlight { border-color: rgba(255,215,0,0.5) !important; }
    .hype-btn { background: rgba(255,87,34,0.15); border: 1px solid rgba(255,87,34,0.35); border-radius: 20px; padding: 4px 12px; cursor: pointer; color: #ff7043; font-size: 0.82rem; font-weight: 700; transition: background 0.15s; }
    .hype-btn:hover { background: rgba(255,87,34,0.28); }
    .hype-btn:active { transform: scale(0.93); }
    .apply-menu-btn { font-size: 0.72rem; height: 26px; line-height: 26px; padding: 0 8px; opacity: 0.7; }
    .flame-bar-wrap { margin-top: 10px; }
    .flame-bar-bg { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; }
    .flame-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; background: linear-gradient(90deg,#ff7043,#ffd600); }
  `],
  template: `
    @let nom = nomination();
    @let pu = nom.powerUp;
    @let cc = nom.chaosCard;
    @let showEffects = weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath' || weekStatus() === 'Closed';
    @let isTiny = showEffects && cc === 'TinyText';
    @let isClown = showEffects && cc === 'ClownMode';
    @let isSpot = pu === 'Spotlight';
    @let dramaticVoice = cc === 'DramaticReading' ? seededPick(nom.id) : null;
    @let displayTitle = showEffects ? transformedTitle() : nom.title;
    @let flamePct = hypeBattleActive() && hypeBattleTotal() > 0 ? Math.round(nom.hypeMeterCount / hypeBattleTotal() * 100) : 0;

    <div [class.tiny]="isTiny" [class.clown]="isClown" [class.spotlight]="isSpot"
         [style.border]="cardBorder()" [style.background]="cardBg()"
         class="card" style="display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:12px">

      <!-- Spotlight pin -->
      @if (isSpot) {
        <div style="position:absolute;top:0;left:0;right:0;height:3px;border-radius:12px 12px 0 0;background:linear-gradient(90deg,#FFD700,rgba(255,215,0,0.2))"></div>
      }

      <!-- Avatar -->
      <div [style.background]="avatarBg()" [style.color]="avatarColor()" [style.border]="avatarBorder()"
           style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.85rem;font-weight:700">
        @if (isClown && showEffects) { 🤡🎪 } @else { {{initials()}} }
      </div>

      <!-- Content -->
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.95rem">
          @if (isClown && showEffects) { <span [style.color]="clownNameColor()">{{nom.nomineeName}}</span> } @else { {{nom.nomineeName}} }
        </div>
        <div class="card-title" style="font-weight:600;font-size:0.85rem;margin-top:2px">
          @if (isClown && showEffects) { 🎉 } {{displayTitle}} @if (isClown && showEffects) { 🎉 }
        </div>
        @if (nom.description) {
          <div style="font-size:0.8rem;opacity:0.55;margin-top:4px;line-height:1.4">{{nom.description}}</div>
        }
        <div style="font-size:0.7rem;opacity:0.35;margin-top:6px">Nominated by {{nom.nominatorName}}</div>

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
              🌶️ {{cc === 'DramaticReading' ? 'Dramatic: ' + (dramaticVoice ?? '') : chaosCardLabel(cc)}}
            </span>
          }

          <!-- Hype meter live count -->
          @if (showEffects && pu === 'HypeMeter') {
            <span style="font-size:0.68rem;font-weight:700;color:#ff7043">
              🔥 ×{{nom.hypeMeterCount}}
            </span>
          }
        </div>

        <!-- Hype Meter tap button (always during call if HypeMeter; or during hype battle for any nomination) -->
        @if (showEffects && weekStatus() !== 'Closed' && (pu === 'HypeMeter' || hypeBattleActive())) {
          <button class="hype-btn" style="margin-top:8px" (click)="hypeClick.emit(nom.id)">
            🔥 @if (hypeBattleActive()) { Battle Hype! } @else { Hype! } ({{nom.hypeMeterCount}})
          </button>
        }

        <!-- Hype Battle flame bar -->
        @if (hypeBattleActive() && (weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath')) {
          <div class="flame-bar-wrap">
            <div style="display:flex;justify-content:space-between;font-size:0.65rem;opacity:0.5;margin-bottom:3px">
              <span>🔥 Hype Battle</span>
              <span>{{flamePct}}%</span>
            </div>
            <div class="flame-bar-bg">
              <div class="flame-bar-fill" [style.width]="flamePct + '%'"></div>
            </div>
          </div>
        }

        <!-- Apply card buttons (during nominating, for other members) -->
        @if (weekStatus() === 'Nominating' && !nom.isOwned && canApplyCards() && !pu && !cc) {
          <div style="display:flex;gap:6px;margin-top:10px">
            <button mat-stroked-button class="apply-menu-btn" [matMenuTriggerFor]="puMenu"
                    matTooltip="Spend a token to apply a Power-up">
              ⚡ Power-up
            </button>
            <button mat-stroked-button class="apply-menu-btn" [matMenuTriggerFor]="ccMenu"
                    matTooltip="Spend a token to apply a Chaos Card">
              🌶️ Chaos Card
            </button>
          </div>
        }
        @if (weekStatus() === 'Nominating' && !nom.isOwned && canApplyCards() && (pu || cc)) {
          <div style="margin-top:8px;font-size:0.7rem;opacity:0.45">Card applied ✓</div>
        }
      </div>

      <!-- Edit/Delete (owner, nominating phase) -->
      @if (canEdit() && weekStatus() === 'Nominating') {
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button mat-icon-button matTooltip="Edit nomination" (click)="editClick.emit(nomination())">
            <mat-icon style="font-size:18px;color:rgba(255,255,255,0.4)">edit</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Delete nomination" (click)="deleteClick.emit(nomination().id)">
            <mat-icon style="font-size:18px;color:rgba(239,83,80,0.6)">delete</mat-icon>
          </button>
        </div>
      }

      <!-- Vote section -->
      @if (weekStatus() === 'Voting' || weekStatus() === 'SuddenDeath' || weekStatus() === 'Closed') {
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;min-width:64px">
          <div style="font-size:1.1rem;font-weight:800;opacity:0.8">
            {{nom.voteCount}}@if (pu === 'Wildcard') { <span style="font-size:0.6rem;color:#ce93d8;vertical-align:super">×2</span> }
          </div>
          <div style="font-size:0.6rem;opacity:0.4;text-transform:uppercase">votes</div>
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
      <button mat-menu-item (click)="applyPowerUpClick.emit({ nominationId: nom.id, type: 'HypeMeter' })">
        🔥 Hype Meter — spammable during call
      </button>
      @if (isHost()) {
        <button mat-menu-item (click)="applyPowerUpClick.emit({ nominationId: nom.id, type: 'Wildcard' })">
          🃏 Wildcard — doubles vote weight
        </button>
      }
    </mat-menu>

    <!-- Chaos card menu -->
    <mat-menu #ccMenu="matMenu">
      <button mat-menu-item (click)="applyChaosCardClick.emit({ nominationId: nom.id, type: 'ClownMode' })">
        🤡 Clown Mode — animated party chaos
      </button>
      <button mat-menu-item (click)="applyChaosCardClick.emit({ nominationId: nom.id, type: 'TinyText' })">
        🔬 Tiny Text — comically small
      </button>
      <button mat-menu-item (click)="applyChaosCardClick.emit({ nominationId: nom.id, type: 'Autocorrect' })">
        📱 Autocorrect — scrambled words
      </button>
      <button mat-menu-item (click)="applyChaosCardClick.emit({ nominationId: nom.id, type: 'DramaticReading' })">
        🎭 Dramatic Reading — assigned voice
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

  voteClick           = output<string>();
  removeVoteClick     = output<string>();
  editClick           = output<WowNominationDisplay>();
  deleteClick         = output<string>();
  hypeClick           = output<string>();
  applyPowerUpClick   = output<{ nominationId: string; type: string }>();
  applyChaosCardClick = output<{ nominationId: string; type: string }>();

  readonly Math = Math;

  readonly transformedTitle = computed(() => {
    const nom = this.nomination();
    switch (nom.chaosCard) {
      case 'Autocorrect': return autocorrect(nom.title, nom.id);
      case 'RandomCase':  return randomCase(nom.title);
      case 'Hangman':     return hangman(nom.title, nom.id);
      default:            return nom.title;
    }
  });

  clownNameColor() {
    return seededPick(CLOWN_COLORS, this.nomination().id);
  }

  seededPick(id: string): string {
    return seededPick(DRAMATIC_VOICES, id);
  }

  powerUpMeta(pu: WowPowerUp) { return POWER_UP_META[pu]; }
  chaosCardLabel(cc: WowChaosCard) { return CHAOS_CARD_META[cc].label; }

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
