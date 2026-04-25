import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, AfterViewInit, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { TeamMemberService } from '../../core/services/team-member.service';
import { TeamMember } from '../../core/models/team-member.model';
import { WheelService } from '../../core/services/wheel.service';
import { Wheel } from '../../core/models/wheel.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const COLORS = [
  '#5c6bc0','#42a5f5','#26c6da','#66bb6a','#ffca28','#ffa726','#ef5350','#ab47bc',
  '#ec407a','#29b6f6','#26a69a','#9ccc65','#ffee58','#ff7043','#8d6e63','#78909c',
];

@Component({
  selector: 'app-wheel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule, MatProgressSpinnerModule],
  styles: [`
    /* Desktop: side-by-side, no wrapping */
    .wheel-layout { display: flex; gap: 24px; flex-wrap: nowrap; align-items: flex-start; }
    .wheel-layout.mobile { display: block; }
    .participant-panel { width: 280px; flex-shrink: 0; min-width: 0; }
    .wheel-layout.mobile .participant-panel { width: 100%; }
    .wheel-area { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .wheel-layout.mobile .wheel-area { width: 100%; }

    /* Step indicator (mobile) */
    .step-nav { display: flex; align-items: center; margin-bottom: 20px; }
    .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
                justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0; }
    .step-dot.active  { background: rgba(100,181,246,0.2);  color: #64b5f6; border: 1px solid rgba(100,181,246,0.5); }
    .step-dot.done    { background: rgba(100,181,246,0.12); color: #64b5f6; border: 1px solid rgba(100,181,246,0.3); }
    .step-dot.pending { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.1); }
    .step-line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
    .step-line.done { background: rgba(100,181,246,0.4); }

    .icon-btn {
      background: none; border: none; cursor: pointer; padding: 0; border-radius: 4px;
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; flex-shrink: 0;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.06); }
    .wheel-chip {
      padding: 4px 10px; border-radius: 20px; border: 1px solid; font-size: 0.75rem;
      cursor: pointer; background: transparent; transition: all 0.15s;
      display: inline-flex; align-items: center; gap: 4px;
    }
  `],
  template: `
    <h2 style="margin:0 0 20px;font-size:1.2rem">Spin the Wheel</h2>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {

    <!-- Mobile step indicator -->
    @if (isMobile()) {
      <div class="step-nav">
        <div class="step-dot" [class.active]="step()===1" [class.done]="step()>1" [class.pending]="step()<1">1</div>
        <div class="step-line" [class.done]="step()>1"></div>
        <div class="step-dot" [class.active]="step()===2" [class.done]="step()>2" [class.pending]="step()<2">2</div>
        <div class="step-line" [class.done]="step()>2"></div>
        <div class="step-dot" [class.active]="step()===3" [class.done]="false" [class.pending]="step()<3">3</div>
      </div>
    }

    <!-- Mobile step 3: winner result (replaces layout) -->
    @if (isMobile() && step() === 3) {
      <div style="text-align:center;padding:48px 0">
        <div style="font-size:4rem;margin-bottom:8px">🎉</div>
        <div style="font-size:0.8rem;opacity:0.4;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Winner</div>
        <div style="font-size:2.2rem;font-weight:700;margin-bottom:40px">{{ winner() }}</div>
        @if (selected().length >= 2) {
          <button mat-raised-button color="primary"
                  style="width:100%;height:52px;font-size:1rem;margin-bottom:12px"
                  (click)="spinAgain()">
            <mat-icon>casino</mat-icon> Remove &amp; Spin Again
          </button>
        }
        <button mat-stroked-button style="width:100%;height:48px" (click)="startOver()">
          Start Over
        </button>
      </div>
    }

    <!-- Main layout (participant panel + wheel area) -->
    @if (!isMobile() || step() !== 3) {
    <div class="wheel-layout" [class.mobile]="isMobile()">

      <!-- ── Participant panel (desktop always; mobile step 1 only) ── -->
      @if (!isMobile() || step() === 1) {
      <div class="participant-panel">

        <!-- Wheel selector -->
        <div style="margin-bottom:14px">
          <div style="font-size:0.72rem;font-weight:600;opacity:0.45;text-transform:uppercase;
                      letter-spacing:0.08em;margin-bottom:8px">Wheel</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            <button class="wheel-chip"
                    [style.background]="!activeWheel() ? 'rgba(100,181,246,0.15)' : 'transparent'"
                    [style.border-color]="!activeWheel() ? 'rgba(100,181,246,0.4)' : 'rgba(255,255,255,0.12)'"
                    [style.color]="!activeWheel() ? '#64b5f6' : 'rgba(255,255,255,0.4)'"
                    (click)="selectWheel(null)">Session</button>
            @for (w of wheels(); track w.id) {
              <button class="wheel-chip"
                      [style.background]="activeWheel()?.id===w.id ? 'rgba(100,181,246,0.15)' : 'transparent'"
                      [style.border-color]="activeWheel()?.id===w.id ? 'rgba(100,181,246,0.4)' : 'rgba(255,255,255,0.12)'"
                      [style.color]="activeWheel()?.id===w.id ? '#64b5f6' : 'rgba(255,255,255,0.4)'"
                      (click)="selectWheel(w)">
                {{ w.name }}
                @if (activeWheel()?.id === w.id) {
                  <span style="opacity:0.5;font-size:0.8em;line-height:1;margin-left:2px"
                        (click)="deleteActiveWheel(); $event.stopPropagation()">✕</span>
                }
              </button>
            }
            @if (!creatingWheel()) {
              <button class="wheel-chip"
                      style="border-style:dashed;color:rgba(255,255,255,0.3);border-color:rgba(255,255,255,0.15)"
                      (click)="creatingWheel.set(true)">+ New</button>
            }
          </div>
          @if (creatingWheel()) {
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
              <input [(ngModel)]="newWheelName" placeholder="Wheel name…"
                     style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);
                            border-radius:6px;padding:5px 8px;color:inherit;font-size:0.8rem;outline:none"
                     (keydown.enter)="createWheel()" (keydown.escape)="cancelCreate()">
              <button class="icon-btn" style="color:rgba(100,181,246,0.8)"
                      [disabled]="!newWheelName.trim() || savingWheel()" (click)="createWheel()">
                <mat-icon style="font-size:16px;height:16px;width:16px;line-height:1">check</mat-icon>
              </button>
              <button class="icon-btn" style="color:rgba(255,255,255,0.4)" (click)="cancelCreate()">
                <mat-icon style="font-size:16px;height:16px;width:16px;line-height:1">close</mat-icon>
              </button>
            </div>
          }
          @if (activeWheel()) {
            <div style="font-size:0.7rem;opacity:0.35;margin-top:2px">
              {{ activeWheel()!.participants.length }} saved · changes sync to server
            </div>
          }
        </div>

        <div style="font-size:0.72rem;font-weight:600;opacity:0.45;text-transform:uppercase;
                    letter-spacing:0.08em;margin-bottom:10px">Participants</div>

        <button mat-stroked-button style="width:100%;justify-content:flex-start;margin-bottom:10px;font-size:0.82rem"
                (click)="addAll()">
          <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:6px">groups</mat-icon>
          Add everyone <span style="opacity:0.4;margin-left:4px">({{ allMembers().length }})</span>
        </button>

        @for (lead of teamLeads(); track lead.id) {
          <div style="border-radius:8px;overflow:hidden;margin-bottom:6px;
                      border:1px solid {{ teamSomeAdded(lead.id) ? 'rgba(100,181,246,0.2)' : 'rgba(255,255,255,0.07)' }}">
            <div style="display:flex;align-items:center;padding:7px 10px;cursor:pointer;gap:6px;
                        background:{{ teamAllAdded(lead.id) ? 'rgba(100,181,246,0.08)' : 'transparent' }};
                        transition:background 0.15s"
                 (click)="toggleAddTeam(lead.id)">
              <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
                          background:{{ teamAllAdded(lead.id) ? '#64b5f6' : teamSomeAdded(lead.id) ? '#ffb74d' : 'rgba(255,255,255,0.18)' }}"></div>
              <span style="flex:1;font-size:0.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                {{ lead.firstName }} {{ lead.lastName }}
              </span>
              <span style="font-size:0.7rem;opacity:0.4;flex-shrink:0">{{ teamAddedCount(lead.id) }}/{{ teamSize(lead.id) }}</span>
              <button class="icon-btn" (click)="toggleExpanded(lead.id); $event.stopPropagation()"
                      [matTooltip]="isExpanded(lead.id) ? 'Collapse' : 'Expand members'">
                <mat-icon style="font-size:18px;height:18px;width:18px;line-height:1;color:rgba(255,255,255,0.5)">
                  {{ isExpanded(lead.id) ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              </button>
            </div>
            @if (isExpanded(lead.id)) {
              <div style="background:rgba(0,0,0,0.18);padding:2px 0 4px">
                @for (m of teamMembers(lead.id); track m.id) {
                  <div style="display:flex;align-items:center;padding:4px 10px 4px 24px;gap:8px">
                    <div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;
                                background:{{ isSelected(m.id) ? '#64b5f6' : 'rgba(255,255,255,0.15)' }}"></div>
                    <span style="flex:1;font-size:0.8rem;opacity:{{ isSelected(m.id) ? '1' : '0.55' }}">
                      {{ m.firstName }} {{ m.lastName }}
                    </span>
                    @if (isSelected(m.id)) {
                      <button class="icon-btn" style="color:rgba(239,83,80,0.8)"
                              matTooltip="Remove" (click)="removeMember(m)">
                        <mat-icon style="font-size:16px;height:16px;width:16px;line-height:1">close</mat-icon>
                      </button>
                    } @else {
                      <button class="icon-btn" style="color:rgba(100,181,246,0.7)"
                              matTooltip="Add" (click)="addMember(m)">
                        <mat-icon style="font-size:16px;height:16px;width:16px;line-height:1">add</mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (selected().length === 0) {
          <div style="font-size:0.78rem;opacity:0.3;margin-top:10px;padding:0 2px">
            Click a team or member to add to the wheel
          </div>
        } @else {
          <div style="display:flex;align-items:center;margin-top:10px;padding:0 2px">
            <span style="font-size:0.75rem;opacity:0.4;flex:1">{{ selected().length }} on the wheel</span>
            <button mat-button style="font-size:0.72rem;opacity:0.5;padding:0 8px;height:28px" (click)="clearAll()">
              Clear all
            </button>
          </div>
        }

        <!-- Mobile: proceed to spin -->
        @if (isMobile()) {
          <button mat-raised-button color="primary"
                  style="width:100%;height:52px;font-size:1rem;margin-top:20px"
                  [disabled]="selected().length < 2"
                  (click)="goToSpin()">
            <mat-icon>casino</mat-icon>
            Ready to Spin ({{ selected().length }})
          </button>
        }
      </div>
      } <!-- end participant panel -->

      <!-- ── Wheel / Trill area (desktop always; mobile step 2 only) ── -->
      @if (!isMobile() || step() === 2) {
      <div class="wheel-area">

        <!-- Mobile: back link + count -->
        @if (isMobile()) {
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:4px">
            <button mat-button style="padding:0 4px;min-width:0" (click)="step.set(1)">
              <mat-icon style="font-size:18px;height:18px;width:18px;line-height:18px;vertical-align:middle">arrow_back</mat-icon>
              Change
            </button>
            <span style="font-size:0.8rem;opacity:0.45">{{ selected().length }} participants</span>
          </div>
        }

        <!-- Mode toggle -->
        <div style="display:flex;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden">
          <button (click)="mode.set('wheel')"
                  style="padding:6px 18px;font-size:0.8rem;border:none;cursor:pointer;transition:all 0.15s"
                  [style.background]="mode()==='wheel' ? 'rgba(100,181,246,0.2)' : 'transparent'"
                  [style.color]="mode()==='wheel' ? '#64b5f6' : 'rgba(255,255,255,0.45)'">Wheel</button>
          <button (click)="mode.set('trill')"
                  style="padding:6px 18px;font-size:0.8rem;border:none;cursor:pointer;transition:all 0.15s"
                  [style.background]="mode()==='trill' ? 'rgba(255,152,0,0.2)' : 'transparent'"
                  [style.color]="mode()==='trill' ? '#ff9800' : 'rgba(255,255,255,0.45)'">Trill</button>
        </div>

        <!-- Wheel canvas -->
        @if (mode() === 'wheel') {
          <div style="position:relative">
            <!-- Pointer arrow — hidden when empty -->
            @if (selected().length > 0) {
              <div style="position:absolute;top:50%;right:-16px;transform:translateY(-50%);z-index:10;
                          width:0;height:0;border-top:12px solid transparent;
                          border-bottom:12px solid transparent;border-right:22px solid #ff5252"></div>
            }
            <!-- Canvas: always in DOM so @ViewChild resolves; hidden when empty -->
            <canvas #wheelCanvas [width]="canvasSize()" [height]="canvasSize()"
                    style="border-radius:50%;display:block"
                    [style.visibility]="selected().length === 0 ? 'hidden' : 'visible'"
                    [style.position]="selected().length === 0 ? 'absolute' : 'relative'"
                    [style.box-shadow]="wildMode() ? '0 0 24px rgba(239,83,80,0.25)' : 'none'"></canvas>
            <!-- HTML empty state -->
            @if (selected().length === 0) {
              <div [style.width]="canvasSize() + 'px'" [style.height]="canvasSize() + 'px'"
                   style="border-radius:50%;border:2px dashed rgba(255,255,255,0.09);
                          background:rgba(255,255,255,0.02);display:flex;flex-direction:column;
                          align-items:center;justify-content:center;gap:12px;box-sizing:border-box">
                <mat-icon style="font-size:64px;width:64px;height:64px;opacity:0.1">casino</mat-icon>
                <div style="text-align:center;padding:0 40px">
                  <div style="font-size:1rem;font-weight:500;opacity:0.22">Add participants</div>
                  <div style="font-size:0.8rem;opacity:0.14;margin-top:6px;line-height:1.5">
                    Select a team or member<br>from the panel to get started
                  </div>
                </div>
              </div>
            }
          </div>
          <div style="display:flex;align-items:center;gap:10px" [style.width]="isMobile() ? '100%' : 'auto'">
            <button mat-raised-button
                    [style.flex]="isMobile() ? '1' : 'none'"
                    style="height:48px;font-size:1rem;min-width:140px"
                    [style.background]="wildMode() ? '#ef5350' : ''"
                    [color]="wildMode() ? '' : 'primary'"
                    [disabled]="selected().length < 2 || spinning()"
                    (click)="spin()">
              <mat-icon>{{ wildMode() ? 'whatshot' : 'casino' }}</mat-icon>
              {{ spinning() ? 'Spinning…' : (wildMode() ? 'Wild Spin!' : 'Spin!') }}
            </button>
            <button (click)="wildMode.set(!wildMode())"
                    [matTooltip]="wildMode() ? 'Wild mode on — it will troll you' : 'Enable wild mode'"
                    style="height:36px;width:36px;border-radius:50%;border:1px solid;cursor:pointer;
                           display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s"
                    [style.background]="wildMode() ? 'rgba(239,83,80,0.2)' : 'rgba(255,255,255,0.05)'"
                    [style.border-color]="wildMode() ? 'rgba(239,83,80,0.5)' : 'rgba(255,255,255,0.15)'">
              <mat-icon style="font-size:18px;height:18px;width:18px;line-height:1"
                        [style.color]="wildMode() ? '#ef5350' : 'rgba(255,255,255,0.4)'">whatshot</mat-icon>
            </button>
          </div>
        }

        <!-- Trill display -->
        @if (mode() === 'trill') {
          <div [style.width]="canvasSize() + 'px'" [style.height]="canvasSize() + 'px'"
               style="border-radius:16px;max-width:100%;display:flex;flex-direction:column;
                      align-items:center;justify-content:center;gap:8px;box-sizing:border-box"
               [style.background]="selected().length === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,152,0,0.05)'"
               [style.border]="selected().length === 0 ? '2px dashed rgba(255,255,255,0.09)' : '1px solid rgba(255,152,0,0.15)'">
            @if (selected().length === 0) {
              <mat-icon style="font-size:64px;width:64px;height:64px;opacity:0.1">bolt</mat-icon>
              <div style="text-align:center;padding:0 40px">
                <div style="font-size:1rem;font-weight:500;opacity:0.22">Add participants</div>
                <div style="font-size:0.8rem;opacity:0.14;margin-top:6px;line-height:1.5">
                  Select a team or member<br>from the panel to get started
                </div>
              </div>
            } @else if (trillingName()) {
              <div style="font-size:2.2rem;font-weight:800;text-align:center;padding:0 16px;
                          color:#ff9800;transition:opacity 0.05s">{{ trillingName() }}</div>
            } @else {
              <mat-icon style="font-size:48px;height:48px;width:48px;opacity:0.15">bolt</mat-icon>
              <div style="font-size:0.85rem;opacity:0.3;margin-top:4px">Press Trill!</div>
            }
          </div>
          <button mat-raised-button [style.width]="isMobile() ? '100%' : '160px'"
                  style="height:48px;font-size:1rem;background:#ff9800;color:#000"
                  [disabled]="selected().length < 2 || trilling()"
                  (click)="trill()">
            <mat-icon>bolt</mat-icon> {{ trilling() ? 'Trilling…' : 'Trill!' }}
          </button>
        }

        @if (selected().length === 1) {
          <div style="font-size:0.8rem;opacity:0.4">Add at least 2 participants</div>
        }
      </div>
      } <!-- end wheel area -->

    </div>
    } <!-- end main layout -->

    <!-- Desktop winner overlay -->
    @if (!isMobile() && winner()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;
                  justify-content:center;z-index:999"
           (click)="winner.set(null)">
        <div style="background:#1e1e2e;border-radius:20px;padding:48px 64px;text-align:center;
                    border:2px solid rgba(255,255,255,0.15);max-width:360px"
             (click)="$event.stopPropagation()">
          <div style="font-size:3rem;margin-bottom:8px">🎉</div>
          <div style="font-size:0.85rem;opacity:0.5;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em">Winner</div>
          <div style="font-size:2rem;font-weight:700">{{ winner() }}</div>
          @if (activeWheel()) {
            <div style="font-size:0.75rem;opacity:0.4;margin-top:8px">Removed from {{ activeWheel()!.name }}</div>
          }
          <button mat-stroked-button style="margin-top:24px" (click)="winner.set(null)">Close</button>
        </div>
      </div>
    }
    } <!-- end @else loading -->
  `
})
export class WheelComponent implements OnInit, AfterViewInit {
  @ViewChild('wheelCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private teamMemberSvc = inject(TeamMemberService);
  private wheelSvc = inject(WheelService);
  private dialog = inject(MatDialog);

  loading       = signal(true);
  allMembers    = signal<TeamMember[]>([]);
  teamLeads     = computed(() => this.allMembers().filter(m => m.role === 'TeamLead' || m.role === 'TechLead'));
  selected      = signal<TeamMember[]>([]);
  spinning      = signal(false);
  winner        = signal<string | null>(null);
  expandedTeams = signal<Set<string>>(new Set());
  mode          = signal<'wheel' | 'trill'>('wheel');
  trilling      = signal(false);
  trillingName  = signal('');
  wildMode      = signal(false);

  wheels        = signal<Wheel[]>([]);
  activeWheel   = signal<Wheel | null>(null);
  creatingWheel = signal(false);
  newWheelName  = '';
  savingWheel   = signal(false);

  isMobile   = signal(false);
  step       = signal<1 | 2 | 3>(1);
  canvasSize = signal(340);

  private currentAngle = 0;
  private animFrame: number | null = null;

  constructor() {
    this.checkMobile();
    // Redraw when step 2 becomes active — canvas just entered the DOM
    effect(() => {
      if (this.step() === 2) { setTimeout(() => this.draw(), 0); }
    });
  }

  @HostListener('window:resize')
  checkMobile() {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile) {
      this.canvasSize.set(Math.min(window.innerWidth - 48, 340));
    } else {
      // Fill available space: subtract sidebar + participant panel + gaps + page padding
      const byWidth  = window.innerWidth  - 58 - 48 - 280 - 64;
      // Subtract topbar equivalent + mode toggle + spin button + page padding
      const byHeight = window.innerHeight - 80 - 44 - 68 - 48;
      this.canvasSize.set(Math.max(Math.min(byWidth, byHeight, 580), 320));
    }
    setTimeout(() => this.draw(), 0);
  }

