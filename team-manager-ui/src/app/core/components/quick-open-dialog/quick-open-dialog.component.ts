import { Component, inject, signal, computed, AfterViewInit, ViewChild, ElementRef, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TeamMemberService } from '../../services/team-member.service';
import { TeamMember } from '../../models/team-member.model';

interface QuickOpenItem {
  id: string;
  path: string;
  label: string;
  icon: string;
}

const QUICK_OPEN_ITEMS: QuickOpenItem[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'sprints', path: '/sprints', label: 'Sprints', icon: 'directions_run' },
  { id: 'features', path: '/features', label: 'Features', icon: 'view_list' },
  { id: 'progress', path: '/progress', label: 'Progress', icon: 'track_changes' },
  { id: 'discussion', path: '/discussion', label: 'Discussion', icon: 'forum' },
  { id: 'team', path: '/team', label: 'Team', icon: 'people' },
  { id: 'leave', path: '/leave', label: 'Leave', icon: 'event_busy' },
  { id: 'meetings', path: '/meetings', label: 'Meetings', icon: 'event' },
  { id: 'export', path: '/export', label: 'Export', icon: 'download' },
  { id: 'fun', path: '/fun', label: 'Fun Hub', icon: 'casino' },
  { id: 'win-of-the-week', path: '/fun/win-of-the-week', label: 'Win of the Week', icon: 'emoji_events' },
  { id: 'win-of-the-month', path: '/fun/win-of-the-week#month', label: 'Win of the Month', icon: 'workspace_premium' },
  { id: 'leaderboard', path: '/fun/leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
  { id: 'wheel', path: '/fun/wheel', label: 'Spin Wheel', icon: 'casino' },
  { id: 'coffee-run', path: '/fun/coffee-run', label: 'Coffee Run', icon: 'local_cafe' },
  { id: 'scrum-poker', path: '/fun/scrum-poker', label: 'Scrum Poker', icon: 'style' },
  { id: 'expense-claim', path: '/expense-claim', label: 'Expense Claim', icon: 'receipt_long' },
  { id: 'showcase', path: '/showcase', label: 'Showcase', icon: 'auto_awesome' },
  { id: 'milestones', path: '/milestones', label: 'Milestones', icon: 'flag' },
  { id: 'pis', path: '/pis', label: 'Program Increments', icon: 'view_quilt' },
  { id: 'session-types', path: '/session-types', label: 'Session Types', icon: 'category' },
  { id: 'slot-locations', path: '/meetings/locations', label: 'Slot Locations', icon: 'location_on' },
  { id: 'access-requests', path: '/access-requests', label: 'Access Requests', icon: 'person_add' },
  { id: 'settings', path: '/settings', label: 'Settings', icon: 'settings' },
  { id: 'api-keys', path: '/settings/api-keys', label: 'API Keys', icon: 'vpn_key' },
  { id: 'feature-permissions', path: '/settings/feature-permissions', label: 'Feature Permissions', icon: 'admin_panel_settings' },
  { id: 'profile', path: '/profile', label: 'Profile', icon: 'person' },
];

@Component({
  selector: 'app-quick-open-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  template: `
    <div class="quick-open-wrapper">
      <div class="quick-open-header">
        <mat-icon>search</mat-icon>
        <input #searchInput [ngModel]="query()" (ngModelChange)="query.set($event)"
               placeholder="Go to page..." autocomplete="off" spellcheck="false"
               (keydown)="onKeydown($event)" />
      </div>
      <div class="quick-open-list">
        @if (filtered().length === 0) {
          <div class="quick-open-empty">No results</div>
        } @else {
          @for (item of filtered(); track item.id) {
            <button class="quick-open-item" [class.active]="$index === selectedIndex()"
                    (click)="navigate(item.path)">
              <mat-icon class="item-icon">{{ item.icon }}</mat-icon>
              <span class="item-label">{{ item.label }}</span>
              <span class="item-path">{{ item.path }}</span>
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .quick-open-wrapper {
      width: 90vw;
      max-width: 500px;
      background: #1a2636;
      border-radius: 10px;
    }
    .quick-open-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      background: rgba(0,0,0,0.2);
    }
    .quick-open-header mat-icon { color: rgba(255,255,255,0.3); font-size: 20px; }
    .quick-open-header input {
      flex: 1;
      background: none;
      border: none;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
    }
    .quick-open-header input::placeholder { color: rgba(255,255,255,0.3); }
    .close-btn {
      color: rgba(255,255,255,0.4);
      width: 32px;
      height: 32px;
      line-height: 32px;
    }
    .close-btn:hover { color: rgba(255,255,255,0.8); }
    .quick-open-list {
      max-height: 320px;
      overflow-y: auto;
    }
    .quick-open-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      background: none;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      text-align: left;
      transition: background 0.1s;
    }
    .quick-open-item:hover, .quick-open-item.active {
      background: rgba(100,181,246,0.1);
    }
    .quick-open-item.active { color: #64b5f6; }
    .item-icon { font-size: 18px; width: 18px; height: 18px; color: rgba(255,255,255,0.5); }
    .quick-open-item.active .item-icon { color: #64b5f6; }
    .item-label { font-size: 0.9rem; font-weight: 500; }
    .item-path { flex: 1; text-align: right; font-size: 0.75rem; color: rgba(255,255,255,0.3); }
    .quick-open-empty { padding: 20px; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.85rem; }
  `]
})
export class QuickOpenDialogComponent implements AfterViewInit, OnInit {
  private router = inject(Router);
  private teamMemberService = inject(TeamMemberService);
  dialogRef = inject(MatDialogRef<QuickOpenDialogComponent>);
  query = signal('');
  selectedIndex = signal(0);
  teamMembers = signal<TeamMember[]>([]);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.teamMemberService.getAll({ isActive: true }).subscribe(members => {
      this.teamMembers.set(members);
      setTimeout(() => this.searchInput?.nativeElement?.focus());
    });
  }

  allItems = computed(() => {
    const members = this.teamMembers();
    const memberItems: QuickOpenItem[] = members.map(m => ({
      id: `member-${m.id}`,
      path: `/team/${m.id}`,
      label: `${m.firstName} ${m.lastName}`,
      icon: 'person'
    }));
    return [...QUICK_OPEN_ITEMS, ...memberItems];
  });

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const items = this.allItems();
    if (!q) return items.slice(0, 15);
    return items.filter(i =>
      i.label.toLowerCase().includes(q) || i.path.toLowerCase().includes(q)
    ).slice(0, 15);
  });

  ngAfterViewInit(): void {
    setTimeout(() => this.searchInput?.nativeElement?.focus());
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.selectedIndex.update(i => Math.min(i + 1, this.filtered().length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.selectedIndex.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const items = this.filtered();
      if (items.length > 0) this.navigate(items[this.selectedIndex()].path);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    // Handle arrow keys when dialog is open
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'ArrowDown') {
        this.selectedIndex.update(i => Math.min(i + 1, this.filtered().length - 1));
      } else {
        this.selectedIndex.update(i => Math.max(i - 1, 0));
      }
    }
  }

  navigate(path: string): void {
    this.router.navigate([path]);
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}