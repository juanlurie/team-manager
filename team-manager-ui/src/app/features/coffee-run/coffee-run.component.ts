import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CoffeeRunService } from '../../core/services/coffee-run.service';
import { CoffeeRunList, CoffeeRunDetail, CoffeeRunMenuItem, CreateOrderRequest, OrderItemEntry, MenuTemplateList, CreateMenuTemplateRequest } from '../../core/models/coffee-run.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TeamMemberService } from '../../core/services/team-member.service';

@Component({
  selector: 'app-coffee-run',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './coffee-run.component.html',
  styleUrls: ['./coffee-run.component.scss']
})
export class CoffeeRunComponent implements OnInit {
  private coffeeRunSvc = inject(CoffeeRunService);
  private teamMemberSvc = inject(TeamMemberService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  runs = signal<CoffeeRunList[]>([]);
  templates = signal<MenuTemplateList[]>([]);
  currentUserId = signal<string | null>(null);

  openRuns = computed(() => this.runs().filter(r => r.status === 'Open'));
  closedRuns = computed(() => this.runs().filter(r => r.status === 'Closed'));
  runsWithMenu = computed(() => this.runs().filter(r => r.menuItemCount > 0));

  copyMenuRunId: string | null = null;
  copyFromTemplateId: string | null = null;
  templateName = '';

  view = signal<'list' | 'detail'>('list');
  detail = signal<CoffeeRunDetail | null>(null);
  detailLoading = signal(false);
  editingOrder = signal(false);

  newItemName = '';
  newItemPrice = '';

  editingMenuItemId = signal<string | null>(null);
  editingMenuItemName = '';
  editingMenuItemPrice = '';

  saving = signal(false);

  ngOnInit() {
    this.teamMemberSvc.getMe().subscribe(profile => {
      this.currentUserId.set(profile.id);
      this.coffeeRunSvc.getAll().subscribe(runs => {
        this.runs.set(runs);
        this.coffeeRunSvc.getTemplates().subscribe(tmpl => {
          this.templates.set(tmpl);
          this.loading.set(false);
        });
      });
    });
  }

  isInitiator(): boolean {
    return this.detail()?.initiatorId === this.currentUserId();
  }

  isOpen(): boolean {
    return this.detail()?.status === 'Open';
  }

  hasOrder(): boolean {
    return !!this.detail()?.currentUserOrderId;
  }

  getUserOrder() {
    return this.detail()?.orders.find(o => o.id === this.detail()?.currentUserOrderId) ?? null;
  }

  /* ── Navigation ──────────────────────────────────── */

  viewList() { this.view.set('list'); this.detail.set(null); }

  viewDetail(runId: string) {
    this.detailLoading.set(true);
    this.view.set('detail');
    this.coffeeRunSvc.getById(runId).subscribe({
      next: d => { this.detail.set(d); this.detailLoading.set(false); },
      error: () => { this.detailLoading.set(false); this.viewList(); this.snackBar.open('Failed to load coffee run', 'Close', { duration: 4000 }); }
    });
  }

  /* ── Run actions ──────────────────────────────────── */

  createRun() {
    if (this.saving()) return;
    this.saving.set(true);
    this.coffeeRunSvc.create(this.copyFromTemplateId ?? undefined, this.copyMenuRunId ?? undefined).subscribe({
      next: d => {
        this.runs.update(list => [{
          id: d.id, initiatorName: d.initiatorName, status: d.status,
          menuItemCount: 0, orderCount: 0, createdAt: d.createdAt
        }, ...list]);
        this.saving.set(false);
        this.snackBar.open('Coffee run started!', 'Close', { duration: 4000 });
        this.detail.set(d);
        this.view.set('detail');
      },
      error: () => { this.saving.set(false); this.snackBar.open('Failed to start coffee run', 'Close', { duration: 4000 }); }
    });
  }

  deleteRun() {
    const run = this.detail();
    if (!run) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete coffee run?', message: `This coffee run will be permanently removed.`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.delete(run.id).subscribe({
        next: () => {
          this.runs.update(list => list.filter(r => r.id !== run.id));
          this.viewList();
          this.snackBar.open('Coffee run deleted', 'Close', { duration: 3000 });
        },
        error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 4000 })
      });
    });
  }

  closeRun() {
    const run = this.detail();
    if (!run) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Close coffee run?', message: `Orders will be locked and no further changes allowed.`, confirmLabel: 'Close Run' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.close(run.id).subscribe({
        next: d => {
          this.detail.set(d);
          this.runs.update(list => list.map(r => r.id === d.id ? { ...r, status: d.status } : r));
          this.snackBar.open('Coffee run closed', 'Close', { duration: 3000 });
        },
        error: () => this.snackBar.open('Failed to close', 'Close', { duration: 4000 })
      });
    });
  }

  /* ── Menu item actions ────────────────────────────── */

  addMenuItem() {
    const name = this.newItemName.trim();
    const priceStr = String(this.newItemPrice).trim();
    if (!name || !priceStr || this.saving()) return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) return;
    const run = this.detail();
    if (!run) return;

    this.saving.set(true);
    this.coffeeRunSvc.addMenuItem(run.id, { name, price }).subscribe({
      next: d => { this.detail.set(d); this.newItemName = ''; this.newItemPrice = ''; this.saving.set(false); },
      error: () => { this.saving.set(false); this.snackBar.open('Failed to add item', 'Close', { duration: 4000 }); }
    });
  }

  startEditMenuItem(item: CoffeeRunMenuItem) {
    this.editingMenuItemId.set(item.id);
    this.editingMenuItemName = item.name;
    this.editingMenuItemPrice = item.price.toString();
  }

  saveEditMenuItem(item: CoffeeRunMenuItem) {
    const run = this.detail();
    if (!run) return;
    const name = this.editingMenuItemName.trim();
    const price = parseFloat(this.editingMenuItemPrice);
    if (!name || isNaN(price) || price <= 0) return;

    this.coffeeRunSvc.updateMenuItem(run.id, item.id, { name, price }).subscribe({
      next: d => { this.detail.set(d); this.editingMenuItemId.set(null); },
      error: () => this.snackBar.open('Failed to update item', 'Close', { duration: 4000 })
    });
  }

  cancelEditMenuItem() { this.editingMenuItemId.set(null); }

  deleteMenuItem(item: CoffeeRunMenuItem) {
    const run = this.detail();
    if (!run) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete menu item?', message: `"${item.name}" will be removed from the menu.`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.deleteMenuItem(run.id, item.id).subscribe({
        next: d => this.detail.set(d),
        error: () => this.snackBar.open('Failed to delete item', 'Close', { duration: 4000 })
      });
    });
  }

  /* ── Order actions ────────────────────────────────── */

  orderQuantities: { [menuItemId: string]: number } = {};
  orderNotes = '';

  initOrderForm() {
    this.orderQuantities = {};
    this.orderNotes = '';
    this.editingOrder.set(true);
    const existing = this.getUserOrder();
    if (existing) {
      this.orderNotes = existing.notes ?? '';
      for (const item of existing.items) {
        this.orderQuantities[item.menuItemId] = item.quantity;
      }
    }
    const run = this.detail();
    if (run) {
      for (const mi of run.menuItems) {
        if (!(mi.id in this.orderQuantities)) this.orderQuantities[mi.id] = 0;
      }
    }
  }

  getQuantity(menuItemId: string): number {
    return this.orderQuantities[menuItemId] ?? 0;
  }

  adjustQuantity(menuItemId: string, delta: number) {
    const cur = this.getQuantity(menuItemId);
    const next = Math.max(0, cur + delta);
    this.orderQuantities[menuItemId] = next;
  }

  hasAnyQuantity(): boolean {
    return Object.values(this.orderQuantities).some(q => q > 0);
  }

  getOrderTotal(): number {
    const run = this.detail();
    if (!run) return 0;
    let total = 0;
    for (const mi of run.menuItems) {
      total += mi.price * this.getQuantity(mi.id);
    }
    return total;
  }

  placeOrder() {
    const run = this.detail();
    if (!run || !this.hasAnyQuantity()) return;
    const items: OrderItemEntry[] = [];
    for (const mi of run.menuItems) {
      const qty = this.getQuantity(mi.id);
      if (qty > 0) items.push({ menuItemId: mi.id, quantity: qty });
    }
    if (items.length === 0) return;

    this.saving.set(true);
    const req: CreateOrderRequest = { items };
    if (this.orderNotes.trim()) req.notes = this.orderNotes.trim();

    this.coffeeRunSvc.createOrder(run.id, req).subscribe({
      next: d => { this.detail.set(d); this.saving.set(false); this.editingOrder.set(false); this.snackBar.open('Order placed!', 'Close', { duration: 3000 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Failed to place order', 'Close', { duration: 4000 }); }
    });
  }

  startEditOrder() {
    this.initOrderForm();
  }

  updateOrder() {
    const run = this.detail();
    const order = this.getUserOrder();
    if (!run || !order || !this.hasAnyQuantity()) return;

    this.saving.set(true);
    const items: OrderItemEntry[] = [];
    for (const mi of run.menuItems) {
      const qty = this.getQuantity(mi.id);
      if (qty > 0) items.push({ menuItemId: mi.id, quantity: qty });
    }

    this.coffeeRunSvc.updateOrder(run.id, order.id, {
      notes: this.orderNotes.trim() || undefined,
      items
    }).subscribe({
      next: d => { this.detail.set(d); this.saving.set(false); this.editingOrder.set(false); this.snackBar.open('Order updated!', 'Close', { duration: 3000 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Failed to update order', 'Close', { duration: 4000 }); }
    });
  }

  cancelEditOrder() {
    this.orderQuantities = {};
    this.editingOrder.set(false);
  }

  deleteOrder() {
    const run = this.detail();
    const order = this.getUserOrder();
    if (!run || !order) return;

    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete your order?', message: `Your order will be removed.`, danger: true, confirmLabel: 'Delete' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.deleteOrder(run.id, order.id).subscribe({
        next: d => { this.detail.set(d); this.orderQuantities = {}; this.editingOrder.set(false); },
        error: () => this.snackBar.open('Failed to delete order', 'Close', { duration: 4000 })
      });
    });
  }

  /* ── Template actions ─────────────────────────────── */

  saveAsTemplate() {
    const run = this.detail();
    if (!run || run.menuItems.length === 0) return;

    const name = prompt('Save menu as template. Name:');
    if (!name || !name.trim()) return;

    const req: CreateMenuTemplateRequest = { name: name.trim(), copyFromRunId: run.id };
    this.coffeeRunSvc.createTemplate(req).subscribe({
      next: tmpl => {
        this.templates.update(list => [...list, { id: tmpl.id, name: tmpl.name, itemCount: tmpl.items.length, createdAt: tmpl.createdAt }]);
        this.snackBar.open('Menu saved as template!', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to save template', 'Close', { duration: 4000 })
    });
  }

  deleteTemplate(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete template?', message: 'This menu template will be removed.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.deleteTemplate(id).subscribe({
        next: () => { this.templates.update(list => list.filter(t => t.id !== id)); this.snackBar.open('Template deleted', 'Close', { duration: 3000 }); },
        error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 4000 })
      });
    });
  }
}
