import { Component, OnInit, inject, signal, computed, effect, untracked, ChangeDetectionStrategy } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TeamMember, MEMBER_ROLES, roleLabel } from '../../../core/models/team-member.model';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { SquadService } from '../../../core/services/squad.service';
import { SquadSummary } from '../../../core/models/squad.model';
import { TeamSummary, NO_TEAM } from '../../../core/models/team.model';
import { TeamMemberFormComponent } from '../team-member-form/team-member-form.component';
import { SquadManagerDialogComponent } from '../squad-manager-dialog/squad-manager-dialog.component';
import { TeamManagerDialogComponent } from '../team-manager-dialog/team-manager-dialog.component';
import { ChangeRoleDialogComponent } from '../change-role-dialog/change-role-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { FilterBarComponent, FilterGroup, stripMentions } from '../../../shared/components/filter-bar/filter-bar.component';
import { GlobalFilterService } from '../../../core/services/global-filter.service';
import { AuthService } from '../../../core/auth/auth.service';

const CRAFT_LABELS: Record<string, string> = {
  DevBE: 'Dev BE', DevFE: 'Dev FE', DevIOS: 'iOS', DevAndroid: 'Android',
  Dev: 'Developer', Analysis: 'Analyst', Design: 'Designer', QA: 'QA',
};

