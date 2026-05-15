import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-not-registered',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
          Please contact your team lead to be added.
        </p>
        <div class="info-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>If you believe this is an error, try signing out and signing back in.</span>
        </div>
        <button class="logout-btn" (click)="onLogout()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
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
    }
    .not-registered-card {
      text-align: center;
      padding: 48px 40px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      max-width: 420px;
      width: 90%;
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
    .main-message { margin: 0 0 24px; color: rgba(255,255,255,0.5); font-size: 0.88rem; line-height: 1.6; }
    .info-box {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      margin-bottom: 24px;
      color: rgba(255,255,255,0.4);
      font-size: 0.8rem;
      text-align: left;
      line-height: 1.4;
    }
    .info-box svg { flex-shrink: 0; margin-top: 1px; color: rgba(255,255,255,0.3); }
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
export class NotRegisteredComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    // If somehow they have a valid token, redirect to dashboard
    if (this.auth.hasValidToken()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin;
  }
}
