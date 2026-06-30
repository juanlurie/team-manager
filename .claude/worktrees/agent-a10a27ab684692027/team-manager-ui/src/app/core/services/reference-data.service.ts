import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProjectDto {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CategoryDto {
  id: string;
  projectId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface PublicHolidayDto {
  id: string;
  date: string;
  name: string;
  isActive: boolean;
}

export interface ActivityComboDto {
  id: string;
  label: string;
  project: string;
  category: string;
  color: string;
  bg: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CategoriesByProject {
  [projectId: string]: string[];
}

export interface CreateProjectRequest {
  name: string;
}

export interface CreateCategoryRequest {
  projectId: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  constructor(private http: HttpClient) {}

  getProjects(): Observable<ProjectDto[]> {
    return this.http.get<ProjectDto[]>('/api/v1/reference/projects');
  }

  getCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>('/api/v1/reference/categories');
  }

  getPublicHolidays(year?: number): Observable<PublicHolidayDto[]> {
    return this.http.get<PublicHolidayDto[]>(`/api/v1/reference/holidays${year ? `?year=${year}` : ''}`);
  }

  getActivityCombos(): Observable<ActivityComboDto[]> {
    return this.http.get<ActivityComboDto[]>('/api/v1/reference/combos');
  }

  createProject(request: CreateProjectRequest): Observable<ProjectDto> {
    return this.http.post<ProjectDto>('/api/v1/reference/projects', request);
  }

  createCategory(request: CreateCategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>('/api/v1/reference/categories', request);
  }
}