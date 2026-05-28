import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './api.config';

export interface FeaturePermission {
  featureKey: string;
  isEnabled: boolean;
}

export interface MyPermissionsResponse {
  memberId: string;
  role: string;
  permissions: FeaturePermission[];
}

@Injectable({ providedIn: 'root' })
export class FeatureAccessService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/feature-permissions`;

  private permissionsSignal = signal<Map<string, boolean>>(new Map());
  private loaded = signal(false);

  loadPermissions() {
    this.http.get<MyPermissionsResponse>(`${this.base}/me`).subscribe({
      next: (data) => {
        const map = new Map<string, boolean>();
        for (const p of data.permissions) {
          map.set(p.featureKey, p.isEnabled);
        }
        this.permissionsSignal.set(map);
        this.loaded.set(true);
      },
      error: () => {
        this.loaded.set(true);
      },
    });
  }

  hasAccess(featureKey: string): boolean {
    const map = this.permissionsSignal();
    if (!this.loaded()) return true;
    const val = map.get(featureKey);
    return val !== false;
  }

  hasAccess$(featureKey: string) {
    return computed(() => this.hasAccess(featureKey));
  }
}
