import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError(error => {
      const message = error?.error?.detail ?? error?.error?.title ?? 'An unexpected error occurred.';
      snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return throwError(() => error);
    })
  );
};
