import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeatureCategoryGroup, MemberFeatureOverride } from '../models/feature-permissions.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class FeaturePermissionService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/feature-permissions`;

  getAllRolePermissions(): Observable<FeatureCategoryGroup[]> {
    return this.http.get<FeatureCategoryGroup[]>(`${this.base}/roles`);
  }

  updateRolePermission(featureKey: string, role: string, isEnabled: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/roles/${featureKey}/${role}`, { isEnabled });
  }

  getMemberOverrides(memberId: string): Observable<MemberFeatureOverride[]> {
    return this.http.get<MemberFeatureOverride[]>(`${this.base}/members/${memberId}`);
  }

  updateMemberOverride(memberId: string, featureKey: string, isEnabled: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/members/${memberId}`, { featureKey, isEnabled });
  }

  removeMemberOverride(memberId: string, featureKey: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/members/${memberId}/${featureKey}`);
  }
}
