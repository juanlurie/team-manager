import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-not-registered',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        } @else {
          <div class="request-form">
            <p class="form-hint">Request access from an admin:</p>

            <label class="field-label">Name</label>
            <input class="field-input" [(ngModel)]="form.name" placeholder="Your full name" />

            <label class="field-label">Email</label>
            <input class="field-input" [(ngModel)]="form.email" type="email" placeholder="your@email.com" />

            <label class="field-label">Reason (optional)</label>
            <textarea class="field-input field-textarea" [(ngModel)]="form.reason" placeholder="Why do you need access?" rows="3"></textarea>

            @if (error()) {
              <div class="error-msg">{{ error() }}</div>
            }

            <button class="submit-btn" [disabled]="submitting() || !form.name.trim() || !form.email.trim()" (click)="submitRequest()">
              {{ submitting() ? 'Submitting...' : 'Request Access' }}
            </button>
          </div>

          <div class="divider">
            <span>or</span>
          </div>

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
export class NotRegisteredComponent {
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  form = { name: '', email: '', reason: '' };
  submitting = signal(false);
  error = signal('');
  requestSent = signal(false);

  constructor() {
    const claims = this.auth.identityClaims as any;
    if (claims) {
      this.form.name = claims.name || claims.given_name || '';
      this.form.email = claims.email || '';
    }
  }

  submitRequest() {
    if (!this.form.name.trim() || !this.form.email.trim()) return;
    this.submitting.set(true);
    this.error.set('');

    const claims = this.auth.identityClaims as any;
    const googleSub = claims?.sub || null;

    this.http.post('/api/accessrequests/submit', {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      reason: this.form.reason.trim() || null,
      googleSub
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.requestSent.set(true);
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
}
