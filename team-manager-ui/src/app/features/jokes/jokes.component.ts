import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { API_BASE } from '../../core/services/api.config';
import { WebSocketService } from '../../core/websocket/websocket.service';

interface JokeType {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  color: string;
}

const JOKE_TYPES: JokeType[] = [
  {
    id: 'random',
    label: 'Random Joke',
    icon: 'casino',
    prompt: 'Tell me a funny random joke. Keep it clean and under 3 sentences.',
    color: '#7c4dff',
  },
  {
    id: 'dad',
    label: 'Dad Joke',
    icon: 'sentiment_very_satisfied',
    prompt: 'Tell me a classic dad joke. It should be groan-worthy and punny. Just the joke, no explanation.',
    color: '#ff8f00',
  },
  {
    id: 'tech',
    label: 'Tech Joke',
    icon: 'code',
    prompt: 'Tell me a programming or software development joke that a dev team would appreciate. Just the joke.',
    color: '#00897b',
  },
  {
    id: 'timesheet',
    label: 'Timesheet Threat',
    icon: 'schedule',
    prompt: 'Write a playful, dramatic threat aimed at a software development team who have not submitted their timesheets. Channel your inner cartoon villain — menacing but hilarious. Under 4 sentences.',
    color: '#e53935',
  },
];

@Component({
  selector: 'app-jokes',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  styles: [`
    .jokes-wrap { max-width: 640px; margin: 0 auto; padding: 8px 0; }
    .section-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.35); margin-bottom: 12px; }
    .type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 24px; }
    @media (max-width: 480px) { .type-grid { grid-template-columns: 1fr; } }
    .type-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: 14px;
      border: 1.5px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      cursor: pointer; transition: all 0.15s;
      text-align: left; color: inherit; font-family: inherit;
    }
    .type-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); }
    .type-card.active { border-color: var(--card-color); background: rgba(0,0,0,0.2); }
    .type-card.loading { opacity: 0.6; cursor: wait; }
    .type-icon { font-size: 26px; width: 26px; height: 26px; flex-shrink: 0; }
    .type-label { font-size: 0.88rem; font-weight: 600; }
    .joke-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px; padding: 24px;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .joke-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .joke-category { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; }
    .joke-text { font-size: 1.05rem; line-height: 1.65; color: rgba(255,255,255,0.9); }
    .joke-actions { display: flex; gap: 10px; margin-top: 20px; }
    .spinner-wrap { display: flex; justify-content: center; padding: 40px; }
    .unconfigured { text-align: center; padding: 24px 0; }
    .unconfigured mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.3; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; }
    .unconfigured p { color: rgba(255,255,255,0.45); font-size: 0.88rem; line-height: 1.5; }
  `],
  template: `
    <div class="jokes-wrap">
      <p class="section-title">Pick a vibe</p>

      <div class="type-grid">
        @for (type of jokeTypes; track type.id) {
          <button
            class="type-card"
            [class.active]="selectedType()?.id === type.id"
            [class.loading]="loading()"
            [style.--card-color]="type.color"
            (click)="generate(type)"
            [disabled]="loading()"
          >
            <mat-icon class="type-icon" [style.color]="type.color">{{ type.icon }}</mat-icon>
            <span class="type-label">{{ type.label }}</span>
          </button>
        }
      </div>

      @if (loading()) {
        <div class="spinner-wrap">
          <mat-spinner diameter="36" />
        </div>
      } @else if (joke() !== null) {
        <div class="joke-card">
          <div class="joke-header">
            <mat-icon [style.color]="selectedType()!.color" style="font-size:18px;width:18px;height:18px">
              {{ selectedType()!.icon }}
            </mat-icon>
            <span class="joke-category">{{ selectedType()!.label }}</span>
          </div>
          <p class="joke-text">{{ joke() }}</p>
          <div class="joke-actions">
            <button mat-stroked-button (click)="generate(selectedType()!)">
              <mat-icon>refresh</mat-icon> Another one
            </button>
            <button mat-stroked-button (click)="copy()">
              <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
              {{ copied() ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
      } @else if (failed()) {
        <div class="unconfigured">
          <mat-icon>error_outline</mat-icon>
          <p>Couldn't generate a joke. Check the <strong>GenerateJoke</strong> request config<br>
            and make sure the <strong>Text Response Path</strong> mapping is set correctly.</p>
          <button mat-stroked-button (click)="generate(selectedType()!)" style="margin-top:12px">
            <mat-icon>refresh</mat-icon> Try again
          </button>
        </div>
      } @else if (selectedType() && !configured()) {
        <div class="unconfigured">
          <mat-icon>settings</mat-icon>
          <p>No <strong>GenerateJoke</strong> request config is set up yet.<br>
            Add one in Request Configs to enable AI-powered jokes.</p>
        </div>
      }
    </div>
  `,
})
export class JokesComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private ws = inject(WebSocketService);
  private base = `${API_BASE}/jokes`;
  private wsSub?: Subscription;

  jokeTypes = JOKE_TYPES;
  selectedType = signal<JokeType | null>(null);
  joke = signal<string | null>(null);
  failed = signal(false);
  loading = signal(false);
  configured = signal(true);
  copied = signal(false);

  ngOnInit() {
    this.http.get<{ configured: boolean }>(`${this.base}/configured`).subscribe({
      next: r => this.configured.set(r.configured),
      error: () => this.configured.set(false),
    });

    this.wsSub = this.ws.messages$.subscribe(msg => {
      if (msg?.type !== 'joke_generated') return;
      const data = msg.data as { jokeTypeId: string; joke: string | null; status: string };
      if (data.jokeTypeId !== this.selectedType()?.id) return;
      this.loading.set(false);
      const text = data.joke?.trim() || null;
      this.joke.set(text);
      this.failed.set(!text);
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  copy() {
    const text = this.joke();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  generate(type: JokeType) {
    this.copied.set(false);
    this.failed.set(false);
    if (this.loading()) return;
    this.selectedType.set(type);
    this.joke.set(null);
    this.loading.set(true);

    this.http.post<{ configured: boolean; eventId?: string; joke?: string | null; status?: string }>(
      `${this.base}/generate`,
      { jokeType: type.prompt, jokeLabel: type.label, jokeTypeId: type.id }
    ).subscribe({
      next: r => {
        const text = r.joke?.trim() || null;
        this.loading.set(false);
        if (!this.joke()) {
          this.joke.set(text);
          this.failed.set(!text);
        }
      },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }
}
