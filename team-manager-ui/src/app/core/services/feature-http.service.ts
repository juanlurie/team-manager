import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class FeatureHttpService {
  private http = inject(HttpClient);

  get<T>(url: string, fallback: T): Observable<T> {
    return this.http.get<T>(url).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 403 && err.error?.error === 'feature_disabled') {
          return of(fallback);
        }
        throw err;
      })
    );
  }

  post<T>(url: string, body: any, fallback: T): Observable<T> {
    return this.http.post<T>(url, body).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 403 && err.error?.error === 'feature_disabled') {
          return of(fallback);
        }
        throw err;
      })
    );
  }

  put<T>(url: string, body: any, fallback: T): Observable<T> {
    return this.http.put<T>(url, body).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 403 && err.error?.error === 'feature_disabled') {
          return of(fallback);
        }
        throw err;
      })
    );
  }

  delete<T>(url: string, fallback: T): Observable<T> {
    return this.http.delete<T>(url).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 403 && err.error?.error === 'feature_disabled') {
          return of(fallback);
        }
        throw err;
      })
    );
  }
}
