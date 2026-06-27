import { Component, inject, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-integrations-hub',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatSnackBarModule],
  template: `
    <div class="hub">
      <div class="hub-tabs-wrap">
        <nav class="hub-tabs" role="tablist" #tabsEl (scroll)="updateFades()">
          <a class="hub-tab" routerLink="library" routerLinkActive="active" role="tab">Library</a>
          <a class="hub-tab" routerLink="api-configs" routerLinkActive="active" role="tab">Custom Integrations</a>
          <a class="hub-tab" routerLink="ai-prompts" routerLinkActive="active" role="tab">AI Prompts</a>
          <a class="hub-tab" routerLink="config-variables" routerLinkActive="active" role="tab">Config Variables</a>
          <a class="hub-tab" routerLink="credentials" routerLinkActive="active" role="tab">Credentials</a>
          <a class="hub-tab" routerLink="sync-queue" routerLinkActive="active" role="tab">Sync Queue</a>
          <a class="hub-tab" routerLink="services" routerLinkActive="active" role="tab">Services</a>
          <a class="hub-tab" routerLink="api-keys" routerLinkActive="active" role="tab">API Keys</a>
        </nav>
        <button class="scroll-hint left" [class.show]="showLeftFade()" (click)="scrollTabs(-120)" tabindex="-1" aria-hidden="true">‹</button>
        <button class="scroll-hint right" [class.show]="showRightFade()" (click)="scrollTabs(120)" tabindex="-1" aria-hidden="true">›</button>
      </div>
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .hub { max-width:1100px;margin:0 auto;padding:8px; }
    .hub-tabs-wrap { position:relative; margin-bottom:16px; }
    .hub-tabs {
      display:flex;gap:0;
      border-bottom:1px solid rgba(255,255,255,0.08);
      overflow-x:auto;scrollbar-width:none;
      -ms-overflow-style:none;
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
    .hub-content { min-height:200px; }
  `]
})
export class IntegrationsHubComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  @ViewChild('tabsEl') tabsEl?: ElementRef<HTMLElement>;
  showLeftFade = signal(false);
  showRightFade = signal(false);

  ngAfterViewInit() {
    this.updateFades();
    window.addEventListener('resize', this.updateFades);
  }

  updateFades = () => {
    const el = this.tabsEl?.nativeElement;
    if (!el) return;
    this.showLeftFade.set(el.scrollLeft > 2);
    this.showRightFade.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  scrollTabs(delta: number) {
    const el = this.tabsEl?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.updateFades);
  }

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('outlook') === 'connected') {
      this.snackBar.open('Outlook Calendar connected!', 'Close', { duration: 4000 });
    } else if (params.get('outlook_error')) {
      this.snackBar.open('Outlook connection failed: ' + params.get('outlook_error'), 'Close', { duration: 5000 });
    } else if (params.get('gcal') === 'connected') {
      this.snackBar.open('Google Calendar connected!', 'Close', { duration: 4000 });
    } else if (params.get('gcal_error')) {
      this.snackBar.open('Google connection failed: ' + params.get('gcal_error'), 'Close', { duration: 5000 });
    }
  }
}
