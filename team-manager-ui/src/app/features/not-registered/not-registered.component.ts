import { Component, inject, signal, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { AccessRequestEvent, ACCESS_REQUEST_EVENT_TYPES } from '../../core/websocket/events/access-request.events';

@Component({
  selector: 'app-not-registered',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="not-registered-page">
      <div class="not-registered-card">
        <div class="icon-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="17" y1="8" x2="23" y2="14"/>
            <line x1="23" y1="8" x2="17" y2="14"/>
          </svg>
        </div>
        <h1>Access Not Granted</h1>
        <p class="main-message">
          Your Google account is not registered as a team member.
        </p>

        @if (requestSent()) {
          <div class="success-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <div style="font-weight:600;margin-bottom:4px">Access Request Submitted</div>
              <div style="font-size:0.78rem;opacity:0.7">An admin will review your request. You'll be notified once approved.</div>
            </div>
          </div>
          <button class="logout-btn" (click)="onLogout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        } @else if (hasClaims()) {
          <!-- Google identity confirmed — just show who they are and a reason field -->
          <div class="google-identity">
            @if (googlePicture()) {
              <img class="google-avatar" [src]="googlePicture()" alt="Profile photo" referrerpolicy="no-referrer" />
            } @else {
              <div class="google-avatar google-avatar--fallback">{{ googleName().charAt(0).toUpperCase() }}</div>
            }
            <div class="google-info">
              <div class="google-name">{{ googleName() }}</div>
              <div class="google-email">{{ googleEmail() }}</div>
            </div>
          </div>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }

          <button class="submit-btn" [disabled]="submitting()" (click)="submitRequest()">
            {{ submitting() ? 'Submitting...' : 'Request Access' }}
          </button>

          <div class="divider"><span>or</span></div>

          <button class="logout-btn" (click)="onLogout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        } @else {
          <!-- Fallback: no Google claims available -->
          <div class="request-form">
            <p class="form-hint">Request access from an admin:</p>

            <label class="field-label">Name</label>
            <input class="field-input" [(ngModel)]="form.name" placeholder="Your full name" />

            <label class="field-label">Email</label>
            <input class="field-input" [(ngModel)]="form.email" type="email" placeholder="your@email.com" />

            @if (error()) {
              <div class="error-msg">{{ error() }}</div>
            }

            <button class="submit-btn" [disabled]="submitting() || !form.name.trim() || !form.email.trim()" (click)="submitRequest()">
              {{ submitting() ? 'Submitting...' : 'Request Access' }}
            </button>
          </div>

          <div class="divider"><span>or</span></div>

          <button class="logout-btn" (click)="onLogout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .not-registered-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #0d1b2a 100%);
      padding: 20px;
    }
    .not-registered-card {
      text-align: center;
      padding: 40px 36px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      max-width: 440px;
      width: 100%;
    }
    .icon-circle {
      width: 56px; height: 56px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: rgba(239,83,80,0.12);
      color: #ef5350;
      display: flex; align-items: center; justify-content: center;
    }
    .icon-circle svg { width: 28px; height: 28px; }
    h1 { margin: 0 0 12px; font-size: 1.3rem; font-weight: 600; color: rgba(255,255,255,0.9); }
    .main-message { margin: 0 0 20px; color: rgba(255,255,255,0.5); font-size: 0.88rem; line-height: 1.6; }

    .success-box {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px;
      background: rgba(76,175,80,0.1);
      border: 1px solid rgba(76,175,80,0.25);
      border-radius: 10px;
      margin-bottom: 20px;
      color: #81c784;
      text-align: left;
      line-height: 1.5;
    }
    .success-box svg { flex-shrink: 0; margin-top: 2px; }

    .google-identity {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      margin-bottom: 16px;
      text-align: left;
    }
    .google-avatar {
      width: 44px; height: 44px;
      border-radius: 50%;
      flex-shrink: 0;
      object-fit: cover;
    }
    .google-avatar--fallback {
      display: flex; align-items: center; justify-content: center;
      background: rgba(100,181,246,0.2);
      color: #64b5f6;
      font-size: 1.1rem;
      font-weight: 700;
    }
    .google-info { overflow: hidden; }
    .google-name { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .google-email { font-size: 0.78rem; color: rgba(255,255,255,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .request-form { text-align: left; margin-bottom: 16px; }
    .form-hint { font-size: 0.82rem; color: rgba(255,255,255,0.4); margin: 0 0 14px; }
    .field-label { display: block; font-size: 0.72rem; color: rgba(255,255,255,0.45); margin-bottom: 4px; font-weight: 500; }
    .field-input {
      width: 100%; box-sizing: border-box;
      padding: 8px 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      color: inherit;
      font-size: 0.85rem;
      font-family: inherit;
      outline: none;
      margin-bottom: 12px;
      transition: border-color 0.15s;
    }
    .field-input:focus { border-color: rgba(100,181,246,0.5); }
    .field-input::placeholder { color: rgba(255,255,255,0.25); }
    .field-textarea { resize: vertical; min-height: 60px; }

    .error-msg {
      font-size: 0.78rem; color: #ef5350;
      background: rgba(239,83,80,0.1);
      border: 1px solid rgba(239,83,80,0.2);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 12px;
      text-align: left;
    }

    .submit-btn {
      width: 100%;
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: #64b5f6;
      color: #0d1b2a;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .submit-btn:hover:not(:disabled) { background: #90caf9; }
    .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .divider {
      display: flex; align-items: center; gap: 12px;
      margin: 16px 0;
      color: rgba(255,255,255,0.2);
      font-size: 0.75rem;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.08);
    }

    .logout-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: transparent;
      color: rgba(255,255,255,0.6);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .logout-btn:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
  `]
})
export class NotRegisteredComponent implements OnDestroy {
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private wsSvc = inject(WebSocketService);
  private wsSub: Subscription | null = null;
  private pendingRequestId: string | null = null;

  googleName = signal('');
  googleEmail = signal('');
  googlePicture = signal('');
  submitting = signal(false);
  error = signal('');
  requestSent = signal(false);
  hasClaims = signal(false);

  // Manual fallback form (when no Google claims)
  form = { name: '', email: '' };

  constructor() {
    effect(() => {
      const claims = this.auth.pendingClaims();
      if (claims?.email) {
        this.googleName.set(claims.name);
        this.googleEmail.set(claims.email);
        this.googlePicture.set(claims.picture);
        this.hasClaims.set(true);
      }
    });
  }

  submitRequest() {
    const name = this.hasClaims() ? this.googleName() : this.form.name.trim();
    const email = this.hasClaims() ? this.googleEmail() : this.form.email.trim();
    if (!name || !email) return;

    this.submitting.set(true);
    this.error.set('');

    this.http.post<{ id: string }>('/api/accessrequests/submit', {
      name,
      email,
      reason: null,
      googleSub: this.auth.pendingClaims()?.sub || null
    }).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.requestSent.set(true);
        this.pendingRequestId = res.id;
        this.listenForApproval();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.error || 'Failed to submit request. Please try again.');
      }
    });
  }

  onLogout() {
    this.auth.logout();
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  private listenForApproval() {
    this.wsSvc.connect();
    this.wsSub = this.wsSvc.roomEvents<AccessRequestEvent>(ACCESS_REQUEST_EVENT_TYPES).subscribe(msg => {
      if (msg.type !== 'access_request_approved') return;
      const requestId = msg.data['requestId'] as string;
      if (requestId === this.pendingRequestId) {
        this.wsSub?.unsubscribe();
        this.auth.login();
      }
    });
  }
}
