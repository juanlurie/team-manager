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
  TestRequestResult,
  ProjectMappingResult
} from './api-request-configs.service';
import { CredentialsService } from '../../core/services/credentials.service';
import { ConfigVariablesService } from '../settings/config-variables/config-variables.service';
import { MobileService } from '../../core/services/mobile.service';

interface CodeSegment { text: string; kind: 'plain' | 'resolved' | 'missing'; }
interface MappingPreviewRow { label: string; path: string; value: string; }
interface MappingPreview { kind: 'array' | 'single'; count?: number; rows: MappingPreviewRow[]; error?: string; }

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
            @if (data.action === 'AiConnection') {
              <label class="toggle-pill" [class.on]="data.isAiConnection" matTooltip="Selectable as an AI Prompt's connection">
                <input type="checkbox" [checked]="data.isAiConnection" (change)="data.isAiConnection = $any($event.target).checked">
                <span class="toggle-pill-dot"></span>
                <mat-icon class="toggle-pill-icon">auto_awesome</mat-icon>
                <span class="toggle-pill-label">AI Connection</span>
              </label>
            }
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
        } @else {
          <div class="mobile-wizard-nav">
            <button type="button" class="wizard-nav-btn" [disabled]="currentStepIndex() === 0" (click)="prevStep()">‹ Back</button>
            <span class="wizard-step-label">Step {{ currentStepIndex() + 1 }} of {{ sectionList.length }}</span>
            <button type="button" class="wizard-nav-btn" [disabled]="currentStepIndex() === sectionList.length - 1" (click)="nextStep()">Next ›</button>
          </div>
          <div class="wizard-step-title">{{ sectionList[currentStepIndex()].title }}</div>
        }

        <div class="form-grid">
          <!-- Basic Info -->
          <div class="form-section" id="section-basic" [class.open]="showBody('basic')">
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
          <div class="form-section" id="section-request" [class.open]="showBody('request')">
            @if (showBody('request')) {
            <div class="section-body">
            <div class="tpl-field full-width">
              <input class="tpl-input-plain" [(ngModel)]="data.url" (ngModelChange)="updateUrlSegs()" placeholder="https://example.com/api">
              @if (hasPlaceholders(urlSegs())) {
                <pre class="tpl-preview">@for (seg of urlSegs(); track $index) {<span [class.body-resolved]="seg.kind === 'resolved'" [class.code-missing]="seg.kind === 'missing'">{{ seg.text }}</span>}</pre>
              }
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
          <div class="form-section" id="section-headers" [class.open]="showBody('headers')">
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
                  <div class="tpl-field half-width">
                    <input class="tpl-input-plain" [(ngModel)]="entry.value" placeholder="{cookie}">
                    @if (hasPlaceholders(getSegs(entry.value))) {
                      <pre class="tpl-preview">@for (seg of getSegs(entry.value); track $index) {<span [class.body-resolved]="seg.kind === 'resolved'" [class.code-missing]="seg.kind === 'missing'">{{ seg.text }}</span>}</pre>
                    }
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
          <div class="form-section" id="section-parameters" [class.open]="showBody('parameters')">
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
          <div class="form-section" id="section-body" [class.open]="showBody('body')">
            @if (showBody('body')) {
            <div class="section-body">
            <div class="body-field">
              <textarea class="body-textarea-plain" [(ngModel)]="data.bodyTemplate" (ngModelChange)="updateBodySegs()" rows="4" placeholder="teamId=&#123;teamIds&#125;&amp;start=&#123;start&#125;"></textarea>
              @if (hasPlaceholders(bodySegs())) {
                <pre class="body-preview">@for (seg of bodySegs(); track $index) {<span [class.body-resolved]="seg.kind === 'resolved'" [class.code-missing]="seg.kind === 'missing'">{{ seg.text }}</span>}</pre>
              }
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
          <div class="form-section" id="section-success" [class.open]="showBody('success')">
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
          <div class="form-section" id="section-mapping" [class.open]="showBody('mapping')">
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

          @if (data.action === 'GetTimesheetProjects' || data.action === 'GetTimesheetProjectCategories') {
            <div class="map-block">
              <div class="map-sublabel-row">
                <button mat-button color="primary" (click)="showProjectTest.set(!showProjectTest())" style="font-size:0.78rem">
                  <mat-icon style="font-size:15px;width:15px;height:15px">science</mat-icon> Test Mapping
                </button>
              </div>

              @if (showProjectTest()) {
                <div class="path-picker">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Paste a sample response{{ data.mapping.responseFormat === 'html' ? ' (HTML)' : ' (JSON)' }}</mat-label>
                    <textarea matInput [(ngModel)]="projectSampleResponse" rows="6"
                              [placeholder]="projectSamplePlaceholder()"></textarea>
                  </mat-form-field>
                  <div class="path-picker-actions">
                    <button mat-button (click)="testProjectMapping()" [disabled]="!projectSampleResponse().trim() || testingProjectMapping()">
                      {{ testingProjectMapping() ? 'Testing...' : 'Run Test' }}
                    </button>
                  </div>
                  @if (projectMappingError()) {
                    <div class="test-results">
                      <span class="test-label" style="color:#ef5350">{{ projectMappingError() }}</span>
                    </div>
                  }
                  @if (projectMappingResults()) {
                    <div class="test-results">
                      <h4>{{ projectMappingResults()!.length }} project(s) found</h4>
                      @if (firstProjectBreakdown(); as rows) {
                        <div class="map-field-breakdown">
                          <div class="map-field-breakdown-title">How each field mapped (first project)</div>
                          @for (row of rows; track row.label) {
                            <div class="test-result-row">
                              <span class="test-label">{{ row.label }} <code class="path-code">{{ row.path }}</code></span>
                              <span class="test-value">→ {{ row.value }}</span>
                            </div>
                          }
                        </div>
                      }
                      <div class="map-field-breakdown-title">All projects found</div>
                      @for (proj of projectMappingResults(); track proj.name) {
                        <div class="test-result-row">
                          <span class="test-label">{{ proj.name }}{{ proj.id ? ' (' + proj.id + ')' : '' }}</span>
                          <span class="test-value">
                            {{ proj.categories.length > 0 ? proj.categories.map(c => c.name).join(', ') : 'no categories' }}
                          </span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Response Format</mat-label>
                <mat-select [(ngModel)]="data.mapping.responseFormat">
                  <mat-option value="json">JSON</mat-option>
                  <mat-option value="html">HTML (JSON array embedded in a script/page)</mat-option>
                </mat-select>
              </mat-form-field>
              @if (data.mapping.responseFormat === 'html') {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>HTML JSON Marker</mat-label>
                  <input matInput [(ngModel)]="data.mapping.htmlJsonMarker" placeholder="new timesheet(">
                  <mat-hint>The text that appears just before the project list in the page. We'll grab the "[ ... ]" array that starts right after it.</mat-hint>
                </mat-form-field>
              } @else {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Projects Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectsPath" placeholder="data.projects">
                  <mat-hint>Where to find the list of projects in the response. Leave blank if the response itself is that list.</mat-hint>
                </mat-form-field>
              }
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Project Name Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectNamePath" placeholder="name">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Project ID Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectIdPath" placeholder="id">
                  <mat-hint>Optional. Stored so future syncs can match this project even if its name changes.</mat-hint>
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Categories Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectCategoriesPath" placeholder="categories">
                  <mat-hint>Where to find this project's categories, relative to the project itself (not the response root).</mat-hint>
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
                  <mat-hint>Optional. Stored so future syncs can match this category even if its name changes.</mat-hint>
                </mat-form-field>
              </div>

              <div class="custom-fields-section">
                <div class="custom-fields-header">
                  <span class="custom-fields-title">Custom Properties</span>
                  <button mat-icon-button color="primary" (click)="addCustomField()" matTooltip="Add property" class="add-row-btn">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
                <p class="custom-fields-hint">Extra fields this system needs beyond the defaults above. Each one is extracted per project/category and becomes available as <code class="path-code">{{ '{' }}label{{ '}' }}</code> when building other requests for that project/category (e.g. Add Timesheet Entry), the same way Category ID does.</p>
                @for (entry of customFieldEntries(); track $index) {
                  <div class="header-row">
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Label</mat-label>
                      <input matInput [(ngModel)]="entry.key" placeholder="billingCode">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Path</mat-label>
                      <input matInput [(ngModel)]="entry.value" placeholder="billing.code">
                    </mat-form-field>
                    <button mat-icon-button class="remove-btn" (click)="removeCustomField(entry.key)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
                @if (customFieldEntries().length === 0) {
                  <div class="empty-rows-hint">No custom properties — click + to add one</div>
                }
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

          @if (data.action === 'FetchTimesheetApprovals') {
            <div class="map-block">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Array Path (optional)</mat-label>
                <input matInput [(ngModel)]="data.mapping.arrayPath" placeholder="e.g. TeamsToSignOff">
                <mat-hint>Top-level array. Leave empty if response is itself a top-level array</mat-hint>
              </mat-form-field>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Employees Path (optional)</mat-label>
                  <input matInput [(ngModel)]="data.mapping.employeesPath" placeholder="Employees">
                  <mat-hint>Relative to each top-level item. Leave empty if it's already an employee</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Days Path (optional)</mat-label>
                  <input matInput [(ngModel)]="data.mapping.daysArrayPath" placeholder="Days">
                  <mat-hint>Relative to each employee. Leave empty if entries are directly underneath</mat-hint>
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Entries Path (optional)</mat-label>
                  <input matInput [(ngModel)]="data.mapping.entriesPath" placeholder="TimesheetEntries">
                  <mat-hint>Relative to each day. Leave empty if the day itself is the entry</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Member Name Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.memberNamePath" placeholder="Name">
                  <mat-hint>Relative to each employee</mat-hint>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Team Name Path (optional)</mat-label>
                <input matInput [(ngModel)]="data.mapping.teamNamePath" placeholder="TeamName">
                <mat-hint>Relative to each top-level item. Lets the approval screen filter out whole teams</mat-hint>
              </mat-form-field>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Date Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.datePath" placeholder="Date">
                  <mat-hint>Relative to each entry</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Member ID Path (optional)</mat-label>
                  <input matInput [(ngModel)]="data.mapping.memberIdPath" placeholder="EmployeeId">
                  <mat-hint>Relative to each employee</mat-hint>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Day Date Path (optional)</mat-label>
                <input matInput [(ngModel)]="data.mapping.dayDatePath" placeholder="Date">
                <mat-hint>
                  Relative to each day. A day present here with no entries is still outstanding;
                  a day missing entirely is treated as already signed off. Needed for the
                  missing-timesheet weekly summary — leave empty to skip that distinction.
                </mat-hint>
              </mat-form-field>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Project Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectPath" placeholder="project">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Category Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.categoryPath" placeholder="category">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Hours Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.hoursPath" placeholder="hours">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Minutes Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.minutesPath" placeholder="minutes">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Billable Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.billablePath" placeholder="billable">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Worked From Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.workedFromPath" placeholder="workedFrom">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Description Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.descriptionPath" placeholder="description">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Ticket Number Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.ticketNumberPath" placeholder="ticketNumber">
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>External ID Path (optional)</mat-label>
                <input matInput [(ngModel)]="data.mapping.externalIdPath" placeholder="entryId">
                <mat-hint>Path to this entry's ID in the external system, if available</mat-hint>
              </mat-form-field>
            </div>
          }

          @if (data.action === 'AiConnection') {
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
          <div class="form-section" id="section-code" [class.open]="showBody('code')">
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
                    <div class="test-response-actions">
                      @if (hasProjectMapping() && testResult()!.success) {
                        <button mat-button color="primary" class="use-response-btn" (click)="useResponseForMapping()">
                          <mat-icon style="font-size:15px;width:15px;height:15px">arrow_forward</mat-icon> Use this response to test mapping
                        </button>
                      }
                      <button mat-icon-button (click)="copyTestResponse()" class="close-test-btn" matTooltip="Copy">
                        <mat-icon style="font-size:16px;width:16px;height:16px">content_copy</mat-icon>
                      </button>
                      <button mat-icon-button (click)="testResult.set(null)" class="close-test-btn"><mat-icon>close</mat-icon></button>
                    </div>
                  </div>
                  <pre class="test-response-body">{{ formatTestBody(testResult()!.body) }}</pre>

                  @if (testResult()!.success) {
                    @if (hasProjectMapping()) {
                      <div class="map-field-breakdown">
                        <div class="map-field-breakdown-title">
                          Response Mapping — {{ projectMappingResults() === null ? 'checking…' : projectMappingResults()!.length + ' project(s) found' }}
                        </div>
                        @if (firstProjectBreakdown(); as rows) {
                          @for (row of rows; track row.label) {
                            <div class="test-result-row">
                              <span class="test-label">{{ row.label }} <code class="path-code">{{ row.path }}</code></span>
                              <span class="test-value">→ {{ row.value }}</span>
                            </div>
                          }
                        }
                      </div>
                    } @else if (mappingPreview(); as preview) {
                      <div class="map-field-breakdown">
                        @if (preview.error) {
                          <div class="map-field-breakdown-title" style="color:#ef5350">{{ preview.error }}</div>
                        } @else {
                          <div class="map-field-breakdown-title">
                            Response Mapping{{ preview.kind === 'array' ? ' — ' + preview.count + ' item(s) found' : '' }}
                          </div>
                          @for (row of preview.rows; track row.label) {
                            <div class="test-result-row">
                              <span class="test-label">{{ row.label }} <code class="path-code">{{ row.path }}</code></span>
                              <span class="test-value">→ {{ row.value }}</span>
                            </div>
                          }
                        }
                      </div>
                    }
                  }
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

    /* Mobile — wizard: one section visible at a time */
    .mobile-wizard-nav { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
    .wizard-nav-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#64b5f6; font-family:inherit; font-size:0.82rem; font-weight:600; padding:8px 14px; border-radius:8px; cursor:pointer; }
    .wizard-nav-btn:disabled { color:rgba(255,255,255,0.25); cursor:default; }
    .wizard-step-label { font-size:0.74rem; color:rgba(255,255,255,0.45); font-family:monospace; }
    .wizard-step-title { font-size:1.05rem; font-weight:700; color:rgba(255,255,255,0.95); margin-bottom:12px; }

    /* Form sections */
    .form-grid { display: flex; flex-direction: column; gap: 6px; }
    .form-section { overflow: hidden; transition: border-color 0.15s, background 0.15s; }
    .form-section.open { border: 1px solid rgba(100,181,246,0.25); border-radius: 10px; background: rgba(255,255,255,0.03); }

    /* On desktop, the rail drives navigation and there's no per-section border; on mobile, the wizard nav does */
    .form-shell.md .form-grid { gap: 0; }
    .form-shell.md .form-section.open { border: none; background: none; border-radius: 0; overflow: visible; }
    .form-shell.md .section-body { padding: 0; }

    .section-body { padding: 4px 14px 16px; }
    .section-add-row { display: flex; justify-content: flex-end; margin-bottom: 2px; }
    .map-block { padding-top: 2px; }
    .map-sublabel-row { display: flex; justify-content: flex-end; margin-bottom: 6px; }
    .add-row-btn { width: 28px; height: 28px; line-height: 28px; color: #64b5f6; }
    .add-row-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .full-width { width: 100%; display: block; margin-bottom: 18px; }
    .half-width { flex: 1; min-width: 80px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }

.header-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px; flex-wrap: nowrap; }
    .remove-btn { margin-top: 4px; flex-shrink: 0; color: rgba(239,83,80,0.5); }
    .remove-btn:hover { color: #ef5350; }
    .lock-btn { margin-top: 4px; flex-shrink: 0; }
    .secret-value-row { display: flex; align-items: center; gap: 8px; min-height: 56px; padding: 0 4px; }
    .secret-placeholder { font-family: monospace; font-size: 1.1rem; color: rgba(255,255,255,0.3); letter-spacing: 3px; flex: 1; }
    .change-secret-btn { font-size: 0.78rem; color: #64b5f6; }
    .empty-rows-hint { font-size: 0.75rem; color: rgba(255,255,255,0.25); padding: 4px 0 8px; }

    .custom-fields-section { margin-top: 8px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.07); }
    .custom-fields-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .custom-fields-title { font-size: 0.78rem; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.4px; }
    .custom-fields-hint { font-size: 0.74rem; color: rgba(255,255,255,0.35); margin: 0 0 10px; line-height: 1.5; }

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
    .test-result-row { display: flex; gap: 8px; font-size: 0.75rem; margin-bottom: 4px; flex-wrap: wrap; }
    .test-label { color: rgba(255,255,255,0.4); min-width: 60px; }
    .test-value { color: #4caf50; font-family: monospace; }
    .map-field-breakdown { background: rgba(100,181,246,0.06); border: 1px solid rgba(100,181,246,0.15); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
    .map-field-breakdown-title { font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 6px 0; }
    .path-code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; color: rgba(255,255,255,0.6); }

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
    .test-response-actions { display: flex; align-items: center; gap: 4px; }
    .use-response-btn { font-size: 0.75rem; }
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

    /* Inline template fields (URL, header values) — plain editable input plus a separate
       read-only preview underneath showing which {placeholders} resolve. No overlay, so there's
       nothing to desync during text selection. */
    .tpl-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px; flex: 1; min-width: 80px; }
    .tpl-input-plain { display: block; width: 100%; padding: 12px 14px; font-size: 0.9rem; font-family: inherit; line-height: 1.375; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
    .tpl-input-plain:focus { border-color: rgba(100,181,246,0.5); }
    .tpl-input-plain::placeholder { color: rgba(255,255,255,0.3); }
    .tpl-preview { margin: 0; padding: 6px 10px; font-size: 0.78rem; font-family: inherit; line-height: 1.375; white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.2); border-radius: 4px; color: rgba(255,255,255,0.6); }

    /* Body template field — same plain-input + separate preview approach */
    .body-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
    .body-textarea-plain { display: block; width: 100%; min-height: 80px; padding: 10px 12px; font-size: 0.8rem; font-family: monospace; line-height: 1.5625; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; outline: none; resize: vertical; box-sizing: border-box; transition: border-color 0.15s; }
    .body-textarea-plain:focus { border-color: rgba(100,181,246,0.5); }
    .body-textarea-plain::placeholder { color: rgba(255,255,255,0.3); }
    .body-preview { margin: 0; padding: 8px 12px; font-size: 0.72rem; font-family: monospace; line-height: 1.5625; white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.2); border-radius: 4px; color: rgba(255,255,255,0.6); max-height: 160px; overflow-y: auto; }
    .body-footer-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .body-chips { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
    .body-legend { display: flex; gap: 10px; align-items: center; flex-shrink: 0; padding-top: 2px; }
    .legend-item { display: inline-flex; align-items: center; gap: 4px; font-size: 0.68rem; color: rgba(255,255,255,0.35); white-space: nowrap; }
    .legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .legend-resolved { background: #42a5f5; }
    .legend-missing { background: #ffa726; }

    @media (max-width: 640px) {
      .edit-page { padding: 8px 8px 100px; }
      .two-col { grid-template-columns: 1fr; gap: 28px; }
      .header-row { flex-wrap: wrap; }
      .page-footer { padding: 10px 12px; }
      .curl-import-btn { padding: 6px 10px; gap: 8px; margin-bottom: 10px; }
      .curl-import-icon-wrap { width: 24px; height: 24px; }
      .curl-import-icon-wrap mat-icon { font-size: 14px; width: 14px; height: 14px; }
      .curl-import-sub { display: none; }
      .curl-import-label { font-size: 0.78rem; }
      .header-toggles { flex-basis: 100%; justify-content: flex-end; margin-top: 4px; }
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
  customFieldEntries = signal<{key: string, value: string}[]>([]);
  actions = REQUEST_ACTIONS;
  configVars = signal<{key: string, value: string, isSecret: boolean}[]>([]);
  get configVarKeys() { return this.configVars().map(v => v.key); }

  get bodyVarChips(): string[] {
    if (!this.data) return [];
    const cookieNames = this.cookieVarNames();
    const paramNames = this.parameterEntries().map(e => e.key.trim()).filter(Boolean);
    const actionVars = Object.keys(REQUEST_ACTIONS.find(a => a.value === this.data!.action)?.vars ?? {});
    return [...cookieNames, ...paramNames, ...actionVars];
  }

  showCurlImport = signal(false);
  curlInput = '';
  curlParseError = signal('');
  testing = signal(false);
  testResult = signal<TestRequestResult | null>(null);
  mappingPreview = signal<MappingPreview | null>(null);
  curlSegs = signal<CodeSegment[]>([]);
  httpSegs = signal<CodeSegment[]>([]);
  bodySegs = signal<CodeSegment[]>([]);
  urlSegs = signal<CodeSegment[]>([]);

  private readonly SYSTEM_VARS = new Set([
    'start', 'end', 'teamIds', 'date', 'id', 'project', 'category',
    'hours', 'minutes', 'billable', 'workedFrom', 'sentiment',
    'description', 'ticketNumber', 'jokeType', 'seed', 'nominee', 'title',
    'employeeId', 'categoryId', 'workedFromLocationId', 'timesheetEntryId',
    'topic', 'angle', 'recentTopics', 'memberName', 'totalHours'
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

  showProjectTest = signal(false);
  projectSampleResponse = signal('');
  testingProjectMapping = signal(false);
  projectMappingResults = signal<ProjectMappingResult[] | null>(null);
  projectMappingError = signal('');

  private mobile = inject(MobileService);
  get isDesktop() { return !this.mobile.isMobile(); }

  activeSection = signal<string>('basic');

  constructor() {
    effect(() => {
      if (this.activeSection() === 'code') untracked(() => this.generateCode());
    });
    effect(() => {
      if (this.activeSection() === 'body') untracked(() => this.updateBodySegs());
    });
    effect(() => {
      if (this.activeSection() === 'request') untracked(() => this.updateUrlSegs());
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

  showBody(key: string) { return this.activeSection() === key; }

  currentStepIndex(): number {
    const idx = this.sectionList.findIndex(s => s.key === this.activeSection());
    return idx === -1 ? 0 : idx;
  }

  prevStep() {
    const list = this.sectionList;
    const idx = this.currentStepIndex();
    if (idx > 0) this.activeSection.set(list[idx - 1].key);
  }

  nextStep() {
    const list = this.sectionList;
    const idx = this.currentStepIndex();
    if (idx < list.length - 1) this.activeSection.set(list[idx + 1].key);
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
    return this.data ? ['AddTimesheetEntry', 'GetTimesheetProjects', 'GetTimesheetProjectCategories', 'FetchLeave',
            'AiConnection', 'FetchCalendarEvents', 'FetchTimesheetApprovals'].includes(this.data.action) : false;
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
      ...this.SYSTEM_VARS
    ]);
    const regularHeaderValues = this.headerEntries().filter(e => !e.secret).map(e => e.value).join(' ');
    const template = (this.data.bodyTemplate ?? '') + regularHeaderValues;
    const matches = [...template.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    return [...new Set(matches)].filter(v => !knownParams.has(v));
  }

  // 'date' is the one placeholder that needs a live value rather than a fixed sample, so it's
  // special-cased here instead of in the centralized REQUEST_ACTIONS.vars sample data.
  testVarPlaceholder(v: string): string {
    if (v === 'date') return new Date().toISOString().split('T')[0];
    const actionVars: Record<string, string> = this.data
      ? REQUEST_ACTIONS.find(a => a.value === this.data!.action)?.vars ?? {}
      : {};
    return actionVars[v] ?? '';
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
    this.customFieldEntries.set(Object.entries(this.data.mapping.customFields || {}).map(([k, v]) => ({ key: k, value: v as string })));

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

  addCustomField() { this.customFieldEntries.set([...this.customFieldEntries(), { key: '', value: '' }]); }
  removeCustomField(key: string) { this.customFieldEntries.set(this.customFieldEntries().filter(e => e.key !== key)); }

  private computeSegs(template: string): CodeSegment[] {
    const { params, cookieVars } = this.getResolveContext();
    const segs: CodeSegment[] = [];
    // Split only on clean {word} tokens -- a naive "{ any non-} chars }" split would let an
    // unrelated literal '{' earlier in the template (e.g. a JSON body's opening brace) swallow
    // the next real placeholder up through its closing '}', leaving it unstyled.
    for (const part of template.split(/(\{\w+\})/)) {
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

  hasPlaceholders(segs: CodeSegment[]): boolean {
    return segs.some(s => s.kind !== 'plain');
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

  hasProjectMapping(): boolean {
    return this.data?.action === 'GetTimesheetProjects' || this.data?.action === 'GetTimesheetProjectCategories';
  }

  useResponseForMapping() {
    const body = this.testResult()?.body;
    if (!body) return;
    this.projectSampleResponse.set(body);
    this.showProjectTest.set(true);
    this.activeSection.set('mapping');
    this.testProjectMapping();
  }

  firstProjectBreakdown(): { label: string; path: string; value: string }[] | null {
    const results = this.projectMappingResults();
    if (!results || results.length === 0 || !this.data) return null;
    const first = results[0];
    const m = this.data.mapping;
    const rows = [
      { label: 'Project Name Path', path: m.projectNamePath || '(not set)', value: first.name },
      { label: 'Project ID Path', path: m.projectIdPath || '(not set)', value: first.id ?? '(empty)' }
    ];
    for (const [label, path] of Object.entries(this.liveCustomFields())) {
      const value = first.customFields[label];
      rows.push({ label, path, value: value ?? '(empty)' });
    }
    if (m.projectCategoriesPath) {
      rows.push({ label: 'Categories Path', path: m.projectCategoriesPath, value: `${first.categories.length} found` });
      if (first.categories.length > 0) {
        const firstCat = first.categories[0];
        rows.push({ label: 'Category Name Path', path: m.categoryNamePath || '(not set)', value: firstCat.name });
        rows.push({ label: 'Category ID Path', path: m.categoryIdPath || '(not set)', value: firstCat.id ?? '(empty)' });
        for (const [label, path] of Object.entries(this.liveCustomFields())) {
          const value = firstCat.customFields[label];
          rows.push({ label: `${label} (category)`, path, value: value ?? '(empty)' });
        }
      }
    }
    return rows;
  }

  projectSamplePlaceholder(): string {
    const sample = JSON.stringify([{ name: 'Project A', categories: [{ name: 'Dev' }] }]);
    return this.data?.mapping.responseFormat === 'html' ? `...new timesheet(${sample})...` : sample;
  }

  private liveCustomFields(): Record<string, string> {
    const customFields: Record<string, string> = {};
    for (const entry of this.customFieldEntries()) { if (entry.key.trim()) customFields[entry.key.trim()] = entry.value; }
    return customFields;
  }

  testProjectMapping() {
    if (!this.data) return;
    const raw = this.projectSampleResponse().trim();
    if (!raw) return;
    this.testingProjectMapping.set(true);
    this.projectMappingError.set('');
    this.projectMappingResults.set(null);
    const mapping = { ...this.data.mapping, customFields: this.liveCustomFields() };
    this.svc.testProjectMapping(raw, mapping).subscribe({
      next: (result) => { this.projectMappingResults.set(result.projects); this.testingProjectMapping.set(false); },
      error: (err) => {
        this.projectMappingError.set(err.error || 'Failed to test mapping');
        this.testingProjectMapping.set(false);
      }
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
    // Same fix as computeSegs() -- split only on clean {word} tokens so an unrelated literal '{'
    // earlier in the template can't swallow the next real placeholder.
    const parts = template.split(/(\{\w+\})/);
    for (const part of parts) {
      const m = part.match(/^\{(\w+)\}$/);
      if (!m) { if (part) segs.push({ text: part, kind: 'plain' }); continue; }
      const k = m[1];
      const cv = this.configVars().find(c => !c.isSecret && c.key === k);
      if (cv) { segs.push({ text: cv.value, kind: 'resolved' }); continue; }
      if (cookieVars[k]) { segs.push({ text: cookieVars[k], kind: 'resolved' }); continue; }
      if (params[k]) { segs.push({ text: params[k], kind: 'resolved' }); continue; }
      if (this.testVars[k]) { segs.push({ text: this.testVars[k], kind: 'resolved' }); continue; }
      if (this.SYSTEM_VARS.has(k)) { segs.push({ text: this.testVarPlaceholder(k) || `sample-${k}`, kind: 'resolved' }); continue; }
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

  copyTestResponse() {
    const result = this.testResult();
    if (!result) return;
    navigator.clipboard.writeText(this.formatTestBody(result.body));
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
      next: (result) => {
        this.testResult.set(result);
        this.testing.set(false);
        this.mappingPreview.set(null);
        if (result.success) this.computeMappingPreview(result.body);
        if (result.success && this.hasProjectMapping()) {
          this.projectSampleResponse.set(result.body);
          this.testProjectMapping();
        }
      },
      error: () => { this.testing.set(false); this.snackBar.open('Test request failed', 'Close', { duration: 3000 }); }
    });
  }

  private computeMappingPreview(rawBody: string) {
    if (!this.data || this.hasProjectMapping()) return;
    let root: unknown;
    try { root = JSON.parse(rawBody); } catch { return; }
    const m = this.data.mapping;
    const action = this.data.action;

    if (action === 'FetchLeave') {
      this.computeArrayMappingPreview(root, m.arrayPath, [
        { label: 'Name', path: m.namePath }, { label: 'Start', path: m.startPath },
        { label: 'End', path: m.endPath }, { label: 'Type', path: m.typePath },
        { label: 'Days', path: m.daysPath }, { label: 'Status', path: m.statusPath },
      ]);
    } else if (action === 'FetchCalendarEvents') {
      this.computeArrayMappingPreview(root, m.arrayPath, [
        { label: 'Subject', path: m.subjectPath ?? '' }, { label: 'Is All Day', path: m.isAllDayPath ?? '' },
        { label: 'Start', path: m.startPath }, { label: 'End', path: m.endPath },
        { label: 'Location', path: m.locationPath ?? '' },
      ]);
    } else if (action === 'FetchTimesheetApprovals') {
      this.computeTimesheetApprovalPreview(root, m);
    } else if (action === 'AddTimesheetEntry') {
      this.computeSingleMappingPreview(root, [{ label: 'External ID', path: m.externalIdPath }]);
    } else if (action === 'AiConnection') {
      this.computeSingleMappingPreview(root, [{ label: 'Text Response', path: m.textResponsePath }]);
    }
  }

  private computeArrayMappingPreview(root: unknown, arrayPath: string, fieldDefs: { label: string; path: string }[]) {
    const arr = arrayPath ? this.getAtPath(root, arrayPath) : root;
    if (!Array.isArray(arr)) {
      this.mappingPreview.set({
        kind: 'array', rows: [],
        error: arrayPath ? `Array path "${arrayPath}" did not resolve to an array` : 'Response root is not an array'
      });
      return;
    }
    const first = arr[0];
    const rows = fieldDefs.map(f => ({
      label: f.label,
      path: f.path || '(not set)',
      value: first === undefined ? '(no items)' : this.previewValue(this.getAtPath(first, f.path))
    }));
    this.mappingPreview.set({ kind: 'array', count: arr.length, rows });
  }

  // Mirrors the backend's nested flatten (ArrayPath -> EmployeesPath -> DaysArrayPath -> EntriesPath),
  // where each lower level is optional. Walks the same way ConfigurableTimesheetApprovalFetcher does
  // so the preview reflects exactly what import will produce, including the member name pulled from
  // the employee level rather than the entry itself.
  private computeTimesheetApprovalPreview(root: unknown, m: MappingConfig) {
    const topArr = m.arrayPath ? this.getAtPath(root, m.arrayPath) : root;
    if (!Array.isArray(topArr)) {
      this.mappingPreview.set({
        kind: 'array', rows: [],
        error: m.arrayPath ? `Array path "${m.arrayPath}" did not resolve to an array` : 'Response root is not an array'
      });
      return;
    }

    const enumerateLevel = (element: unknown, path: string | undefined): unknown[] => {
      if (!path) return [element];
      const resolved = this.getAtPath(element, path);
      return Array.isArray(resolved) ? resolved : [];
    };

    let firstEntry: unknown;
    let firstMemberName: unknown;
    let count = 0;
    for (const group of topArr) {
      for (const employee of enumerateLevel(group, m.employeesPath)) {
        const memberName = this.getAtPath(employee, m.memberNamePath ?? '');
        for (const day of enumerateLevel(employee, m.daysArrayPath)) {
          for (const entry of enumerateLevel(day, m.entriesPath)) {
            count++;
            if (firstEntry === undefined) { firstEntry = entry; firstMemberName = memberName; }
          }
        }
      }
    }

    const fieldDefs = [
      { label: 'Member Name', value: firstMemberName },
      { label: 'Date', path: m.datePath ?? '' },
      { label: 'Project', path: m.projectPath ?? '' }, { label: 'Category', path: m.categoryPath ?? '' },
      { label: 'Hours', path: m.hoursPath ?? '' }, { label: 'Minutes', path: m.minutesPath ?? '' },
      { label: 'Billable', path: m.billablePath ?? '' }, { label: 'Worked From', path: m.workedFromPath ?? '' },
      { label: 'Description', path: m.descriptionPath ?? '' }, { label: 'Ticket Number', path: m.ticketNumberPath ?? '' },
      { label: 'External ID', path: m.externalIdPath },
    ];
    const rows = fieldDefs.map(f => ({
      label: f.label,
      path: 'path' in f ? (f.path || '(not set)') : (m.memberNamePath || '(not set)'),
      value: firstEntry === undefined
        ? '(no items)'
        : 'value' in f ? this.previewValue(f.value) : this.previewValue(this.getAtPath(firstEntry, f.path!))
    }));
    this.mappingPreview.set({ kind: 'array', count, rows });
  }

  private computeSingleMappingPreview(root: unknown, fieldDefs: { label: string; path: string }[]) {
    const rows = fieldDefs.map(f => ({
      label: f.label,
      path: f.path || '(not set)',
      value: this.previewValue(this.getAtPath(root, f.path))
    }));
    this.mappingPreview.set({ kind: 'single', rows });
  }

  private previewValue(v: unknown): string {
    if (v === undefined || v === null || v === '') return '(empty)';
    return typeof v === 'string' ? v : JSON.stringify(v);
  }

  private getAtPath(root: unknown, path: string): unknown {
    if (!path) return undefined;
    let current: any = root;
    for (const segment of this.parseMappingPath(path)) {
      if (current === null || current === undefined) return undefined;
      current = current[segment];
    }
    return current;
  }

  // Mirrors the backend's path parser (dot-separated segments, [index] for array access)
  private parseMappingPath(path: string): string[] {
    const segments: string[] = [];
    let current = '';
    let i = 0;
    while (i < path.length) {
      if (path[i] === '.') {
        if (current) { segments.push(current); current = ''; }
        i++;
      } else if (path[i] === '[') {
        if (current) { segments.push(current); current = ''; }
        i++;
        const end = path.indexOf(']', i);
        if (end > i) { segments.push(path.substring(i, end)); i = end + 1; }
        else break;
      } else {
        current += path[i];
        i++;
      }
    }
    if (current) segments.push(current);
    return segments;
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

    const customFields: Record<string, string> = {};
    for (const entry of this.customFieldEntries()) { if (entry.key.trim()) customFields[entry.key.trim()] = entry.value; }
    this.data.mapping = { ...this.data.mapping, customFields };

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
        responseFormat: 'json', htmlJsonMarker: '', employeeIdPattern: '',
        textResponsePath: '', subjectPath: 'subject', isAllDayPath: 'isAllDay', locationPath: 'location',
        customFields: {}
      }
    };
  }
}
