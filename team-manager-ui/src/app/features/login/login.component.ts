import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

const FEATURES = [
  { icon: 'directions_run', label: 'Sprint tracking', desc: 'Plan velocity, blockers and retros' },
  { icon: 'people',         label: 'Team overview',   desc: 'Skills, notes and member profiles' },
  { icon: 'schedule',       label: 'Timesheets',      desc: 'Log time and sync to external systems' },
  { icon: 'event_busy',     label: 'Leave',           desc: 'Calendar view across the whole team' },
  { icon: 'rocket_launch',  label: 'Delivery',        desc: 'Features, progress and exports' },
  { icon: 'casino',         label: 'Fun Hub',         desc: 'Wins, leaderboard, spin wheel and more' },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  template: `
    <div class="login-page">

      <!-- Left hero panel -->
      <div class="hero">
        <div class="hero-inner">
          <div class="brand">
            <div class="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div class="brand-name">Team Manager</div>
              <div class="brand-tagline">Everything your team needs, in one place</div>
            </div>
          </div>

          <div class="features">
            @for (f of features; track f.label) {
              <div class="feature-row">
                <div class="feature-icon-wrap">
                  <span class="material-icons feature-icon">{{ f.icon }}</span>
                </div>
                <div>
                  <div class="feature-label">{{ f.label }}</div>
                  <div class="feature-desc">{{ f.desc }}</div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Decorative mesh -->
        <div class="mesh"></div>
      </div>

      <!-- Right sign-in panel -->
      <div class="sign-in-panel">
        <div class="sign-in-card">
          <div class="card-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to access your team workspace</p>

          <button class="google-btn" (click)="login()">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div class="divider">
            <span>Secure sign-in via Google OAuth</span>
          </div>
        </div>
      </div>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    @import url('https://fonts.googleapis.com/icon?family=Material+Icons');

    * { box-sizing: border-box; }

    .login-page {
      display: flex;
      min-height: 100vh;
      background: #0d1b2a;
    }

    /* ── Left hero ── */
    .hero {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #0d1b2a 0%, #102236 40%, #0f2d47 100%);
      overflow: hidden;
      padding: 48px;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      max-width: 460px;
      width: 100%;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 52px;
    }

    .brand-icon {
      width: 52px;
      height: 52px;
      background: rgba(100,181,246,0.12);
      border: 1px solid rgba(100,181,246,0.25);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #64b5f6;
    }
    .brand-icon svg { width: 26px; height: 26px; }

    .brand-name {
      font-size: 1.3rem;
      font-weight: 700;
      color: rgba(255,255,255,0.92);
      letter-spacing: -0.01em;
    }
    .brand-tagline {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.35);
      margin-top: 2px;
    }

    .features {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .feature-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .feature-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(100,181,246,0.08);
      border: 1px solid rgba(100,181,246,0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .feature-icon {
      font-size: 18px;
      color: #64b5f6;
      opacity: 0.75;
    }

    .feature-label {
      font-size: 0.88rem;
      font-weight: 600;
      color: rgba(255,255,255,0.8);
      line-height: 1.3;
    }

    .feature-desc {
      font-size: 0.76rem;
      color: rgba(255,255,255,0.35);
      margin-top: 2px;
      line-height: 1.4;
    }

    /* Decorative mesh overlay */
    .mesh {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(100,181,246,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(100,181,246,0.04) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }
    .mesh::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 70% 60% at 30% 50%, rgba(100,181,246,0.06) 0%, transparent 70%);
    }

    /* Vertical separator */
    .hero::after {
      content: '';
      position: absolute;
      top: 10%;
      bottom: 10%;
      right: 0;
      width: 1px;
      background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent);
    }

    /* ── Right sign-in ── */
    .sign-in-panel {
      width: 420px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
      background: #0d1b2a;
    }

    .sign-in-card {
      width: 100%;
      max-width: 320px;
    }

    .card-logo {
      width: 48px;
      height: 48px;
      background: rgba(100,181,246,0.1);
      border: 1px solid rgba(100,181,246,0.2);
      border-radius: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64b5f6;
      margin-bottom: 28px;
    }
    .card-logo svg { width: 22px; height: 22px; }

    h1 {
      margin: 0 0 6px;
      font-size: 1.55rem;
      font-weight: 700;
      color: rgba(255,255,255,0.92);
      letter-spacing: -0.02em;
    }

    p {
      margin: 0 0 32px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.38);
      line-height: 1.5;
    }

    .google-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 13px 20px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.97);
      color: #1a1a1a;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s;
      font-family: inherit;
      letter-spacing: 0.01em;
    }
    .google-btn:hover {
      background: #fff;
      border-color: rgba(255,255,255,0.2);
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
      transform: translateY(-1px);
    }
    .google-btn:active { transform: translateY(0); box-shadow: none; }

    .divider {
      margin-top: 24px;
      text-align: center;
    }
    .divider span {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.2);
    }

    /* ── Mobile: compact, sign-in above the fold ── */
    @media (max-width: 720px) {
      .login-page {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 24px 48px;
        background: linear-gradient(145deg, #0d1b2a 0%, #102236 40%, #0f2d47 100%);
      }

      /* Hide the hero panel entirely */
      .hero { display: none; }

      /* Sign-in panel becomes the full page */
      .sign-in-panel {
        width: 100%;
        max-width: 360px;
        padding: 0;
        background: none;
      }

      .sign-in-card { max-width: 100%; }

      /* Show a compact brand mark instead of the left-panel brand */
      .sign-in-card::before {
        content: '';
        display: block;
      }

      h1 { font-size: 1.75rem; }
      p  { margin-bottom: 36px; }
    }
  `]
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  features = FEATURES;

  ngOnInit() {
    this.auth.authStatus$.subscribe(status => {
      if (status === 'authorized') {
        this.router.navigate(['/dashboard']);
      } else if (status === 'unauthorized') {
        this.router.navigate(['/not-registered']);
      }
    });
  }

  login() {
    this.auth.login();
  }
}
