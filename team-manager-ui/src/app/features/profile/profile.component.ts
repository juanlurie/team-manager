import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  private auth = inject(AuthService);

  get userName(): string {
    const claims = this.auth.identityClaims as any;
    return claims?.name || claims?.preferred_username || 'User';
  }

  get userEmail(): string {
    const claims = this.auth.identityClaims as any;
    return claims?.email || '';
  }

  get userRole(): string {
    const claims = this.auth.identityClaims as any;
    return claims?.role || '';
  }
}
