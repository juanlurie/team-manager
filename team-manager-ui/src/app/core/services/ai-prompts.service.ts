import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiPrompt, TestAiPromptResult } from '../models/ai-prompt.model';

@Injectable({ providedIn: 'root' })
export class AiPromptsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/ai-prompts';

  getAll(): Observable<AiPrompt[]> {
    return this.http.get<AiPrompt[]>(this.baseUrl);
  }

  create(prompt: AiPrompt): Observable<AiPrompt> {
    return this.http.post<AiPrompt>(this.baseUrl, prompt);
  }

  update(id: string, prompt: AiPrompt): Observable<AiPrompt> {
    return this.http.put<AiPrompt>(`${this.baseUrl}/${id}`, prompt);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  test(id: string, promptParams: Record<string, string>): Observable<TestAiPromptResult> {
    return this.http.post<TestAiPromptResult>(`${this.baseUrl}/${id}/test`, { promptParams });
  }
}
