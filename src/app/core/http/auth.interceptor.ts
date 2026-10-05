import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Endpoints that must never carry a bearer token or trigger a refresh. */
const ANONYMOUS_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password'];

/**
 * Attaches the access token to every call, and replaces it once when the server says
 * it has expired.
 *
 * The retry is deliberately limited to a single attempt on a request that was sent
 * with a token. A 401 on a request that carried none is an answer, not a hint to try
 * again, and retrying it would turn a rejected sign-in into a loop.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  if (isAnonymous(request)) {
    return next(request);
  }

  const token = auth.accessToken();
  const authorised = token ? withToken(request, token) : request;

  return next(authorised).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((fresh) => next(withToken(request, fresh))),

        // The refresh failed, so the session is gone. The original 401 is what the
        // caller asked about, and reporting the refresh failure instead would hide it.
        catchError(() => throwError(() => error)),
      );
    }),
  );
};

function isAnonymous(request: HttpRequest<unknown>): boolean {
  return ANONYMOUS_PATHS.some((path) => request.url.includes(path));
}

function withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
