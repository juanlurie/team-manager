import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { TeamMember } from '../../../core/models/team-member.model';
import { MemberSkill, MemberNote, MemberTask } from '../../../core/models/member-personal.model';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { MemberPersonalService } from '../../../core/services/member-personal.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TimesheetTabComponent } from './timesheet-tab/timesheet-tab.component';

const SKILL_CATEGORIES = ['Technical', 'Soft Skills'];
const SKILL_FILTERS = ['All', ...SKILL_CATEGORIES];

interface MapCategory { key: string; label: string; color: string; border: string; placeholder: string; }
const MAP_CATEGORIES: MapCategory[] = [
  { key: 'goals',               label: 'Goals',                    color: 'rgba(47,158,68,0.12)',   border: 'rgba(47,158,68,0.4)',   placeholder: 'Ultimate goals, short-term ambitions…' },
  { key: 'motivators',          label: 'Motivators',               color: 'rgba(12,133,153,0.12)',  border: 'rgba(12,133,153,0.4)',  placeholder: 'What energises and drives them…' },
  { key: 'keyTraits',           label: 'Key Traits',               color: 'rgba(12,133,153,0.10)',  border: 'rgba(12,133,153,0.35)', placeholder: 'Personality strengths and characteristics…' },
  { key: 'worksWellWhen',       label: 'Works Well When',          color: 'rgba(230,119,0,0.10)',   border: 'rgba(230,119,0,0.4)',   placeholder: 'Conditions where they thrive…' },
  { key: 'doesntWorkWellWhen',  label: "Doesn't Work Well When",   color: 'rgba(232,89,12,0.10)',   border: 'rgba(232,89,12,0.4)',   placeholder: 'Situations that hinder them…' },
  { key: 'background',          label: 'Background & Skills',      color: 'rgba(47,158,68,0.08)',   border: 'rgba(47,158,68,0.3)',   placeholder: 'General background, qualifications, key skills…' },
  { key: 'education',           label: 'Education',                color: 'rgba(103,65,217,0.10)',  border: 'rgba(103,65,217,0.4)',  placeholder: 'Degrees, certifications, courses…' },
  { key: 'hobbies',             label: 'Hobbies',                  color: 'rgba(232,89,12,0.10)',   border: 'rgba(232,89,12,0.35)',  placeholder: 'Interests outside of work…' },
  { key: 'family',              label: 'Family',                   color: 'rgba(224,49,49,0.08)',   border: 'rgba(224,49,49,0.3)',   placeholder: 'Family situation, what matters to them at home…' },
  { key: 'home',                label: 'Home',                     color: 'rgba(25,113,194,0.10)',  border: 'rgba(25,113,194,0.4)',  placeholder: 'Where they live, commute, home context…' },
  { key: 'food',                label: 'Food Likes & Dislikes',    color: 'rgba(201,42,42,0.08)',   border: 'rgba(201,42,42,0.3)',   placeholder: 'Favourites, dislikes, dietary notes…' },
];

