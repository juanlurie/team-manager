import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CoffeeRunList, CoffeeRunDetail, CreateMenuItemRequest, UpdateMenuItemRequest, CreateOrderRequest, UpdateOrderRequest, MenuTemplateList, MenuTemplateDetail, CreateMenuTemplateRequest } from '../models/coffee-run.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class CoffeeRunService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/coffee-runs`;
  private tmplBase = `${API_BASE}/coffee-run-menu-templates`;

  getAll(): Observable<CoffeeRunList[]> { return this.http.get<CoffeeRunList[]>(this.base); }
  getById(id: string): Observable<CoffeeRunDetail> { return this.http.get<CoffeeRunDetail>(`${this.base}/${id}`); }
  create(fromTemplateId?: string, copyMenuFromRunId?: string): Observable<CoffeeRunDetail> {
    let params = new HttpParams();
    if (fromTemplateId) params = params.set('fromTemplateId', fromTemplateId);
    if (copyMenuFromRunId) params = params.set('copyMenuFromRunId', copyMenuFromRunId);
    return this.http.post<CoffeeRunDetail>(this.base, {}, { params });
  }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
  close(id: string): Observable<CoffeeRunDetail> { return this.http.post<CoffeeRunDetail>(`${this.base}/${id}/close`, {}); }
  addMenuItem(id: string, req: CreateMenuItemRequest): Observable<CoffeeRunDetail> { return this.http.post<CoffeeRunDetail>(`${this.base}/${id}/menu-items`, req); }
  updateMenuItem(id: string, itemId: string, req: UpdateMenuItemRequest): Observable<CoffeeRunDetail> { return this.http.put<CoffeeRunDetail>(`${this.base}/${id}/menu-items/${itemId}`, req); }
  deleteMenuItem(id: string, itemId: string): Observable<CoffeeRunDetail> { return this.http.delete<CoffeeRunDetail>(`${this.base}/${id}/menu-items/${itemId}`); }
  createOrder(id: string, req: CreateOrderRequest): Observable<CoffeeRunDetail> { return this.http.post<CoffeeRunDetail>(`${this.base}/${id}/orders`, req); }
  updateOrder(id: string, orderId: string, req: UpdateOrderRequest): Observable<CoffeeRunDetail> { return this.http.put<CoffeeRunDetail>(`${this.base}/${id}/orders/${orderId}`, req); }
  deleteOrder(id: string, orderId: string): Observable<CoffeeRunDetail> { return this.http.delete<CoffeeRunDetail>(`${this.base}/${id}/orders/${orderId}`); }

  getTemplates(): Observable<MenuTemplateList[]> { return this.http.get<MenuTemplateList[]>(this.tmplBase); }
  createTemplate(req: CreateMenuTemplateRequest): Observable<MenuTemplateDetail> { return this.http.post<MenuTemplateDetail>(this.tmplBase, req); }
  deleteTemplate(id: string): Observable<void> { return this.http.delete<void>(`${this.tmplBase}/${id}`); }
}
