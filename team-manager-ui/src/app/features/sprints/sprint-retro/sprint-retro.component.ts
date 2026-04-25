import { Component, inject, Input, OnInit } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { Sprint } from '../../../core/models/sprint.model';
import { SprintService } from '../../../core/services/sprint.service';

const RETRO_COLS = [
  { key: 'wentWell',    label: '✅ Went Well',      color: '#4caf50', placeholder: 'What went well this sprint?' },
  { key: 'didntGoWell', label: "⚠️ Didn't Go Well", color: '#ff9800', placeholder: "What could've gone better?" },
  { key: 'actionItems', label: '🎯 Action Items',    color: '#64b5f6', placeholder: 'Improvements to carry forward…' },
];

@Component({
  selector: 'app-sprint-retro',
  standalone: true,
  imports: [],
  template: `
    <div style="border-radius:10px;background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.07);overflow:hidden">
      <div style="padding:8px 14px 6px;border-bottom:1px solid rgba(255,255,255,0.06);
                  display:flex;align-items:center;gap:8px">
        @if (saving) {
          <span style="font-size:0.68rem;opacity:0.35;margin-left:auto">Saving…</span>
        }
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))">
        @for (col of cols; track col.key) {
          <div [style.border-right]="col.key !== 'actionItems' ? '1px solid rgba(255,255,255,0.05)' : 'none'"
               style="padding:10px 14px">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px"
                 [style.color]="col.color">{{ col.label }}</div>
            <textarea
              style="width:100%;background:transparent;border:none;outline:none;resize:none;
                     font-family:inherit;font-size:0.8rem;color:inherit;box-sizing:border-box;
                     line-height:1.5;min-height:160px"
              rows="8"
              [placeholder]="col.placeholder"
              [value]="getValue(col.key)"
              (input)="onInput(col.key, $any($event.target).value)"
              (blur)="saveNow()">
            </textarea>
          </div>
        }
      </div>
    </div>
  `
})
export class SprintRetroComponent implements OnInit {
  @Input({ required: true }) sprintId!: string;
  @Input() sprint: Sprint | null = null;

  private svc = inject(SprintService);

  saving = false;
  readonly cols = RETRO_COLS;

  private retro = { wentWell: null as string | null, didntGoWell: null as string | null, actionItems: null as string | null };
  private change$ = new Subject<void>();

  ngOnInit() {
    if (this.sprint) {
      this.retro = {
        wentWell: this.sprint.retroWentWell ?? null,
        didntGoWell: this.sprint.retroDidntGoWell ?? null,
        actionItems: this.sprint.retroActionItems ?? null
      };
    }
    this.change$.pipe(debounceTime(1200)).subscribe(() => this.saveNow());
  }

  getValue(key: string): string { return (this.retro as any)[key] ?? ''; }

  onInput(key: string, value: string) {
    (this.retro as any)[key] = value || null;
    this.change$.next();
  }

  saveNow() {
    this.saving = true;
    this.svc.updateRetro(this.sprintId, this.retro).subscribe(() => { this.saving = false; });
  }
}
