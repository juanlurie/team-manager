import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { CoffeeRunService } from '../../core/services/coffee-run.service';
import { MenuTemplateList, MenuTemplateDetail, TemplateItem, ImportMenuTemplateRequest, CreateTemplateItemRequest, UpdateTemplateItemRequest } from '../../core/models/coffee-run.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-manage-menus',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule,
    MatInputModule, MatFormFieldModule
  ],
  templateUrl: './manage-menus.component.html',
  styleUrls: ['./manage-menus.component.scss']
})
export class ManageMenusComponent implements OnInit {
  private coffeeRunSvc = inject(CoffeeRunService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  loading = signal(true);
  templates = signal<MenuTemplateList[]>([]);
  selectedTemplate = signal<MenuTemplateDetail | null>(null);
  selectedTemplateLoading = signal(false);

  newName = '';
  newItemName = '';
  newItemPrice = '';

  editingItemId = signal<string | null>(null);
  editingItemName = '';
  editingItemPrice = '';

  importText = '';
  importName = '';
  showImport = signal(false);

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.loading.set(true);
    this.coffeeRunSvc.getTemplates().subscribe({
      next: result => { this.templates.set(result.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectTemplate(t: MenuTemplateList) {
    this.selectedTemplateLoading.set(true);
    this.coffeeRunSvc.getTemplateDetail(t.id).subscribe({
      next: d => { this.selectedTemplate.set(d); this.selectedTemplateLoading.set(false); },
      error: () => this.selectedTemplateLoading.set(false)
    });
  }

  backToList() {
    this.selectedTemplate.set(null);
  }

  createTemplate() {
    const name = this.newName.trim();
    if (!name) return;
    this.coffeeRunSvc.createTemplate({ name }).subscribe({
      next: () => {
        this.newName = '';
        this.loadTemplates();
        this.snackBar.open('Template created', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to create template', 'Close', { duration: 4000 })
    });
  }

  deleteTemplate(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete template?', message: 'This menu template will be permanently removed.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.deleteTemplate(id).subscribe({
        next: () => {
          this.backToList();
          this.loadTemplates();
          this.snackBar.open('Template deleted', 'Close', { duration: 3000 });
        },
        error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 4000 })
      });
    });
  }

  renameTemplate() {
    const t = this.selectedTemplate();
    if (!t || !this.newName.trim()) return;
    this.coffeeRunSvc.updateTemplate(t.id, { name: this.newName.trim() }).subscribe({
      next: d => {
        this.selectedTemplate.set(d);
        this.newName = '';
        this.loadTemplates();
        this.snackBar.open('Template renamed', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to rename', 'Close', { duration: 4000 })
    });
  }

  addItem() {
    const name = this.newItemName.trim();
    if (!name) return;
    const t = this.selectedTemplate();
    if (!t) return;

    const priceStr = String(this.newItemPrice).trim();
    const req: CreateTemplateItemRequest = {
      name,
      price: priceStr ? parseFloat(priceStr) : null
    };

    this.coffeeRunSvc.addTemplateItem(t.id, req).subscribe({
      next: d => {
        this.selectedTemplate.set(d);
        this.newItemName = '';
        this.newItemPrice = '';
        this.snackBar.open('Item added', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to add item', 'Close', { duration: 4000 })
    });
  }

  startEditItem(item: TemplateItem) {
    this.editingItemId.set(item.id);
    this.editingItemName = item.name;
    this.editingItemPrice = item.price?.toString() ?? '';
  }

  saveEditItem(item: TemplateItem) {
    const t = this.selectedTemplate();
    if (!t) return;
    const name = this.editingItemName.trim();
    if (!name) return;

    const priceStr = String(this.editingItemPrice).trim();
    const req: UpdateTemplateItemRequest = {
      name,
      price: priceStr ? parseFloat(priceStr) : null
    };

    this.coffeeRunSvc.updateTemplateItem(t.id, item.id, req).subscribe({
      next: d => {
        this.selectedTemplate.set(d);
        this.editingItemId.set(null);
        this.snackBar.open('Item updated', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update', 'Close', { duration: 4000 })
    });
  }

  cancelEditItem() {
    this.editingItemId.set(null);
  }

  deleteItem(item: TemplateItem) {
    const t = this.selectedTemplate();
    if (!t) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete item?', message: `"${item.name}" will be removed from this template.`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.deleteTemplateItem(t.id, item.id).subscribe({
        next: () => {
          this.coffeeRunSvc.getTemplateDetail(t.id).subscribe(d => this.selectedTemplate.set(d));
          this.snackBar.open('Item deleted', 'Close', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 4000 })
      });
    });
  }

  toggleImport() {
    this.showImport.update(v => !v);
    if (this.showImport()) {
      this.importName = '';
      this.importText = '';
    }
  }

  importMenu() {
    const name = this.importName.trim();
    if (!name) return;

    let items: { name: string; price?: number | null }[];
    try {
      items = JSON.parse(this.importText);
      if (!Array.isArray(items)) throw new Error('Not an array');
      items.forEach((item, i) => {
        if (!item.name || typeof item.name !== 'string') throw new Error(`Item ${i} missing name`);
      });
    } catch (e) {
      this.snackBar.open('Invalid JSON. Expected array of {name, price?}', 'Close', { duration: 5000 });
      return;
    }

    const req: ImportMenuTemplateRequest = { name, items };
    this.coffeeRunSvc.importTemplate(req).subscribe({
      next: () => {
        this.showImport.set(false);
        this.loadTemplates();
        this.snackBar.open(`Imported ${items.length} items as "${name}"`, 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to import', 'Close', { duration: 4000 })
    });
  }

  goBack() {
    this.router.navigate(['/fun/coffee-run']);
  }

  startRunWithTemplate(templateId: string) {
    this.coffeeRunSvc.create({ templateId }).subscribe({
      next: d => {
        this.router.navigate(['/fun/coffee-run'], { queryParams: { runId: d.id } });
      },
      error: () => this.snackBar.open('Failed to start coffee run', 'Close', { duration: 4000 })
    });
  }
}
