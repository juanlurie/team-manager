import { Component, ChangeDetectionStrategy, EventEmitter, Input, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RetroThemeLibraryService } from '../../../core/services/retro-theme-library.service';
import { RetroCustomTheme } from '../../../core/models/fun-retro.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RETRO_THEMES, ALL_TEMPLATE_COLUMNS } from './retro-constants';

// Owns the full lifecycle of the shared custom-theme library (create/rename/delete/upload/
// override) plus the theme *picker* swatches. Two modes share this one component instead of
// duplicating markup: 'compact' is the in-session settings-drawer picker (select only, no CRUD),
// 'full' is the standalone theme-manager page (complete authoring surface).
@Component({
  selector: 'app-retro-theme-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    :host { display:block; }
    .theme-picker { display:flex;gap:6px;flex-wrap:wrap; }
    .theme-swatch {
      width:34px;height:34px;flex-shrink:0;
      background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);
      border-radius:8px;cursor:pointer;color:rgba(255,255,255,0.5);
      display:flex;align-items:center;justify-content:center;
      transition:border-color .15s,background .15s;
    }
    .theme-swatch:hover { background:rgba(255,255,255,0.1); }
    .theme-swatch.active { border-color:#64b5f6;background:rgba(100,181,246,0.12); }
    .theme-swatch-preview {
      width:22px;height:22px;background-repeat:no-repeat;background-position:center;
      background-size:contain;image-rendering:pixelated;opacity:0.85;
    }
    .theme-manage-panel { display:flex;flex-direction:column;gap:12px; }
    .theme-manage-desc { font-size:0.7rem;color:rgba(255,255,255,0.35); }
    .theme-manage-card {
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);
      border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;
    }
    .theme-manage-row { display:flex;align-items:center;gap:8px; }
    .theme-manage-name { flex:1;font-size:0.88rem;font-weight:600; }
    .theme-name-input {
      flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
      border-radius:6px;color:#fff;padding:5px 8px;font-size:0.82rem;
    }
    .theme-variant-slots { display:flex;gap:6px;flex-wrap:wrap; }
    .theme-variant-slot { position:relative;width:44px;height:44px;flex-shrink:0; }
    .theme-variant-slot-label {
      font-size:0.6rem;color:rgba(255,255,255,0.4);text-align:center;margin-top:2px;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    .theme-variant-preview, .theme-variant-upload {
      width:44px;height:44px;border-radius:6px;cursor:pointer;
      background-color:rgba(255,255,255,0.05);border:1.5px dashed rgba(255,255,255,0.15);
      background-repeat:no-repeat;background-position:center;background-size:contain;
      display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);
    }
    .theme-variant-preview { border-style:solid; }
    .theme-variant-remove {
      position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;
      background:#ef5350;color:#fff;border:none;cursor:pointer;
      display:flex;align-items:center;justify-content:center;padding:0;
    }
    .theme-manage-new { display:flex;gap:8px;align-items:center; }
    .theme-override-row {
      display:flex;align-items:center;gap:8px;font-size:0.78rem;color:rgba(255,255,255,0.6);
      border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;
    }
    .theme-override-select {
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
      border-radius:6px;color:#fff;padding:5px 8px;font-size:0.78rem;
    }
    .toolbar-btn {
      background:transparent;border:none;color:rgba(255,255,255,0.5);cursor:pointer;
      border-radius:6px;padding:4px;display:flex;align-items:center;justify-content:center;
    }
    .toolbar-btn:hover { background:rgba(255,255,255,0.1);color:#fff; }
    .toolbar-btn-danger:hover { background:rgba(239,83,80,0.15);color:#ef5350; }
    .toolbar-btn mat-icon { font-size:18px;width:18px;height:18px; }
  `],
  template: `
    @if (mode === 'compact') {
      <div class="theme-picker">
        <button class="theme-swatch" [class.active]="!selectedThemeId" title="None" (click)="selectTheme(null)">
          <mat-icon style="font-size:16px;height:16px;width:16px">block</mat-icon>
        </button>
        @for (t of retroThemes; track t.id) {
          <button class="theme-swatch" [class.active]="selectedThemeId === t.id" [title]="t.label"
                  (click)="selectTheme(t.id)">
            <span class="theme-swatch-preview" [style.background-image]="t.variantUrls[0]"></span>
          </button>
        }
        @for (t of customThemes(); track t.id) {
          <button class="theme-swatch" [class.active]="selectedThemeId === t.id" [title]="t.name"
                  (click)="selectTheme(t.id)">
            @if (customThemeSwatchUrl(t); as url) {
              <span class="theme-swatch-preview" [style.background-image]="'url(' + url + ')'"></span>
            } @else {
              <mat-icon style="font-size:16px;height:16px;width:16px">image</mat-icon>
            }
          </button>
        }
      </div>
    } @else {
      <div class="theme-manage-panel">
        <div class="theme-manage-desc">
          Shared across every retro. Upload an image per column key -- columns without one fall back
          to the closest legacy positive/negative/action slot. A theme can also stand in for one of
          the built-in themes (space/f1/ocean/retro-gaming): sessions already using that built-in
          theme render this theme's images instead, without their stored theme value changing.
        </div>
        @for (t of customThemes(); track t.id) {
          <div class="theme-manage-card">
            <div class="theme-manage-row">
              @if (renamingThemeId() === t.id) {
                <input class="theme-name-input" [value]="renameText()" (input)="renameText.set($any($event.target).value)"
                       (keydown.enter)="saveRenameTheme(t.id)" (keydown.escape)="renamingThemeId.set(null)" />
                <button class="toolbar-btn" (click)="saveRenameTheme(t.id)"><mat-icon>check</mat-icon></button>
                <button class="toolbar-btn" (click)="renamingThemeId.set(null)"><mat-icon>close</mat-icon></button>
              } @else {
                <span class="theme-manage-name">{{ t.name }}</span>
                <button class="toolbar-btn" title="Rename" (click)="startRenameTheme(t)"><mat-icon style="font-size:16px;height:16px;width:16px">edit</mat-icon></button>
              }
              <button class="toolbar-btn toolbar-btn-danger" title="Delete theme" (click)="deleteCustomTheme(t)">
                <mat-icon style="font-size:16px;height:16px;width:16px">delete_outline</mat-icon>
              </button>
            </div>
            <div class="theme-variant-slots">
              @for (c of allColumns; track c.key) {
                <div>
                  <div class="theme-variant-slot" [title]="c.label">
                    @if (customThemeVariantUrl(t, c.key); as url) {
                      <span class="theme-variant-preview" [style.background-image]="'url(' + url + ')'" (click)="fileInput.click()"></span>
                      <button class="theme-variant-remove" title="Remove" (click)="removeVariantImage(t.id, c.key)">
                        <mat-icon style="font-size:12px;height:12px;width:12px">close</mat-icon>
                      </button>
                    } @else {
                      <button class="theme-variant-upload" (click)="fileInput.click()">
                        <mat-icon style="font-size:16px;height:16px;width:16px">add_photo_alternate</mat-icon>
                      </button>
                    }
                    <input #fileInput type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none"
                           (change)="onVariantFileSelected($event, t.id, c.key)" />
                  </div>
                  <div class="theme-variant-slot-label">{{ c.label }}</div>
                </div>
              }
            </div>
            <div class="theme-override-row">
              <span>Overrides built-in theme:</span>
              <select class="theme-override-select" [disabled]="savingOverrideThemeId() === t.id"
                      [ngModel]="t.overridesBuiltInId ?? ''" (ngModelChange)="onOverrideChange(t, $event)">
                <option value="">None</option>
                @for (b of retroThemes; track b.id) {
                  <option [value]="b.id" [disabled]="isClaimedByAnother(b.id, t.id)">
                    {{ b.label }}{{ isClaimedByAnother(b.id, t.id) ? ' (in use)' : '' }}
                  </option>
                }
              </select>
            </div>
          </div>
        }
        <div class="theme-manage-new">
          <input class="theme-name-input" placeholder="New theme name…" [value]="newThemeName()"
                 (input)="newThemeName.set($any($event.target).value)" (keydown.enter)="createCustomTheme()" />
          <button mat-stroked-button [disabled]="!newThemeName().trim() || creatingTheme()" (click)="createCustomTheme()">
            <mat-icon>add</mat-icon> New Theme
          </button>
        </div>
      </div>
    }
  `,
})
export class RetroThemeEditorComponent implements OnInit, OnDestroy {
  @Input() mode: 'full' | 'compact' = 'full';
  @Input() selectedThemeId: string | null = null;
  @Output() themeSelected = new EventEmitter<string | null>();

  private themeLibSvc = inject(RetroThemeLibraryService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly retroThemes = RETRO_THEMES;
  readonly allColumns = ALL_TEMPLATE_COLUMNS;

  customThemes = signal<RetroCustomTheme[]>([]);
  newThemeName = signal('');
  creatingTheme = signal(false);
  renamingThemeId = signal<string | null>(null);
  renameText = signal('');
  savingOverrideThemeId = signal<string | null>(null);

  // Object URLs for fetched variant image blobs, keyed by "themeId:variant". Not plain asset
  // URLs -- the endpoint sits behind bearer-token auth, so each is fetched via HttpClient (which
  // the auth interceptor attaches the token to) rather than an <img src>, then cached here.
  private variantImageUrls = signal<Record<string, string>>({});
  private variantFetchInFlight = new Set<string>();

  ngOnInit(): void {
    this.loadCustomThemes();
  }

  ngOnDestroy(): void {
    for (const url of Object.values(this.variantImageUrls())) URL.revokeObjectURL(url);
  }

  loadCustomThemes(): void {
    this.themeLibSvc.getThemes().subscribe({
      next: themes => this.customThemes.set(themes),
      error: () => {},
    });
  }

  findCustomTheme(id: string): RetroCustomTheme | undefined {
    return this.customThemes().find(t => t.id === id);
  }

  isClaimedByAnother(builtInId: string, excludeThemeId: string): boolean {
    return this.customThemes().some(t => t.id !== excludeThemeId && t.overridesBuiltInId === builtInId);
  }

  /** Lazily fetches and caches a variant's image blob as an object URL; returns the cached URL
   *  (or null while the fetch is in flight / the variant has no image). Falls back to the
   *  "positive" variant if the requested one has no image, same spirit as the built-in
   *  retro-gaming theme mixing variants -- a half-configured theme still reads as one theme. */
  private ensureVariantUrl(themeId: string, variant: string): string | null {
    const theme = this.findCustomTheme(themeId);
    if (!theme) return null;
    const effectiveVariant = theme.variants[variant] ? variant : (theme.variants['positive'] ? 'positive' : null);
    if (!effectiveVariant) return null;
    const key = `${themeId}:${effectiveVariant}`;
    const cached = this.variantImageUrls()[key];
    if (cached) return cached;
    if (!this.variantFetchInFlight.has(key)) {
      this.variantFetchInFlight.add(key);
      this.themeLibSvc.getVariantBlob(themeId, effectiveVariant).subscribe({
        next: blob => {
          this.variantFetchInFlight.delete(key);
          this.variantImageUrls.update(m => ({ ...m, [key]: URL.createObjectURL(blob) }));
        },
        error: () => this.variantFetchInFlight.delete(key),
      });
    }
    return null;
  }

  /** Representative preview for a custom theme's swatch -- the "positive" variant (or whatever's
   *  uploaded, since ensureVariantUrl falls back to it). */
  customThemeSwatchUrl(theme: RetroCustomTheme): string | null {
    return this.ensureVariantUrl(theme.id, 'positive');
  }

  customThemeVariantUrl(theme: RetroCustomTheme, variant: string): string | null {
    const key = `${theme.id}:${variant}`;
    return this.variantImageUrls()[key] ?? (theme.variants[variant] ? this.ensureVariantUrl(theme.id, variant) : null);
  }

  createCustomTheme(): void {
    const name = this.newThemeName().trim();
    if (!name || this.creatingTheme()) return;
    this.creatingTheme.set(true);
    this.themeLibSvc.createTheme(name).subscribe({
      next: theme => {
        this.customThemes.update(list => [...list, theme]);
        this.newThemeName.set('');
        this.creatingTheme.set(false);
      },
      error: () => {
        this.creatingTheme.set(false);
        this.snackBar.open('Failed to create theme', 'OK', { duration: 3000 });
      },
    });
  }

  startRenameTheme(theme: RetroCustomTheme): void {
    this.renamingThemeId.set(theme.id);
    this.renameText.set(theme.name);
  }

  saveRenameTheme(themeId: string): void {
    const name = this.renameText().trim();
    this.renamingThemeId.set(null);
    if (!name) return;
    this.themeLibSvc.renameTheme(themeId, name).subscribe({
      next: () => this.customThemes.update(list => list.map(t => t.id === themeId ? { ...t, name } : t)),
      error: () => this.snackBar.open('Failed to rename theme', 'OK', { duration: 3000 }),
    });
  }

  deleteCustomTheme(theme: RetroCustomTheme): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: `Delete "${theme.name}"?`, message: 'Sessions using this theme will fall back to no background.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.themeLibSvc.deleteTheme(theme.id).subscribe({
        next: () => this.customThemes.update(list => list.filter(t => t.id !== theme.id)),
        error: () => this.snackBar.open('Failed to delete theme', 'OK', { duration: 3000 }),
      });
    });
  }

  onVariantFileSelected(event: Event, themeId: string, variant: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('Image must be under 5MB', 'OK', { duration: 3000 });
      return;
    }
    this.themeLibSvc.uploadVariant(themeId, variant, file).subscribe({
      next: ({ updatedAt }) => {
        this.customThemes.update(list => list.map(t => t.id === themeId ? { ...t, variants: { ...t.variants, [variant]: updatedAt } } : t));
        const key = `${themeId}:${variant}`;
        this.variantImageUrls.update(m => {
          const old = m[key];
          if (old) URL.revokeObjectURL(old);
          const next = { ...m };
          delete next[key];
          return next;
        });
      },
      error: () => this.snackBar.open('Failed to upload image', 'OK', { duration: 3000 }),
    });
  }

  removeVariantImage(themeId: string, variant: string): void {
    this.themeLibSvc.deleteVariant(themeId, variant).subscribe({
      next: () => {
        this.customThemes.update(list => list.map(t => {
          if (t.id !== themeId) return t;
          const variants = { ...t.variants };
          delete variants[variant];
          return { ...t, variants };
        }));
        const key = `${themeId}:${variant}`;
        const old = this.variantImageUrls()[key];
        if (old) {
          URL.revokeObjectURL(old);
          this.variantImageUrls.update(m => { const next = { ...m }; delete next[key]; return next; });
        }
      },
      error: () => this.snackBar.open('Failed to remove image', 'OK', { duration: 3000 }),
    });
  }

  onOverrideChange(theme: RetroCustomTheme, builtInId: string): void {
    const value = builtInId || null;
    if (value === theme.overridesBuiltInId) return;
    this.savingOverrideThemeId.set(theme.id);
    this.themeLibSvc.setOverride(theme.id, value).subscribe({
      next: () => {
        this.savingOverrideThemeId.set(null);
        this.customThemes.update(list => list.map(t => t.id === theme.id ? { ...t, overridesBuiltInId: value } : t));
      },
      error: (err: { status?: number }) => {
        this.savingOverrideThemeId.set(null);
        const msg = err?.status === 409
          ? 'Another theme already overrides that built-in theme -- clear it there first.'
          : 'Failed to update override';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
      },
    });
  }

  selectTheme(id: string | null): void {
    this.themeSelected.emit(id);
  }
}
