import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MappingConfig {
  arrayPath: string;
  namePath: string;
  startPath: string;
  endPath: string;
  typePath: string;
  daysPath: string;
  statusPath: string;
  nameTransform: string;
  externalIdPath: string;
  projectsPath: string;
  projectNamePath: string;
  projectIdPath: string;
  projectCategoriesPath: string;
  categoryNamePath: string;
  categoryIdPath: string;
  textResponsePath: string;
}

export interface SuccessCriteria {
  requiredStatus?: number | null;
  jsonPath?: string | null;
  jsonValue?: string | null;
}

export interface ApiRequestConfig {
  id?: string;
  action: string;
  name: string;
  description?: string;
  enabled: boolean;
  url: string;
  method: string;
  isFormUrlEncoded: boolean;
  bodyFormat?: string;
  headers: Record<string, string>;
  parameters: Record<string, string>;
  bodyTemplate: string;
  mapping: MappingConfig;
  retryCount?: number;
  successCriteria?: SuccessCriteria | null;
  autoSync?: boolean;
}

export const REQUEST_ACTIONS = [
  { value: 'FetchLeave', label: 'Fetch Leave', icon: 'event_busy' },
  { value: 'AddTimesheetEntry', label: 'Add Timesheet Entry', icon: 'schedule' },
  { value: 'EditTimesheetEntry', label: 'Edit Timesheet Entry', icon: 'edit_calendar' },
  { value: 'DeleteTimesheetEntry', label: 'Delete Timesheet Entry', icon: 'delete_forever' },
  { value: 'GetTimesheetProjects', label: 'Get Timesheet Projects', icon: 'folder_open' },
  { value: 'AiChatWinStory', label: 'AI Chat — Win Story', icon: 'auto_awesome' },
] as const;

@Injectable({ providedIn: 'root' })
export class ApiRequestConfigsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/request-configs';

  list(): Observable<ApiRequestConfig[]> {
    return this.http.get<ApiRequestConfig[]>(this.baseUrl);
  }

  get(id: string): Observable<ApiRequestConfig> {
    return this.http.get<ApiRequestConfig>(`${this.baseUrl}/${id}`);
  }

  create(config: ApiRequestConfig): Observable<ApiRequestConfig> {
    return this.http.post<ApiRequestConfig>(this.baseUrl, config);
  }

  update(id: string, config: ApiRequestConfig): Observable<ApiRequestConfig> {
    return this.http.put<ApiRequestConfig>(`${this.baseUrl}/${id}`, config);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  export(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export`, { responseType: 'blob' });
  }

  import(configs: ApiRequestConfig[]): Observable<{ created: number; updated: number }> {
    return this.http.post<{ created: number; updated: number }>(`${this.baseUrl}/import`, configs);
  }

  testRequest(config: ApiRequestConfig, variables?: Record<string, string>): Observable<TestRequestResult> {
    return this.http.post<TestRequestResult>(`${this.baseUrl}/test-request`, { config, variables });
  }

  testMapping(sampleJson: string, arrayPath: string, fields: Record<string, string>): Observable<TestMappingResult> {
    return this.http.post<TestMappingResult>(`${this.baseUrl}/test-mapping`, {
      sampleJson,
      arrayPath,
      fields
    });
  }
}

export interface TestRequestResult {
  statusCode: number;
  body: string;
  success: boolean;
}

export interface TestMappingResult {
  availablePaths: string[];
  testResults: Record<string, string | null>;
  arrayLength: number;
}
