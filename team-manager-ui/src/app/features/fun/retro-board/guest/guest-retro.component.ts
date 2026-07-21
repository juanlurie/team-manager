import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { filter, take, takeUntil, switchMap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { GuestRetroBoardService } from '../../../../core/services/guest-retro-board.service';
import { GuestRetroBoard } from '../../../../core/models/retro-board.model';
import { GuestRetroBoardViewComponent } from './guest-retro-board-view.component';

type View = 'loading' | 'notFound' | 'join' | 'board';

/**
 * Public (unguarded) landing for a RetroBoard join link / QR. Recognizes an already-signed-in member
 * and sends them to the authed board; otherwise offers the guest path (name entry, when the board
 * allows guests) or sign-in. Once joined, hosts the read-only guest board and keeps it fresh by
 * polling (guests have no WebSocket yet). See docs/session-identity.md.
 */
@Component({
  selector: 'app-guest-retro',
  standalone: true,
  imports: [FormsModule, GuestRetroBoardViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--ds-surface-canvas, #0f1117); color: var(--ds-text, #e6e9ef); }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 24px 16px 48px; }
    .center { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { width: 100%; max-width: 420px; background: var(--ds-surface-1, #151b24); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); border-radius: 16px; padding: 28px 24px; text-align: center; }
    .eyebrow { font-size: .72rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ds-text-faint, #667085); }
    h1 { font-size: 1.35rem; margin: 8px 0 4px; }
    .sub { color: var(--ds-text-muted, #9aa6b8); font-size: .9rem; margin-bottom: 20px; }
    label { display: block; text-align: left; font-size: .78rem; font-weight: 600; color: var(--ds-text-muted, #9aa6b8); margin: 0 0 6px; }
    input { width: 100%; box-sizing: border-box; padding: 11px 12px; border-radius: 10px; border: 1px solid var(--ds-border-strong, rgba(255,255,255,.14)); background: var(--ds-surface-sunken, #0b0d12); color: var(--ds-text, #e6e9ef); font-size: .95rem; }
    input:focus { outline: none; border-color: var(--ds-primary, #5b9df0); }
    button { font: inherit; cursor: pointer; border-radius: 10px; border: 1px solid transparent; padding: 11px 16px; font-weight: 600; width: 100%; }
    button:disabled { opacity: .55; cursor: default; }
    .btn-primary { background: var(--ds-primary, #5b9df0); color: var(--ds-primary-on, #081120); margin-top: 14px; }
    .btn-ghost { background: transparent; border-color: var(--ds-border-strong, rgba(255,255,255,.14)); color: var(--ds-text, #e6e9ef); margin-top: 10px; }
    .err { color: var(--ds-danger, #ef5b58); font-size: .82rem; margin-top: 10px; }
    .divider { display: flex; align-items: center; gap: 10px; color: var(--ds-text-faint, #667085); font-size: .72rem; margin: 16px 0 6px; }
    .divider::before, .divider::after { content: ''; height: 1px; background: var(--ds-border, rgba(255,255,255,.08)); flex: 1; }
    .board-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    .board-head h1 { font-size: 1.25rem; margin: 0; }
    .badge { font-size: .7rem; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; background: var(--ds-primary-soft, rgba(91,157,240,.14)); color: var(--ds-primary, #5b9df0); }
    .you { margin-left: auto; font-size: .82rem; color: var(--ds-text-muted, #9aa6b8); }
    .roster { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 20px; }
    .chip { font-size: .74rem; padding: 3px 9px; border-radius: 999px; background: var(--ds-surface-2, #1a2230); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); color: var(--ds-text-muted, #9aa6b8); }
    .chip.guest { border-color: var(--ds-primary-border, rgba(91,157,240,.35)); }
  `],
  template: `
    @switch (view()) {
      @case ('loading') {
        <div class="center"><div class="card"><p class="sub" style="margin:0">Loading…</p></div></div>
      }
      @case ('notFound') {
        <div class="center">
          <div class="card">
            <p class="eyebrow">Retro</p>
            <h1>This link isn't available</h1>
            <p class="sub">The retro may have ended, or it isn't open to guests. Check with whoever shared it.</p>
          </div>
        </div>
      }
      @case ('join') {
        <div class="center">
          <div class="card">
            <p class="eyebrow">Join retro</p>
            <h1>{{ title() }}</h1>
            <p class="sub">You've been invited to join this retrospective.</p>
            @if (allowGuest()) {
              <label for="gname">Your name</label>
              <input id="gname" [(ngModel)]="name" maxlength="60" placeholder="e.g. Alex from Design"
                     (keyup.enter)="joinAsGuest()" [disabled]="joining()" />
              <button class="btn-primary" (click)="joinAsGuest()" [disabled]="joining() || !name.trim()">
                {{ joining() ? 'Joining…' : 'Join as guest' }}
              </button>
              <div class="divider">or</div>
            } @else {
              <p class="sub">This retro is open to team members only.</p>
            }
            <button class="btn-ghost" (click)="signIn()">Sign in with your account</button>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
        </div>
      }
      @case ('board') {
        <div class="wrap">
          <div class="board-head">
            <h1>{{ title() }}</h1>
            <span class="badge">{{ board()!.board.phase }}</span>
            <span class="you">You're in as <strong>{{ board()!.displayName }}</strong></span>
          </div>
          <div class="roster">
            @for (p of board()!.board.participants; track p.id) {
              <span class="chip" [class.guest]="p.isGuest">{{ p.name }}{{ p.isGuest ? ' (guest)' : '' }}</span>
            }
          </div>
          <app-guest-retro-board-view [board]="board()!.board" />
        </div>
      }
    }
  `,
})
export class GuestRetroComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private svc = inject(GuestRetroBoardService);
  private destroy$ = new Subject<void>();

  view = signal<View>('loading');
  board = signal<GuestRetroBoard | null>(null);
  joining = signal(false);
  error = signal<string | null>(null);
  name = '';

  private slug = '';

  title() { return this.board()?.board.title || 'Retrospective'; }
  allowGuest() { return this.board()?.board.allowGuestJoin ?? false; }

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';

    // Recognize an already-signed-in member and hand them the real (authed) board, which enrols them
    // as a member participant. Guests fall through to the join card.
    this.auth.authStatus$.pipe(
      filter(s => s !== 'checking'),
      take(1),
      takeUntil(this.destroy$),
    ).subscribe(status => {
      if (status === 'authorized') {
        this.router.navigate(['/pulse/retro-board', this.slug]);
      } else {
        this.loadBoard(true);
      }
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  private loadBoard(initial: boolean) {
    this.svc.getBoard(this.slug).pipe(takeUntil(this.destroy$)).subscribe({
      next: b => {
        this.board.set(b);
        if (b.hasJoined) {
          const wasBoard = this.view() === 'board';
          this.view.set('board');
          if (!wasBoard) this.startPolling();   // arm live refresh the first time we show the board
        } else {
          this.view.set('join');
        }
      },
      error: () => { if (initial) this.view.set('notFound'); },
    });
  }

  joinAsGuest() {
    const displayName = this.name.trim();
    if (!displayName || this.joining()) return;
    this.joining.set(true); this.error.set(null);
    this.svc.join(this.slug, displayName).pipe(takeUntil(this.destroy$)).subscribe({
      next: b => { this.joining.set(false); this.board.set(b); this.view.set('board'); this.startPolling(); },
      error: () => { this.joining.set(false); this.error.set('Could not join — the retro may have closed.'); },
    });
  }

  signIn() { this.auth.login(this.router.url); }

  // Guests have no WebSocket yet, so refresh the read-only board on a gentle poll.
  private startPolling() {
    interval(4000).pipe(
      switchMap(() => this.svc.getBoard(this.slug).pipe(catchError(() => EMPTY))),
      takeUntil(this.destroy$),
    ).subscribe(b => this.board.set(b));
  }
}
