import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, AfterViewInit, HostListener, effect, ChangeDetectionStrategy } from '@angular/core';

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
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './wheel.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./wheel.component.scss']
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
