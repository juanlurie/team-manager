import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .hint { font-size:11px; color:rgba(255,255,255,0.28); margin-bottom:10px; }
    .proj-list { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
    .proj-row { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px; }
    .billable-check { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; }
    .billable-check input { width:15px; height:15px; cursor:pointer; accent-color:#64b5f6; }
    .add-row { display:flex; gap:7px; align-items:center; }
    .inp { flex:1; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; }
    .inp:focus { border-color:rgba(100,181,246,0.7); }
    .inp::placeholder { color:rgba(255,255,255,0.2); }
    .tag-rm { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.3); font-size:14px; line-height:1; padding:0; }
    .tag-rm:hover { color:#ef5350; }
    .btn-add { padding:7px 12px; background:rgba(100,181,246,0.1); border:1px solid rgba(100,181,246,0.3); border-radius:6px; color:#64b5f6; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
    .btn-add:hover { background:rgba(100,181,246,0.18); }
    .btn-add:disabled { opacity:0.35; cursor:not-allowed; }
    @media (max-width:640px) {
      .proj-row { flex-direction:column; align-items:flex-start; gap:8px; padding:10px; }
      .proj-row > div { margin-left:0 !important; }
      .billable-check { font-size:14px; }
      .billable-check input { width:18px; height:18px; }
      .tag-rm { font-size:18px; padding:4px; }
    }
  `],
  template: `
    <div class="hint">These projects are added to the default Entelect list. Use this for client projects or custom work categories.</div>
    <div class="proj-list">
      @for (p of allProjects(); track p) {
        <div class="proj-row">
          <span>{{ p }}</span>
          <div style="margin-left:auto; display:flex; align-items:center; gap:16px;">
            <label class="billable-check">
              <input type="checkbox" [checked]="billable().includes(p)" (change)="toggleBillable.emit({project:p,checked:$any($event.target).checked})">
              <span>Billable</span>
            </label>
            @if (isExtra()(p)) {
              <button class="tag-rm" (click)="remove.emit(p)">×</button>
            }
          </div>
        </div>
      }
    </div>
    <div class="add-row">
      <input class="inp" placeholder="Project name" [ngModel]="newProject()" (ngModelChange)="newProjectChange.emit($event)" (keydown.enter)="add.emit()" style="flex:1" />
      <button class="btn-add" [disabled]="!newProject().trim()" (click)="add.emit()">Add</button>
    </div>
  `
})
export class ConfigProjectsComponent {
  allProjects = input.required<string[]>();
  billable = input.required<string[]>();
  isExtra = input.required<(project: string) => boolean>();
  newProject = input.required<string>();

  newProjectChange = output<string>();
  toggleBillable = output<{project:string;checked:boolean}>();
  remove = output<string>();
  add = output<void>();
}