  ngOnInit() {
    this.teamMemberSvc.getAll({ isActive: true }).subscribe(members => {
      this.allMembers.set(members.sort((a, b) => a.firstName.localeCompare(b.firstName)));
      this.wheelSvc.getAll().subscribe(wheels => { this.wheels.set(wheels); this.loading.set(false); });
    });
  }

  ngAfterViewInit() { this.draw(); }

  goToSpin() { this.step.set(2); }

  /* ── Wheel management ──────────────────────────────── */

  selectWheel(w: Wheel | null) {
    this.activeWheel.set(w);
    if (w) { this.syncSelectedFromWheel(w); }
    else { this.selected.set([]); this.draw(); }
  }

  createWheel() {
    const name = this.newWheelName.trim();
    if (!name || this.savingWheel()) return;
    this.savingWheel.set(true);
    this.wheelSvc.create(name).subscribe({
      next: (created) => {
        this.wheels.update(list => [...list, created]);
        this.newWheelName = '';
        this.creatingWheel.set(false);
        this.savingWheel.set(false);
        this.selectWheel(created);
      },
      error: () => this.savingWheel.set(false)
    });
  }

  cancelCreate() { this.creatingWheel.set(false); this.newWheelName = ''; }

  deleteActiveWheel() {
    const wheel = this.activeWheel();
    if (!wheel) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete wheel?', message: `"${wheel.name}" will be permanently removed.`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.wheelSvc.delete(wheel.id).subscribe(() => {
        this.wheels.update(list => list.filter(w => w.id !== wheel.id));
        this.activeWheel.set(null);
        this.selected.set([]);
        this.draw();
      });
    });
  }

  private syncSelectedFromWheel(w: Wheel) {
    const members = w.participants
      .map(p => this.allMembers().find(m => m.id === p.teamMemberId))
      .filter((m): m is TeamMember => !!m);
    this.selected.set(members);
    this.draw();
  }

  private updateActiveWheel(updated: Wheel) {
    this.activeWheel.set(updated);
    this.wheels.update(list => list.map(w => w.id === updated.id ? updated : w));
    this.syncSelectedFromWheel(updated);
  }

  private reloadActiveWheel() {
    const wid = this.activeWheel()?.id;
    if (!wid) return;
    this.wheelSvc.getAll().subscribe(wheels => {
      this.wheels.set(wheels);
      const updated = wheels.find(w => w.id === wid) ?? null;
      if (updated) { this.activeWheel.set(updated); this.syncSelectedFromWheel(updated); }
      else { this.activeWheel.set(null); }
    });
  }

  /* ── Selection helpers ─────────────────────────────── */

  isSelected(id: string) { return this.selected().some(m => m.id === id); }

  teamMembers(leadId: string): TeamMember[] {
    return this.allMembers().filter(m => m.teamLeadId === leadId || m.id === leadId);
  }

  teamSize(leadId: string)       { return this.teamMembers(leadId).length; }
  teamAddedCount(leadId: string) { return this.teamMembers(leadId).filter(m => this.isSelected(m.id)).length; }
  teamAllAdded(leadId: string)   { const ms = this.teamMembers(leadId); return ms.length > 0 && ms.every(m => this.isSelected(m.id)); }
  teamSomeAdded(leadId: string)  { return this.teamMembers(leadId).some(m => this.isSelected(m.id)); }

  /* ── Selection actions ─────────────────────────────── */

  addMember(m: TeamMember) {
    if (this.isSelected(m.id)) return;
    if (this.activeWheel()) {
      this.wheelSvc.addParticipant(this.activeWheel()!.id, m.id).subscribe(u => this.updateActiveWheel(u));
    } else { this.selected.update(s => [...s, m]); this.draw(); }
  }

  removeMember(m: TeamMember) {
    if (this.activeWheel()) {
      this.wheelSvc.removeParticipant(this.activeWheel()!.id, m.id).subscribe(u => this.updateActiveWheel(u));
    } else { this.selected.update(s => s.filter(x => x.id !== m.id)); this.draw(); }
  }

  toggleAddTeam(leadId: string) {
    if (this.activeWheel()) {
      const wheel = this.activeWheel()!;
      const presentIds = new Set(wheel.participants.map(p => p.teamMemberId));
      const teamIds = this.teamMembers(leadId).map(m => m.id);
      if (this.teamAllAdded(leadId)) {
        forkJoin(teamIds.map(id => this.wheelSvc.removeParticipant(wheel.id, id)))
          .subscribe(() => this.reloadActiveWheel());
      } else {
        const toAdd = teamIds.filter(id => !presentIds.has(id));
        if (toAdd.length > 0)
          forkJoin(toAdd.map(id => this.wheelSvc.addParticipant(wheel.id, id)))
            .subscribe(() => this.reloadActiveWheel());
      }
    } else {
      if (this.teamAllAdded(leadId)) {
        const ids = new Set(this.teamMembers(leadId).map(m => m.id));
        this.selected.update(s => s.filter(m => !ids.has(m.id)));
      } else {
        const existing = this.selected();
        const toAdd = this.teamMembers(leadId).filter(m => !existing.some(e => e.id === m.id));
        this.selected.update(s => [...s, ...toAdd]);
      }
      this.draw();
    }
  }

  addAll() {
    if (this.activeWheel()) {
      const wheel = this.activeWheel()!;
      const presentIds = new Set(wheel.participants.map(p => p.teamMemberId));
      const toAdd = this.allMembers().filter(m => !presentIds.has(m.id));
      if (toAdd.length === 0) return;
      forkJoin(toAdd.map(m => this.wheelSvc.addParticipant(wheel.id, m.id)))
        .subscribe(() => this.reloadActiveWheel());
    } else { this.selected.set([...this.allMembers()]); this.draw(); }
  }

  clearAll() {
    if (this.activeWheel()) {
      const wheel = this.activeWheel()!;
      if (wheel.participants.length === 0) return;
      forkJoin(wheel.participants.map(p => this.wheelSvc.removeParticipant(wheel.id, p.teamMemberId)))
        .subscribe(() => this.reloadActiveWheel());
    } else { this.selected.set([]); this.draw(); }
  }

  /* ── Expand/collapse ───────────────────────────────── */

  isExpanded(leadId: string) { return this.expandedTeams().has(leadId); }

  toggleExpanded(leadId: string) {
    this.expandedTeams.update(s => {
      const n = new Set(s);
      n.has(leadId) ? n.delete(leadId) : n.add(leadId);
      return n;
    });
  }

  /* ── Winner announcement ───────────────────────────── */

  private announceWinner(w: TeamMember) {
    this.winner.set(`${w.firstName} ${w.lastName}`);
    if (this.activeWheel()) {
      this.wheelSvc.removeParticipant(this.activeWheel()!.id, w.id)
        .subscribe(updated => this.updateActiveWheel(updated));
    }
    if (this.isMobile()) { this.step.set(3); }
  }

  spinAgain() {
    if (!this.activeWheel()) {
      const name = this.winner();
      this.selected.update(s => s.filter(m => `${m.firstName} ${m.lastName}` !== name));
    }
    this.winner.set(null);
    this.step.set(2);
    setTimeout(() => { this.draw(); if (this.selected().length >= 2) this.spin(); }, 50);
  }

  startOver() { this.winner.set(null); this.step.set(1); }

  /* ── Trill ─────────────────────────────────────────── */

  trill() {
    const names = this.selected();
    if (names.length < 2 || this.trilling()) return;
    this.trilling.set(true);
    this.winner.set(null);

    const winnerIdx = Math.floor(Math.random() * names.length);
    const pickedWinner = names[winnerIdx];
    const duration = 2800 + Math.random() * 800;
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = elapsed / duration;
      if (progress >= 1) {
        this.trillingName.set(`${pickedWinner.firstName} ${pickedWinner.lastName}`);
        this.trilling.set(false);
        setTimeout(() => this.announceWinner(pickedWinner), 400);
        return;
      }
      const idx = Math.floor(Math.random() * names.length);
      this.trillingName.set(`${names[idx].firstName} ${names[idx].lastName}`);
      const interval = 50 + Math.pow(progress, 2) * 300;
      setTimeout(tick, interval);
    };
    tick();
  }

  /* ── Spin ──────────────────────────────────────────── */

  spin() {
    if (this.wildMode()) { this.spinWild(); return; }
    const names = this.selected();
    if (names.length < 2 || this.spinning()) return;
    this.spinning.set(true);
    this.winner.set(null);

    const totalRotation = 2 * Math.PI * (8 + Math.floor(Math.random() * 6)) + Math.random() * 2 * Math.PI;
    const duration   = 4000 + Math.random() * 1500;
    const start      = performance.now();
    const startAngle = this.currentAngle;

    const animate = (now: number) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 4);
      this.currentAngle = startAngle + totalRotation * eased;
      this.draw();
      if (progress < 1) {
        this.animFrame = requestAnimationFrame(animate);
      } else {
        this.currentAngle = startAngle + totalRotation;
        this.draw();
        this.spinning.set(false);
        const segAngle   = (2 * Math.PI) / names.length;
        const normalized = ((2 * Math.PI) - (this.currentAngle % (2 * Math.PI))) % (2 * Math.PI);
        const w = names[Math.floor(normalized / segAngle) % names.length];
        this.announceWinner(w);
      }
    };
    this.animFrame = requestAnimationFrame(animate);
  }

  /* ── Wild spin ─────────────────────────────────────── */

  private angleForIndex(idx: number, n: number, fromAngle: number, extraRotations: number): number {
    const segAngle      = (2 * Math.PI) / n;
    const targetNorm    = idx * segAngle + segAngle / 2;
    const targetInCycle = ((2 * Math.PI) - targetNorm + 2 * Math.PI) % (2 * Math.PI);
    const currentMod    = ((fromAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let delta = targetInCycle - currentMod;
    if (delta <= 0) delta += 2 * Math.PI;
    return fromAngle + delta + 2 * Math.PI * extraRotations;
  }

  private spinWild() {
    const names = this.selected();
    if (names.length < 2 || this.spinning()) return;
    this.spinning.set(true);
    this.winner.set(null);

    const n        = names.length;
    const realIdx  = Math.floor(Math.random() * n);
    const numChaos = 2 + Math.floor(Math.random() * 3);
    let dir = 1;

    const runSegment = (seg: number) => {
      if (seg >= numChaos) { this.wildFinal(names, realIdx, n); return; }
      const isTrollPause = seg === 0;
      const rotations    = isTrollPause ? 4 + Math.random() * 3 : 0.8 + Math.random() * 1.8;
      const duration     = isTrollPause ? 3200 + Math.random() * 600 : 700 + Math.random() * 600;
      const angleChange  = 2 * Math.PI * rotations * dir;
      const segStart     = this.currentAngle;
      const target       = segStart + angleChange;
      const t0           = performance.now();
      const ease         = isTrollPause
        ? (p: number) => 1 - Math.pow(1 - p, 4)
        : (p: number) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

      const animate = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        this.currentAngle = segStart + angleChange * ease(p);
        this.draw();
        if (p < 1) { this.animFrame = requestAnimationFrame(animate); }
        else {
          this.currentAngle = target;
          this.draw();
          dir *= -1;
          const pause = isTrollPause ? 750 + Math.random() * 300 : 80 + Math.random() * 120;
          setTimeout(() => runSegment(seg + 1), pause);
        }
      };
      this.animFrame = requestAnimationFrame(animate);
    };
    runSegment(0);
  }

  private wildFinal(names: TeamMember[], realIdx: number, n: number) {
    const realTarget = this.angleForIndex(realIdx, n, this.currentAngle, 1 + Math.floor(Math.random() * 2));
    const startAngle = this.currentAngle;
    const duration   = 1800 + Math.random() * 500;
    const t0         = performance.now();

    const animate = (now: number) => {
      const p     = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      this.currentAngle = startAngle + (realTarget - startAngle) * eased;
      this.draw();
      if (p < 1) { this.animFrame = requestAnimationFrame(animate); }
      else {
        this.currentAngle = realTarget;
        this.draw();
        this.spinning.set(false);
        this.announceWinner(names[realIdx]);
      }
    };
    this.animFrame = requestAnimationFrame(animate);
  }

  /* ── Draw ──────────────────────────────────────────── */

  private draw() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx  = canvas.getContext('2d')!;
    const cx   = canvas.width / 2;
    const cy   = canvas.height / 2;
    const r    = cx - 4;
    const names = this.selected();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (names.length === 0) return;

    const segAngle = (2 * Math.PI) / names.length;
    names.forEach((m, i) => {
      const start = this.currentAngle + i * segAngle;
      const end   = start + segAngle;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(start + segAngle / 2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      const fontSize = names.length > 16 ? 10 : names.length > 10 ? 12 : 14;
      ctx.font = `${fontSize}px sans-serif`;
      const label = m.firstName + (names.length <= 12 ? ' ' + m.lastName.charAt(0) + '.' : '');
      ctx.fillText(label, r - 10, 0);
      ctx.restore();
    });

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e1e2e'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
}
