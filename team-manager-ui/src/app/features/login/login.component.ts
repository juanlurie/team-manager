import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h1>Team Manager</h1>
        <p>Sign in with your Google account to continue</p>
        <button class="google-btn" (click)="login()">
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign in with Google
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background: linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #0d1b2a 100%);
    }
    .login-card {
      text-align:center;
      padding:48px 40px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      max-width: 380px;
      width: 90%;
    }
    .brand-icon {
      width: 56px; height: 56px;
      margin: 0 auto 20px;
      color: #64b5f6;
      opacity: 0.8;
    }
    .brand-icon svg { width: 100%; height: 100%; }
    h1 { margin:0 0 8px; font-size:1.4rem; font-weight:600; color:rgba(255,255,255,0.9); }
    p { margin:0 0 28px; color:rgba(255,255,255,0.4); font-size:0.85rem; line-height:1.5; }
    .google-btn {
      display:inline-flex;
      align-items:center;
      gap:10px;
      padding:11px 22px;
      border-radius:8px;
      border:1px solid rgba(255,255,255,0.12);
      background:#fff;
      color:#333;
      font-size:0.9rem;
      font-weight:500;
      cursor:pointer;
      transition:all 0.2s;
      font-family:inherit;
    }
    .google-btn:hover { background:#f8f8f8; box-shadow:0 2px 12px rgba(0,0,0,0.3); transform:translateY(-1px); }
    .google-btn:active { transform:translateY(0); }
  `]
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.auth.isAuthorized$.subscribe(authorized => {
      if (authorized) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  login() {
    this.auth.login();
  }
}
