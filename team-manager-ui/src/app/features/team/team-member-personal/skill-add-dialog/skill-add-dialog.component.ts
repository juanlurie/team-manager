import { Component, ElementRef, ViewChild, inject, HostListener, signal, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface SkillAddResult {
  name: string;
  category?: string;
  rating?: number;
  yearsOfExperience?: number;
  notes?: string;
}

interface SkillPreset {
  name: string;
  category: string;
}

const PRESETS: SkillPreset[] = [
  // Frontend
  { name: 'Angular', category: 'Technical' },
  { name: 'React', category: 'Technical' },
  { name: 'Vue.js', category: 'Technical' },
  { name: 'Svelte', category: 'Technical' },
  { name: 'TypeScript', category: 'Technical' },
  { name: 'JavaScript', category: 'Technical' },
  { name: 'HTML5', category: 'Technical' },
  { name: 'CSS3', category: 'Technical' },
  { name: 'SCSS', category: 'Technical' },
  { name: 'Tailwind CSS', category: 'Technical' },
  { name: 'Bootstrap', category: 'Technical' },
  { name: 'Next.js', category: 'Technical' },
  { name: 'Nuxt.js', category: 'Technical' },
  { name: 'RxJS', category: 'Technical' },
  { name: 'NgRx', category: 'Technical' },
  { name: 'Redux', category: 'Technical' },
  { name: 'Zustand', category: 'Technical' },
  { name: 'Jest', category: 'Technical' },
  { name: 'Cypress', category: 'Technical' },
  { name: 'Playwright', category: 'Technical' },
  { name: 'Storybook', category: 'Technical' },
  { name: 'Webpack', category: 'Technical' },
  { name: 'Vite', category: 'Technical' },
  { name: 'ESLint', category: 'Technical' },
  { name: 'Prettier', category: 'Technical' },
  // Backend
  { name: 'C#', category: 'Technical' },
  { name: '.NET', category: 'Technical' },
  { name: '.NET Core', category: 'Technical' },
  { name: 'ASP.NET Core', category: 'Technical' },
  { name: 'Entity Framework', category: 'Technical' },
  { name: 'LINQ', category: 'Technical' },
  { name: 'PostgreSQL', category: 'Technical' },
  { name: 'SQL Server', category: 'Technical' },
  { name: 'MongoDB', category: 'Technical' },
  { name: 'Redis', category: 'Technical' },
  { name: 'MySQL', category: 'Technical' },
  { name: 'SQLite', category: 'Technical' },
  { name: 'Docker', category: 'Technical' },
  { name: 'Kubernetes', category: 'Technical' },
  { name: 'Azure', category: 'Technical' },
  { name: 'AWS', category: 'Technical' },
  { name: 'REST API', category: 'Technical' },
  { name: 'GraphQL', category: 'Technical' },
  { name: 'Node.js', category: 'Technical' },
  { name: 'Express', category: 'Technical' },
  { name: 'NestJS', category: 'Technical' },
  { name: 'Python', category: 'Technical' },
  { name: 'FastAPI', category: 'Technical' },
  { name: 'Django', category: 'Technical' },
  { name: 'Flask', category: 'Technical' },
  { name: 'Java', category: 'Technical' },
  { name: 'Spring Boot', category: 'Technical' },
  { name: 'Go', category: 'Technical' },
  { name: 'Rust', category: 'Technical' },
  { name: 'RabbitMQ', category: 'Technical' },
  { name: 'Kafka', category: 'Technical' },
  { name: 'gRPC', category: 'Technical' },
  { name: 'Blazor', category: 'Technical' },
  { name: 'SignalR', category: 'Technical' },
  // Mobile & Cross-platform
  { name: 'iOS', category: 'Technical' },
  { name: 'Swift', category: 'Technical' },
  { name: 'Android', category: 'Technical' },
  { name: 'Kotlin', category: 'Technical' },
  { name: 'Flutter', category: 'Technical' },
  { name: 'React Native', category: 'Technical' },
  { name: 'Xamarin', category: 'Technical' },
  { name: 'MAUI', category: 'Technical' },
  // DevOps & Cloud
  { name: 'Git', category: 'Technical' },
  { name: 'GitHub', category: 'Technical' },
  { name: 'GitLab', category: 'Technical' },
  { name: 'GitHub Actions', category: 'Technical' },
  { name: 'Azure DevOps', category: 'Technical' },
  { name: 'CI/CD', category: 'Technical' },
  { name: 'Terraform', category: 'Technical' },
  { name: 'Ansible', category: 'Technical' },
  { name: 'Linux', category: 'Technical' },
  { name: 'Bash', category: 'Technical' },
  { name: 'PowerShell', category: 'Technical' },
  { name: 'Nginx', category: 'Technical' },
  { name: 'Apache', category: 'Technical' },
  { name: 'Jenkins', category: 'Technical' },
  { name: 'ArgoCD', category: 'Technical' },
  { name: 'Helm', category: 'Technical' },
  { name: 'Azure Functions', category: 'Technical' },
  { name: 'AWS Lambda', category: 'Technical' },
  { name: 'AWS S3', category: 'Technical' },
  { name: 'DynamoDB', category: 'Technical' },
  { name: 'ElasticSearch', category: 'Technical' },
  { name: 'Datadog', category: 'Technical' },
  { name: 'Grafana', category: 'Technical' },
  // Testing
  { name: 'xUnit', category: 'Technical' },
  { name: 'NUnit', category: 'Technical' },
  { name: 'Moq', category: 'Technical' },
  { name: 'Integration Testing', category: 'Technical' },
  { name: 'Unit Testing', category: 'Technical' },
  { name: 'TDD', category: 'Technical' },
  { name: 'BDD', category: 'Technical' },
  { name: 'Selenium', category: 'Technical' },
  // Architecture & Practices
  { name: 'Microservices', category: 'Technical' },
  { name: 'Domain-Driven Design', category: 'Technical' },
  { name: 'Event-Driven Architecture', category: 'Technical' },
  { name: 'CQRS', category: 'Technical' },
  { name: 'SOLID', category: 'Technical' },
  { name: 'Clean Architecture', category: 'Technical' },
  { name: 'Test-Driven Development', category: 'Technical' },
  { name: 'Agile', category: 'Technical' },
  { name: 'Scrum', category: 'Technical' },
  { name: 'Kanban', category: 'Technical' },
  // Soft Skills
  { name: 'Communication', category: 'Soft Skills' },
  { name: 'Leadership', category: 'Soft Skills' },
  { name: 'Mentoring', category: 'Soft Skills' },
  { name: 'Problem Solving', category: 'Soft Skills' },
  { name: 'Critical Thinking', category: 'Soft Skills' },
  { name: 'Teamwork', category: 'Soft Skills' },
  { name: 'Adaptability', category: 'Soft Skills' },
  { name: 'Time Management', category: 'Soft Skills' },
  { name: 'Project Management', category: 'Soft Skills' },
  { name: 'Scrum Master', category: 'Soft Skills' },
  { name: 'Presentation', category: 'Soft Skills' },
  { name: 'Negotiation', category: 'Soft Skills' },
  { name: 'Conflict Resolution', category: 'Soft Skills' },
  { name: 'Facilitation', category: 'Soft Skills' },
  { name: 'Coaching', category: 'Soft Skills' },
];

const SKILL_CATEGORIES = ['Technical', 'Soft Skills'];

@Component({
  selector: 'app-skill-add-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="dialog-wrapper">
      <h2 mat-dialog-title>Add Skill</h2>
      <div mat-dialog-content class="dialog-content">
        <!-- Combined search / type field with autocomplete dropdown -->
        <div class="search-field">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            type="text"
            class="search-input"
            placeholder="Search or type a skill name…"
            [(ngModel)]="query"
            (input)="onQueryChange()"
            (focus)="onFocus()"
            (keydown)="onSearchKeydown($event)"
            (blur)="onBlur()"
          />
          @if (query) {
            <button class="clear-btn" (mousedown)="clearQuery()" tabindex="-1">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <!-- Suggestions dropdown -->
        @if (showDropdown() && suggestions().length > 0) {
          <div class="suggestions" #suggestionsEl>
            @for (s of suggestions(); track s.name; let i = $index) {
              <button
                class="suggestion-item"
                [class.selected]="i === highlightedIndex()"
                (mousedown)="selectSuggestion(s)"
                tabindex="-1"
              >
                <span class="suggestion-name">{{ s.name }}</span>
                <span class="suggestion-cat">{{ s.category }}</span>
              </button>
            }
          </div>
        }

        <!-- Category -->
        <div class="field-row">
          <label class="field-label">Category</label>
          <div class="category-chips">
            @for (cat of categories; track cat) {
              <button
                class="cat-chip"
                [class.active]="category() === cat"
                (click)="toggleCategory(cat)"
              >{{ cat }}</button>
            }
          </div>
        </div>

        <!-- Star rating -->
        <div class="field-row">
          <label class="field-label">Rating</label>
          <div class="stars">
            @for (i of [1,2,3,4,5]; track i) {
              <mat-icon
                class="star-icon"
                [class.filled]="i <= rating()"
                (click)="rating.set(i)"
              >star</mat-icon>
            }
            @if (rating() > 0) {
              <span class="star-value">{{ rating() }}/5</span>
            }
          </div>
        </div>

        <!-- Years of experience -->
        <div class="field-row">
          <label class="field-label">Years of experience</label>
          <div class="years-input">
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              [(ngModel)]="yearsOfExperience"
              placeholder="0"
              class="years-field"
            />
            <span class="years-label">years</span>
          </div>
        </div>

        <!-- Notes -->
        <div class="field-row">
          <label class="field-label">Notes</label>
          <textarea
            rows="2"
            [(ngModel)]="notes"
            placeholder="Optional notes…"
            class="notes-field"
          ></textarea>
        </div>
      </div>

      <div mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-flat-button color="primary" (click)="add()" [disabled]="!query.trim()">Add Skill</button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-wrapper { min-width: 320px; }
    .dialog-content { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

    /* Search field */
    .search-field { position: relative; }
    .search-icon {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      font-size: 18px; width: 18px; height: 18px; color: rgba(255,255,255,0.35); pointer-events: none; z-index: 1;
    }
    .search-input {
      width: 100%; padding: 12px 40px 12px 38px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: inherit;
      font-size: 0.9rem; outline: none; font-family: inherit; box-sizing: border-box;
    }
    .search-input:focus { border-color: rgba(100,181,246,0.5); }
    .clear-btn {
      position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer;
      display: flex; padding: 2px;
    }

    /* Suggestions dropdown */
    .suggestions {
      background: #1e2d3d; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
      max-height: 220px; overflow-y: auto; padding: 4px; margin-top: -10px;
    }
    .suggestion-item {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; padding: 8px 12px; background: none; border: none;
      color: rgba(255,255,255,0.85); font-size: 0.85rem; cursor: pointer;
      border-radius: 6px;
    }
    .suggestion-item:hover, .suggestion-item.selected {
      background: rgba(100,181,246,0.15); color: #64b5f6;
    }
    .suggestion-name { font-weight: 500; }
    .suggestion-cat { font-size: 0.75rem; opacity: 0.4; font-weight: 400; }

    /* Field rows */
    .field-row { display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: 0.82rem; font-weight: 600; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.03em; }

    /* Category chips */
    .category-chips { display: flex; gap: 8px; }
    .cat-chip {
      padding: 6px 18px; border-radius: 16px; font-size: 0.82rem; font-weight: 600;
      border: 1px solid rgba(255,255,255,0.15); background: transparent;
      color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.15s;
    }
    .cat-chip.active { border-color: #64b5f6; color: #64b5f6; background: rgba(100,181,246,0.12); }
    .cat-chip:hover:not(.active) { border-color: rgba(255,255,255,0.3); }

    /* Stars */
    .stars { display: flex; align-items: center; gap: 4px; }
    .star-icon { font-size: 28px; width: 28px; height: 28px; cursor: pointer; color: rgba(255,255,255,0.15); transition: color 0.1s; }
    .star-icon.filled { color: #ffb74d; }
    .star-value { font-size: 0.85rem; opacity: 0.5; margin-left: 8px; }

    /* Years */
    .years-input { display: flex; align-items: center; gap: 8px; }
    .years-field {
      width: 80px; padding: 8px 10px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: inherit;
      font-size: 0.9rem; outline: none; font-family: inherit;
    }
    .years-field:focus { border-color: rgba(100,181,246,0.5); }
    .years-label { font-size: 0.85rem; opacity: 0.5; }

    /* Notes */
    .notes-field {
      width: 100%; padding: 8px 10px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: inherit;
      font-size: 0.85rem; outline: none; resize: vertical; font-family: inherit;
      box-sizing: border-box;
    }
    .notes-field:focus { border-color: rgba(100,181,246,0.5); }
  `]
})
export class SkillAddDialogComponent {
  dialogRef = inject(MatDialogRef<SkillAddDialogComponent>);

  categories = SKILL_CATEGORIES;
  presets = PRESETS;

  query = '';
  suggestions = signal<SkillPreset[]>([]);
  showDropdown = signal(false);
  highlightedIndex = signal(-1);

  category = signal('');
  rating = signal(0);
  yearsOfExperience: number | null = null;
  notes = '';

  private blurTimeout: any;

  constructor() {
    afterNextRender(() => {
      const input = document.querySelector('.search-input') as HTMLInputElement;
      input?.focus();
    });
  }

  onQueryChange() {
    const q = this.query.toLowerCase().trim();
    if (!q) { this.suggestions.set([]); this.showDropdown.set(false); return; }
    const matches = this.presets.filter(p => p.name.toLowerCase().includes(q)).slice(0, 15);
    this.suggestions.set(matches);
    this.showDropdown.set(matches.length > 0);
    this.highlightedIndex.set(-1);
  }

  onFocus() {
    clearTimeout(this.blurTimeout);
    const q = this.query.toLowerCase().trim();
    if (q) {
      this.onQueryChange();
    }
  }

  onBlur() {
    this.blurTimeout = setTimeout(() => this.showDropdown.set(false), 150);
  }

  selectSuggestion(preset: SkillPreset) {
    this.query = preset.name;
    this.category.set(preset.category);
    this.showDropdown.set(false);
    this.highlightedIndex.set(-1);
    clearTimeout(this.blurTimeout);
  }

  clearQuery() {
    this.query = '';
    this.category.set('');
    this.suggestions.set([]);
    this.showDropdown.set(false);
  }

  toggleCategory(cat: string) {
    this.category.set(this.category() === cat ? '' : cat);
  }

  onSearchKeydown(event: KeyboardEvent) {
    const list = this.suggestions();
    if (this.showDropdown() && list.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = Math.min(this.highlightedIndex() + 1, list.length - 1);
        this.highlightedIndex.set(next);
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = Math.max(this.highlightedIndex() - 1, 0);
        this.highlightedIndex.set(prev);
        return;
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const idx = this.highlightedIndex();
        if (idx >= 0 && idx < list.length) {
          this.selectSuggestion(list[idx]);
          return;
        }
      } else if (event.key === 'Escape') {
        this.showDropdown.set(false);
        return;
      }
    }
    if (event.key === 'Enter' && this.query.trim()) {
      event.preventDefault();
      this.add();
    }
  }

  add() {
    const name = this.query.trim();
    if (!name) return;

    const result: SkillAddResult = { name };
    if (this.category()) result.category = this.category();
    if (this.rating() > 0) result.rating = this.rating();
    if (this.yearsOfExperience !== null && this.yearsOfExperience > 0) {
      result.yearsOfExperience = this.yearsOfExperience;
    }
    if (this.notes.trim()) result.notes = this.notes.trim();

    this.dialogRef.close(result);
  }
}
