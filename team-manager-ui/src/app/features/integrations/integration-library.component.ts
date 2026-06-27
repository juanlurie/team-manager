import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { ApiRequestConfigsService, ApiRequestConfig, MappingConfig } from '../api-request-configs/api-request-configs.service';

interface LibraryField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  hint?: string;
  default?: string;
}

interface LibraryProvider {
  id: string;
  name: string;
  category: 'AI' | 'Timesheet' | 'Notifications';
  tagline: string;
  docsHint?: string;
  logoColor: string;
  logoText: string;
  fields: LibraryField[];
  matchesConfig: (c: ApiRequestConfig) => boolean;
  build: (values: Record<string, string>) => Partial<ApiRequestConfig>[];
}

const EMPTY_MAPPING: MappingConfig = {
  arrayPath: '', namePath: '', startPath: '', endPath: '', typePath: '',
  daysPath: '', statusPath: '', nameTransform: '', externalIdPath: '',
  projectsPath: '', projectNamePath: '', projectIdPath: '',
  projectCategoriesPath: '', categoryNamePath: '', categoryIdPath: '',
  responseFormat: 'json', htmlJsonMarker: '', employeeIdPattern: '',
  textResponsePath: '',
};

const AI_BASE: Partial<ApiRequestConfig> = {
  action: 'AiConnection', isAiConnection: true, enabled: true, autoSync: true,
  isFormUrlEncoded: false, bodyFormat: 'json', parameters: {},
  mapping: { ...EMPTY_MAPPING },
};

const TIMESHEET_BASE: Partial<ApiRequestConfig> = {
  enabled: true, autoSync: true, isAiConnection: false,
  isFormUrlEncoded: false, bodyFormat: 'json', parameters: {},
  mapping: { ...EMPTY_MAPPING },
};

