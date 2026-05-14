import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { TeamMember } from '../../core/models/team-member.model';
import { MeetingSeries } from '../../core/models/meeting-series.model';

@Component({
  selector: 'app-meeting-series-item-create',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="page">
      <div class="back-row">
        <button class="back-btn" (click)="goBack()">← Back</button>
        <h2>Create Meeting Item</h2>
      </div>

      @if (series()) {
        <div class="series-banner">
          Series: {{ series()!.title }}
        </div>
      }

      <div class="section">
        <div class="section-label">Basic Info</div>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Title</mat-label>
          <input matInput [ngModel]="title()" (ngModelChange)="title.set($event)" maxlength="200" placeholder="e.g. Review: Alice Jones">
          @if (!title().trim() && submitted()) {
            <mat-error>Title is required</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput [ngModel]="description()" (ngModelChange)="description.set($event)" maxlength="2000" rows="2"></textarea>
        </mat-form-field>
      </div>

      <div class="section">
        <div class="section-label" style="color:#64b5f6">Mandatory Participants</div>
        <div class="member-chips">
          @for (m of allMembers(); track m.id) {
            <button class="chip member-chip"
                    [class.active]="mandatoryIds().has(m.id)"
                    (click)="toggleMandatory(m.id)">
              {{ m.firstName }} {{ m.lastName }}
            </button>
          }
        </div>
        @if (mandatoryIds().size > 0) {
          <div class="selected-chips">
            @for (id of mandatoryIds(); track id) {
              @let m = memberMap()[id];
              <span class="chip active" style="background:rgba(100,181,246,0.15);border-color:rgba(100,181,246,0.4);color:#64b5f6">
                {{ m?.firstName }} {{ m?.lastName }}
                <span class="chip-remove" (click)="removeMandatory(id)">×</span>
              </span>
            }
          </div>
        }
      </div>

      <div class="section">
        <div class="section-label" style="color:#81c784">Optional Participants</div>
        <div class="member-chips">
          @for (m of allMembers(); track m.id) {
            <button class="chip member-chip"
                    [class.active]="optionalIds().has(m.id)"
                    (click)="toggleOptional(m.id)">
              {{ m.firstName }} {{ m.lastName }}
            </button>
          }
        </div>
        @if (optionalIds().size > 0) {
          <div class="selected-chips">
            @for (id of optionalIds(); track id) {
              @let m = memberMap()[id];
              <span class="chip active" style="background:rgba(129,199,132,0.15);border-color:rgba(129,199,132,0.4);color:#81c784">
                {{ m?.firstName }} {{ m?.lastName }}
                <span class="chip-remove" (click)="removeOptional(id)">×</span>
              </span>
            }
          </div>
        }
      </div>

      <div class="actions">
        <button mat-stroked-button (click)="goBack()">Cancel</button>
        <button mat-raised-button color="primary" [disabled]="saving()" (click)="save()">
          @if (saving()) { Saving... } @else { Create Item }
        </button>
      </div>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .back-row { display:flex;align-items:center;gap:12px;margin-bottom:24px; }
    .back-row h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .back-btn { background:none;border:1px solid rgba(255,255,255,0.1);color:inherit;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-family:inherit; }
    .back-btn:hover { background:rgba(255,255,255,0.05); }
    .series-banner { padding:8px 12px;border-radius:8px;background:rgba(100,181,246,0.1);color:#64b5f6;font-size:0.85rem;margin-bottom:16px; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .full-width { width:100%;margin-bottom:8px; }
    .member-chips { display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px; }
    .chip { padding:5px 14px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:inherit;font-size:0.8rem;cursor:pointer;transition:all 0.12s;font-family:inherit;display:inline-flex;align-items:center;gap:4px; }
    .chip:hover { border-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.04); }
    .member-chip.active { background:rgba(100,181,246,0.15);border-color:rgba(100,181,246,0.4);color:#64b5f6; }
    .selected-chips { display:flex;flex-wrap:wrap;gap:4px; }
    .chip.active { font-weight:500; }
    .chip-remove { cursor:pointer;opacity:0.6;font-size:1rem;margin-left:2px; }
    .chip-remove:hover { opacity:1; }
    .actions { display:flex;gap:10px;margin-top:16px; }
    .error { color:#ef5350;font-size:0.82rem;margin-top:6px; }
  `]
})
export class MeetingSeriesItemCreateComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(MeetingSeriesService);
  private memberSvc = inject(TeamMemberService);
  private snack = inject(MatSnackBar);

  series = signal<MeetingSeries | null>(null);
  title = signal('');
  description = signal('');
  mandatoryIds = signal<Set<string>>(new Set());
  optionalIds = signal<Set<string>>(new Set());
  allMembers = signal<TeamMember[]>([]);
  saving = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  memberMap = computed(() => {
    const map: Record<string, TeamMember> = {};
    for (const m of this.allMembers()) map[m.id] = m;
    return map;
  });

  ngOnInit() {
    this.memberSvc.getAll({ isActive: true }).subscribe(members => {
      this.allMembers.set(members.sort((a, b) => a.firstName.localeCompare(b.firstName)));
    });
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadSeries(id);
    });
  }

  loadSeries(id: string) {
    this.svc.getById(id).subscribe({
      next: s => this.series.set(s),
      error: () => this.router.navigate(['/meeting-series'])
    });
  }

  toggleMandatory(id: string) {
    const set = new Set(this.mandatoryIds());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.mandatoryIds.set(set);
    const opt = new Set(this.optionalIds()); opt.delete(id); this.optionalIds.set(opt);
  }

  toggleOptional(id: string) {
    const set = new Set(this.optionalIds());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.optionalIds.set(set);
    const man = new Set(this.mandatoryIds()); man.delete(id); this.mandatoryIds.set(man);
  }

  removeMandatory(id: string) { const set = new Set(this.mandatoryIds()); set.delete(id); this.mandatoryIds.set(set); }
  removeOptional(id: string) { const set = new Set(this.optionalIds()); set.delete(id); this.optionalIds.set(set); }

  goBack() { const s = this.series(); this.router.navigate(['/meeting-series', s?.id]); }

  save() {
    this.submitted.set(true);
    if (!this.title().trim()) { this.error.set('Title is required'); return; }
    if (this.mandatoryIds().size === 0) { this.error.set('At least one mandatory participant required'); return; }
    this.error.set(null);
    this.saving.set(true);

    const participants = [
      ...[...this.mandatoryIds()].map(id => ({ teamMemberId: id, role: 'Mandatory' as const })),
      ...[...this.optionalIds()].map(id => ({ teamMemberId: id, role: 'Optional' as const }))
    ];

    const s = this.series();
    if (!s) return;

    this.svc.createItem(s.id, {
      title: this.title().trim(),
      description: this.description().trim() || undefined,
      participants
    }).subscribe({
      next: () => {
        this.snack.open('Item created', 'OK', { duration: 2000 });
        this.router.navigate(['/meeting-series', s.id]);
      },
      error: () => { this.saving.set(false); this.error.set('Failed to create item'); }
    });
  }
}