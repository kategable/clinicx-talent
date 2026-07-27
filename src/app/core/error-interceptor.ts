import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Handles global HTTP error responses:
 * - 401 → redirect to sign-in (session expired / not authenticated)
 * - 403 → redirect to home (forbidden)
 * - 429 → surface rate-limit message via store (TODO: toast service)
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        switch (err.status) {
          case 401:
            // Session expired or not authenticated — redirect to sign-in
            void router.navigateByUrl('/signin');
            break;
          case 403:
            // Forbidden — user doesn't have the right role
            void router.navigateByUrl('/');
            break;
          case 429:
            // Rate limited — surface the message
            console.warn(
              '[ClinicX] Rate limited:',
              err.error?.error?.message ?? 'Too many requests',
            );
            break;
        }
      }
      return throwError(() => err);
    }),
  );
};