const PROVIDERS: LibraryProvider[] = [
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    category: 'AI',
    tagline: 'Use Claude models for AI-powered features — win stories, retro analysis, jokes, and more.',
    logoColor: '#CC785C',
    logoText: 'A',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', hint: 'From console.anthropic.com/settings/api-keys' },
      { key: 'model', label: 'Model', type: 'text', hint: 'e.g. claude-sonnet-4-6, claude-haiku-4-5-20251001', default: 'claude-sonnet-4-6' },
    ],
    matchesConfig: c => c.url.includes('anthropic.com'),
    build: ({ apiKey, model }) => [{
      ...AI_BASE,
      name: 'Claude (Anthropic)',
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: { 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      secretHeaders: { 'x-api-key': apiKey },
      bodyTemplate: `{"model":"${model || 'claude-sonnet-4-6'}","max_tokens":1024,"system":"{systemPrompt}","messages":[{"role":"user","content":"{userMessage}"}]}`,
      mapping: { ...EMPTY_MAPPING, textResponsePath: 'content[0].text' },
    }],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'AI',
    tagline: 'Use GPT models as an AI provider for any AI-powered feature.',
    logoColor: '#10a37f',
    logoText: 'AI',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', hint: 'From platform.openai.com/api-keys' },
      { key: 'model', label: 'Model', type: 'text', hint: 'e.g. gpt-4o-mini, gpt-4o', default: 'gpt-4o-mini' },
    ],
    matchesConfig: c => c.url.includes('openai.com'),
    build: ({ apiKey, model }) => [{
      ...AI_BASE,
      name: 'OpenAI',
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      secretHeaders: { 'Authorization': `Bearer ${apiKey}` },
      bodyTemplate: `{"model":"${model || 'gpt-4o-mini'}","messages":[{"role":"system","content":"{systemPrompt}"},{"role":"user","content":"{userMessage}"}]}`,
      mapping: { ...EMPTY_MAPPING, textResponsePath: 'choices[0].message.content' },
    }],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'AI',
    tagline: 'Use Gemini models as an AI provider.',
    logoColor: '#4285F4',
    logoText: 'G',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', hint: 'From aistudio.google.com/apikey' },
      { key: 'model', label: 'Model', type: 'text', hint: 'e.g. gemini-2.0-flash, gemini-1.5-pro', default: 'gemini-2.0-flash' },
    ],
    matchesConfig: c => c.url.includes('generativelanguage.googleapis.com'),
    build: ({ apiKey, model }) => [{
      ...AI_BASE,
      name: 'Google Gemini',
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      secretHeaders: {},
      bodyTemplate: '{"system_instruction":{"parts":[{"text":"{systemPrompt}"}]},"contents":[{"parts":[{"text":"{userMessage}"}]}]}',
      mapping: { ...EMPTY_MAPPING, textResponsePath: 'candidates[0].content.parts[0].text' },
    }],
  },
  {
    id: 'groq',
    name: 'Groq',
    category: 'AI',
    tagline: 'Fast inference for open-source models via the Groq API.',
    logoColor: '#F55036',
    logoText: 'GQ',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', hint: 'From console.groq.com/keys' },
      { key: 'model', label: 'Model', type: 'text', hint: 'e.g. llama-3.3-70b-versatile, mixtral-8x7b-32768', default: 'llama-3.3-70b-versatile' },
    ],
    matchesConfig: c => c.url.includes('groq.com'),
    build: ({ apiKey, model }) => [{
      ...AI_BASE,
      name: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      secretHeaders: { 'Authorization': `Bearer ${apiKey}` },
      bodyTemplate: `{"model":"${model || 'llama-3.3-70b-versatile'}","messages":[{"role":"system","content":"{systemPrompt}"},{"role":"user","content":"{userMessage}"}]}`,
      mapping: { ...EMPTY_MAPPING, textResponsePath: 'choices[0].message.content' },
    }],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    category: 'AI',
    tagline: 'Run open-source models locally. No API key required.',
    logoColor: '#1a1a2e',
    logoText: 'OL',
    fields: [
      { key: 'baseUrl', label: 'Base URL', type: 'url', hint: 'Where your Ollama instance is running', default: 'http://localhost:11434' },
      { key: 'model', label: 'Model', type: 'text', hint: 'e.g. llama3.2, mistral, gemma3', default: 'llama3.2' },
    ],
    matchesConfig: c => c.action === 'AiConnection' && c.url.includes('/api/chat') && !c.url.includes('openai') && !c.url.includes('anthropic'),
    build: ({ baseUrl, model }) => [{
      ...AI_BASE,
      name: 'Ollama',
      url: `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/chat`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      secretHeaders: {},
      bodyTemplate: `{"model":"${model || 'llama3.2'}","stream":false,"messages":[{"role":"system","content":"{systemPrompt}"},{"role":"user","content":"{userMessage}"}]}`,
      mapping: { ...EMPTY_MAPPING, textResponsePath: 'message.content' },
    }],
  },
  {
    id: 'toggl',
    name: 'Toggl Track',
    category: 'Timesheet',
    tagline: 'Sync time entries with Toggl Track. Creates configs for adding, editing, deleting entries and fetching projects.',
    docsHint: 'Body templates use {hours} for duration — Toggl expects seconds, so you may want to adjust (e.g. multiply hours × 3600) after setup.',
    logoColor: '#e01b59',
    logoText: 'T',
    fields: [
      { key: 'apiKey', label: 'API Token', type: 'password', hint: 'From toggl.com → Profile → API Token' },
      { key: 'workspaceId', label: 'Workspace ID', type: 'text', hint: 'From toggl.com → Settings → Workspace ID' },
    ],
    matchesConfig: c => c.url.includes('toggl.com'),
    build: ({ apiKey, workspaceId }) => {
      const auth = 'Basic ' + btoa(`${apiKey}:api_token`);
      const base = `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}`;
      const h = { 'content-type': 'application/json' };
      const sh = { 'Authorization': auth };
      const ws = Number(workspaceId);
      return [
        {
          ...TIMESHEET_BASE, autoSync: false,
          name: 'Toggl Track — Get Projects',
          action: 'GetTimesheetProjects',
          url: `${base}/projects`,
          method: 'GET',
          headers: h, secretHeaders: sh, bodyTemplate: '',
          mapping: { ...EMPTY_MAPPING, responseFormat: 'json', projectsPath: '', projectNamePath: 'name', projectIdPath: 'id' },
        },
        {
          ...TIMESHEET_BASE,
          name: 'Toggl Track — Add Entry',
          action: 'AddTimesheetEntry',
          url: `${base}/time_entries`,
          method: 'POST',
          headers: h, secretHeaders: sh,
          bodyTemplate: `{"billable":{billable},"description":"{description}","duration":{hours},"project_id":{categoryId},"start":"{date}T08:00:00Z","tags":[],"workspace_id":${ws}}`,
        },
        {
          ...TIMESHEET_BASE,
          name: 'Toggl Track — Edit Entry',
          action: 'EditTimesheetEntry',
          url: `${base}/time_entries/{id}`,
          method: 'PUT',
          headers: h, secretHeaders: sh,
          bodyTemplate: `{"billable":{billable},"description":"{description}","duration":{hours},"project_id":{categoryId},"start":"{date}T08:00:00Z","tags":[],"workspace_id":${ws}}`,
        },
        {
          ...TIMESHEET_BASE,
          name: 'Toggl Track — Delete Entry',
          action: 'DeleteTimesheetEntry',
          url: `${base}/time_entries/{id}`,
          method: 'DELETE',
          headers: h, secretHeaders: {},
          bodyTemplate: '',
        },
      ];
    },
  },
  {
    id: 'harvest',
    name: 'Harvest',
    category: 'Timesheet',
    tagline: 'Sync time entries with Harvest. Creates configs for adding, editing, deleting entries and fetching projects.',
    logoColor: '#fa5d00',
    logoText: 'H',
    fields: [
      { key: 'apiKey', label: 'Access Token', type: 'password', hint: 'From id.getharvest.com/oauth2/access_tokens' },
      { key: 'accountId', label: 'Account ID', type: 'text', hint: 'From id.getharvest.com → your account → Account ID' },
    ],
    matchesConfig: c => c.url.includes('harvestapp.com'),
    build: ({ apiKey, accountId }) => {
      const h = { 'content-type': 'application/json', 'User-Agent': 'TeamManager' };
      const sh = { 'Authorization': `Bearer ${apiKey}`, 'Harvest-Account-Id': accountId };
      return [
        {
          ...TIMESHEET_BASE, autoSync: false,
          name: 'Harvest — Get Projects',
          action: 'GetTimesheetProjects',
          url: 'https://api.harvestapp.com/v2/projects?is_active=true',
          method: 'GET',
          headers: h, secretHeaders: sh, bodyTemplate: '',
          mapping: { ...EMPTY_MAPPING, responseFormat: 'json', projectsPath: 'projects', projectNamePath: 'name', projectIdPath: 'id' },
        },
        {
          ...TIMESHEET_BASE,
          name: 'Harvest — Add Entry',
          action: 'AddTimesheetEntry',
          url: 'https://api.harvestapp.com/v2/time_entries',
          method: 'POST',
          headers: h, secretHeaders: sh,
          bodyTemplate: '{"project_id":{categoryId},"task_id":0,"spent_date":"{date}","hours":{hours},"notes":"{description}"}',
        },
        {
          ...TIMESHEET_BASE,
          name: 'Harvest — Edit Entry',
          action: 'EditTimesheetEntry',
          url: 'https://api.harvestapp.com/v2/time_entries/{id}',
          method: 'PATCH',
          headers: h, secretHeaders: sh,
          bodyTemplate: '{"project_id":{categoryId},"task_id":0,"spent_date":"{date}","hours":{hours},"notes":"{description}"}',
        },
        {
          ...TIMESHEET_BASE,
          name: 'Harvest — Delete Entry',
          action: 'DeleteTimesheetEntry',
          url: 'https://api.harvestapp.com/v2/time_entries/{id}',
          method: 'DELETE',
          headers: h, secretHeaders: {},
          bodyTemplate: '',
        },
      ];
    },
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Notifications',
    tagline: 'Send messages to a Slack channel via an Incoming Webhook.',
    logoColor: '#4A154B',
    logoText: 'SL',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', hint: 'From api.slack.com → Your App → Incoming Webhooks' },
    ],
    matchesConfig: c => c.url.includes('hooks.slack.com') || c.name === 'Slack Webhook',
    build: ({ webhookUrl }) => [{
      name: 'Slack Webhook',
      action: 'AiChatWinStory',
      enabled: true, autoSync: true, isAiConnection: false,
      isFormUrlEncoded: false, bodyFormat: 'json', parameters: {},
      mapping: { ...EMPTY_MAPPING },
      url: webhookUrl,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      secretHeaders: {},
      bodyTemplate: '{"text":"{userMessage}"}',
    }],
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'Notifications',
    tagline: 'Send messages to a Teams channel via an Incoming Webhook.',
    logoColor: '#6264A7',
    logoText: 'MT',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', hint: 'From Teams channel → Connectors → Incoming Webhook' },
    ],
    matchesConfig: c => c.url.includes('webhook.office.com') || c.url.includes('teams.microsoft.com') || c.name === 'Microsoft Teams Webhook',
    build: ({ webhookUrl }) => [{
      name: 'Microsoft Teams Webhook',
      action: 'AiChatWinStory',
      enabled: true, autoSync: true, isAiConnection: false,
      isFormUrlEncoded: false, bodyFormat: 'json', parameters: {},
      mapping: { ...EMPTY_MAPPING },
      url: webhookUrl,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      secretHeaders: {},
      bodyTemplate: '{"text":"{userMessage}"}',
    }],
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'Notifications',
    tagline: 'Send messages to a Discord channel via a Webhook.',
    logoColor: '#5865F2',
    logoText: 'DC',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', hint: 'From Discord channel settings → Integrations → Webhooks' },
    ],
    matchesConfig: c => c.url.includes('discord.com/api/webhooks') || c.name === 'Discord Webhook',
    build: ({ webhookUrl }) => [{
      name: 'Discord Webhook',
      action: 'AiChatWinStory',
      enabled: true, autoSync: true, isAiConnection: false,
      isFormUrlEncoded: false, bodyFormat: 'json', parameters: {},
      mapping: { ...EMPTY_MAPPING },
      url: webhookUrl,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      secretHeaders: {},
      bodyTemplate: '{"content":"{userMessage}"}',
    }],
  },
  {
    id: 'n8n',
    name: 'n8n',
    category: 'Notifications',
    tagline: 'Trigger n8n workflows via a Webhook node for custom automations.',
    logoColor: '#EA4B71',
    logoText: 'n8',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', hint: 'From your n8n Webhook node trigger URL' },
    ],
    matchesConfig: c => c.url.includes('/webhook/') && (c.url.includes('n8n') || c.name.startsWith('n8n')) || c.name === 'n8n Webhook',
    build: ({ webhookUrl }) => [{
      name: 'n8n Webhook',
      action: 'AiChatWinStory',
      enabled: true, autoSync: true, isAiConnection: false,
      isFormUrlEncoded: false, bodyFormat: 'json', parameters: {},
      mapping: { ...EMPTY_MAPPING },
      url: webhookUrl,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      secretHeaders: {},
      bodyTemplate: '{"message":"{userMessage}","source":"{sourceType}","id":"{sourceId}"}',
    }],
  },
];

