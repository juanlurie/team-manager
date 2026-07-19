import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { CoffeeRunService } from '../../core/services/coffee-run.service';
import { CoffeeRunList, CoffeeRunDetail, CoffeeRunMenuItem, CreateOrderRequest, OrderItemEntry, MenuTemplateList, CreateMenuTemplateRequest, RunSummaryDetail, PagedResult } from '../../core/models/coffee-run.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TeamMemberService } from '../../core/services/team-member.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { CoffeeEvent, COFFEE_EVENT_TYPES } from '../../core/websocket/events/coffee.events';

@Component({
  selector: 'app-coffee-run',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule, MatSelectModule, MatInputModule, MatMenuModule],
  templateUrl: './coffee-run.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./coffee-run.component.scss']
})
export class CoffeeRunComponent implements OnInit, OnDestroy {
  private coffeeRunSvc = inject(CoffeeRunService);
  private teamMemberSvc = inject(TeamMemberService);
  private ws = inject(WebSocketService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private wsSub?: Subscription;
  private countdownInterval?: Subscription;

  loading = signal(true);
  runs = signal<CoffeeRunList[]>([]);
  templates = signal<MenuTemplateList[]>([]);
  currentUserId = signal<string | null>(null);

  // Pagination
  currentPage = signal(1);
  pageSize = 10;
  totalRuns = signal(0);
  totalPages = signal(1);

  // Filters
  statusFilter = signal<string>('');
  searchQuery = signal('');
  showClosed = signal(false);
  menuSearchQuery = signal('');
  orderSearchQuery = signal('');

  openRuns = computed(() => this.runs().filter(r => r.status === 'Open'));
  closedRuns = computed(() => this.runs().filter(r => r.status === 'Closed'));
  draftRuns = computed(() => this.runs().filter(r => r.status === 'Draft'));
  cancelledRuns = computed(() => this.runs().filter(r => r.status === 'Cancelled'));
  runsWithMenu = computed(() => this.runs().filter(r => r.menuItemCount > 0));

  copyMenuRunId: string | null = null;
  copyFromTemplateId: string | null = null;

  view = signal<'list' | 'detail'>('list');
  detail = signal<CoffeeRunDetail | null>(null);
  detailLoading = signal(false);
  editingOrder = signal(false);
  showSummary = signal(false);
  runSummary = signal<RunSummaryDetail | null>(null);
  summaryLoading = signal(false);

  // Countdown
  deadlineRemaining = signal<string | null>(null);

  // Menu editing
  newItemName = '';
  newItemPrice = '';
  newItemCategory = '';
  newItemMaxQty = '';

  editingMenuItemId = signal<string | null>(null);
  editingMenuItemName = '';
  editingMenuItemPrice = '';
  editingMenuItemCategory = '';

  saving = signal(false);

  // Template dialog
  showTemplateDialog = signal(false);
  templateName = '';
  templateScope = 'Personal';

  // Run creation dialog
  showCreateDialog = signal(false);
  newRunTitle = '';
  newRunLocation = '';
  newRunDeadline = '';
  newRunTemplateId: string | null = null;

  navigateToManageMenus() {
    this.router.navigate(['/fun/manage-menus']);
  }

  ngOnInit() {
    this.ws.connect();
    this.wsSub = this.ws.roomEvents<CoffeeEvent>(COFFEE_EVENT_TYPES).subscribe(msg => {
      const type = msg.type;
      if (type === 'coffee_run_status_changed' || type === 'coffee_order_placed' ||
          type === 'coffee_order_updated' || type === 'coffee_order_deleted' ||
          type === 'coffee_menu_updated' || type === 'coffee_item_availability_changed') {
        const runId = (msg.data as any)?.runId;
        if (runId && this.detail()?.id === runId) {
          this.viewDetail(runId);
        }
        if (this.view() === 'list') {
          this.loadRuns();
        }
      }
      if (type === 'coffee_run_created') {
        this.loadRuns();
        const initiatorName = (msg.data as any)?.initiatorName;
        if (initiatorName) this.snackBar.open(`${initiatorName} started a coffee run!`, 'Close', { duration: 4000 });
      }
    });

    this.teamMemberSvc.getMe().subscribe(profile => {
      this.currentUserId.set(profile.id);
      this.loadRuns();
      this.loadTemplates();

      this.route.queryParams.subscribe(params => {
        const runId = params['run'];
        if (runId) {
          this.viewDetail(runId);
        }
      });
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.countdownInterval?.unsubscribe();
  }

  loadRuns() {
    this.loading.set(true);
    this.coffeeRunSvc.getAll(this.currentPage(), this.pageSize, this.statusFilter() || undefined).subscribe({
      next: (result: PagedResult<CoffeeRunList>) => {
        this.runs.set(result.items);
        this.totalRuns.set(result.totalCount);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadTemplates() {
    this.coffeeRunSvc.getTemplates().subscribe({
      next: (result: PagedResult<MenuTemplateList>) => {
        this.templates.set(result.items.filter(t => !t.isArchived));
      },
      error: () => {}
    });
  }

  isInitiator(): boolean {
    return this.detail()?.initiatorId === this.currentUserId();
  }

  canViewMenuAndOrders(): boolean {
    return this.isInitiator() || (!this.isClosed() && !this.isCancelled());
  }

  isStatus(status: string): boolean {
    return this.detail()?.status === status;
  }

  isOpen(): boolean {
    return this.isStatus('Open');
  }

  isDraft(): boolean {
    return this.isStatus('Draft');
  }

  isClosed(): boolean {
    return this.isStatus('Closed');
  }

  isCancelled(): boolean {
    return this.isStatus('Cancelled');
  }

  hasOrder(): boolean {
    return !!this.detail()?.currentUserOrderId;
  }

  getUserOrder() {
    return this.detail()?.orders.find(o => o.id === this.detail()?.currentUserOrderId) ?? null;
  }

  /* ── Countdown ──────────────────────────────────── */

  startCountdown() {
    this.countdownInterval?.unsubscribe();
    const deadline = this.detail()?.orderDeadline;
    if (!deadline) {
      this.deadlineRemaining.set(null);
      return;
    }

    const updateCountdown = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        this.deadlineRemaining.set('Deadline passed');
        this.countdownInterval?.unsubscribe();
        if (this.isInitiator() && this.isOpen()) {
          this.viewDetail(this.detail()!.id);
        }
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (hours > 0) {
        this.deadlineRemaining.set(`${hours}h ${minutes}m`);
      } else {
        this.deadlineRemaining.set(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    this.countdownInterval = interval(1000).subscribe(updateCountdown);
  }

  /* ── Navigation ──────────────────────────────────── */

  viewList() {
    this.view.set('list');
    this.detail.set(null);
    this.showSummary.set(false);
    this.showClosed.set(false);
    this.runSummary.set(null);
    this.countdownInterval?.unsubscribe();
    this.loadRuns();
  }

  viewDetail(runId: string) {
    this.detailLoading.set(true);
    this.view.set('detail');
    this.showSummary.set(false);
    this.runSummary.set(null);
    this.coffeeRunSvc.getById(runId).subscribe({
      next: d => {
        this.detail.set(d);
        this.detailLoading.set(false);
        console.log('Menu items with sizes:', d.menuItems.filter(m => m.sizes).map(m => ({ name: m.name, sizes: m.sizes })));
        this.initOrderSizes();
        this.startCountdown();
      },
      error: () => { this.detailLoading.set(false); this.viewList(); this.snackBar.open('Failed to load coffee run', 'Close', { duration: 4000 }); }
    });
  }

  /* ── Run actions ──────────────────────────────────── */

  openCreateDialog() {
    this.showCreateDialog.set(true);
    this.newRunTitle = '';
    this.newRunLocation = '';
    this.newRunDeadline = '';
    this.newRunTemplateId = null;
    this.copyFromTemplateId = null;
    this.copyMenuRunId = null;
  }

  closeCreateDialog() {
    this.showCreateDialog.set(false);
  }

  createRun() {
    if (this.saving()) return;
    this.saving.set(true);

    const req: any = {};
    if (this.newRunTitle.trim()) req.title = this.newRunTitle.trim();
    if (this.newRunLocation.trim()) req.location = this.newRunLocation.trim();
    if (this.newRunDeadline) req.orderDeadline = this.newRunDeadline;
    if (this.copyFromTemplateId) req.templateId = this.copyFromTemplateId;
    if (this.copyMenuRunId) req.copyMenuFromRunId = this.copyMenuRunId;

    this.coffeeRunSvc.create(req).subscribe({
      next: d => {
        this.runs.update(list => [{
          id: d.id, initiatorName: d.initiatorName, title: d.title, status: d.status,
          menuItemCount: 0, orderCount: 0, totalAmount: 0, createdAt: d.createdAt,
          orderDeadline: d.orderDeadline, closedAt: d.closedAt, location: d.location
        }, ...list]);
        this.saving.set(false);
        this.showCreateDialog.set(false);
        this.snackBar.open('Coffee run started!', 'Close', { duration: 4000 });
        this.detail.set(d);
        this.view.set('detail');
        this.startCountdown();
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

  publishRun() {
    const run = this.detail();
    if (!run) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Publish this run?', message: 'The team will be notified and can start ordering.', confirmLabel: 'Publish' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.publish(run.id).subscribe({
        next: d => {
          this.detail.set(d);
          this.runs.update(list => list.map(r => r.id === d.id ? { ...r, status: d.status } : r));
          this.snackBar.open('Run is live! Team members can now order.', 'Close', { duration: 3000 });
          this.startCountdown();
        },
        error: () => this.snackBar.open('Failed to publish', 'Close', { duration: 4000 })
      });
    });
  }

  closeRun() {
    const run = this.detail();
    if (!run) return;
    const orderCount = run.orders.length;
    const total = run.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Close coffee run?', message: `${orderCount} orders · R${total.toFixed(2)} total. Orders will be locked.`, confirmLabel: 'Close Run' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.close(run.id).subscribe({
        next: d => {
          this.detail.set(d);
          this.runs.update(list => list.map(r => r.id === d.id ? { ...r, status: d.status } : r));
          this.countdownInterval?.unsubscribe();
          this.deadlineRemaining.set(null);
          this.snackBar.open(`Run closed. ${orderCount} orders · R${total.toFixed(2)} total.`, 'Close', { duration: 4000 });
        },
        error: () => this.snackBar.open('Failed to close', 'Close', { duration: 4000 })
      });
    });
  }

  cancelRun() {
    const run = this.detail();
    if (!run) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Cancel this run?', message: `All orders will be removed. This cannot be undone.`, danger: true, confirmLabel: 'Cancel Run' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.cancel(run.id).subscribe({
        next: d => {
          this.detail.set(d);
          this.runs.update(list => list.map(r => r.id === d.id ? { ...r, status: d.status } : r));
          this.countdownInterval?.unsubscribe();
          this.deadlineRemaining.set(null);
          this.snackBar.open('Run cancelled. All orders have been removed.', 'Close', { duration: 4000 });
        },
        error: () => this.snackBar.open('Failed to cancel', 'Close', { duration: 4000 })
      });
    });
  }

  /* ── Summary ──────────────────────────────────── */

  loadSummary() {
    const run = this.detail();
    if (!run) return;
    this.summaryLoading.set(true);
    this.coffeeRunSvc.getSummary(run.id).subscribe({
      next: s => { this.runSummary.set(s); this.summaryLoading.set(false); },
      error: () => this.summaryLoading.set(false)
    });
  }

  copyTotals() {
    const summary = this.runSummary();
    if (!summary) return;
    let text = `Coffee Run Summary\n`;
    text += `Grand Total: R${summary.grandTotal.toFixed(2)}\n`;
    text += `Total Items: ${summary.totalItems}\n\n`;
    text += `Per Person:\n`;
    for (const p of summary.people) {
      text += `  ${p.memberName}: R${p.total.toFixed(2)} (${p.itemCount} items)\n`;
    }
    text += `\nPer Item:\n`;
    for (const i of summary.items) {
      text += `  ${i.name}: ${i.totalQuantity}x = R${i.totalAmount.toFixed(2)}\n`;
    }
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Order summary copied to clipboard.', 'Close', { duration: 3000 });
    });
  }

  /* ── Menu item actions ────────────────────────────── */

  addMenuItem() {
    const name = this.newItemName.trim();
    if (!name || this.saving()) return;
    const run = this.detail();
    if (!run) return;

    const req: any = { name, price: 0 };
    if (this.newItemCategory.trim()) req.category = this.newItemCategory.trim();
    if (this.newItemMaxQty && parseInt(this.newItemMaxQty) > 0) req.maxQuantity = parseInt(this.newItemMaxQty);

    this.saving.set(true);
    this.coffeeRunSvc.addMenuItem(run.id, req).subscribe({
      next: d => {
        this.detail.set(d);
        this.newItemName = '';
        this.newItemPrice = '';
        this.newItemCategory = '';
        this.newItemMaxQty = '';
        this.saving.set(false);
      },
      error: () => { this.saving.set(false); this.snackBar.open('Failed to add item', 'Close', { duration: 4000 }); }
    });
  }

  startEditMenuItem(item: CoffeeRunMenuItem) {
    this.editingMenuItemId.set(item.id);
    this.editingMenuItemName = item.name;
    this.editingMenuItemPrice = item.price.toString();
    this.editingMenuItemCategory = item.category || '';
  }

  saveEditMenuItem(item: CoffeeRunMenuItem) {
    const run = this.detail();
    if (!run) return;
    const name = this.editingMenuItemName.trim();
    if (!name) return;

    const req: any = { name, price: 0 };
    if (this.editingMenuItemCategory) req.category = this.editingMenuItemCategory;

    this.coffeeRunSvc.updateMenuItem(run.id, item.id, req).subscribe({
      next: d => { this.detail.set(d); this.editingMenuItemId.set(null); },
      error: () => this.snackBar.open('Failed to update item', 'Close', { duration: 4000 })
    });
  }

  cancelEditMenuItem() { this.editingMenuItemId.set(null); }

  toggleItemAvailability(item: CoffeeRunMenuItem) {
    const run = this.detail();
    if (!run) return;
    this.coffeeRunSvc.toggleMenuItemAvailability(run.id, item.id).subscribe({
      next: d => this.detail.set(d),
      error: () => this.snackBar.open('Failed to toggle availability', 'Close', { duration: 4000 })
    });
  }

  deleteMenuItem(item: CoffeeRunMenuItem) {
    const run = this.detail();
    if (!run) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete menu item?', message: `"${item.name}" will be removed from the menu.`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.coffeeRunSvc.deleteMenuItem(run.id, item.id).subscribe({
        next: () => this.viewDetail(run.id),
        error: (err) => {
          const msg = err?.error || 'Failed to delete item';
          this.snackBar.open(msg, 'Close', { duration: 4000 });
        }
      });
    });
  }

  /* ── Menu categories ────────────────────────────── */

  menuCategories = computed(() => {
    const items = this.detail()?.menuItems || [];
    const cats = new Set<string>();
    for (const item of items) {
      cats.add(item.category || 'Uncategorized');
    }
    return Array.from(cats).sort();
  });

  filteredMenuItems = computed(() => {
    const items = this.detail()?.menuItems || [];
    const q = this.menuSearchQuery().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q));
  });

  getMenuItemsByCategory(category: string) {
    return this.filteredMenuItems().filter(i => (i.category || 'Uncategorized') === category);
  }

  filteredOrderItems = computed(() => {
    const items = this.detail()?.menuItems || [];
    const q = this.orderSearchQuery().toLowerCase();
    if (!q) return items.filter(i => i.isAvailable);
    return items.filter(i => i.isAvailable && (i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)));
  });

  orderItemCategories = computed(() => {
    const items = this.filteredOrderItems();
    const cats = new Set<string>();
    for (const item of items) {
      cats.add(item.category || 'Uncategorized');
    }
    return Array.from(cats).sort();
  });

  getOrderItemsByCategory(category: string) {
    return this.filteredOrderItems().filter(i => (i.category || 'Uncategorized') === category);
  }

  /* ── Order actions ────────────────────────────────── */

  orderQuantities: { [menuItemId: string]: number } = {};
  orderSizes: { [menuItemId: string]: string } = {};
  orderAdditions: { [menuItemId: string]: Record<string, string> } = {};
  orderNotes = '';

  initOrderForm() {
    this.orderQuantities = {};
    this.orderSizes = {};
    this.orderAdditions = {};
    this.orderNotes = '';
    this.editingOrder.set(true);
    const existing = this.getUserOrder();
    if (existing) {
      this.orderNotes = existing.notes ?? '';
      for (const item of existing.items) {
        this.orderQuantities[item.menuItemId] = item.quantity;
        if (item.selectedSize) this.orderSizes[item.menuItemId] = item.selectedSize;
        if (item.selectedAdditions) {
          try {
            this.orderAdditions[item.menuItemId] = JSON.parse(item.selectedAdditions);
          } catch {}
        }
      }
    }
    const run = this.detail();
    if (run) {
      for (const mi of run.menuItems) {
        if (!(mi.id in this.orderQuantities)) this.orderQuantities[mi.id] = 0;
        if (mi.sizes && !this.orderSizes[mi.id]) {
          try {
            const sizes = JSON.parse(mi.sizes) as { name: string }[];
            const midIndex = Math.floor(sizes.length / 2);
            this.orderSizes[mi.id] = sizes[midIndex].name;
          } catch {}
        }
      }
    }
  }

  initOrderSizes() {
    const run = this.detail();
    if (!run) return;
    for (const mi of run.menuItems) {
      if (mi.sizes && !this.orderSizes[mi.id]) {
        try {
          const sizes = JSON.parse(mi.sizes) as { name: string }[];
          const midIndex = Math.floor(sizes.length / 2);
          this.orderSizes[mi.id] = sizes[midIndex].name;
        } catch {}
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

  getItemPrice(mi: CoffeeRunMenuItem): number {
    const selectedSize = this.orderSizes[mi.id];
    if (!mi.sizes || !selectedSize) return mi.price;
    try {
      const sizes = JSON.parse(mi.sizes) as { name: string; priceAdjust: number }[];
      const size = sizes.find(s => s.name === selectedSize);
      return mi.price + (size?.priceAdjust ?? 0);
    } catch {
      return mi.price;
    }
  }

  getOrderTotal(): number {
    const run = this.detail();
    if (!run) return 0;
    let total = 0;
    for (const mi of run.menuItems) {
      total += this.getItemPrice(mi) * this.getQuantity(mi.id);
    }
    return total;
  }

  parseSizes(sizesJson: string): { name: string; priceAdjust: number }[] {
    try {
      return JSON.parse(sizesJson);
    } catch {
      return [];
    }
  }

  parseAdditions(additionsJson: string | null): { name: string; options: string[] }[] {
    if (!additionsJson) return [];
    try {
      return JSON.parse(additionsJson);
    } catch {
      return [];
    }
  }

  getSelectedAddition(menuItemId: string, categoryName: string): string {
    return this.orderAdditions[menuItemId]?.[categoryName] || '';
  }

  setSelectedAddition(menuItemId: string, categoryName: string, value: string) {
    if (!this.orderAdditions[menuItemId]) this.orderAdditions[menuItemId] = {};
    if (value) {
      this.orderAdditions[menuItemId][categoryName] = value;
    } else {
      delete this.orderAdditions[menuItemId][categoryName];
    }
  }

  placeOrder() {
    const run = this.detail();
    if (!run || !this.hasAnyQuantity()) return;
    const items: OrderItemEntry[] = [];
    for (const mi of run.menuItems) {
      const qty = this.getQuantity(mi.id);
      if (qty > 0) {
        const entry: OrderItemEntry = { menuItemId: mi.id, quantity: qty, size: this.orderSizes[mi.id] || undefined };
        const adds = this.orderAdditions[mi.id];
        if (adds && Object.keys(adds).length > 0) entry.additions = adds;
        items.push(entry);
      }
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
      if (qty > 0) {
        const entry: OrderItemEntry = { menuItemId: mi.id, quantity: qty, size: this.orderSizes[mi.id] || undefined };
        const adds = this.orderAdditions[mi.id];
        if (adds && Object.keys(adds).length > 0) entry.additions = adds;
        items.push(entry);
      }
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
    this.orderSizes = {};
    this.orderAdditions = {};
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
        next: () => { this.viewDetail(run.id); this.orderQuantities = {}; this.editingOrder.set(false); },
        error: () => this.snackBar.open('Failed to delete order', 'Close', { duration: 4000 })
      });
    });
  }

  updateOrderStatus(orderId: string, status: string) {
    const run = this.detail();
    if (!run) return;
    this.coffeeRunSvc.updateOrderStatus(run.id, orderId, { status }).subscribe({
      next: d => this.detail.set(d),
      error: () => this.snackBar.open('Failed to update status', 'Close', { duration: 4000 })
    });
  }

  /* ── Template actions ─────────────────────────────── */

  openSaveTemplateDialog() {
    this.showTemplateDialog.set(true);
    this.templateName = '';
    this.templateScope = 'Personal';
  }

  closeSaveTemplateDialog() {
    this.showTemplateDialog.set(false);
  }

  saveAsTemplate() {
    const run = this.detail();
    if (!run || run.menuItems.length === 0) return;
    if (!this.templateName.trim()) return;

    const req: CreateMenuTemplateRequest = { name: this.templateName.trim(), scope: this.templateScope, copyFromRunId: run.id };
    this.coffeeRunSvc.createTemplate(req).subscribe({
      next: tmpl => {
        this.templates.update(list => [...list, {
          id: tmpl.id, name: tmpl.name, scope: tmpl.scope,
          itemCount: tmpl.items.length, createdByName: tmpl.createdByName,
          createdAt: tmpl.createdAt, isArchived: false
        }]);
        this.showTemplateDialog.set(false);
        this.snackBar.open('Menu saved as template!', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to save template', 'Close', { duration: 4000 })
    });
  }

  useTemplate(t: MenuTemplateList) {
    this.copyFromTemplateId = t.id;
    this.copyMenuRunId = null;
    this.openCreateDialog();
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

  /* ── Pagination ──────────────────────────────────── */

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadRuns();
  }

  /* ── Filters ──────────────────────────────────── */

  applyFilter() {
    this.currentPage.set(1);
    this.loadRuns();
  }

  /* ── Helpers ──────────────────────────────────── */

  statusColor(status: string): string {
    switch (status) {
      case 'Open': return '#22c55e';
      case 'Draft': return '#eab308';
      case 'Closing': return '#f97316';
      case 'Closed': return '#6b7280';
      case 'Cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  }

  orderStatusColor(status: string): string {
    switch (status) {
      case 'Placed': return '#22c55e';
      case 'Confirmed': return '#3b82f6';
      case 'PickedUp': return '#22c55e';
      default: return '#6b7280';
    }
  }

  copyShareLink() {
    const run = this.detail();
    if (!run) return;
    const url = `${window.location.origin}/fun/coffee-run?run=${run.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.snackBar.open('Link copied! Share on WhatsApp ☕', 'Close', { duration: 3000 });
    }).catch(() => {
      this.snackBar.open('Failed to copy link', 'Close', { duration: 3000 });
    });
  }
}
