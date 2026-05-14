import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api.config';
import {
  MeetingSeries,
  CreateMeetingSeriesRequest,
  UpdateMeetingSeriesRequest,
  CreateMeetingSeriesSlotsRequest,
  UpdateMeetingSeriesSlotRequest,
  CreateMeetingSeriesItemRequest,
  UpdateMeetingSeriesItemRequest,
  AddMeetingSeriesItemAvailabilityRequest,
  MeetingSeriesSlot,
  MeetingSeriesItem,
  MeetingSeriesItemAvailability,
  MyMeetingItem,
  BulkAvailabilityResponse,
  BulkAvailabilityRequest,
  MyMeetingSeries
} from '../models/meeting-series.model';

@Injectable({ providedIn: 'root' })
export class MeetingSeriesService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE}/meeting-series`;

  getAll(): Observable<MeetingSeries[]> {
    return this.http.get<MeetingSeries[]>(this.baseUrl);
  }

  getById(id: string): Observable<MeetingSeries> {
    return this.http.get<MeetingSeries>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateMeetingSeriesRequest): Observable<MeetingSeries> {
    return this.http.post<MeetingSeries>(this.baseUrl, request);
  }

  update(id: string, request: UpdateMeetingSeriesRequest): Observable<MeetingSeries> {
    return this.http.put<MeetingSeries>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Slots
  getSlots(seriesId: string): Observable<MeetingSeriesSlot[]> {
    return this.http.get<MeetingSeriesSlot[]>(`${this.baseUrl}/${seriesId}/slots`);
  }

  createSlots(seriesId: string, request: CreateMeetingSeriesSlotsRequest): Observable<MeetingSeries> {
    return this.http.post<MeetingSeries>(`${this.baseUrl}/${seriesId}/slots`, request);
  }

  updateSlot(seriesId: string, slotId: string, request: UpdateMeetingSeriesSlotRequest): Observable<MeetingSeries> {
    return this.http.put<MeetingSeries>(`${this.baseUrl}/${seriesId}/slots/${slotId}`, request);
  }

  deleteSlot(seriesId: string, slotId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${seriesId}/slots/${slotId}`);
  }

  // Items
  getItems(seriesId: string): Observable<MeetingSeriesItem[]> {
    return this.http.get<MeetingSeriesItem[]>(`${this.baseUrl}/${seriesId}/items`);
  }

  createItem(seriesId: string, request: CreateMeetingSeriesItemRequest): Observable<MeetingSeries> {
    return this.http.post<MeetingSeries>(`${this.baseUrl}/${seriesId}/items`, request);
  }

  updateItem(seriesId: string, itemId: string, request: UpdateMeetingSeriesItemRequest): Observable<MeetingSeries> {
    return this.http.put<MeetingSeries>(`${this.baseUrl}/${seriesId}/items/${itemId}`, request);
  }

  deleteItem(seriesId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${seriesId}/items/${itemId}`);
  }

  // Availability
  getAvailabilities(itemId: string): Observable<MeetingSeriesItemAvailability[]> {
    return this.http.get<MeetingSeriesItemAvailability[]>(`${this.baseUrl}/items/${itemId}/availability`);
  }

  addAvailability(itemId: string, request: AddMeetingSeriesItemAvailabilityRequest): Observable<MeetingSeries> {
    return this.http.post<MeetingSeries>(`${this.baseUrl}/items/${itemId}/availability`, request);
  }

  removeAvailability(itemId: string, availabilityId: string): Observable<MeetingSeries> {
    return this.http.delete<MeetingSeries>(`${this.baseUrl}/items/${itemId}/availability/${availabilityId}`);
  }

  getMyMeetings(): Observable<MyMeetingItem[]> {
    return this.http.get<MyMeetingItem[]>(`${this.baseUrl}/my-meetings`);
  }

  getBulkAvailability(seriesId: string): Observable<BulkAvailabilityResponse> {
    return this.http.get<BulkAvailabilityResponse>(
      `${this.baseUrl}/${seriesId}/bulk-availability`
    );
  }

  submitBulkAvailability(seriesId: string, request: BulkAvailabilityRequest): Observable<MeetingSeries> {
    return this.http.post<MeetingSeries>(
      `${this.baseUrl}/${seriesId}/bulk-availability`,
      request
    );
  }

  unconfirmItem(itemId: string): Observable<MeetingSeries> {
    return this.http.post<MeetingSeries>(`${this.baseUrl}/items/${itemId}/unconfirm`, {});
  }

  getMySeries(): Observable<MyMeetingSeries[]> {
    return this.http.get<MyMeetingSeries[]>(`${this.baseUrl}/my-series`);
  }
}