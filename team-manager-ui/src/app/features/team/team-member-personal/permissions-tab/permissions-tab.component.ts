import { Component, OnInit, inject, signal, Input, computed, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FeaturePermissionService } from '../../../../core/services/feature-permission.service';
import { MemberFeatureOverride } from '../../../../core/models/feature-permissions.model';

@Component({
  selector: 'app-permissions-tab',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
],
  templateUrl: './permissions-tab.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./permissions-tab.component.scss'],
})
export class PermissionsTabComponent implements OnInit {
  @Input({ required: true }) memberId = '';
  @Input() memberRole = '';

  private service = inject(FeaturePermissionService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  saving = signal<string | null>(null);
  overrides = signal<MemberFeatureOverride[]>([]);
  categories = signal<string[]>([]);

  overrideCount = computed(() => this.overrides().filter(o => !o.roleDefault).length);
  hasOverrides = computed(() => this.overrideCount() > 0);

  groupedOverrides = computed(() => {
    const groups: Record<string, MemberFeatureOverride[]> = {};
    for (const item of this.overrides()) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  });

  ngOnInit() {
    this.loadOverrides();
  }

  loadOverrides() {
    this.loading.set(true);
    this.service.getMemberOverrides(this.memberId).subscribe({
      next: data => {
        this.overrides.set(data);
        const cats = [...new Set(data.map(o => o.category))];
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleOverride(featureKey: string, currentEnabled: boolean, isRoleDefault: boolean) {
    this.saving.set(featureKey);

    if (isRoleDefault) {
      this.service.updateMemberOverride(this.memberId, featureKey, !currentEnabled).subscribe({
        next: () => {
          this.saving.set(null);
          this.loadOverrides();
          this.snackBar.open('Override applied', 'Close', { duration: 2000 });
        },
        error: () => {
          this.saving.set(null);
          this.snackBar.open('Failed to update', 'Close', { duration: 3000 });
        },
      });
    } else {
      this.service.removeMemberOverride(this.memberId, featureKey).subscribe({
        next: () => {
          this.saving.set(null);
          this.loadOverrides();
          this.snackBar.open('Reset to role default', 'Close', { duration: 2000 });
        },
        error: () => {
          this.saving.set(null);
          this.snackBar.open('Failed to reset', 'Close', { duration: 3000 });
        },
      });
    }
  }

  isSaving(featureKey: string): boolean {
    return this.saving() === featureKey;
  }
}
