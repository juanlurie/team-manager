import { Component, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, OnDestroy, input, signal, effect } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface HubTab {
  label: string;
  route: string;
  /** Match the route exactly (use for a tab whose path is a prefix of its siblings). */
  exact?: boolean;
}

/**
 * Scrollable tab row shared by every hub (Pulse, Games, Delivery, Team, Meetings, Integrations).
 * Shows left/right arrows only when the row actually overflows, so wide tab sets stay reachable
 * without a visible scrollbar.
 */
@Component({
  selector: 'app-hub-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="hub-tabs-wrap">
      <nav class="hub-tabs" role="tablist" #tabsEl (scroll)="updateArrows()">
        @for (tab of tabs(); track tab.route) {
          <a class="hub-tab" [routerLink]="tab.route" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: !!tab.exact }" role="tab">{{ tab.label }}</a>
        }
      </nav>
      <button class="scroll-hint left" [class.show]="showLeft()" (click)="scrollTabs(-160)"
              tabindex="-1" aria-hidden="true">‹</button>
      <button class="scroll-hint right" [class.show]="showRight()" (click)="scrollTabs(160)"
              tabindex="-1" aria-hidden="true">›</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .hub-tabs-wrap { position:relative; margin-bottom:16px; }
    .hub-tabs {
      display:flex;gap:0;
      border-bottom:1px solid rgba(255,255,255,0.08);
      overflow-x:auto;scrollbar-width:none;
      -ms-overflow-style:none;scroll-behavior:smooth;
    }
    .hub-tabs::-webkit-scrollbar { display:none; }
    .hub-tab {
      padding:12px 16px;font-size:0.85rem;font-weight:500;
      color:rgba(255,255,255,0.45);text-decoration:none;
      border-bottom:2px solid transparent;
      transition:all 0.15s;white-space:nowrap;cursor:pointer;
      font-family:inherit;background:none;border-top:none;border-left:none;border-right:none;
    }
    .hub-tab:hover { color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.04); }
    .hub-tab.active { color:#64b5f6;border-bottom-color:#64b5f6; }
    .hub-tab:focus-visible { outline:2px solid #64b5f6;outline-offset:-2px; }
    .scroll-hint {
      position:absolute; top:50%; transform:translateY(-50%);
      width:22px; height:22px; border-radius:50%;
      background:#1c2a38; border:1px solid rgba(100,181,246,0.35);
      color:#64b5f6; font-size:0.85rem; line-height:1;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; font-family:inherit;
      opacity:0; pointer-events:none; transition:opacity 0.15s;
      box-shadow:0 0 6px rgba(0,0,0,0.4);
    }
    .scroll-hint.show { opacity:1; pointer-events:auto; }
    .scroll-hint.left { left:2px; }
    .scroll-hint.right { right:2px; }
  `]
})
export class HubTabsComponent implements AfterViewInit, OnDestroy {
  tabs = input.required<HubTab[]>();

  @ViewChild('tabsEl') tabsEl?: ElementRef<HTMLElement>;
  showLeft = signal(false);
  showRight = signal(false);

  private observer?: ResizeObserver;

  constructor() {
    // Tab sets are feature-gated, so the row can change width after first render.
    effect(() => {
      this.tabs();
      queueMicrotask(() => this.updateArrows());
    });
  }

  ngAfterViewInit() {
    this.updateArrows();
    const el = this.tabsEl?.nativeElement;
    if (el && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.updateArrows());
      this.observer.observe(el);
    }
    window.addEventListener('resize', this.updateArrows);
  }

  updateArrows = () => {
    const el = this.tabsEl?.nativeElement;
    if (!el) return;
    this.showLeft.set(el.scrollLeft > 2);
    this.showRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  scrollTabs(delta: number) {
    this.tabsEl?.nativeElement.scrollBy({ left: delta, behavior: 'smooth' });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    window.removeEventListener('resize', this.updateArrows);
  }
}
