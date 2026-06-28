import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { TeamMember } from '../../core/models/team-member.model';
import { generateAvatar } from '../../core/utils/multiavatar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule,
            MatFormFieldModule, MatInputModule, MatSnackBarModule],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private memberSvc = inject(TeamMemberService);
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  member = signal<TeamMember | null>(null);
  showPicker = signal(false);
  seedInput = signal('');
  saving = signal(false);

  private readonly SUGGESTION_SUFFIXES = [
    '', '-2', '-3', '-x', '-y', '-z', '-alpha', '-beta',
    '-one', '-two', '-red', '-blue', '-star', '-moon', '-sun', '-wind'
  ];

  currentAvatarSvg = computed((): SafeHtml => {
    const seed = this.member()?.avatarSeed;
    return seed ? this.sanitizer.bypassSecurityTrustHtml(generateAvatar(seed)) : '';
  });

  previewSvg = computed((): SafeHtml => {
    const s = this.seedInput().trim();
    return s ? this.sanitizer.bypassSecurityTrustHtml(generateAvatar(s)) : '';
  });

  avatarSuggestions = computed((): string[] => {
    const m = this.member();
    if (!m) return [];
    const base = `${m.firstName} ${m.lastName}`;
    return this.SUGGESTION_SUFFIXES.map(sfx => `${base}${sfx}`);
  });

  suggestionSvg(seed: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(generateAvatar(seed));
  }

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
      });
    });
  }

  openAvatarPicker() {
    this.seedInput.set(this.member()?.avatarSeed ?? '');
    this.showPicker.set(true);
  }

  onSeedInput(event: Event) {
    this.seedInput.set((event.target as HTMLInputElement).value);
  }

  selectSeed(seed: string) {
    this.seedInput.set(seed);
  }

  clearAvatar() {
    this.seedInput.set('');
    this.saveAvatar();
  }

  saveAvatar() {
    const m = this.member();
    if (!m) return;
    const seed = this.seedInput().trim() || null;
    this.saving.set(true);
    this.memberSvc.updateAvatar(m.id, seed).subscribe({
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
