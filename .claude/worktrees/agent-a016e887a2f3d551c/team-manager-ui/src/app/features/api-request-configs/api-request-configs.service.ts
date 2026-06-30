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
  responseFormat: string;
  htmlJsonMarker: string;
  employeeIdPattern: string;
  textResponsePath: string;
  subjectPath?: string;
  isAllDayPath?: string;
  locationPath?: string;
  employeesPath?: string;
  daysArrayPath?: string;
  entriesPath?: string;
  memberIdPath?: string;
  memberNamePath?: string;
  teamNamePath?: string;
  dayDatePath?: string;
  datePath?: string;
  projectPath?: string;
  categoryPath?: string;
  hoursPath?: string;
  minutesPath?: string;
  billablePath?: string;
  workedFromPath?: string;
  descriptionPath?: string;
  ticketNumberPath?: string;
  customFields?: Record<string, string>;
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
  secretHeaders?: Record<string, string>;
  parameters: Record<string, string>;
  bodyTemplate: string;
  mapping: MappingConfig;
  retryCount?: number;
  successCriteria?: SuccessCriteria | null;
  autoSync?: boolean;
  // Marks this as eligible to be picked as an AI Prompt's connection (see features/ai-prompts) --
  // keeps that screen's connection picker from listing every non-AI integration too.
  isAiConnection?: boolean;
}

// `vars` is the single source of truth for an action's runtime-only template placeholders —
// each key is a {placeholder} the action injects at send time, each value a sample used both
// to list "available variables" in the editor and to populate Test Request with something
// meaningful instead of an empty string. Add a new runtime placeholder here, once, rather than
// in the three separate places the edit component used to hardcode them.
export const REQUEST_ACTIONS = [
  { value: 'FetchLeave', label: 'Fetch Leave', icon: 'event_busy', vars: { start: '', end: '', teamIds: '' } },
  { value: 'FetchCalendarEvents', label: 'Fetch Calendar Events', icon: 'calendar_month', vars: { start: '', end: '', teamIds: '' } },
  { value: 'AddTimesheetEntry', label: 'Add Timesheet Entry', icon: 'schedule', vars: {
    id: '', date: '', project: '', category: '', categoryId: '', employeeId: '', workedFromLocationId: '',
    hours: '1', minutes: '0', billable: 'true', workedFrom: '', sentiment: '', description: 'Test', ticketNumber: ''
  } },
  { value: 'EditTimesheetEntry', label: 'Edit Timesheet Entry', icon: 'edit_calendar', vars: {
    id: '', date: '', project: '', category: '', categoryId: '', employeeId: '', workedFromLocationId: '',
    hours: '1', minutes: '0', billable: 'true', workedFrom: '', sentiment: '', description: 'Test', ticketNumber: ''
  } },
  { value: 'DeleteTimesheetEntry', label: 'Delete Timesheet Entry', icon: 'delete_forever', vars: {
    id: '', date: '', project: '', category: '', categoryId: '', employeeId: '', workedFromLocationId: '',
    hours: '1', minutes: '0', billable: 'true', workedFrom: '', sentiment: '', description: 'Test', ticketNumber: ''
  } },
  { value: 'GetTimesheetProjects', label: 'Get Timesheet Projects', icon: 'folder_open', vars: {} },
  { value: 'GetTimesheetProjectCategories', label: 'Get Timesheet Project Categories', icon: 'category', vars: {} },
  { value: 'FetchTimesheetApprovals', label: 'Fetch Timesheet Approvals', icon: 'fact_check', vars: { start: '', end: '' } },
  { value: 'ApproveTimesheet', label: 'Approve Timesheet', icon: 'task_alt', vars: {
    memberName: 'Jane Doe', start: '', end: '', employeeId: '', totalHours: '40'
  } },
  // The one shared AI connection (URL/auth/model/response-shape) -- actual prompt text for each
  // use case (quiz questions, Wordle words, jokes, win stories, timesheet analysis) is managed
  // separately under AI Prompts, which link to a connection created with this action and
  // isAiConnection=true. {systemPrompt}/{userMessage} are filled in by AiPromptExecutorService at
  // call time from whichever prompt is being run -- write them in the BodyTemplate exactly like
  // any other text placeholder, with your own quotes around them, e.g. "system": "{systemPrompt}".
  { value: 'AiConnection', label: 'AI Connection', icon: 'auto_awesome', vars: {
    systemPrompt: 'You are a helpful assistant.', userMessage: 'Say hello.'
  } },
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

  testProjectMapping(sampleResponse: string, mapping: MappingConfig): Observable<TestProjectMappingResult> {
    return this.http.post<TestProjectMappingResult>(`${this.baseUrl}/test-project-mapping`, {
      sampleResponse,
      responseFormat: mapping.responseFormat,
      htmlJsonMarker: mapping.htmlJsonMarker,
      projectsPath: mapping.projectsPath,
      projectNamePath: mapping.projectNamePath,
      projectIdPath: mapping.projectIdPath,
      projectCategoriesPath: mapping.projectCategoriesPath,
      categoryNamePath: mapping.categoryNamePath,
      categoryIdPath: mapping.categoryIdPath,
      customFields: mapping.customFields
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

export interface CategoryMappingResult {
  name: string;
  id: string | null;
  customFields: Record<string, string>;
}

export interface ProjectMappingResult {
  name: string;
  id: string | null;
  categories: CategoryMappingResult[];
  customFields: Record<string, string>;
}

export interface TestProjectMappingResult {
  projects: ProjectMappingResult[];
  arrayLength: number;
}