@Component({
  selector: 'app-team-member-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, MatTabsModule, MatDialogModule, MatProgressSpinnerModule, TimesheetTabComponent, IconButtonComponent],
  styles: [`
    @media (max-width: 480px) {
      .tab-label { display: none; }
    }
  `],
  template: `
    <div style="max-width:1280px;margin:0 auto;padding:24px 16px 64px">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <button mat-button (click)="back()"
                style="padding:0 8px 0 4px;gap:4px;color:rgba(255,255,255,0.55)">
          <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">arrow_back</mat-icon>
          Team
        </button>
        @if (member()) {
          <div>
            <div style="font-size:1.3rem;font-weight:700">{{ member()!.firstName }} {{ member()!.lastName }}</div>
            <div style="font-size:0.8rem;opacity:0.45;margin-top:2px">{{ member()!.email }}</div>
          </div>
        }
      </div>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:80px">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {

      <!-- Tabs -->
      <mat-tab-group animationDuration="150ms" mat-stretch-tabs="false" align="start">

        <!-- Personal Map -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="font-size:18px;margin-right:6px;vertical-align:middle">hub</mat-icon>
            <span class="tab-label">Personal Map</span>
          </ng-template>
          <div style="padding-top:20px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
              <span style="font-size:0.8rem;opacity:0.4">Click any card to edit — saves automatically on blur</span>
              @if (mapSaved()) {
                <span style="font-size:0.78rem;color:#81c784">Saved</span>
              }
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:12px">
              @for (cat of mapCategories; track cat.key) {
                <div style="border-radius:10px;padding:14px;"
                     [style.background]="cat.color"
                     [style.border]="'1px solid ' + cat.border">
                  <div style="font-weight:700;font-size:0.82rem;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;opacity:0.8">
                    {{ cat.label }}
                  </div>
                  <textarea [ngModel]="mapData()[cat.key]"
                            (ngModelChange)="updateMapField(cat.key, $event)"
                            (blur)="saveMap()"
                            rows="4"
                            [placeholder]="cat.placeholder"
                            style="width:100%;box-sizing:border-box;background:rgba(0,0,0,0.2);border:none;border-radius:6px;color:inherit;font-size:0.85rem;padding:8px;resize:vertical;font-family:inherit;outline:none;line-height:1.5">
                  </textarea>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- Skills -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="font-size:18px;margin-right:6px;vertical-align:middle">trending_up</mat-icon>
            <span class="tab-label">Skills</span>
          </ng-template>
          <div style="padding-top:24px">

            <!-- Add skill -->
            <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
              <input [(ngModel)]="newSkillName"
                     placeholder="Skill name"
                     (keydown.enter)="addSkill()"
                     style="flex:1;min-width:150px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:inherit;font-size:0.85rem;padding:8px 10px;outline:none">
              <select [(ngModel)]="newSkillCategory"
                      style="background:rgba(40,40,50,1);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:inherit;font-size:0.85rem;padding:8px 10px;outline:none">
                <option value="">No category</option>
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
              <button mat-stroked-button (click)="addSkill()" [disabled]="!newSkillName.trim()">Add skill</button>
            </div>

            <!-- Category filter -->
            @if (skills().length > 0) {
              <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
                @for (f of skillFilters; track f) {
                  <button (click)="skillFilter.set(f)"
                          style="padding:4px 12px;border-radius:16px;font-size:0.78rem;font-weight:600;border:1px solid;cursor:pointer;transition:all 0.15s;background:transparent"
                          [style.borderColor]="skillFilter() === f ? '#64b5f6' : 'rgba(255,255,255,0.15)'"
                          [style.color]="skillFilter() === f ? '#64b5f6' : 'rgba(255,255,255,0.6)'"
                          [style.background]="skillFilter() === f ? 'rgba(100,181,246,0.12)' : 'transparent'">
                    {{ f }}
                  </button>
                }
              </div>
            }

            <!-- Skill cards -->
            <div style="display:flex;flex-direction:column;gap:10px">
              @for (skill of filteredSkills(); track skill.id) {
                <div style="border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:12px 14px">
                  <!-- Row 1: name + actions (never wraps) -->
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-weight:600;font-size:0.9rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ skill.name }}</span>
                    <app-icon-btn icon="add_circle_outline" size="sm" tooltip="Add rating" (btnClick)="toggleRateForm(skill.id)" />
                    <app-icon-btn icon="history" size="sm" tooltip="History" (btnClick)="toggleHistory(skill.id)" />
                    <app-icon-btn icon="delete_outline" size="sm" tooltip="Delete" [danger]="true" (btnClick)="deleteSkill(skill)" />
                  </div>
                  <!-- Row 2: category + rating + date + trend -->
                  @if (skill.category || latestRating(skill)) {
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px">
                      @if (skill.category) {
                        <span [style.background]="categoryBg(skill.category)"
                              [style.color]="categoryColor(skill.category)"
                              style="font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px">
                          {{ skill.category }}
                        </span>
                      }
                      @if (latestRating(skill); as lr) {
                        <span style="display:flex;align-items:center;gap:1px">
                          @for (i of [1,2,3,4,5]; track i) {
                            <mat-icon style="font-size:16px;width:16px;height:16px"
                                      [style.color]="i <= lr.rating ? '#ffb74d' : 'rgba(255,255,255,0.2)'">star</mat-icon>
                          }
                        </span>
                        <span style="font-size:0.75rem;opacity:0.45">{{ lr.ratedAt | date:'d MMM y' }}</span>
                        @if (trendIcon(skill); as t) {
                          <mat-icon [style.color]="t.color" style="font-size:18px">{{ t.icon }}</mat-icon>
                        }
                      }
                    </div>
                  }

                  <!-- Rate form -->
                  @if (ratingFormId() === skill.id) {
                    <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07)">
                      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
                        <span style="font-size:0.82rem;opacity:0.6;margin-right:4px">Rating:</span>
                        @for (i of [1,2,3,4,5]; track i) {
                          <mat-icon (click)="ratingDraft.set(i)"
                                    style="font-size:24px;width:24px;height:24px;cursor:pointer"
                                    [style.color]="i <= ratingDraft() ? '#ffb74d' : 'rgba(255,255,255,0.2)'">star</mat-icon>
                        }
                        <span style="font-size:0.85rem;margin-left:4px;opacity:0.6">{{ ratingDraft() }}/5</span>
                      </div>
                      <textarea [(ngModel)]="ratingNotes"
                                rows="2"
                                placeholder="Notes (optional)"
                                style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:inherit;font-size:0.85rem;padding:8px;resize:none;font-family:inherit;outline:none;margin-bottom:8px">
                      </textarea>
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                        <span style="font-size:0.82rem;opacity:0.6">Date:</span>
                        <input type="date" [(ngModel)]="ratingDate"
                               style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:inherit;font-size:0.85rem;padding:5px 8px;outline:none">
                        <button mat-raised-button color="primary" (click)="submitRating(skill.id)" [disabled]="ratingDraft() === 0">Save</button>
                        <button mat-button (click)="ratingFormId.set(null)">Cancel</button>
                      </div>
                    </div>
                  }

                  <!-- History -->
                  @if (historyId() === skill.id && skill.ratings.length > 0) {
                    <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07)">
                      @for (r of skill.ratings.slice().reverse(); track r.id) {
                        <div style="display:flex;align-items:center;gap:10px;padding:5px 0;font-size:0.82rem;border-bottom:1px solid rgba(255,255,255,0.04)">
                          <span style="opacity:0.45;min-width:90px">{{ r.ratedAt | date:'d MMM y' }}</span>
                          <span style="display:flex;gap:1px">
                            @for (i of [1,2,3,4,5]; track i) {
                              <mat-icon style="font-size:14px;width:14px;height:14px"
                                        [style.color]="i <= r.rating ? '#ffb74d' : 'rgba(255,255,255,0.15)'">star</mat-icon>
                            }
                          </span>
                          @if (r.notes) {
                            <span style="opacity:0.55;flex:1">{{ r.notes }}</span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            @if (skills().length === 0) {
              <div style="text-align:center;padding:48px;opacity:0.3;font-size:0.85rem">No skills tracked yet — add one above</div>
            }
          </div>
        </mat-tab>

        <!-- Notes -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="font-size:18px;margin-right:6px;vertical-align:middle">notes</mat-icon>
            <span class="tab-label">Notes</span>
          </ng-template>
          <div style="padding-top:24px">
            <div style="font-size:0.8rem;opacity:0.4;margin-bottom:16px">Observations and highlights — builds up for annual reviews</div>

            <div style="display:flex;gap:8px;margin-bottom:20px;align-items:flex-end;flex-wrap:wrap">
              <textarea [(ngModel)]="newNoteText"
                        rows="3"
                        placeholder="Add an observation…"
                        style="flex:1;min-width:200px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:inherit;font-size:0.88rem;padding:10px 12px;resize:none;font-family:inherit;outline:none">
              </textarea>
              <button mat-stroked-button (click)="addNote()" [disabled]="!newNoteText.trim()" style="align-self:flex-end">Add</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px">
              @for (note of notes(); track note.id) {
                <div style="padding:12px 14px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <span style="font-size:0.74rem;opacity:0.4;flex:1">{{ note.createdAt | date:'d MMM y' }}</span>
                    <app-icon-btn icon="delete_outline" size="sm" tooltip="Delete note" [danger]="true" (btnClick)="deleteNote(note)" />
                  </div>
                  <div style="font-size:0.88rem;white-space:pre-wrap;line-height:1.5">{{ note.text }}</div>
                </div>
              }
            </div>

            @if (notes().length === 0) {
              <div style="text-align:center;padding:48px;opacity:0.3;font-size:0.85rem">No notes yet — add observations throughout the year</div>
            }
          </div>
        </mat-tab>

        <!-- Tasks -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="font-size:18px;margin-right:6px;vertical-align:middle">task_alt</mat-icon>
            <span class="tab-label">Tasks</span>
          </ng-template>
          <div style="padding-top:24px">

            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
              <input [(ngModel)]="newTaskTitle"
                     placeholder="Add a task…"
                     (keydown.enter)="addTask()"
                     style="flex:1;min-width:180px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:inherit;font-size:0.88rem;padding:9px 12px;outline:none">
              <input type="date" [(ngModel)]="newTaskDueDate"
                     style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:inherit;font-size:0.85rem;padding:8px 10px;outline:none"
                     [title]="'Due date (optional)'">
              <button mat-stroked-button (click)="addTask()" [disabled]="!newTaskTitle.trim()">Add</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:6px">
              @for (task of tasks(); track task.id) {
                <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.03)"
                     [style.border]="!task.isCompleted && task.dueDate && isOverdue(task.dueDate) ? '1px solid rgba(239,83,80,0.35)' : '1px solid rgba(255,255,255,0.06)'"
                     [style.borderLeft]="!task.isCompleted && task.dueDate && isOverdue(task.dueDate) ? '3px solid #ef5350' : ''">
                  <input type="checkbox" [checked]="task.isCompleted" (change)="toggleTask(task)"
                         style="width:16px;height:16px;cursor:pointer;accent-color:#64b5f6;flex-shrink:0">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span style="font-size:0.88rem"
                            [style.opacity]="task.isCompleted ? '0.35' : '1'"
                            [style.textDecoration]="task.isCompleted ? 'line-through' : 'none'">
                        {{ task.title }}
                      </span>
                      @if (!task.isCompleted && task.dueDate && isOverdue(task.dueDate)) {
                        <span style="font-size:0.68rem;font-weight:600;padding:1px 6px;border-radius:6px;
                                     background:rgba(239,83,80,0.15);color:#ef9a9a;text-transform:uppercase;
                                     letter-spacing:0.04em;flex-shrink:0">Overdue</span>
                      }
                    </div>
                    <div style="display:flex;gap:10px;margin-top:3px;font-size:0.74rem;flex-wrap:wrap">
                      @if (task.dueDate && !task.isCompleted) {
                        <span [style.color]="isOverdue(task.dueDate) ? '#ef9a9a' : 'rgba(255,255,255,0.35)'">
                          Due {{ task.dueDate | date:'d MMM y' }}
                        </span>
                      }
                      @if (task.isCompleted && task.completedAt) {
                        <span style="opacity:0.35">Done {{ task.completedAt | date:'d MMM y' }}</span>
                      }
                    </div>
                  </div>
                  <app-icon-btn icon="delete_outline" size="sm" tooltip="Delete task" [danger]="true" (btnClick)="deleteTask(task)" />
                </div>
              }
            </div>

            @if (tasks().length === 0) {
              <div style="text-align:center;padding:48px;opacity:0.3;font-size:0.85rem">No tasks</div>
            }
          </div>
        </mat-tab>

        <!-- Timesheets -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="font-size:18px;margin-right:6px;vertical-align:middle">schedule</mat-icon>
            <span class="tab-label">Timesheets</span>
          </ng-template>
          <app-timesheet-tab [memberId]="memberId" />
        </mat-tab>

      </mat-tab-group>
      } <!-- end @else -->
    </div>
  `
})
export class TeamMemberPersonalComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private memberSvc = inject(TeamMemberService);
  private personalSvc = inject(MemberPersonalService);
  private dialog = inject(MatDialog);

  readonly categories = SKILL_CATEGORIES;
  readonly skillFilters = SKILL_FILTERS;
  readonly mapCategories = MAP_CATEGORIES;

  loading = signal(true);
  memberId = '';
  member = signal<TeamMember | null>(null);
  skills = signal<MemberSkill[]>([]);
  notes = signal<MemberNote[]>([]);
  tasks = signal<MemberTask[]>([]);

  mapData = signal<Record<string, string>>({});
  mapSavedJson = '';
  mapSaved = signal(false);

  newSkillName = '';
  newSkillCategory = '';
  skillFilter = signal('All');
  ratingFormId = signal<string | null>(null);
  historyId = signal<string | null>(null);
  ratingDraft = signal(0);
  ratingNotes = '';
  ratingDate = '';

  newNoteText = '';
  newTaskTitle = '';
  newTaskDueDate = '';

  filteredSkills = computed(() => {
    const f = this.skillFilter();
    return f === 'All' ? this.skills() : this.skills().filter(s => s.category === f);
  });

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id')!;
    this.ratingDate = new Date().toISOString().substring(0, 10);

    forkJoin({
      member: this.memberSvc.getById(this.memberId),
      personal: this.personalSvc.getPersonal(this.memberId),
      skills: this.personalSvc.getSkills(this.memberId),
      notes: this.personalSvc.getNotes(this.memberId),
      tasks: this.personalSvc.getTasks(this.memberId),
    }).subscribe(({ member, personal, skills, notes, tasks }) => {
      this.member.set(member);
      const parsed = this.parseMapJson(personal.personalMap);
      this.mapData.set(parsed);
      this.mapSavedJson = JSON.stringify(parsed);
      this.skills.set(skills);
      this.notes.set(notes);
      this.tasks.set(tasks);
      this.loading.set(false);
    });
  }

  back() { this.router.navigate(['/team']); }

  private parseMapJson(raw: string | null): Record<string, string> {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  updateMapField(key: string, value: string) {
    this.mapData.update(d => ({ ...d, [key]: value }));
  }

  saveMap() {
    const current = JSON.stringify(this.mapData());
    if (current === this.mapSavedJson) return;
    const json = current === '{}' ? null : current;
    this.personalSvc.upsertPersonal(this.memberId, json).subscribe(() => {
      this.mapSavedJson = current;
      this.mapSaved.set(true);
      setTimeout(() => this.mapSaved.set(false), 2000);
    });
  }

  addSkill() {
    const name = this.newSkillName.trim();
    if (!name) return;
    this.personalSvc.createSkill(this.memberId, name, this.newSkillCategory || null).subscribe(skill => {
      this.skills.update(s => [...s, skill].sort((a, b) => a.name.localeCompare(b.name)));
      this.newSkillName = '';
      this.newSkillCategory = '';
    });
  }

  deleteSkill(skill: MemberSkill) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete skill?', message: `"${skill.name}" and all its rating history will be removed.` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.personalSvc.deleteSkill(this.memberId, skill.id).subscribe(() => {
        this.skills.update(s => s.filter(x => x.id !== skill.id));
        if (this.ratingFormId() === skill.id) this.ratingFormId.set(null);
        if (this.historyId() === skill.id) this.historyId.set(null);
      });
    });
  }

  toggleRateForm(id: string) {
    if (this.ratingFormId() === id) { this.ratingFormId.set(null); return; }
    this.ratingFormId.set(id);
    this.historyId.set(null);
    this.ratingDraft.set(0);
    this.ratingNotes = '';
    this.ratingDate = new Date().toISOString().substring(0, 10);
  }

  toggleHistory(id: string) {
    this.historyId.set(this.historyId() === id ? null : id);
    if (this.ratingFormId() === id) this.ratingFormId.set(null);
  }

  submitRating(skillId: string) {
    if (this.ratingDraft() === 0) return;
    this.personalSvc.addSkillRating(this.memberId, skillId, this.ratingDraft(), this.ratingNotes || null, this.ratingDate || null)
      .subscribe(updated => {
        this.skills.update(s => s.map(x => x.id === skillId ? updated : x));
        this.ratingFormId.set(null);
      });
  }

  latestRating(skill: MemberSkill) {
    return skill.ratings.length ? skill.ratings[skill.ratings.length - 1] : null;
  }

  trendIcon(skill: MemberSkill): { icon: string; color: string } | null {
    if (skill.ratings.length < 2) return null;
    const first = skill.ratings[0].rating;
    const last = skill.ratings[skill.ratings.length - 1].rating;
    if (last > first) return { icon: 'trending_up', color: '#81c784' };
    if (last < first) return { icon: 'trending_down', color: '#ef9a9a' };
    return { icon: 'trending_flat', color: 'rgba(255,255,255,0.4)' };
  }

  categoryBg(cat: string) {
    return cat === 'Technical' ? 'rgba(100,181,246,0.15)' : 'rgba(171,71,188,0.15)';
  }
  categoryColor(cat: string) {
    return cat === 'Technical' ? '#64b5f6' : '#ce93d8';
  }

  addNote() {
    const text = this.newNoteText.trim();
    if (!text) return;
    this.personalSvc.createNote(this.memberId, text).subscribe(note => {
      this.notes.update(n => [note, ...n]);
      this.newNoteText = '';
    });
  }

  deleteNote(note: MemberNote) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete note?' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.personalSvc.deleteNote(this.memberId, note.id).subscribe(() => {
        this.notes.update(n => n.filter(x => x.id !== note.id));
      });
    });
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date(new Date().toDateString());
  }

  addTask() {
    const title = this.newTaskTitle.trim();
    if (!title) return;
    this.personalSvc.createTask(this.memberId, title, this.newTaskDueDate || null).subscribe(task => {
      this.tasks.update(t => [task, ...t]);
      this.newTaskTitle = '';
      this.newTaskDueDate = '';
    });
  }

  toggleTask(task: MemberTask) {
    this.personalSvc.updateTask(this.memberId, task.id, { isCompleted: !task.isCompleted }).subscribe(updated => {
      this.tasks.update(t => t.map(x => x.id === task.id ? updated : x)
        .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted) || a.createdAt.localeCompare(b.createdAt)));
    });
  }

  deleteTask(task: MemberTask) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete task?' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.personalSvc.deleteTask(this.memberId, task.id).subscribe(() => {
        this.tasks.update(t => t.filter(x => x.id !== task.id));
      });
    });
  }
}
