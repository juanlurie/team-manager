import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="logo">🏆</div>
        <h1>Team Manager</h1>
        <p>Sign in to continue</p>
        <button class="google-btn" (click)="login()">
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign in with Google
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1b2a; }
    .login-card { text-align:center;padding:48px 40px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;max-width:400px;width:90%; }
    .logo { font-size:3rem;margin-bottom:16px; }
    h1 { margin:0 0 8px;font-size:1.5rem;font-weight:700;color:#fff; }
    p { margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:0.9rem; }
    .google-btn { display:inline-flex;align-items:center;gap:12px;padding:12px 24px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#fff;color:#333;font-size:0.95rem;font-weight:500;cursor:pointer;transition:all 0.2s;font-family:inherit; }
    .google-btn:hover { background:#f5f5f5;box-shadow:0 2px 8px rgba(0,0,0,0.2); }
  `]
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  async ngOnInit() {
    await firstValueFrom(this.auth.isDone$);
    if (this.auth.hasValidToken()) {
      this.router.navigate(['/dashboard']);
    }
  }

  login() {
    this.auth.login();
  }
}
