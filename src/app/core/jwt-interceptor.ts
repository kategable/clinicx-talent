import { HttpInterceptorFn } from '@angular/common/http';
import { TOKEN_STORAGE_KEY } from './auth/constants';

/**
 * Attaches the JWT bearer token to every outgoing HTTP request when the user
 * is authenticated. Reads the token from sessionStorage so it survives
 * refreshes without an NgRx store roundtrip.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (raw) {
      const pair = JSON.parse(raw) as { token: string };
      if (pair.token) {
        req = req.clone({
          setHeaders: { Authorization: `Bearer ${pair.token}` },
        });
      }
    }
  } catch {
    // sessionStorage unavailable — pass through without token
  }
  return next(req);
};
