import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Milestone,
  MilestoneDetail,
  MilestoneCriterion,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  CreateMilestoneCriterionRequest,
  UpdateMilestoneCriterionRequest
} from '../models/milestone.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class MilestoneService {
  private http = inject(HttpClient);

  getByPI(piId: string): Observable<Milestone[]> {
    return this.http.get<Milestone[]>(`${API_BASE}/pis/${piId}/milestones`);
  }

  getById(id: string): Observable<MilestoneDetail> {
    return this.http.get<MilestoneDetail>(`${API_BASE}/milestones/${id}`);
  }

  create(piId: string, request: CreateMilestoneRequest): Observable<Milestone> {
    return this.http.post<Milestone>(`${API_BASE}/pis/${piId}/milestones`, request);
  }

  update(id: string, request: UpdateMilestoneRequest): Observable<Milestone> {
    return this.http.put<Milestone>(`${API_BASE}/milestones/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/milestones/${id}`);
  }

  getCriteria(milestoneId: string): Observable<MilestoneCriterion[]> {
    return this.http.get<MilestoneCriterion[]>(`${API_BASE}/milestones/${milestoneId}/criteria`);
  }

  addCriterion(milestoneId: string, request: CreateMilestoneCriterionRequest): Observable<MilestoneCriterion> {
    return this.http.post<MilestoneCriterion>(`${API_BASE}/milestones/${milestoneId}/criteria`, request);
  }

  updateCriterion(criterionId: string, request: UpdateMilestoneCriterionRequest): Observable<MilestoneCriterion> {
    return this.http.put<MilestoneCriterion>(`${API_BASE}/criteria/${criterionId}`, request);
  }

  deleteCriterion(criterionId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/criteria/${criterionId}`);
  }
}
