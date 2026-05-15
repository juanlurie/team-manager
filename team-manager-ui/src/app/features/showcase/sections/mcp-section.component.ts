import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ShowcaseDataService } from '../services/showcase-data.service';
import { McpDomain, McpTool } from '../models/showcase.model';

@Component({
  selector: 'app-mcp-section',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Model Context Protocol (MCP) Server</h2>
        <p class="section-desc">Expose the entire Team Manager API to AI assistants like Claude, Cursor, and Windsurf. Let AI agents read your sprint data, create work items, and manage meetings through natural language.</p>
      </div>
      <div class="meta-bar">
        <span class="meta-item"><mat-icon>code</mat-icon> Server: <code>mcp-server/server.py</code></span>
        <span class="meta-item"><mat-icon>usb</mat-icon> Transport: stdio</span>
        <span class="meta-item"><mat-icon>build</mat-icon> Total: {{ totalTools }}+ tools across {{ domains.length }} domains</span>
      </div>

      <div class="search-bar">
        <mat-icon>search</mat-icon>
        <input type="text" placeholder="Search tools by name..." [value]="searchTerm()" (input)="onSearch($event)" />
        @if (searchTerm()) {
          <button class="clear-btn" (click)="clearSearch()"><mat-icon>close</mat-icon></button>
        }
      </div>

      <div class="accordion">
        @for (domain of filteredDomains(); track domain.name; let i = $index) {
          <div class="accordion-item">
            <button class="accordion-header" (click)="toggleDomain(i)">
              <mat-icon class="domain-icon">{{ domain.icon }}</mat-icon>
              <span class="domain-name">{{ domain.name }}</span>
              <span class="tool-count">{{ domain.toolCount }} tools</span>
              <mat-icon class="chevron">{{ expandedIndex() === i ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
            @if (expandedIndex() === i) {
              <div class="accordion-body">
                @for (tool of filteredTools(domain.tools); track tool.name) {
                  <div class="tool-row" [matTooltip]="tool.apiEndpoint" matTooltipPosition="above">
                    <code class="tool-name">{{ tool.name }}</code>
                    <span class="tool-desc">{{ tool.description }}</span>
                    <span class="param-badge">{{ tool.requiredParams.length }} param{{ tool.requiredParams.length !== 1 ? 's' : '' }}</span>
                    <span class="http-method" [class]="tool.httpMethod.toLowerCase()">{{ tool.httpMethod }}</span>
                  </div>
                }
                @if (filteredTools(domain.tools).length === 0) {
                  <div class="no-results">No tools match "{{ searchTerm() }}"</div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .section { padding: 8px 0; }
    .section-title { font-size: 1.1rem; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 6px; }
    .section-desc { font-size: 0.82rem; color: rgba(255,255,255,0.45); margin: 0 0 12px; line-height: 1.5; }

    .meta-bar {
      display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;
      padding: 12px 16px; background: rgba(255,255,255,0.02); border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .meta-item {
      display: flex; align-items: center; gap: 6px; font-size: 0.78rem;
      color: rgba(255,255,255,0.55);
    }
    .meta-item mat-icon { font-size: 16px; width: 16px; height: 16px; color: #64b5f6; }
    .meta-item code {
      background: rgba(100,181,246,0.1); color: #64b5f6; padding: 1px 6px;
      border-radius: 3px; font-size: 0.75rem; font-family: 'SF Mono', 'Fira Code', monospace;
    }

    .search-bar {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px; margin-bottom: 16px;
    }
    .search-bar mat-icon { color: rgba(255,255,255,0.35); font-size: 20px; width: 20px; height: 20px; }
    .search-bar input {
      flex: 1; background: none; border: none; outline: none; color: rgba(255,255,255,0.85);
      font-size: 0.85rem; font-family: inherit;
    }
    .search-bar input::placeholder { color: rgba(255,255,255,0.3); }
    .clear-btn {
      background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.35);
      display: flex; align-items: center; padding: 0;
    }
    .clear-btn:hover { color: rgba(255,255,255,0.7); }

    .accordion { display: flex; flex-direction: column; gap: 4px; }
    .accordion-item {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px; overflow: hidden;
    }
    .accordion-header {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 16px;
      background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7);
      font-size: 0.88rem; font-weight: 500; font-family: inherit;
      transition: background 0.15s;
    }
    .accordion-header:hover { background: rgba(255,255,255,0.04); }
    .domain-icon { font-size: 20px; width: 20px; height: 20px; color: #64b5f6; }
    .domain-name { flex: 1; text-align: left; }
    .tool-count {
      font-size: 0.75rem; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.06);
      padding: 2px 8px; border-radius: 10px;
    }
    .chevron { color: rgba(255,255,255,0.3); font-size: 20px; width: 20px; height: 20px; }

    .accordion-body { padding: 0 16px 12px; }
    .tool-row {
      display: flex; align-items: center; gap: 12px; padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.03); cursor: default;
    }
    .tool-row:last-child { border-bottom: none; }
    .tool-row:hover { background: rgba(255,255,255,0.02); }
    .tool-name {
      font-size: 0.78rem; color: #64b5f6; background: rgba(100,181,246,0.08);
      padding: 2px 8px; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', monospace;
      min-width: 180px; flex-shrink: 0;
    }
    .tool-desc { flex: 1; font-size: 0.78rem; color: rgba(255,255,255,0.5); }
    .param-badge {
      font-size: 0.68rem; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.06);
      padding: 2px 6px; border-radius: 3px;
    }
    .http-method {
      font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 3px;
      min-width: 42px; text-align: center;
    }
    .http-method.get { color: #81c784; background: rgba(129,199,132,0.12); }
    .http-method.post { color: #64b5f6; background: rgba(100,181,246,0.12); }
    .http-method.put { color: #ffb74d; background: rgba(255,183,77,0.12); }
    .http-method.patch { color: #ce93d8; background: rgba(206,147,216,0.12); }
    .http-method.delete { color: #ef5350; background: rgba(239,83,80,0.12); }

    .no-results { padding: 12px 0; font-size: 0.8rem; color: rgba(255,255,255,0.35); text-align: center; }
  `],
})
export class McpSectionComponent {
  private svc = inject(ShowcaseDataService);
  domains: McpDomain[] = this.svc.getMcpDomains();
  expandedIndex = signal<number | null>(null);
  searchTerm = signal('');

  totalTools = this.domains.reduce((sum, d) => sum + d.toolCount, 0);

  filteredDomains() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.domains;
    return this.domains.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.tools.some(t => t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term))
    );
  }

  filteredTools(tools: McpTool[]): McpTool[] {
    const term = this.searchTerm().toLowerCase();
    if (!term) return tools;
    return tools.filter(t =>
      t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term)
    );
  }

  toggleDomain(index: number) {
    this.expandedIndex.set(this.expandedIndex() === index ? null : index);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  clearSearch() {
    this.searchTerm.set('');
  }
}