const CATEGORIES = [
  { id: 'AI', label: 'AI Providers', icon: 'auto_awesome' },
  { id: 'Timesheet', label: 'Timesheet', icon: 'schedule' },
  { id: 'Notifications', label: 'Notifications & Automation', icon: 'notifications' },
];

@Component({
  selector: 'app-integration-library',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="lib-page">

      <div class="page-header">
        <mat-icon class="header-icon">extension</mat-icon>
        <div>
          <h1>Integration Library</h1>
          <span class="subtitle">Pre-configured templates — add credentials and start syncing</span>
        </div>
      </div>

      @if (loading()) {
        <div class="loading">
          <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
        </div>
      } @else {
        @for (cat of categories; track cat.id) {
          <section class="category-section">
            <div class="cat-header">
              <mat-icon class="cat-icon">{{ cat.icon }}</mat-icon>
              <span>{{ cat.label }}</span>
            </div>
            <div class="providers-grid">
              @for (p of providersByCategory(cat.id); track p.id) {
                @let status = providerStatuses()[p.id];
                <div class="provider-card" [class.provider-card--configured]="status.isConfigured">

                  <div class="card-top">
                    <div class="card-logo" [style.background]="p.logoColor">{{ p.logoText }}</div>
                    <div class="card-info">
                      <div class="card-name">{{ p.name }}</div>
                      <div class="card-tagline">{{ p.tagline }}</div>
                    </div>
                    @if (status.isConfigured) {
                      <span class="status-badge status-badge--on">
                        <span class="dot dot--on"></span>
                        {{ status.count }} config{{ status.count !== 1 ? 's' : '' }}
                      </span>
                    } @else {
                      <span class="status-badge status-badge--off">
                        <span class="dot"></span>
                        Not set up
                      </span>
                    }
                  </div>

                  @if (p.docsHint) {
                    <div class="docs-hint">
                      <mat-icon class="hint-icon">info_outline</mat-icon>
                      <span>{{ p.docsHint }}</span>
                    </div>
                  }

                  @if (activeProvider() === p.id) {
                    <div class="config-form">
                      @if (status.isConfigured) {
                        <p class="reconfigure-note">Enter new credentials to update all {{ status.count }} existing config{{ status.count !== 1 ? 's' : '' }}.</p>
                      }
                      @for (field of p.fields; track field.key) {
                        <div class="field-group">
                          <label class="field-label">{{ field.label }}</label>
                          <div class="field-input-wrap">
                            <input
                              class="field-input"
                              [type]="field.type === 'password' ? (showField()[field.key] ? 'text' : 'password') : field.type"
                              [(ngModel)]="fieldValues[field.key]"
                              [name]="field.key"
                              [placeholder]="field.default ?? ''"
                            />
                            @if (field.type === 'password') {
                              <button type="button" class="eye-btn" (click)="toggleShow(field.key)">
                                <mat-icon>{{ showField()[field.key] ? 'visibility_off' : 'visibility' }}</mat-icon>
                              </button>
                            }
                          </div>
                          @if (field.hint) {
                            <span class="field-hint">{{ field.hint }}</span>
                          }
                        </div>
                      }
                      <div class="form-actions">
                        <button class="cancel-btn" (click)="closeForm()">Cancel</button>
                        @if (p.category === 'Notifications') {
                          <button class="test-btn" (click)="sendTest(p)" [disabled]="saving() || testing()">
                            @if (testing()) { Testing… } @else { Send test }
                          </button>
                        }
                        <button class="save-btn" (click)="configure(p)" [disabled]="saving() || testing()">
                          @if (saving()) { Saving… } @else { Save }
                        </button>
                      </div>
                    </div>
                  } @else {
                    <button class="configure-btn" (click)="openForm(p)">
                      <mat-icon>{{ status.isConfigured ? 'edit' : 'add' }}</mat-icon>
                      {{ status.isConfigured ? 'Reconfigure' : 'Configure' }}
                    </button>
                  }

                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .lib-page { max-width: 900px; margin: 0 auto; padding: 8px 8px 80px; }

    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    h1 { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .subtitle { font-size: 0.8rem; color: rgba(255,255,255,0.4); }

    .loading { display: flex; justify-content: center; gap: 6px; padding: 64px; }
    .loading-dot { width: 8px; height: 8px; background: rgba(100,181,246,0.5); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    .loading-dot:nth-child(2) { animation-delay: 0.2s; }
    .loading-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,80%,100% { opacity:0.3; transform:scale(0.8); } 40% { opacity:1; transform:scale(1); } }

    .category-section { margin-bottom: 32px; }
    .cat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.6px; }
    .cat-icon { font-size: 16px; width: 16px; height: 16px; }

    .providers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px; }

    .provider-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .provider-card--configured { border-color: rgba(100,181,246,0.25); background: rgba(100,181,246,0.03); }

    .card-top { display: flex; align-items: flex-start; gap: 12px; }
    .card-logo { width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 0.82rem; flex-shrink: 0; letter-spacing: -0.5px; }
    .card-info { flex: 1; min-width: 0; }
    .card-name { font-size: 0.92rem; font-weight: 700; color: rgba(255,255,255,0.88); margin-bottom: 3px; }
    .card-tagline { font-size: 0.75rem; color: rgba(255,255,255,0.38); line-height: 1.5; }

    .status-badge { display: flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
    .status-badge--on { background: rgba(100,181,246,0.15); color: #64b5f6; }
    .status-badge--off { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2); flex-shrink: 0; }
    .dot--on { background: #64b5f6; box-shadow: 0 0 4px rgba(100,181,246,0.5); }

    .docs-hint { display: flex; align-items: flex-start; gap: 7px; padding: 8px 10px; background: rgba(255,193,7,0.06); border: 1px solid rgba(255,193,7,0.18); border-radius: 6px; font-size: 0.74rem; color: rgba(255,255,255,0.45); line-height: 1.5; }
    .hint-icon { font-size: 14px; width: 14px; height: 14px; color: rgba(255,193,7,0.6); flex-shrink: 0; margin-top: 1px; }

    .configure-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; background: rgba(100,181,246,0.1); border: 1px solid rgba(100,181,246,0.3); border-radius: 6px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; align-self: flex-start; }
    .configure-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .configure-btn:hover { background: rgba(100,181,246,0.2); border-color: #64b5f6; }

    .config-form { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.06); }
    .reconfigure-note { margin: 0; font-size: 0.76rem; color: rgba(255,255,255,0.35); }
    .field-group { display: flex; flex-direction: column; gap: 4px; }
    .field-label { font-size: 0.76rem; font-weight: 600; color: rgba(255,255,255,0.55); }
    .field-input-wrap { position: relative; display: flex; align-items: center; }
    .field-input { width: 100%; padding: 7px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.85); font-size: 0.83rem; font-family: inherit; outline: none; transition: border-color 0.12s; box-sizing: border-box; }
    .field-input:focus { border-color: rgba(100,181,246,0.45); }
    .field-input::placeholder { color: rgba(255,255,255,0.2); }
    .eye-btn { position: absolute; right: 6px; background: none; border: none; padding: 2px; cursor: pointer; color: rgba(255,255,255,0.35); display: flex; align-items: center; transition: color 0.12s; }
    .eye-btn:hover { color: rgba(255,255,255,0.6); }
    .eye-btn mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .field-hint { font-size: 0.7rem; color: rgba(255,255,255,0.28); }

    .form-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 2px; }
    .cancel-btn { padding: 6px 14px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.45); font-size: 0.82rem; font-family: inherit; cursor: pointer; transition: all 0.12s; }
    .cancel-btn:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.65); }
    .test-btn { padding: 6px 14px; background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: rgba(255,255,255,0.55); font-size: 0.82rem; font-family: inherit; cursor: pointer; transition: all 0.12s; }
    .test-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.75); }
    .test-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .save-btn { padding: 6px 18px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.4); border-radius: 6px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.12s; }
    .save-btn:hover:not(:disabled) { background: rgba(100,181,246,0.28); border-color: #64b5f6; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class IntegrationLibraryComponent implements OnInit {
  private svc = inject(ApiRequestConfigsService);
  private snackBar = inject(MatSnackBar);

  categories = CATEGORIES;
  loading = signal(true);
  saving = signal(false);
  testing = signal(false);
  existingConfigs = signal<ApiRequestConfig[]>([]);
  activeProvider = signal<string | null>(null);
  showField = signal<Record<string, boolean>>({});
  fieldValues: Record<string, string> = {};

  providerStatuses = computed(() => {
    const configs = this.existingConfigs();
    const result: Record<string, { isConfigured: boolean; count: number; configs: ApiRequestConfig[] }> = {};
    for (const p of PROVIDERS) {
      const matching = configs.filter(c => p.matchesConfig(c));
      result[p.id] = { isConfigured: matching.length > 0, count: matching.length, configs: matching };
    }
    return result;
  });

  ngOnInit() { this.loadConfigs(); }

  loadConfigs() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: configs => { this.existingConfigs.set(configs); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load configs', 'Close', { duration: 3000 }); },
    });
  }

  providersByCategory(cat: string): LibraryProvider[] {
    return PROVIDERS.filter(p => p.category === cat);
  }

  openForm(p: LibraryProvider) {
    this.fieldValues = {};
    for (const f of p.fields) {
      this.fieldValues[f.key] = f.default ?? '';
    }
    this.showField.set({});
    this.activeProvider.set(p.id);
  }

  closeForm() { this.activeProvider.set(null); }

  toggleShow(key: string) {
    this.showField.update(s => ({ ...s, [key]: !s[key] }));
  }

  sendTest(p: LibraryProvider) {
    for (const f of p.fields) {
      if (!this.fieldValues[f.key]?.trim() && !f.default) {
        this.snackBar.open(`${f.label} is required`, 'Close', { duration: 3000 });
        return;
      }
    }
    const vals = { ...this.fieldValues };
    for (const f of p.fields) {
      if (!vals[f.key]?.trim() && f.default) vals[f.key] = f.default;
    }
    let builtConfigs: Partial<ApiRequestConfig>[];
    try { builtConfigs = p.build(vals); } catch {
      this.snackBar.open('Failed to build config — check credentials', 'Close', { duration: 4000 });
      return;
    }
    if (!builtConfigs.length) return;
    const cfg = { ...builtConfigs[0] } as ApiRequestConfig;
    this.testing.set(true);
    this.svc.testRequest(cfg, { userMessage: 'Test from Team Manager — your webhook is connected!' }).subscribe({
      next: result => {
        this.testing.set(false);
        if (result.success) {
          this.snackBar.open('Test sent successfully!', 'Close', { duration: 4000 });
        } else {
          this.snackBar.open(`Test failed (${result.statusCode}) — check the webhook URL`, 'Close', { duration: 5000 });
        }
      },
      error: () => { this.testing.set(false); this.snackBar.open('Test request failed', 'Close', { duration: 4000 }); },
    });
  }

  configure(p: LibraryProvider) {
    for (const f of p.fields) {
      const val = this.fieldValues[f.key];
      if (!val?.trim() && !f.default) {
        this.snackBar.open(`${f.label} is required`, 'Close', { duration: 3000 });
        return;
      }
    }

    const vals = { ...this.fieldValues };
    for (const f of p.fields) {
      if (!vals[f.key]?.trim() && f.default) vals[f.key] = f.default;
    }

    let builtConfigs: Partial<ApiRequestConfig>[];
    try {
      builtConfigs = p.build(vals);
    } catch {
      this.snackBar.open('Failed to build config — check credentials', 'Close', { duration: 4000 });
      return;
    }

    const existingForProvider = this.providerStatuses()[p.id].configs;
    this.saving.set(true);

    const ops = builtConfigs.map(cfg => {
      const existing = existingForProvider.find(e => e.name === cfg.name);
      const full = { ...existing, ...cfg } as ApiRequestConfig;
      return existing?.id
        ? this.svc.update(existing.id, full)
        : this.svc.create(full);
    });

    forkJoin(ops).subscribe({
      next: () => {
        const count = builtConfigs.length;
        this.snackBar.open(`${p.name} configured — ${count} config${count !== 1 ? 's' : ''} saved`, 'Close', { duration: 4000 });
        this.saving.set(false);
        this.activeProvider.set(null);
        this.loadConfigs();
      },
      error: () => {
        this.snackBar.open('Failed to save — check your credentials and try again', 'Close', { duration: 4000 });
        this.saving.set(false);
      },
    });
  }
}
