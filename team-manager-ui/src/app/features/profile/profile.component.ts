import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { TeamMember } from '../../core/models/team-member.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private memberSvc = inject(TeamMemberService);
  private snackBar = inject(MatSnackBar);

  member = signal<TeamMember | null>(null);
  showPicker = signal(false);
  selectedSeed = signal<string | null>(null);
  saving = signal(false);

  avatarOptions = computed(() => {
    const m = this.member();
    if (!m) return [];
    const base = `${m.firstName}-${m.lastName}`;
    return Array.from({ length: 24 }, (_, i) => `${base}-${i + 1}`);
  });

  readonly encodeURIComponent = encodeURIComponent;

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

  ngOnInit() {
    this.memberSvc.getMe().subscribe(me => {
      this.memberSvc.getById(me.id).subscribe(m => {
        this.member.set(m);
        this.selectedSeed.set(m.avatarSeed);
      });
    });
  }

  openAvatarPicker() {
    this.selectedSeed.set(this.member()?.avatarSeed ?? null);
    this.showPicker.set(true);
  }

  selectSeed(seed: string) {
    this.selectedSeed.set(seed);
  }

  clearAvatar() {
    this.selectedSeed.set(null);
  }

  saveAvatar() {
    const m = this.member();
    if (!m) return;
    this.saving.set(true);
    this.memberSvc.updateAvatar(m.id, this.selectedSeed()).subscribe({
      next: updated => {
        this.member.set(updated);
        this.showPicker.set(false);
        this.saving.set(false);
        this.snackBar.open('Avatar updated', 'Close', { duration: 2000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Failed to save avatar', 'Close', { duration: 3000 });
      }
    });
  }
}
