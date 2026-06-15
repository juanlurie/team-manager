import { Component, inject, signal, effect, untracked, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ApiRequestConfigsService,
  ApiRequestConfig,
  MappingConfig,
  REQUEST_ACTIONS,
  TestRequestResult
} from './api-request-configs.service';
import { CredentialsService } from '../../core/services/credentials.service';
import { ConfigVariablesService } from '../settings/config-variables/config-variables.service';
import { MobileService } from '../../core/services/mobile.service';

interface CodeSegment { text: string; kind: 'plain' | 'resolved' | 'missing'; }

@Component({
  selector: 'app-api-request-config-edit',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatSnackBarModule, MatTooltipModule
  ],
  template: `
    <div class="edit-page">

      <!-- Page header -->
      <div class="page-header">
        <button class="back-btn" (click)="cancel()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-title">
          <mat-icon class="header-icon">api</mat-icon>
          <div>
            <h1>{{ isNew ? 'New API Action' : 'Edit API Action' }}</h1>
            @if (!isNew && data) {
              <span class="subtitle">{{ data.name }}</span>
            }
          </div>
        </div>
        @if (data) {
          <div class="header-toggles">
            <label class="toggle-pill" [class.on]="data.enabled">
              <input type="checkbox" [checked]="data.enabled" (change)="data.enabled = $any($event.target).checked">
              <span class="toggle-pill-dot"></span>
              <span class="toggle-pill-label">Enabled</span>
            </label>
            <label class="toggle-pill" [class.on]="data.autoSync" matTooltip="Fires immediately on enqueue">
              <input type="checkbox" [checked]="data.autoSync" (change)="data.autoSync = $any($event.target).checked">
              <span class="toggle-pill-dot"></span>
              <mat-icon class="toggle-pill-icon">bolt</mat-icon>
              <span class="toggle-pill-label">Auto Sync</span>
            </label>
          </div>
        }
      </div>

      @if (pageLoading()) {
        <div class="loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>
      } @else if (data) {

      <!-- cURL Import Banner -->
      @if (!showCurlImport()) {
        <button class="curl-import-btn" (click)="showCurlImport.set(true)">
          <div class="curl-import-icon-wrap"><mat-icon>terminal</mat-icon></div>
          <div class="curl-import-text">
            <span class="curl-import-label">Import from cURL</span>
            <span class="curl-import-sub">Paste a curl command to auto-fill URL, headers and body</span>
          </div>
          <mat-icon class="curl-import-arrow">chevron_right</mat-icon>
        </button>
      } @else {
        <div class="curl-import-expanded">
          <div class="curl-import-expanded-header">
            <div style="display:flex;align-items:center;gap:8px">
              <mat-icon style="color:#64b5f6;font-size:18px;width:18px;height:18px">terminal</mat-icon>
              <span style="font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.8)">Import from cURL</span>
            </div>
            <button mat-icon-button class="close-btn" (click)="showCurlImport.set(false)"><mat-icon>close</mat-icon></button>
          </div>
          <textarea class="curl-textarea" [(ngModel)]="curlInput" rows="5"
                    placeholder="curl -X POST 'https://...' -H 'Authorization: Bearer ...' -d 'key=value'"></textarea>
          <div class="curl-import-footer">
            @if (curlParseError()) {
              <span class="curl-error"><mat-icon class="err-icon">error_outline</mat-icon>{{ curlParseError() }}</span>
            } @else {
              <span></span>
            }
            <button class="parse-btn" (click)="parseCurl()" [disabled]="!curlInput.trim()">
              <mat-icon>auto_fix_high</mat-icon> Parse &amp; Fill
            </button>
          </div>
        </div>
      }

      <!-- Master-detail shell -->
      <div class="form-shell" [class.md]="isDesktop">
        @if (isDesktop) {
          <nav class="md-rail">
            @for (s of sectionList; track s.key) {
              @if (s.key === 'code') { <div class="rail-divider"></div> }
              <button type="button" class="md-rail-item" [class.active]="activeSection() === s.key" (click)="activeSection.set(s.key)">
                <span class="md-rail-title">{{ s.title }}</span>
                <span class="md-rail-sum">{{ sectionSummary(s.key) }}</span>
              </button>
            }
          </nav>
        }

        <div class="form-grid">
          <!-- Basic Info -->
          <div class="form-section" [class.open]="showBody('basic')">
            <button type="button" class="section-toggle" (click)="toggleSection('basic')">
              <mat-icon class="sec-chevron">{{ isOpen('basic') ? 'expand_more' : 'chevron_right' }}</mat-icon>
              <span class="sec-title">Basic</span>
              @if (!isOpen('basic')) { <span class="sec-summary">{{ data.name || 'unnamed' }}</span> }
            </button>
            @if (showBody('basic')) {
            <div class="section-body">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Action</mat-label>
              <mat-select [(ngModel)]="data.action">
                @for (action of actions; track action.value) {
                  <mat-option [value]="action.value">
                    <mat-icon class="action-option-icon">{{ action.icon }}</mat-icon>
                    {{ action.label }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="two-col">
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="data.name" placeholder="e.g. Primary">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Description</mat-label>
                <input matInput [(ngModel)]="data.description" placeholder="Optional">
              </mat-form-field>
            </div>


            </div>
            }
          </div>

          <!-- Request -->
          <div class="form-section" [class.open]="showBody('request')">
            <button type="button" class="section-toggle" (click)="toggleSection('request')">
              <mat-icon class="sec-chevron">{{ isOpen('request') ? 'expand_more' : 'chevron_right' }}</mat-icon>
              <span class="sec-title">Request</span>
              @if (!isOpen('request')) { <span class="sec-summary">{{ sectionSummary('request') }}</span> }
            </button>
            @if (showBody('request')) {
            <div class="section-body">
            <div class="tpl-field full-width">
              <div class="tpl-editor">
                <div class="tpl-backdrop" aria-hidden="true">@for (seg of urlSegs(); track $index) {<span [class.body-resolved]="seg.kind === 'resolved'" [class.code-missing]="seg.kind === 'missing'">{{ seg.text }}</span>}&nbsp;</div>
                <input class="tpl-input" [(ngModel)]="data.url" (ngModelChange)="updateUrlSegs()" (scroll)="syncInputScroll($event)" placeholder="https://example.com/api">
              </div>
            </div>

            <div class="body-footer-row" style="margin-bottom:12px">
              <div class="body-chips">
                @for (k of configVarKeys; track k) {
                  <span class="config-var-chip" (click)="insertConfigVar(k)" matTooltip="Click to copy">{{ '{' + k + '}' }}</span>
                }
                @for (v of bodyVarChips; track v) {
                  <span class="config-var-chip" (click)="insertConfigVar(v)" matTooltip="Click to copy">{{ '{' + v + '}' }}</span>
                }
              </div>
              <div class="body-legend">
                <span class="legend-item"><span class="legend-dot legend-resolved"></span>Resolved</span>
                <span class="legend-item"><span class="legend-dot legend-missing"></span>Not found</span>
              </div>
            </div>

            <div class="two-col">
              <mat-form-field appearance="outline">
                <mat-label>HTTP Method</mat-label>
                <mat-select [(ngModel)]="data.method">
                  <mat-option value="GET">GET</mat-option>
                  <mat-option value="POST">POST</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Body Format</mat-label>
                <mat-select [(ngModel)]="data.bodyFormat">
                  <mat-option value="raw">Raw</mat-option>
                  <mat-option value="urlencoded">URL Encoded</mat-option>
                  <mat-option value="json">JSON</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            </div>
            }
          </div>

          <!-- Headers -->
          <div class="form-section" [class.open]="showBody('headers')">
            <button type="button" class="section-toggle" (click)="toggleSection('headers')">
              <mat-icon class="sec-chevron">{{ isOpen('headers') ? 'expand_more' : 'chevron_right' }}</mat-icon>
              <span class="sec-title">Headers</span>
              <span class="sec-summary">{{ sectionSummary('headers') }}</span>
            </button>
            @if (showBody('headers')) {
            <div class="section-body">
            <div class="section-add-row">
              <button mat-icon-button color="primary" (click)="addHeader()" matTooltip="Add header" class="add-row-btn">
                <mat-icon>add</mat-icon>
              </button>
            </div>
            @for (entry of headerEntries(); track entry.key) {
              <div class="header-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Key</mat-label>
                  <input matInput [(ngModel)]="entry.key" placeholder="Authorization">
                </mat-form-field>
                @if (entry.secret && !entry.editing) {
                  <div class="secret-value-row half-width">
                    <span class="secret-placeholder">••••••••</span>
                    <button mat-button class="change-secret-btn" (click)="editSecretHeader(entry)">Change</button>
                  </div>
                } @else if (entry.secret && entry.editing) {
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>Value</mat-label>
                    <input matInput [(ngModel)]="entry.value" placeholder="Enter new value">
                    <button matSuffix mat-icon-button (click)="cancelEditSecretHeader(entry)" matTooltip="Cancel">
                      <mat-icon>close</mat-icon>
                    </button>
                  </mat-form-field>
                } @else {
                  <div class="tpl-editor half-width">
                    <div class="tpl-backdrop" aria-hidden="true">@for (seg of getSegs(entry.value); track $index) {<span [class.body-resolved]="seg.kind === 'resolved'" [class.code-missing]="seg.kind === 'missing'">{{ seg.text }}</span>}&nbsp;</div>
                    <input class="tpl-input" [(ngModel)]="entry.value" (scroll)="syncInputScroll($event)" placeholder="{cookie}">
                  </div>
                }
                <button mat-icon-button [color]="entry.secret ? 'accent' : ''" (click)="toggleHeaderSecret(entry)"
                        [matTooltip]="entry.secret ? 'Stored securely — click to make regular' : 'Click to store value securely'"
                        class="lock-btn">
                  <mat-icon>{{ entry.secret ? 'lock' : 'lock_open' }}</mat-icon>
                </button>
                <button mat-icon-button class="remove-btn" (click)="removeHeader(entry.key)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
            @if (headerEntries().length === 0) {
              <div class="empty-rows-hint">No headers — click + to add</div>
            }
            <div class="body-legend" style="margin-top:4px">
              <span class="legend-item"><span class="legend-dot legend-resolved"></span>Resolved</span>
              <span class="legend-item"><span class="legend-dot legend-missing"></span>Not found</span>
            </div>
            </div>
            }
          </div>

          <!-- Parameters -->
          <div class="form-section" [class.open]="showBody('parameters')">
            <button type="button" class="section-toggle" (click)="toggleSection('parameters')">
              <mat-icon class="sec-chevron">{{ isOpen('parameters') ? 'expand_more' : 'chevron_right' }}</mat-icon>
              <span class="sec-title">Parameters</span>
              <span class="sec-summary">{{ sectionSummary('parameters') }}</span>
            </button>
            @if (showBody('parameters')) {
            <div class="section-body">
            <div class="section-add-row">
              <button mat-icon-button color="primary" (click)="addParameter()" matTooltip="Add parameter" class="add-row-btn">
                <mat-icon>add</mat-icon>
              </button>
            </div>
            @for (entry of parameterEntries(); track entry.key) {
              <div class="header-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Name</mat-label>
                  <input matInput [(ngModel)]="entry.key" placeholder="employeeId">
                </mat-form-field>
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Value</mat-label>
                  <input matInput [(ngModel)]="entry.value" placeholder="2588">
                </mat-form-field>
                <button mat-icon-button class="remove-btn" (click)="removeParameter(entry.key)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
            @if (parameterEntries().length === 0) {
              <div class="empty-rows-hint">No parameters — click + to add</div>
            }
            </div>
            }
          </div>

          <!-- Body -->
          <div class="form-section" [class.open]="showBody('body')">
            <button type="button" class="section-toggle" (click)="toggleSection('body')">
              <mat-icon class="sec-chevron">{{ isOpen('body') ? 'expand_more' : 'chevron_right' }}</mat-icon>
              <span class="sec-title">Body Template</span>
              <span class="sec-summary">{{ sectionSummary('body') }}</span>
            </button>
            @if (showBody('body')) {
            <div class="section-body">
            <div class="body-field">
              <div class="body-editor">
                <div class="body-backdrop" aria-hidden="true">@for (seg of bodySegs(); track $index) {<span [class.body-resolved]="seg.kind === 'resolved'" [class.code-missing]="seg.kind === 'missing'">{{ seg.text }}</span>}&nbsp;</div>
                <textarea class="body-textarea" [(ngModel)]="data.bodyTemplate" (ngModelChange)="updateBodySegs()" (scroll)="syncBodyScroll($event)" rows="4" placeholder="teamId=&#123;teamIds&#125;&amp;start=&#123;start&#125;"></textarea>
              </div>
              <div class="body-footer-row">
                <div class="body-chips">
                  @for (v of bodyVarChips; track v) {
                    <span class="config-var-chip" (click)="insertConfigVar(v)" matTooltip="Click to copy">{{ '{' + v + '}' }}</span>
                  }
                </div>
                <div class="body-legend">
                  <span class="legend-item"><span class="legend-dot legend-resolved"></span>Resolved</span>
                  <span class="legend-item"><span class="legend-dot legend-missing"></span>Not found</span>
                </div>
              </div>
            </div>
            </div>
            }
          </div>

          <!-- Success & Retry -->
          <div class="form-section" [class.open]="showBody('success')">
            <button type="button" class="section-toggle" (click)="toggleSection('success')">
              <mat-icon class="sec-chevron">{{ isOpen('success') ? 'expand_more' : 'chevron_right' }}</mat-icon>
              <span class="sec-title">Success &amp; Retry</span>
              <span class="sec-summary">{{ sectionSummary('success') }}</span>
            </button>
            @if (showBody('success')) {
            <div class="section-body">
            <div class="two-col">
              <mat-form-field appearance="outline">
                <mat-label>Required Status</mat-label>
                <input matInput type="number" placeholder="200"
                  [ngModel]="data.successCriteria?.requiredStatus ?? null"
                  (ngModelChange)="setCriteriaStatus($event)">
                <mat-hint>e.g. 200</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Retries on failure</mat-label>
                <input matInput type="number" min="0" max="5" placeholder="0"
                  [ngModel]="data.retryCount ?? 0"
                  (ngModelChange)="data.retryCount = +$event">
              </mat-form-field>
            </div>
            <div class="two-col">
              <mat-form-field appearance="outline">
                <mat-label>Success JSON Path</mat-label>
                <input matInput placeholder="data.result"
                  [ngModel]="data.successCriteria?.jsonPath ?? ''"
                  (ngModelChange)="setCriteriaPath($event)">
                <mat-hint>Leave empty to check status only</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Expected Value</mat-label>
                <input matInput placeholder="true"
                  [ngModel]="data.successCriteria?.jsonValue ?? ''"
                  (ngModelChange)="setCriteriaValue($event)">
                <mat-hint>Blank = path just needs to exist</mat-hint>
              </mat-form-field>
            </div>
            </div>
            }
          </div>

          <!-- Response Mapping -->
          @if (hasMapping()) {
          <div class="form-section" [class.open]="showBody('mapping')">
            <button type="button" class="section-toggle" (click)="toggleSection('mapping')">
              <mat-icon class="sec-chevron">{{ isOpen('mapping') ? 'expand_more' : 'chevron_right' }}</mat-icon>
              <span class="sec-title">Response Mapping</span>
              <span class="sec-summary">{{ sectionSummary('mapping') }}</span>
            </button>
            @if (showBody('mapping')) {
            <div class="section-body">
          @if (data.action === 'AddTimesheetEntry') {
            <div class="map-block">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Response ID Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.externalIdPath" placeholder="entryId">
                <mat-hint>Path to the external ID in the response — saved back to the timesheet entry</mat-hint>
              </mat-form-field>
            </div>
          }

          @if (data.action === 'GetTimesheetProjects') {
            <div class="map-block">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Projects Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.projectsPath" placeholder="data.projects">
                <mat-hint>Path to the projects array — leave empty if the root is the array</mat-hint>
              </mat-form-field>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Project Name Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectNamePath" placeholder="name">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Project ID Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectIdPath" placeholder="id">
                  <mat-hint>Saved as correlation ID</mat-hint>
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Categories Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectCategoriesPath" placeholder="categories">
                  <mat-hint>Within each project object</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Category Name Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.categoryNamePath" placeholder="name">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Category ID Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.categoryIdPath" placeholder="id">
                  <mat-hint>Saved as correlation ID</mat-hint>
                </mat-form-field>
              </div>
            </div>
          }

          @if (data.action === 'FetchLeave') {
            <div class="map-block">
              <div class="map-sublabel-row">
                <button mat-button color="primary" (click)="showPathPicker.set(!showPathPicker())" style="font-size:0.78rem">
                  <mat-icon style="font-size:15px;width:15px;height:15px">search</mat-icon> Path Picker
                </button>
              </div>

              @if (showPathPicker()) {
                <div class="path-picker">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Paste sample JSON response</mat-label>
                    <textarea matInput [(ngModel)]="sampleJson" rows="6"
                              placeholder='[{"title":"Leave","start":"2026-01-01"}]'></textarea>
                  </mat-form-field>
                  <div class="path-picker-actions">
                    <button mat-button (click)="discoverPaths()" [disabled]="!sampleJson().trim() || discoveringPaths()">
                      {{ discoveringPaths() ? 'Discovering...' : 'Discover Paths' }}
                    </button>
                  </div>
                  @if (availablePaths().length > 0) {
                    <div class="path-picker-results">
                      <div class="path-picker-info">
                        <span class="path-count">{{ availablePaths().length }} paths found</span>
                        @if (arrayLength() > 0) {
                          <span class="array-info">{{ arrayLength() }} items in array</span>
                        }
                      </div>
                      <div class="path-list">
                        @for (path of availablePaths(); track path) {
                          <button class="path-chip" (click)="copyPath(path)" matTooltip="Click to copy">{{ path }}</button>
                        }
                      </div>
                    </div>
                  }
                  @if (hasTestResults) {
                    <div class="test-results">
                      <h4>Test Results</h4>
                      @for (entry of testResults() | keyvalue; track entry.key) {
                        @if (entry.value !== null) {
                          <div class="test-result-row">
                            <span class="test-label">{{ entry.key }}</span>
                            <span class="test-value">{{ entry.value }}</span>
                          </div>
                        }
                      }
                    </div>
                  }
                </div>
              }

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Array Path (optional)</mat-label>
                <input matInput [(ngModel)]="data.mapping.arrayPath" placeholder="e.g. data.items or results[0].leaves">
                <mat-hint>Leave empty if response is a top-level array</mat-hint>
              </mat-form-field>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Name Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.namePath" placeholder="title">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Type Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.typePath" placeholder="type">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Start Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.startPath" placeholder="start">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>End Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.endPath" placeholder="end">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Days Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.daysPath" placeholder="totalDays">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Status Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.statusPath" placeholder="status">
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline">
                <mat-label>Name Transform</mat-label>
                <mat-select [(ngModel)]="data.mapping.nameTransform">
                  <mat-option value="ExtractBeforeDash">Extract Before Dash</mat-option>
                  <mat-option value="None">None</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          }

          @if (data.action === 'AiChatWinStory' || data.action === 'GenerateJoke') {
            <div class="map-block">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Text Response Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.textResponsePath"
                       placeholder="choices[0].message.content">
                <mat-hint>Dot-separated path to the text string in the response</mat-hint>
              </mat-form-field>
            </div>
          }

          @if (data.action === 'FetchCalendarEvents') {
            <div class="map-block">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Array Path (optional)</mat-label>
                <input matInput [(ngModel)]="data.mapping.arrayPath" placeholder="e.g. data.items">
                <mat-hint>Leave empty if response root is the array. Use &#123;start&#125; and &#123;end&#125; in the URL/body for date range.</mat-hint>
              </mat-form-field>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Subject Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.subjectPath" placeholder="subject">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Is All Day Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.isAllDayPath" placeholder="isAllDay">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Start Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.startPath" placeholder="start">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>End Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.endPath" placeholder="end">
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Location Path (optional)</mat-label>
                <input matInput [(ngModel)]="data.mapping.locationPath" placeholder="location">
              </mat-form-field>
            </div>
          }
            </div>
            }
          </div>
          }
          <!-- Code & Test -->
          <div class="form-section" [class.open]="showBody('code')">
            <button type="button" class="section-toggle" (click)="toggleSection('code')">
              <mat-icon class="sec-chevron">{{ isOpen('code') ? 'expand_more' : 'chevron_right' }}</mat-icon>
              <span class="sec-title">Code</span>
            </button>
            @if (showBody('code')) {
            <div class="section-body">
              <div class="code-toolbar">
                <div class="code-tabs">
                  <button class="code-tab" [class.active]="codeFormat() === 'curl'" (click)="setCodeFormat('curl')">cURL</button>
                  <button class="code-tab" [class.active]="codeFormat() === 'http'" (click)="setCodeFormat('http')">HTTP</button>
                </div>
                @if (currentCode) {
                  <button class="code-action-btn" (click)="copyCode()" matTooltip="Copy">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                }
              </div>
              @if (!data.url.trim()) {
                <div class="code-empty">Set a URL in the Request section to generate code.</div>
              } @else {
                <pre class="code-output">@for (seg of currentCodeSegments; track $index) {<span [class.code-resolved]="seg.kind === 'resolved'" [class.code-missing]="seg.kind === 'missing'">{{ seg.text }}</span>}</pre>
              }

              @if (unresolvedVars().length > 0) {
                <div class="test-vars-panel">
                  <div class="test-vars-header">Variables <span class="test-vars-hint">— substituted into the code and request above</span></div>
                  <div class="test-vars-grid">
                    @for (v of unresolvedVars(); track v) {
                      <mat-form-field appearance="outline" class="test-var-field">
                        <mat-label>{{ '{' + v + '}' }}</mat-label>
                        <input matInput [(ngModel)]="testVars[v]" [placeholder]="testVarPlaceholder(v)" (ngModelChange)="generateCode()">
                      </mat-form-field>
                    }
                  </div>
                </div>
              }

              <button class="run-test-btn" (click)="runTest()" [disabled]="!data.url.trim() || testing()">
                <mat-icon>{{ testing() ? 'hourglass_empty' : 'play_arrow' }}</mat-icon>
                {{ testing() ? 'Running…' : 'Run Request' }}
              </button>

              @if (testResult()) {
                <div class="test-response" [class.test-success]="testResult()!.success" [class.test-failure]="!testResult()!.success">
                  <div class="test-response-header">
                    <span class="test-status-code" [class.success]="testResult()!.success" [class.failure]="!testResult()!.success">
                      {{ testResult()!.statusCode || 'ERR' }} {{ testResult()!.success ? 'OK' : 'Failed' }}
                    </span>
                    <button mat-icon-button (click)="testResult.set(null)" class="close-test-btn"><mat-icon>close</mat-icon></button>
                  </div>
                  <pre class="test-response-body">{{ formatTestBody(testResult()!.body) }}</pre>
                </div>
              }
            </div>
            }
          </div>
        </div>
      </div>

      <!-- Sticky footer -->
      <div class="page-footer">
        <div class="footer-left"></div>
        <div class="footer-right">
          <button class="footer-cancel-btn" (click)="cancel()">Cancel</button>
          <button class="footer-save-btn" (click)="save()" [disabled]="!data.name.trim() || saving()">
            {{ saving() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>

      } <!-- end @else if data -->
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .edit-page { max-width: 960px; margin: 0 auto; padding: 8px 12px 100px; }

    /* Page header */
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .back-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); cursor: pointer; flex-shrink: 0; transition: all 0.12s; }
    .back-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
    .back-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .header-title { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .header-icon { font-size: 22px; width: 22px; height: 22px; color: #64b5f6; }
    h1 { font-size: 1.15rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .subtitle { font-size: 0.78rem; color: rgba(255,255,255,0.4); }

    .header-toggles { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .toggle-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px 5px 6px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); cursor: pointer; user-select: none; transition: all 0.15s; }
    .toggle-pill input { display: none; }
    .toggle-pill-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.2); transition: background 0.15s; flex-shrink: 0; }
    .toggle-pill-label { font-size: 0.78rem; font-weight: 500; color: rgba(255,255,255,0.45); transition: color 0.15s; }
    .toggle-pill-icon { font-size: 13px; width: 13px; height: 13px; color: rgba(255,255,255,0.3); transition: color 0.15s; }
    .toggle-pill.on { border-color: rgba(100,181,246,0.35); background: rgba(100,181,246,0.08); }
    .toggle-pill.on .toggle-pill-dot { background: #64b5f6; }
    .toggle-pill.on .toggle-pill-label { color: #64b5f6; }
    .toggle-pill.on .toggle-pill-icon { color: #ffc107; }

    .loading { display: flex; justify-content: center; gap: 6px; padding: 64px; }
    .loading-dot { width: 8px; height: 8px; background: rgba(100,181,246,0.5); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    .loading-dot:nth-child(2) { animation-delay: 0.2s; }
    .loading-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,80%,100% { opacity:0.3; transform:scale(0.8); } 40% { opacity:1; transform:scale(1); } }

    /* cURL import */
    .curl-import-btn { width: 100%; display: flex; align-items: center; gap: 12px; background: rgba(100,181,246,0.06); border: 1px dashed rgba(100,181,246,0.3); border-radius: 8px; padding: 10px 14px; cursor: pointer; margin-bottom: 16px; transition: all 0.15s; font-family: inherit; text-align: left; box-sizing: border-box; }
    .curl-import-btn:hover { background: rgba(100,181,246,0.11); border-color: rgba(100,181,246,0.5); }
    .curl-import-icon-wrap { width: 32px; height: 32px; border-radius: 8px; background: rgba(100,181,246,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .curl-import-icon-wrap mat-icon { color: #64b5f6; font-size: 17px; width: 17px; height: 17px; }
    .curl-import-text { flex: 1; min-width: 0; }
    .curl-import-label { display: block; font-size: 0.85rem; font-weight: 600; color: #64b5f6; }
    .curl-import-sub { display: block; font-size: 0.73rem; color: rgba(255,255,255,0.35); margin-top: 1px; }
    .curl-import-arrow { color: rgba(100,181,246,0.5); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }

    .curl-import-expanded { background: rgba(100,181,246,0.05); border: 1px solid rgba(100,181,246,0.25); border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
    .curl-import-expanded-header { display: flex; align-items: center; justify-content: space-between; }
    .curl-textarea { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.8); font-family: monospace; font-size: 0.75rem; padding: 8px 10px; resize: vertical; outline: none; }
    .curl-textarea:focus { border-color: rgba(100,181,246,0.4); }
    .curl-import-footer { display: flex; align-items: center; justify-content: space-between; }
    .curl-error { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #ef5350; }
    .err-icon { font-size: 14px; width: 14px; height: 14px; }
    .parse-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.4); border-radius: 6px; color: #64b5f6; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .parse-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .parse-btn:hover:not(:disabled) { background: rgba(100,181,246,0.25); }
    .parse-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .close-btn { color: rgba(255,255,255,0.4); width: 32px; height: 32px; line-height: 32px; }
    .close-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Form shell — accordion (mobile) / master-detail rail (desktop) */
    .form-shell { display: block; }
    .form-shell.md { display: grid; grid-template-columns: 200px 1fr; gap: 24px; align-items: start; }

    .md-rail { display: flex; flex-direction: column; gap: 2px; position: sticky; top: 16px; }
    .md-rail-item { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; text-align: left; padding: 9px 12px; border: none; border-left: 2px solid transparent; border-radius: 8px; background: none; cursor: pointer; font-family: inherit; color: rgba(255,255,255,0.6); transition: background 0.12s, color 0.12s; width: 100%; box-sizing: border-box; }
    .md-rail-item:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.85); }
    .md-rail-item.active { background: rgba(100,181,246,0.1); color: #fff; border-left-color: #64b5f6; }
    .md-rail-title { font-size: 0.82rem; font-weight: 600; }
    .md-rail-sum { font-size: 0.68rem; color: rgba(255,255,255,0.35); font-family: monospace; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .md-rail-item.active .md-rail-sum { color: rgba(255,255,255,0.5); }
    .rail-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 6px 0; }

    /* On desktop, hide accordion toggles; rail drives navigation */
    .form-shell.md .form-grid { gap: 0; }
    .form-shell.md .section-toggle { display: none; }
    .form-shell.md .form-section { border: none; background: none; border-radius: 0; overflow: visible; }
    .form-shell.md .section-body { padding: 0; }

    /* Form sections — accordion */
    .form-grid { display: flex; flex-direction: column; gap: 6px; }
    .form-section { border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; background: rgba(255,255,255,0.02); overflow: hidden; transition: border-color 0.15s, background 0.15s; }
    .form-section.open { border-color: rgba(100,181,246,0.25); background: rgba(255,255,255,0.03); }

    .section-toggle { width: 100%; display: flex; align-items: center; gap: 8px; background: none; border: none; padding: 13px 14px; cursor: pointer; font-family: inherit; text-align: left; color: inherit; min-height: 48px; box-sizing: border-box; }
    .section-toggle:hover { background: rgba(255,255,255,0.03); }
    .sec-chevron { font-size: 20px; width: 20px; height: 20px; color: rgba(255,255,255,0.4); flex-shrink: 0; transition: color 0.15s; }
    .form-section.open .sec-chevron { color: #64b5f6; }
    .sec-title { font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.75); flex-shrink: 0; }
    .form-section.open .sec-title { color: rgba(255,255,255,0.95); }
    .sec-summary { font-size: 0.74rem; color: rgba(255,255,255,0.35); margin-left: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; font-family: monospace; padding-left: 10px; }

    .section-body { padding: 4px 14px 16px; }
    .section-add-row { display: flex; justify-content: flex-end; margin-bottom: 2px; }
    .map-block { padding-top: 2px; }
    .map-sublabel-row { display: flex; justify-content: flex-end; margin-bottom: 6px; }
    .add-row-btn { width: 28px; height: 28px; line-height: 28px; color: #64b5f6; }
    .add-row-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .full-width { width: 100%; }
    .half-width { flex: 1; min-width: 80px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }

.header-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px; flex-wrap: nowrap; }
    .remove-btn { margin-top: 4px; flex-shrink: 0; color: rgba(239,83,80,0.5); }
    .remove-btn:hover { color: #ef5350; }
    .lock-btn { margin-top: 4px; flex-shrink: 0; }
    .secret-value-row { display: flex; align-items: center; gap: 8px; min-height: 56px; padding: 0 4px; }
    .secret-placeholder { font-family: monospace; font-size: 1.1rem; color: rgba(255,255,255,0.3); letter-spacing: 3px; flex: 1; }
    .change-secret-btn { font-size: 0.78rem; color: #64b5f6; }
    .empty-rows-hint { font-size: 0.75rem; color: rgba(255,255,255,0.25); padding: 4px 0 8px; }

    .config-vars-hint { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 2px 0 10px; }
    .config-vars-label { font-size: 0.72rem; color: rgba(255,255,255,0.3); flex-shrink: 0; }
    .config-var-chip { background: rgba(100,181,246,0.1); color: #64b5f6; border: 1px solid rgba(100,181,246,0.2); padding: 1px 7px; border-radius: 10px; font-size: 0.7rem; font-family: monospace; cursor: pointer; transition: background 0.12s; }
    .config-var-chip:hover { background: rgba(100,181,246,0.2); }

    .path-picker { padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 8px; }
    .path-picker-actions { display: flex; justify-content: flex-end; margin-bottom: 8px; }
    .path-picker-results { margin-top: 8px; }
    .path-picker-info { display: flex; gap: 12px; margin-bottom: 8px; }
    .path-count { font-size: 0.8rem; color: #4caf50; font-weight: 600; }
    .array-info { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    .path-list { display: flex; flex-wrap: wrap; gap: 4px; max-height: 150px; overflow-y: auto; }
    .path-chip { background: rgba(33,150,243,0.12); color: #64b5f6; border: 1px solid rgba(33,150,243,0.25); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; cursor: pointer; font-family: monospace; }
    .path-chip:hover { background: rgba(33,150,243,0.22); }
    .action-option-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 8px; vertical-align: middle; }
    .test-results { margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); }
    .test-results h4 { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0 0 8px 0; }
    .test-result-row { display: flex; gap: 8px; font-size: 0.75rem; margin-bottom: 4px; }
    .test-label { color: rgba(255,255,255,0.4); min-width: 60px; }
    .test-value { color: #4caf50; font-family: monospace; }

    /* Code section */
    .code-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .code-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 2px; }
    .code-tab { padding: 4px 12px; border: none; border-radius: 5px; background: none; color: rgba(255,255,255,0.45); font-size: 0.78rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .code-tab.active { background: rgba(100,181,246,0.18); color: #64b5f6; }
    .code-action-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); cursor: pointer; transition: all 0.12s; }
    .code-action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .code-action-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
    .code-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .code-output { margin: 0; padding: 12px 14px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.8); white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; max-height: 380px; overflow-y: auto; line-height: 1.6; }
    .code-resolved { color: #66bb6a; }
    .code-missing { color: #ffa726; }
    .body-resolved { color: #42a5f5; }
    .code-empty { font-size: 0.78rem; color: rgba(255,255,255,0.3); padding: 12px 0; }

    /* Test section */
    .test-vars-panel { margin-bottom: 12px; padding: 10px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
    .test-vars-header { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
    .test-vars-hint { font-weight: 400; font-size: 0.75rem; color: rgba(255,255,255,0.35); }
    .test-vars-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .test-var-field { min-width: 140px; flex: 1; }
    .run-test-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; background: rgba(76,175,80,0.12); border: 1px solid rgba(76,175,80,0.3); border-radius: 6px; color: #66bb6a; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; margin-bottom: 12px; }
    .run-test-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .run-test-btn:hover:not(:disabled) { background: rgba(76,175,80,0.2); border-color: #66bb6a; }
    .run-test-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .test-response { border-radius: 8px; overflow: hidden; border: 1px solid; }
    .test-response.test-success { border-color: rgba(76,175,80,0.35); background: rgba(76,175,80,0.04); }
    .test-response.test-failure { border-color: rgba(239,83,80,0.35); background: rgba(239,83,80,0.04); }
    .test-response-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; }
    .test-status-code { font-size: 0.8rem; font-weight: 700; font-family: monospace; }
    .test-status-code.success { color: #4caf50; }
    .test-status-code.failure { color: #ef5350; }
    .close-test-btn { width: 28px; height: 28px; line-height: 28px; }
    .close-test-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .test-response-body { margin: 0; padding: 8px 12px 12px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.65); white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; }

    /* Sticky footer */
    .page-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: rgba(18,18,28,0.95); backdrop-filter: blur(8px); border-top: 1px solid rgba(255,255,255,0.08); z-index: 100; }
    .footer-left { display: flex; gap: 4px; }
    .footer-right { display: flex; gap: 8px; align-items: center; }
    .footer-tool-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.12s; }
    .footer-tool-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .footer-tool-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.2); }
    .footer-tool-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .footer-cancel-btn { padding: 7px 16px; background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: rgba(255,255,255,0.5); font-size: 0.85rem; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .footer-cancel-btn:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.75); }
    .footer-save-btn { padding: 7px 22px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.45); border-radius: 6px; color: #64b5f6; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .footer-save-btn:hover:not(:disabled) { background: rgba(100,181,246,0.25); border-color: #64b5f6; }
    .footer-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Inline template overlay (URL, header values) */
    .tpl-field { display: flex; flex-direction: column; margin-bottom: 4px; }
    .tpl-editor { position: relative; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; background: rgba(255,255,255,0.04); transition: border-color 0.15s; flex: 1; min-width: 80px; }
    .tpl-editor:focus-within { border-color: rgba(100,181,246,0.5); }
    .tpl-backdrop { position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 12px 14px; font-size: 0.9rem; font-family: inherit; line-height: 1.375; white-space: pre; overflow: hidden; pointer-events: none; box-sizing: border-box; color: rgba(255,255,255,0.8); }
    .tpl-input { position: relative; display: block; width: 100%; padding: 12px 14px; font-size: 0.9rem; font-family: inherit; line-height: 1.375; background: transparent; color: transparent; caret-color: rgba(255,255,255,0.9); border: none; outline: none; box-sizing: border-box; }
    .tpl-input::placeholder { color: rgba(255,255,255,0.3); }

    /* Body template overlay */
    .body-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
    .body-editor { position: relative; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; background: rgba(255,255,255,0.04); transition: border-color 0.15s; }
    .body-editor:focus-within { border-color: rgba(100,181,246,0.5); }
    .body-backdrop { position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 10px 12px; font-size: 0.8rem; font-family: monospace; line-height: 1.5625; white-space: pre-wrap; word-break: break-all; overflow: hidden; pointer-events: none; box-sizing: border-box; color: rgba(255,255,255,0.8); }
    .body-textarea { position: relative; display: block; width: 100%; min-height: 80px; padding: 10px 12px; font-size: 0.8rem; font-family: monospace; line-height: 1.5625; background: transparent; color: transparent; caret-color: rgba(255,255,255,0.9); border: none; outline: none; resize: vertical; box-sizing: border-box; }
    .body-textarea::placeholder { color: rgba(255,255,255,0.3); }
    .body-footer-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .body-chips { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
    .body-legend { display: flex; gap: 10px; align-items: center; flex-shrink: 0; padding-top: 2px; }
    .legend-item { display: inline-flex; align-items: center; gap: 4px; font-size: 0.68rem; color: rgba(255,255,255,0.35); white-space: nowrap; }
    .legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .legend-resolved { background: #42a5f5; }
    .legend-missing { background: #ffa726; }

    @media (max-width: 640px) {
      .edit-page { padding: 8px 8px 100px; }
      .two-col { grid-template-columns: 1fr; }
      .header-row { flex-wrap: wrap; }
      .page-footer { padding: 10px 12px; }
    }
  `]
})
export class ApiRequestConfigEditComponent implements OnInit {
  private svc = inject(ApiRequestConfigsService);
  private snackBar = inject(MatSnackBar);
  private credentials = inject(CredentialsService);
  private configVarsSvc = inject(ConfigVariablesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  data: ApiRequestConfig | null = null;
  isNew = false;
  pageLoading = signal(true);
  saving = signal(false);
  headerEntries = signal<{key: string, value: string, secret: boolean, editing: boolean}[]>([]);
  parameterEntries = signal<{key: string, value: string}[]>([]);
  actions = REQUEST_ACTIONS;
  configVars = signal<{key: string, value: string, isSecret: boolean}[]>([]);
  get configVarKeys() { return this.configVars().map(v => v.key); }

  get bodyVarChips(): string[] {
    if (!this.data) return [];
    const action = this.data.action;
    const cookieNames = this.cookieVarNames();
    const paramNames = this.parameterEntries().map(e => e.key.trim()).filter(Boolean);
    const base = [...cookieNames, ...paramNames];
    if (action === 'AddTimesheetEntry' || action === 'EditTimesheetEntry' || action === 'DeleteTimesheetEntry') {
      return [...base, 'id', 'date', 'project', 'category', 'categoryId', 'employeeId', 'workedFromLocationId', 'hours', 'minutes', 'billable', 'workedFrom', 'sentiment', 'description', 'ticketNumber'];
    }
    if (action === 'GenerateJoke') return [...base, 'jokeType', 'seed'];
    if (action === 'AiChatWinStory') return [...base, 'nominee', 'title', 'description'];
    if (action === 'FetchLeave') return [...base, 'start', 'end', 'teamIds'];
    if (action === 'FetchCalendarEvents') return [...base, 'start', 'end', 'teamIds'];
    return base;
  }

  showCurlImport = signal(false);
  curlInput = '';
  curlParseError = signal('');
  testing = signal(false);
  testResult = signal<TestRequestResult | null>(null);
  curlSegs = signal<CodeSegment[]>([]);
  httpSegs = signal<CodeSegment[]>([]);
  bodySegs = signal<CodeSegment[]>([]);
  urlSegs = signal<CodeSegment[]>([]);

  private readonly SYSTEM_VARS = new Set([
    'start', 'end', 'teamIds', 'date', 'id', 'project', 'category',
    'hours', 'minutes', 'billable', 'workedFrom', 'sentiment',
    'description', 'ticketNumber', 'jokeType', 'seed', 'nominee', 'title',
    'employeeId', 'categoryId', 'workedFromLocationId', 'timesheetEntryId'
  ]);
  codeFormat = signal<'curl' | 'http'>('curl');
  showTestVars = signal(false);
  testVars: Record<string, string> = {};

  get currentCodeSegments(): CodeSegment[] {
    return this.codeFormat() === 'curl' ? this.curlSegs() : this.httpSegs();
  }

  get currentCode(): string {
    return this.currentCodeSegments.map(s => s.text).join('');
  }

  showPathPicker = signal(false);
  sampleJson = signal('');
  availablePaths = signal<string[]>([]);
  testResults = signal<Record<string, string | null>>({});
  discoveringPaths = signal(false);
  arrayLength = signal(0);

  private mobile = inject(MobileService);
  get isDesktop() { return !this.mobile.isMobile(); }

  expanded = signal<Set<string>>(new Set(['basic', 'request']));
  activeSection = signal<string>('basic');

  constructor() {
    effect(() => {
      const visible = this.isDesktop ? this.activeSection() === 'code' : this.expanded().has('code');
      if (visible) untracked(() => this.generateCode());
    });
    effect(() => {
      const visible = this.isDesktop ? this.activeSection() === 'body' : this.expanded().has('body');
      if (visible) untracked(() => this.updateBodySegs());
    });
    effect(() => {
      const visible = this.isDesktop ? this.activeSection() === 'request' : this.expanded().has('request');
      if (visible) untracked(() => this.updateUrlSegs());
    });
  }


  get sectionList(): { key: string; title: string }[] {
    const base = [
      { key: 'basic', title: 'Basic' },
      { key: 'request', title: 'Request' },
      { key: 'headers', title: 'Headers' },
      { key: 'parameters', title: 'Parameters' },
      { key: 'body', title: 'Body Template' },
      { key: 'success', title: 'Success & Retry' },
    ];
    if (this.hasMapping()) base.push({ key: 'mapping', title: 'Response Mapping' });
    base.push({ key: 'code', title: 'Code' });
    return base;
  }

  isOpen(key: string) { return this.expanded().has(key); }
  showBody(key: string) { return this.isDesktop ? this.activeSection() === key : this.isOpen(key); }

  toggleSection(key: string) {
    this.expanded.update(s => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  sectionSummary(key: string): string {
    if (!this.data) return '';
    switch (key) {
      case 'basic': return this.data.name || 'unnamed';
      case 'request': return `${this.data.method} · ${this.data.url || 'no URL'}`;
      case 'headers': { const n = this.headerEntries().length; return n ? `${n} header${n !== 1 ? 's' : ''}` : 'none'; }
      case 'parameters': { const n = this.parameterEntries().length; return n ? `${n} param${n !== 1 ? 's' : ''}` : 'none'; }
      case 'body': return this.data.bodyTemplate?.trim() ? 'configured' : 'empty';
      case 'success': {
        const s = this.data.successCriteria?.requiredStatus;
        const r = this.data.retryCount ?? 0;
        return `${s ? 'status ' + s : 'any status'} · ${r} retr${r !== 1 ? 'ies' : 'y'}`;
      }
      case 'mapping': return this.actions.find(a => a.value === this.data!.action)?.label ?? this.data.action;
      default: return '';
    }
  }

  hasMapping(): boolean {
    return this.data ? ['AddTimesheetEntry', 'GetTimesheetProjects', 'FetchLeave',
            'AiChatWinStory', 'GenerateJoke', 'FetchCalendarEvents'].includes(this.data.action) : false;
  }

  get hasTestResults(): boolean {
    return Object.values(this.testResults()).some(v => v !== null);
  }

  cookieVarNames(): string[] {
    const names = this.credentials.entries().map(e => e.keyName);
    if (!names.includes('cookie')) names.unshift('cookie');
    return names;
  }

  get cookieVarHint(): string {
    return this.cookieVarNames().map(n => `{${n}}`).join(', ');
  }

  insertConfigVar(key: string) {
    navigator.clipboard.writeText(`{${key}}`).catch(() => {});
    this.snackBar.open(`Copied {${key}} to clipboard`, 'Close', { duration: 2000 });
  }

  unresolvedVars(): string[] {
    if (!this.data) return [];
    const knownParams = new Set([
      ...this.parameterEntries().map(e => e.key.trim()).filter(Boolean),
      ...this.cookieVarNames(),
      ...this.configVarKeys,
      'start', 'end', 'teamIds', 'nominee', 'title', 'description'
    ]);
    const regularHeaderValues = this.headerEntries().filter(e => !e.secret).map(e => e.value).join(' ');
    const template = (this.data.bodyTemplate ?? '') + regularHeaderValues;
    const matches = [...template.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    return [...new Set(matches)].filter(v => !knownParams.has(v));
  }

  testVarPlaceholder(v: string): string {
    const today = new Date().toISOString().split('T')[0];
    const defaults: Record<string, string> = {
      date: today, hours: '1', minutes: '0', billable: 'true',
      workedFrom: '', sentiment: '', description: 'Test', ticketNumber: '', category: '', project: '', id: ''
    };
    return defaults[v] ?? '';
  }

  ngOnInit() {
    this.configVarsSvc.list().subscribe({ next: (vars) => this.configVars.set(vars.map(v => ({ key: v.key, value: v.value, isSecret: v.isSecret }))), error: () => {} });

    const id = this.route.snapshot.paramMap.get('id');
    this.isNew = !id || id === 'new';

    if (this.isNew) {
      this.data = this.newConfig();
      this.pageLoading.set(false);
    } else {
      this.svc.get(id!).subscribe({
        next: (config) => {
          this.data = { ...config };
          this.initEntries();
          this.pageLoading.set(false);
        },
        error: () => {
          this.snackBar.open('Failed to load config', 'Close', { duration: 3000 });
          this.cancel();
        }
      });
    }
  }

  private initEntries() {
    if (!this.data) return;
    const secretHeaders: Record<string, string> = this.data.secretHeaders ?? {};
    const regularHeaders = Object.entries(this.data.headers || {}).map(([k, v]) => ({ key: k, value: v as string, secret: false, editing: false }));
    const secretEntries = Object.entries(secretHeaders).map(([k, v]) => ({ key: k, value: v as string, secret: true, editing: false }));
    this.headerEntries.set([...regularHeaders, ...secretEntries]);
    this.parameterEntries.set(Object.entries(this.data.parameters || {}).map(([k, v]) => ({ key: k, value: v as string })));

    if (!this.isNew) {
      const open = new Set(['basic', 'request']);
      if (this.headerEntries().length) open.add('headers');
      if (this.parameterEntries().length) open.add('parameters');
      if (this.data.bodyTemplate?.trim()) open.add('body');
      this.expanded.set(open);
    }
    this.updateBodySegs();
    this.updateUrlSegs();
  }

  cancel() {
    const steps = this.isNew ? ['..'] : ['../..'];
    this.router.navigate(steps, { relativeTo: this.route });
  }

  setCriteriaStatus(v: any) {
    if (!this.data) return;
    const n = v === '' || v === null ? null : +v;
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), requiredStatus: n } };
  }
  setCriteriaPath(v: string) {
    if (!this.data) return;
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), jsonPath: v || null } };
  }
  setCriteriaValue(v: string) {
    if (!this.data) return;
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), jsonValue: v || null } };
  }

  addHeader() { this.headerEntries.set([...this.headerEntries(), { key: '', value: '', secret: false, editing: false }]); }
  removeHeader(key: string) { this.headerEntries.set(this.headerEntries().filter(e => e.key !== key)); }

  toggleHeaderSecret(entry: {key: string, value: string, secret: boolean, editing: boolean}) {
    entry.secret = !entry.secret;
    if (!entry.secret) {
      if (entry.value === '**SECRET**') entry.value = '';
      entry.editing = false;
    }
    this.headerEntries.set([...this.headerEntries()]);
  }

  editSecretHeader(entry: {key: string, value: string, secret: boolean, editing: boolean}) {
    entry.editing = true;
    entry.value = '';
    this.headerEntries.set([...this.headerEntries()]);
  }

  cancelEditSecretHeader(entry: {key: string, value: string, secret: boolean, editing: boolean}) {
    entry.editing = false;
    entry.value = '**SECRET**';
    this.headerEntries.set([...this.headerEntries()]);
  }

  addParameter() { this.parameterEntries.set([...this.parameterEntries(), { key: '', value: '' }]); }
  removeParameter(key: string) { this.parameterEntries.set(this.parameterEntries().filter(e => e.key !== key)); }

  private computeSegs(template: string): CodeSegment[] {
    const { params, cookieVars } = this.getResolveContext();
    const segs: CodeSegment[] = [];
    for (const part of template.split(/(\{[^}]+\})/)) {
      const m = part.match(/^\{(\w+)\}$/);
      if (!m) { if (part) segs.push({ text: part, kind: 'plain' }); continue; }
      const k = m[1];
      const cv = this.configVars().find(c => !c.isSecret && c.key === k);
      if (cv || k in cookieVars || k in params || this.testVars[k]) {
        segs.push({ text: part, kind: 'resolved' }); continue;
      }
      segs.push({ text: part, kind: this.SYSTEM_VARS.has(k) ? 'resolved' : 'missing' });
    }
    return segs;
  }

  updateBodySegs() {
    if (!this.data) return;
    this.bodySegs.set(this.computeSegs(this.data.bodyTemplate ?? ''));
  }

  updateUrlSegs() {
    if (!this.data) return;
    this.urlSegs.set(this.computeSegs(this.data.url ?? ''));
  }

  getSegs(value: string): CodeSegment[] {
    return this.computeSegs(value);
  }

  syncBodyScroll(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    const backdrop = ta.previousElementSibling as HTMLElement;
    if (backdrop) backdrop.scrollTop = ta.scrollTop;
  }

  syncInputScroll(event: Event) {
    const input = event.target as HTMLInputElement;
    const backdrop = input.previousElementSibling as HTMLElement;
    if (backdrop) backdrop.scrollLeft = input.scrollLeft;
  }

  discoverPaths() {
    if (!this.data) return;
    const raw = this.sampleJson().trim();
    if (!raw) return;
    this.discoveringPaths.set(true);
    const fields: Record<string, string> = {
      Name: this.data.mapping.namePath,
      Start: this.data.mapping.startPath,
      End: this.data.mapping.endPath,
      Type: this.data.mapping.typePath,
      Days: this.data.mapping.daysPath,
      Status: this.data.mapping.statusPath
    };
    this.svc.testMapping(raw, this.data.mapping.arrayPath || '', fields).subscribe({
      next: (result) => { this.availablePaths.set(result.availablePaths); this.testResults.set(result.testResults); this.arrayLength.set(result.arrayLength); this.discoveringPaths.set(false); },
      error: () => { this.snackBar.open('Failed to parse JSON', 'Close', { duration: 3000 }); this.discoveringPaths.set(false); }
    });
  }

  copyPath(path: string) {
    navigator.clipboard.writeText(path);
    this.snackBar.open(`Copied: ${path}`, 'Close', { duration: 2000 });
  }

  toggleTest() {
    const vars = this.unresolvedVars();
    if (vars.length > 0 && !this.showTestVars()) {
      for (const v of vars) { if (!this.testVars[v]) this.testVars[v] = this.testVarPlaceholder(v); }
      this.showTestVars.set(true);
    } else {
      this.runTest();
    }
  }

  setCodeFormat(fmt: 'curl' | 'http') {
    this.codeFormat.set(fmt);
    this.generateCode();
  }

  generateCode() {
    if (this.codeFormat() === 'curl') this.buildCurlPreview();
    else this.buildHttpPreview();
  }

  private getResolveContext(): { params: Record<string,string>; cookieVars: Record<string,string> } {
    const params: Record<string, string> = {};
    for (const e of this.parameterEntries()) { if (e.key.trim()) params[e.key.trim()] = e.value; }
    return { params, cookieVars: this.getCookieVariables() };
  }

  private resolveToSegments(template: string, params: Record<string,string>, cookieVars: Record<string,string>): CodeSegment[] {
    const segs: CodeSegment[] = [];
    const parts = template.split(/(\{[^}]+\})/);
    for (const part of parts) {
      const m = part.match(/^\{(\w+)\}$/);
      if (!m) { if (part) segs.push({ text: part, kind: 'plain' }); continue; }
      const k = m[1];
      const cv = this.configVars().find(c => !c.isSecret && c.key === k);
      if (cv) { segs.push({ text: cv.value, kind: 'resolved' }); continue; }
      if (cookieVars[k]) { segs.push({ text: cookieVars[k], kind: 'resolved' }); continue; }
      if (params[k]) { segs.push({ text: params[k], kind: 'resolved' }); continue; }
      if (this.testVars[k]) { segs.push({ text: this.testVars[k], kind: 'resolved' }); continue; }
      segs.push({ text: part, kind: 'missing' });
    }
    return segs;
  }

  private p(text: string): CodeSegment { return { text, kind: 'plain' }; }

  buildCurlPreview() {
    if (!this.data) return;
    const { params, cookieVars } = this.getResolveContext();
    const rs = (t: string) => this.resolveToSegments(t, params, cookieVars);

    const fmt = this.data.bodyFormat ?? (this.data.isFormUrlEncoded ? 'urlencoded' : 'json');
    const lines: CodeSegment[][] = [
      [this.p(`curl -X ${this.data.method} '`), ...rs(this.data.url), this.p(`'`)]
    ];
    const hasExplicitCT = this.headerEntries().some(e => e.key.trim().toLowerCase() === 'content-type');
    if (!hasExplicitCT && fmt !== 'raw') {
      const ct = fmt === 'urlencoded' ? 'application/x-www-form-urlencoded' : 'application/json';
      lines.push([this.p(`  -H 'Content-Type: ${ct}'`)]);
    }
    for (const e of this.headerEntries()) {
      if (!e.key.trim()) continue;
      const val: CodeSegment[] = e.secret ? [this.p('***')] : rs(e.value);
      lines.push([this.p(`  -H '${e.key.trim()}: `), ...val, this.p(`'`)]);
    }
    if (this.data.method === 'POST' && this.data.bodyTemplate?.trim()) {
      const flag = fmt === 'urlencoded' ? '--data-urlencode' : fmt === 'raw' ? '--data-raw' : '--data';
      lines.push([this.p(`  ${flag} '`), ...rs(this.data.bodyTemplate), this.p(`'`)]);
    }
    const result: CodeSegment[] = [];
    for (let i = 0; i < lines.length; i++) {
      result.push(...lines[i]);
      if (i < lines.length - 1) result.push(this.p(' \\\n'));
    }
    this.curlSegs.set(result);
  }

  buildHttpPreview() {
    if (!this.data) return;
    const { params, cookieVars } = this.getResolveContext();
    const rs = (t: string) => this.resolveToSegments(t, params, cookieVars);

    const resolvedUrl = rs(this.data.url).map(s => s.text).join('');
    let parsedUrl: URL;
    try { parsedUrl = new URL(resolvedUrl); } catch { parsedUrl = new URL('http://unknown' + resolvedUrl); }

    const fmt = this.data.bodyFormat ?? (this.data.isFormUrlEncoded ? 'urlencoded' : 'json');
    const lines: CodeSegment[][] = [
      [this.p(`${this.data.method} `), ...rs(this.data.url.replace(/^https?:\/\/[^/]+/, '')), this.p(` HTTP/1.1`),
       this.p(`\nHost: ${parsedUrl.host}`)]
    ];
    const hasExplicitCT = this.headerEntries().some(e => e.key.trim().toLowerCase() === 'content-type');
    if (!hasExplicitCT && fmt !== 'raw') {
      const ct = fmt === 'urlencoded' ? 'application/x-www-form-urlencoded' : 'application/json';
      lines.push([this.p(`Content-Type: ${ct}`)]);
    }
    for (const e of this.headerEntries()) {
      if (!e.key.trim()) continue;
      const val: CodeSegment[] = e.secret ? [this.p('***')] : rs(e.value);
      lines.push([this.p(`${e.key.trim()}: `), ...val]);
    }
    if (this.data.method === 'POST' && this.data.bodyTemplate?.trim()) {
      lines.push([this.p('')]);
      lines.push(rs(this.data.bodyTemplate));
    }
    const result: CodeSegment[] = [];
    for (let i = 0; i < lines.length; i++) {
      result.push(...lines[i]);
      if (i < lines.length - 1) result.push(this.p('\n'));
    }
    this.httpSegs.set(result);
  }

  copyCode() {
    navigator.clipboard.writeText(this.currentCode);
    this.snackBar.open('Copied', 'Close', { duration: 2000 });
  }

  runTest() {
    if (!this.data) return;
    this.testing.set(true);
    this.testResult.set(null);
    this.showTestVars.set(false);

    const headers: Record<string, string> = {};
    const secretHeaders: Record<string, string> = {};
    for (const entry of this.headerEntries()) {
      if (!entry.key.trim()) continue;
      if (entry.secret) secretHeaders[entry.key.trim()] = entry.editing ? entry.value : (entry.value || '**SECRET**');
      else headers[entry.key.trim()] = entry.value;
    }
    const config: ApiRequestConfig = { ...this.data, headers, secretHeaders };
    const variables: Record<string, string> = { ...this.getCookieVariables(), ...this.testVars };

    this.svc.testRequest(config, variables).subscribe({
      next: (result) => { this.testResult.set(result); this.testing.set(false); },
      error: () => { this.testing.set(false); this.snackBar.open('Test request failed', 'Close', { duration: 3000 }); }
    });
  }

  private getCookieVariables(): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const entry of this.credentials.entries()) vars[entry.keyName] = this.credentials.getValueFor(entry);
    const first = this.credentials.entries()[0];
    if (first) vars['cookie'] = vars[first.keyName] ?? '';
    return vars;
  }

  formatTestBody(body: string): string {
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
  }

  parseCurl() {
    this.curlParseError.set('');
    try {
      const normalized = this.curlInput.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = this.tokenizeCurl(normalized);
      if (!tokens.length || tokens[0].toLowerCase() !== 'curl') { this.curlParseError.set('Does not look like a curl command'); return; }

      let method = '';
      const headers: Record<string, string> = {};
      let body = '';
      let url = '';
      let bodyFormat = '';

      for (let i = 1; i < tokens.length; i++) {
        const t = tokens[i];
        if (t === '-X' || t === '--request') { method = tokens[++i] ?? ''; }
        else if (t === '-H' || t === '--header') { const h = tokens[++i] ?? ''; const idx = h.indexOf(':'); if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim(); }
        else if (t === '-b' || t === '--cookie') { headers['Cookie'] = tokens[++i] ?? ''; }
        else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') { body = tokens[++i] ?? ''; if (!method) method = 'POST'; if (!bodyFormat) bodyFormat = 'raw'; }
        else if (t === '--data-urlencode') { body = tokens[++i] ?? ''; if (!method) method = 'POST'; bodyFormat = 'urlencoded'; }
        else if (!t.startsWith('-') && !url) { url = t.replace(/^['"]|['"]$/g, ''); }
      }

      const ct = headers['Content-Type'] ?? headers['content-type'] ?? '';
      if (ct.toLowerCase().includes('application/x-www-form-urlencoded')) { bodyFormat = 'urlencoded'; delete headers['Content-Type']; delete headers['content-type']; }
      else if (ct.toLowerCase().includes('application/json')) { bodyFormat = 'json'; delete headers['Content-Type']; delete headers['content-type']; }

      if (!url) { this.curlParseError.set('Could not find URL in curl command'); return; }
      if (!this.data) return;

      this.data.url = url;
      if (method) this.data.method = method.toUpperCase();
      if (bodyFormat) { this.data.bodyFormat = bodyFormat; this.data.isFormUrlEncoded = bodyFormat === 'urlencoded'; }
      if (body) this.data.bodyTemplate = body;

      const merged = { ...(this.data.headers || {}), ...headers };
      const existingSecrets = this.headerEntries().filter(e => e.secret);
      this.headerEntries.set([...Object.entries(merged).map(([k, v]) => ({ key: k, value: v as string, secret: false, editing: false })), ...existingSecrets]);

      this.showCurlImport.set(false);
      this.snackBar.open('curl parsed — review the fields below', 'Close', { duration: 3000 });
    } catch {
      this.curlParseError.set('Failed to parse curl command');
    }
  }

  private tokenizeCurl(input: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < input.length) {
      while (i < input.length && input[i] === ' ') i++;
      if (i >= input.length) break;
      const ch = input[i];
      if (ch === "'" || ch === '"') {
        const end = input.indexOf(ch, i + 1);
        tokens.push(end < 0 ? input.slice(i + 1) : input.slice(i + 1, end));
        i = end < 0 ? input.length : end + 1;
      } else {
        const start = i;
        while (i < input.length && input[i] !== ' ') i++;
        tokens.push(input.slice(start, i));
      }
    }
    return tokens;
  }

  save() {
    if (!this.data) return;
    const headers: Record<string, string> = {};
    const secretHeaders: Record<string, string> = {};
    for (const entry of this.headerEntries()) {
      if (!entry.key.trim()) continue;
      if (entry.secret) secretHeaders[entry.key.trim()] = entry.editing ? entry.value : (entry.value || '**SECRET**');
      else headers[entry.key.trim()] = entry.value;
    }
    this.data.headers = headers;
    this.data.secretHeaders = secretHeaders;

    const parameters: Record<string, string> = {};
    for (const entry of this.parameterEntries()) { if (entry.key.trim()) parameters[entry.key.trim()] = entry.value; }
    this.data.parameters = parameters;

    this.saving.set(true);
    const save$ = this.data.id ? this.svc.update(this.data.id, this.data) : this.svc.create(this.data);
    save$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Saved', '', { duration: 2000 });
        this.cancel();
      },
      error: () => { this.saving.set(false); this.snackBar.open('Failed to save config', 'Close', { duration: 3000 }); }
    });
  }

  private newConfig(): ApiRequestConfig {
    return {
      action: 'FetchLeave', name: '', description: '', enabled: false, url: '', method: 'POST',
      isFormUrlEncoded: true, bodyFormat: 'urlencoded', headers: {}, parameters: {}, bodyTemplate: '',
      retryCount: 0, successCriteria: null, autoSync: false,
      mapping: {
        arrayPath: '', namePath: 'title', startPath: 'start', endPath: 'end', typePath: 'type',
        daysPath: 'totalDays', statusPath: 'status', nameTransform: 'ExtractBeforeDash',
        externalIdPath: '', projectsPath: '', projectNamePath: 'name', projectIdPath: 'id',
        projectCategoriesPath: 'categories', categoryNamePath: 'name', categoryIdPath: 'id',
        textResponsePath: '', subjectPath: 'subject', isAllDayPath: 'isAllDay', locationPath: 'location'
      }
    };
  }
}
