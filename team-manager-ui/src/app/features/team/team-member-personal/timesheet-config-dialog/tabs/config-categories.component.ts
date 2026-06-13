import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-categories',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .hint { font-size:11px; color:rgba(255,255,255,0.28); margin-bottom:10px; }
    .proj-sel-row { display:flex; gap:7px; align-items:center; margin-bottom:10px; }
    .sel { flex:1; box-sizing:border-box; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; cursor:pointer; appearance:none; }
    .sel:focus { border-color:rgba(100,181,246,0.7); } .sel option { background:#1a1c2a; }
    .sec-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:8px; }
    .tag-list { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
    .tag { display:flex; align-items:center; gap:5px; padding:4px 8px 4px 10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:16px; font-size:12px; }
    .tag.custom { background:rgba(100,181,246,0.08); border-color:rgba(100,181,246,0.25); }
    .tag-rm { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.3); font-size:14px; line-height:1; padding:0; }
    .tag-rm:hover { color:#ef5350; }
    .add-row { display:flex; gap:7px; align-items:center; }
    .inp { flex:1; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; }
    .inp:focus { border-color:rgba(100,181,246,0.7); } .inp::placeholder { color:rgba(255,255,255,0.2); }
    .btn-add { padding:7px 12px; background:rgba(100,181,246,0.1); border:1px solid rgba(100,181,246,0.3); border-radius:6px; color:#64b5f6; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
    .btn-add:hover { background:rgba(100,181,246,0.18); } .btn-add:disabled { opacity:0.35; cursor:not-allowed; }
    @media (max-width:640px) { .tag-rm { font-size:18px; padding:4px; } }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="hint">Add custom categories to any project (including your extra projects).</div>
    <div class="proj-sel-row">
      <select class="sel" [ngModel]="catProject()" (ngModelChange)="catProjectChange.emit($event)">
        <option value="">Select project…</option>
        @for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }
      </select>
    </div>
    @if (catProject()) {
      <div class="sec-lbl">Categories for "{{ catProject() }}"</div>
      <div class="tag-list">
        @for (c of catsByProject()[catProject()] ?? []; track c) {
          <span class="tag" [class.custom]="isExtraCat(catProject(), c)">
            {{ c }}
            @if (isExtraCat(catProject(), c)) {
              <button class="tag-rm" (click)="remove.emit({project:catProject(),category:c})">×</button>
            }
          </span>
        }
        @if (!(catsByProject()[catProject()] ?? []).length) { <span style="font-size:12px;color:rgba(255,255,255,0.25)">No categories for this project.</span> }
      </div>
      <div class="add-row">
        <input class="inp" placeholder="Category name" [ngModel]="newCat()" (ngModelChange)="newCatChange.emit($event)" (keydown.enter)="add.emit()" style="flex:1" />
        <button class="btn-add" [disabled]="!newCat().trim()" (click)="add.emit()">Add</button>
      </div>
    }
  `
})
export class ConfigCategoriesComponent {
  allProjects = input.required<string[]>();
  catsByProject = input.required<Record<string, string[]>>();
  extraCats = input.required<Record<string, string[]>>();
  catProject = input.required<string>();
  newCat = input.required<string>();

  catProjectChange = output<string>();
  newCatChange = output<string>();
  remove = output<{project:string;category:string}>();
  add = output<void>();

  isExtraCat = (project: string, category: string): boolean => {
    const ec = this.extraCats()[project] ?? [];
    return ec.includes(category);
  };
}
