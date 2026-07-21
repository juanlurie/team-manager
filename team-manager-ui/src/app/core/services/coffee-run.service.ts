import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CoffeeRunList, CoffeeRunDetail, CreateMenuItemRequest, UpdateMenuItemRequest, CreateOrderRequest, UpdateOrderRequest, MenuTemplateList, MenuTemplateDetail, CreateMenuTemplateRequest, ImportMenuTemplateRequest, UpdateMenuTemplateRequest, CreateTemplateItemRequest, UpdateTemplateItemRequest, PagedResult, CreateRunRequest, UpdateRunRequest, RunSummaryDetail, UpdateOrderStatusRequest } from '../models/coffee-run.model';
import { API_BASE } from './api.config';
import { WebSocketService } from '../websocket/websocket.service';
import { CoffeeEvent, COFFEE_EVENT_TYPES } from '../websocket/events/coffee.events';

// Kept as a back-compat alias; the coffee event union now lives with the other feature event
// definitions under core/websocket/events/.
export type CoffeeRunWsMessage = CoffeeEvent;

@Injectable({ providedIn: 'root' })
export class CoffeeRunService {
  private http = inject(HttpClient);
  private ws = inject(WebSocketService);
  private base = `${API_BASE}/coffee-runs`;
  private tmplBase = `${API_BASE}/menu-templates`;
  private tmplBaseLegacy = `${API_BASE}/coffee-run-menu-templates`;

  getAll(page = 1, pageSize = 20, status?: string, initiatorId?: string, from?: string, to?: string): Observable<PagedResult<CoffeeRunList>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (status) params = params.set('status', status);
    if (initiatorId) params = params.set('initiatorId', initiatorId);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<PagedResult<CoffeeRunList>>(this.base, { params });
  }

  getById(id: string): Observable<CoffeeRunDetail> { return this.http.get<CoffeeRunDetail>(`${this.base}/${id}`); }

  create(req?: CreateRunRequest): Observable<CoffeeRunDetail> {
    return this.http.post<CoffeeRunDetail>(this.base, req || {});
  }

  update(id: string, req: UpdateRunRequest): Observable<CoffeeRunDetail> {
    return this.http.patch<CoffeeRunDetail>(`${this.base}/${id}`, req);
  }

  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }

  publish(id: string): Observable<CoffeeRunDetail> { return this.http.post<CoffeeRunDetail>(`${this.base}/${id}/publish`, {}); }

  close(id: string): Observable<CoffeeRunDetail> { return this.http.post<CoffeeRunDetail>(`${this.base}/${id}/close`, {}); }

  cancel(id: string): Observable<CoffeeRunDetail> { return this.http.post<CoffeeRunDetail>(`${this.base}/${id}/cancel`, {}); }

  getSummary(id: string): Observable<RunSummaryDetail> { return this.http.get<RunSummaryDetail>(`${this.base}/${id}/summary`); }

  addMenuItem(id: string, req: CreateMenuItemRequest): Observable<CoffeeRunDetail> { return this.http.post<CoffeeRunDetail>(`${this.base}/${id}/menu-items`, req); }

  updateMenuItem(id: string, itemId: string, req: UpdateMenuItemRequest): Observable<CoffeeRunDetail> { return this.http.put<CoffeeRunDetail>(`${this.base}/${id}/menu-items/${itemId}`, req); }

  toggleMenuItemAvailability(id: string, itemId: string): Observable<CoffeeRunDetail> { return this.http.patch<CoffeeRunDetail>(`${this.base}/${id}/menu-items/${itemId}/availability`, {}); }

  deleteMenuItem(id: string, itemId: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}/menu-items/${itemId}`); }

  createOrder(id: string, req: CreateOrderRequest): Observable<CoffeeRunDetail> { return this.http.post<CoffeeRunDetail>(`${this.base}/${id}/orders`, req); }

  updateOrder(id: string, orderId: string, req: UpdateOrderRequest): Observable<CoffeeRunDetail> { return this.http.put<CoffeeRunDetail>(`${this.base}/${id}/orders/${orderId}`, req); }

  deleteOrder(id: string, orderId: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}/orders/${orderId}`); }

  updateOrderStatus(id: string, orderId: string, req: UpdateOrderStatusRequest): Observable<CoffeeRunDetail> { return this.http.patch<CoffeeRunDetail>(`${this.base}/${id}/orders/${orderId}/status`, req); }

  getTemplates(page = 1, pageSize = 20, scope?: string, includeArchived?: boolean): Observable<PagedResult<MenuTemplateList>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (scope) params = params.set('scope', scope);
    if (includeArchived !== undefined) params = params.set('includeArchived', includeArchived.toString());
    return this.http.get<PagedResult<MenuTemplateList>>(this.tmplBase, { params });
  }

  getTemplateDetail(id: string): Observable<MenuTemplateDetail> { return this.http.get<MenuTemplateDetail>(`${this.tmplBase}/${id}`); }

  createTemplate(req: CreateMenuTemplateRequest): Observable<MenuTemplateDetail> { return this.http.post<MenuTemplateDetail>(this.tmplBase, req); }

  importTemplate(req: ImportMenuTemplateRequest): Observable<MenuTemplateDetail> { return this.http.post<MenuTemplateDetail>(`${this.tmplBase}/import`, req); }

  updateTemplate(id: string, req: UpdateMenuTemplateRequest): Observable<MenuTemplateDetail> { return this.http.put<MenuTemplateDetail>(`${this.tmplBase}/${id}`, req); }

  deleteTemplate(id: string): Observable<void> { return this.http.delete<void>(`${this.tmplBase}/${id}`); }

  archiveTemplate(id: string): Observable<void> { return this.http.post<void>(`${this.tmplBase}/${id}/archive`, {}); }

  restoreTemplate(id: string): Observable<void> { return this.http.post<void>(`${this.tmplBase}/${id}/restore`, {}); }

  addTemplateItem(templateId: string, req: CreateTemplateItemRequest): Observable<MenuTemplateDetail> { return this.http.post<MenuTemplateDetail>(`${this.tmplBase}/${templateId}/items`, req); }

  updateTemplateItem(templateId: string, itemId: string, req: UpdateTemplateItemRequest): Observable<MenuTemplateDetail> { return this.http.put<MenuTemplateDetail>(`${this.tmplBase}/${templateId}/items/${itemId}`, req); }

  deleteTemplateItem(templateId: string, itemId: string): Observable<void> { return this.http.delete<void>(`${this.tmplBase}/${templateId}/items/${itemId}`); }

  // ── WebSocket helpers ──

  onCoffeeRunEvent(callback: (msg: CoffeeEvent) => void): void {
    this.ws.roomEvents<CoffeeEvent>(COFFEE_EVENT_TYPES).subscribe(callback);
  }
}