import { MatMenuModule } from '@angular/material/menu';
import { buildDuplicateFirstNames, memberDisplayName } from '../../../core/utils/member-display-name';
import { AvatarCircleComponent } from '../../../core/components/k-picker/avatar-circle.component';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatDialogModule, MatChipsModule, MatTooltipModule, MatProgressSpinnerModule, IconButtonComponent, FilterBarComponent, MatMenuModule, AvatarCircleComponent],
  template: `
    <div class="tl-header">
      <h2 class="tl-title">Team Members</h2>
      <button class="tl-settings-btn" mat-icon-button [matMenuTriggerFor]="settingsMenu"
              matTooltip="Settings">
        <mat-icon>settings</mat-icon>
      </button>
      <mat-menu #settingsMenu="matMenu" xPosition="before">
        <button mat-menu-item (click)="openForm()">
          <mat-icon>person_add</mat-icon>
          <span>Add member</span>
        </button>
        @if (canManageSquads) {
          <button mat-menu-item (click)="openSquadManager()">
            <mat-icon>groups</mat-icon>
            <span>Manage squads</span>
          </button>
        }
        @if (canManageTeams) {
          <button mat-menu-item (click)="openTeamManager()">
            <mat-icon>workspaces</mat-icon>
            <span>Manage teams</span>
          </button>
        }
      </mat-menu>
    </div>
    <app-filter-bar
      [groups]="filterGroups()"
      [searchPlaceholder]="'Search members…'"
      [searchVal]="memberSearch()"
      [selectedValues]="filterValues()"
      (searchChange)="memberSearch.set($event)"
      (apply)="onFilterApply($event)" />

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:10px;grid-auto-rows:1fr">
      @for (m of filteredMembers(); track m.id) {
        <div (click)="openPersonal(m)" class="member-card" [class.member-card-disabled]="!canOpen(m)"
             [matTooltip]="canOpen(m) ? '' : 'You can only view your own profile'"
             style="border-radius:10px;border:1px solid rgba(255,255,255,0.08);padding:12px 14px;display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;gap:12px">
            <app-avatar-circle [memberId]="m.id" [name]="m.firstName + ' ' + m.lastName" [avatarSeed]="m.avatarSeed" [size]="36" />

            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.9rem">{{ m.firstName }} {{ m.lastName }}</div>
            </div>
            <div style="flex-shrink:0;display:flex;align-items:center" (click)="$event.stopPropagation()">
              @if (canAssignRoles) {
                <app-icon-btn icon="badge" size="sm"
                  [disabled]="!canChangeRole(m)"
                  [tooltip]="canChangeRole(m) ? 'Change role (' + roleLabel(m.role) + ')' : 'Only an Admin can change an Admin\\'s role'"
                  (btnClick)="openChangeRole(m)" />
              }
              <app-icon-btn icon="edit" size="sm" tooltip="Edit member" (btnClick)="openForm(m)" />
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap">
            @for (craft of m.crafts; track craft) {
              <span style="font-size:0.68rem;font-weight:600;padding:2px 7px;border-radius:6px;background:rgba(76,175,80,0.12);color:#81c784">
                {{ craftLabel(craft) }}
              </span>
            }
          </div>
          <div style="margin-top:auto;padding-top:8px;display:flex;align-items:center;gap:8px">
            <div style="flex:1;display:flex;flex-wrap:wrap;gap:3px">
              @for (b of m.achievements?.slice(0,6) ?? []; track b.id) {
                <span [matTooltip]="b.name" style="font-size:1.1rem;line-height:1;cursor:default">{{ b.icon }}</span>
              }
              @if ((m.achievements?.length ?? 0) > 6) {
                <span style="font-size:0.65rem;opacity:0.4;align-self:center">+{{ m.achievements!.length - 6 }}</span>
              }
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
              <!-- Every distinct team, not one: a member in squads across teams belongs to all. -->
              @for (t of m.teams; track t.id) {
                <span class="team-chip" [matTooltip]="'Team: ' + t.name">{{ t.name }}</span>
              }
              @for (sq of m.squads; track sq.id) {
                <span style="font-size:0.68rem;font-weight:600;padding:2px 7px;border-radius:6px"
                      [style.background]="squadBg(sq.color)"
                      [style.color]="sq.color ?? '#9e9e9e'">
                  {{ sq.name }}
                </span>
              }
            </div>
          </div>
        </div>
      }
    </div>

    @if (filteredMembers().length === 0) {
      <div style="text-align:center;padding:64px;opacity:0.35;font-size:0.9rem">No members found</div>
    }
    }
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .tl-header {
      display:flex; align-items:center; margin-bottom:8px; gap:8px;
    }
    .tl-title { margin:0; font-size:1.2rem; flex:1; }
    .tl-settings-btn { flex-shrink:0; }
    :host ::ng-deep app-filter-bar { display:flex; flex:1; min-width:0; margin-bottom:16px; }
    .role-member    { background:rgba(158,158,158,0.12);color:#9e9e9e; }
    .role-teamlead  { background:rgba(100,181,246,0.15);color:#64b5f6; }
    .role-techlead  { background:rgba(171,71,188,0.15);color:#ce93d8; }
    .role-admin     { background:rgba(255,179,0,0.15);color:#ffca28; }
    .team-chip      { font-size:0.68rem;font-weight:600;padding:2px 7px;border-radius:6px;
                      background:rgba(38,166,154,0.15);color:#4db6ac;
                      border:1px solid rgba(38,166,154,0.25); }
    .member-card    { background:rgba(255,255,255,0.04);transition:background 0.15s;min-height:80px;cursor:pointer; }
    .member-card:hover { background:rgba(255,255,255,0.08); }
    .member-card-disabled { cursor:default; }
    .member-card-disabled:hover { background:rgba(255,255,255,0.04); }
  `]
})
export class TeamListComponent implements OnInit {
  private svc = inject(TeamMemberService);
  private squadSvc = inject(SquadService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private globalFilterSvc = inject(GlobalFilterService);
  private auth = inject(AuthService);

  constructor() {
    effect(() => { const h = this.globalFilterSvc.searchHint(); untracked(() => this.memberSearch.set(h)); });

    effect(() => {
      const globalFilters = this.globalFilterSvc.filters();
      untracked(() => {
        if (globalFilters.squadId !== null) {
          this.filterSquad.set([globalFilters.squadId]);
        }
        if (globalFilters.leadId !== null) {
          this.filterLead.set([globalFilters.leadId]);
        }
      });
    });
  }

  members: TeamMember[] = [];
  loading = signal(true);
  // A signal, not a plain field: filteredMembers/teamOptions are computed() over it, and a bare
  // reassignment wouldn't invalidate their memo -- reloads after a dialog closes would no-op.
  allMembers = signal<TeamMember[]>([]);
  squads = signal<SquadSummary[]>([]);
  teamLeads = signal<TeamMember[]>([]);
  memberSearch = signal('');

  filterRole = signal<string[]>([]);
  filterCraft = signal<string[]>([]);
  filterSquad = signal<string[]>([]);
  filterTeam = signal<string[]>([]);
  filterLead = signal<string[]>([]);

  filterGroups = computed<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [];
    groups.push({
      key: 'role',
      label: 'Role',
      icon: 'badge',
      options: this.roleOptions.map(r => ({ id: r.id, label: r.name })),
    });
    groups.push({
      key: 'craft',
      label: 'Craft',
      icon: 'build',
      options: this.craftOptions.map(c => ({ id: c.id, label: c.name })),
    });
    groups.push({
      key: 'squad',
      label: 'Squad',
      icon: 'groups',
      options: this.squads().map(s => ({ id: s.id, label: s.name })),
    });
    const teams = this.teamOptions();
    if (teams.length > 0) {
      groups.push({
        key: 'team',
        label: 'Team',
        icon: 'workspaces',
        // "No team" is the empty derived set, which also covers members in no squad at all.
        options: [...teams.map(t => ({ id: t.id, label: t.name })), { id: NO_TEAM, label: 'No team' }],
      });
    }
    const leads = this.teamLeads();
    if (leads.length > 0) {
      groups.push({
        key: 'lead',
        label: 'Lead',
        icon: 'person',
        options: leads.map(t => ({ id: t.id, label: memberDisplayName(t, buildDuplicateFirstNames(leads)) })),
      });
    }
    return groups;
  });

  filterValues = computed<Record<string, string[]>>(() => ({
    role: this.filterRole(),
    craft: this.filterCraft(),
    squad: this.filterSquad(),
    team: this.filterTeam(),
    lead: this.filterLead(),
  }));

  /** Extract @mentioned member names from the raw search text */
  mentionMemberNames = computed(() => {
    const rawQ = this.memberSearch();
    const members = this.allMembers();
    const names: string[] = [];
    const regex = /@([\w'-]+(?:\s[\w'-]+)*)/g;
    let match;
    while ((match = regex.exec(rawQ)) !== null) {
      const namePart = match[1].toLowerCase();
      const found = members.find(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(namePart)
      );
      if (found) {
        const fullName = `${found.firstName} ${found.lastName}`;
        if (!names.includes(fullName)) {
          names.push(fullName);
        }
      }
    }
    return names;
  });

  filteredMembers = computed(() => {
    const mentionNames = this.mentionMemberNames();
    const q = stripMentions(this.memberSearch()).toLowerCase();
    const roles = this.filterRole();
    const crafts = this.filterCraft();
    const squads = this.filterSquad();
    const teams = this.filterTeam();
    const leads = this.filterLead();

    let filtered = this.allMembers();

    // Filter by @mentioned member names
    if (mentionNames.length > 0) {
      filtered = filtered.filter(m => {
        const fullName = `${m.firstName} ${m.lastName}`;
        return mentionNames.some(n => fullName.toLowerCase().includes(n.toLowerCase()));
      });
    }

    if (q) {
      filtered = filtered.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q));
    }
    if (roles.length > 0) {
      filtered = filtered.filter(m => roles.includes(m.role));
    }
    if (crafts.length > 0) {
      filtered = filtered.filter(m => m.crafts.some(c => crafts.includes(c)));
    }
    if (squads.length > 0) {
      filtered = filtered.filter(m => m.squads.some(sq => squads.includes(sq.id)));
    }
    if (teams.length > 0) {
      // Any-match: someone in two teams shows under both. Showing them under each is strictly
      // better than picking one, which would invent a value the data doesn't hold.
      filtered = filtered.filter(m =>
        (teams.includes(NO_TEAM) && m.teams.length === 0) ||
        m.teams.some(t => teams.includes(t.id)));
    }
    if (leads.length > 0) {
      filtered = filtered.filter(m => leads.includes(m.teamLeadId ?? ''));
    }
    return filtered;
  });

  readonly roleOptions = MEMBER_ROLES.map(r => ({ id: r.id, name: r.label }));

  readonly craftOptions = [
    { id: 'DevBE', name: 'Dev — Backend' },
    { id: 'DevFE', name: 'Dev — Frontend' },
    { id: 'DevIOS', name: 'Dev — Mobile iOS' },
    { id: 'DevAndroid', name: 'Dev — Mobile Android' },
    { id: 'Analysis', name: 'Analyst' },
    { id: 'Design', name: 'Designer' },
    { id: 'QA', name: 'QA' },
  ];

  roleClass(role: string) { return `role-${role.toLowerCase()}`; }
  roleLabel = roleLabel;
  craftLabel(craft: string) { return CRAFT_LABELS[craft] ?? craft; }
  squadBg(color: string | null) { return color ? color + '28' : 'rgba(158,158,158,0.12)'; }

  /**
   * Derived from the members already loaded rather than fetched: /teams is TeamLead-gated, and
   * filtering a list by something visible on its own rows shouldn't depend on the viewer's role.
   * A team with no members can't match anything anyway, so omitting it costs nothing.
   */
  teamOptions = computed<TeamSummary[]>(() => {
    const byId = new Map<string, TeamSummary>();
    for (const m of this.allMembers()) {
      for (const t of m.teams) byId.set(t.id, t);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit() {
    this.squadSvc.getAll().subscribe(s => this.squads.set(s));
    this.svc.getAll({ role: 'TeamLead', isActive: true }).subscribe(m => this.teamLeads.set(m));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAll({ isActive: true })
      .subscribe(m => { this.allMembers.set(m); this.loading.set(false); });
  }

  onFilterApply(filters: Record<string, string[]>) {
    this.filterRole.set(filters['role'] ?? []);
    this.filterCraft.set(filters['craft'] ?? []);
    this.filterSquad.set(filters['squad'] ?? []);
    this.filterTeam.set(filters['team'] ?? []);
    this.filterLead.set(filters['lead'] ?? []);
  }

  openForm(member?: TeamMember) {
    const ref = this.dialog.open(TeamMemberFormComponent, {
      width: '560px',
      maxHeight: '90vh',
      data: { member, allMembers: this.allMembers() }
    });
    ref.afterClosed().subscribe(result => { if (result) this.load(); });
  }

  /** Mirrors the server rule: only an Admin may change an Admin's role. */
  get canAssignRoles() { return this.auth.canAssignRoles(); }
  canChangeRole(member: TeamMember): boolean {
    return member.role !== 'Admin' || this.auth.isAdmin();
  }

  openChangeRole(member: TeamMember) {
    if (!this.canChangeRole(member)) return;
    const ref = this.dialog.open(ChangeRoleDialogComponent, { width: '400px', data: { member } });
    ref.afterClosed().subscribe(changed => { if (changed) this.load(); });
  }

  openSquadManager() {
    const ref = this.dialog.open(SquadManagerDialogComponent, { width: '560px' });
    // Squad membership and squad->team moves both change the derived teams on member rows.
    ref.afterClosed().subscribe(() => { this.load(); this.reloadSquads(); });
  }

  /** UX only -- TeamsController's role attribute is the actual boundary. */
  get canManageTeams() { return this.auth.canManageTeams(); }

  /** Likewise UX only; the boundary is the role attribute on SquadsController's write endpoints. */
  get canManageSquads() { return this.auth.canManageSquads(); }

  openTeamManager() {
    const ref = this.dialog.open(TeamManagerDialogComponent, { width: '560px' });
    // Renaming or deleting a team changes the chips and the filter options on every row.
    ref.afterClosed().subscribe(changed => { if (changed) { this.load(); this.reloadSquads(); } });
  }

  private reloadSquads() {
    this.squadSvc.getAll().subscribe(s => this.squads.set(s));
  }

  canOpen(member: TeamMember): boolean {
    return this.auth.isSelfOrLead(member.id);
  }

  openPersonal(member: TeamMember) {
    if (!this.canOpen(member)) return;
    this.router.navigate(['/team', member.id]);
  }
}
