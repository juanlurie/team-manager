import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
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
import { PermissionsTabComponent } from './permissions-tab/permissions-tab.component';

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
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, MatTabsModule, MatDialogModule, MatProgressSpinnerModule, TimesheetTabComponent, PermissionsTabComponent, IconButtonComponent],
  templateUrl: './team-member-personal.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./team-member-personal.component.scss']
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
