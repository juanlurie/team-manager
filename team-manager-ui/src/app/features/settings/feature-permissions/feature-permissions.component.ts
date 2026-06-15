import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FeaturePermissionService } from '../../../core/services/feature-permission.service';
import { FeatureCategoryGroup, ROLES } from '../../../core/models/feature-permissions.model';

interface FeatureRow {
  featureKey: string;
  label: string;
  roleEnabled: Record<string, boolean>;
}

@Component({
  selector: 'app-feature-permissions',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
],
  templateUrl: './feature-permissions.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./feature-permissions.component.scss'],
})
export class FeaturePermissionsComponent implements OnInit {
  private service = inject(FeaturePermissionService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  saving = signal<string | null>(null);
  rawGroups = signal<FeatureCategoryGroup[]>([]);
  roles = ROLES;

  matrixGroups = computed(() => {
    return this.rawGroups().map(group => ({
      category: group.category,
      rows: this.buildMatrix(group),
    }));
  });

  ngOnInit() {
    this.loadPermissions();
  }

  buildMatrix(group: FeatureCategoryGroup): FeatureRow[] {
    const featureMap = new Map<string, FeatureRow>();
    for (const perm of group.permissions) {
      if (!featureMap.has(perm.featureKey)) {
        featureMap.set(perm.featureKey, {
          featureKey: perm.featureKey,
          label: perm.label,
          roleEnabled: {},
        });
      }
      featureMap.get(perm.featureKey)!.roleEnabled[perm.role] = perm.isEnabled;
    }
    return Array.from(featureMap.values());
  }

  loadPermissions() {
    this.loading.set(true);
    this.service.getAllRolePermissions().subscribe({
      next: data => { this.rawGroups.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  togglePermission(featureKey: string, role: string, currentEnabled: boolean) {
    const saveKey = `${featureKey}:${role}`;
    this.saving.set(saveKey);

    this.rawGroups.update(groups => groups.map(group => ({
      ...group,
      permissions: group.permissions.map(p =>
        p.featureKey === featureKey && p.role === role ? { ...p, isEnabled: !currentEnabled } : p
      ),
    })));

    this.service.updateRolePermission(featureKey, role, !currentEnabled).subscribe({
      next: () => {
        this.saving.set(null);
        this.snackBar.open('Permission updated', 'Close', { duration: 2000 });
      },
      error: () => {
        this.rawGroups.update(groups => groups.map(group => ({
          ...group,
          permissions: group.permissions.map(p =>
            p.featureKey === featureKey && p.role === role ? { ...p, isEnabled: currentEnabled } : p
          ),
        })));
        this.saving.set(null);
        this.snackBar.open('Failed to update permission', 'Close', { duration: 3000 });
      },
    });
  }

  isSaving(featureKey: string, role: string): boolean {
    return this.saving() === `${featureKey}:${role}`;
  }
}
