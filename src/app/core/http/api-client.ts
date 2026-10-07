import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { translateServerMessage } from '../i18n/server-messages';
import { TranslationService } from '../i18n/translation.service';
import type { ApiResponse } from '../models/api-response';
import { ApiRequestError } from './api-error';

/** Query string values accepted by the client; nullish entries are dropped. */
export type QueryParams = Record<
  string,
  string | number | boolean | readonly (string | number)[] | null | undefined
>;

/**
 * Thin wrapper over HttpClient that unwraps the platform response envelope and
 * turns every failure into an {@link ApiRequestError}. Feature services depend
 * on this instead of using HttpClient and the base URL directly.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly translations = inject(TranslationService);

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.unwrap(
      this.http.get<ApiResponse<T>>(this.url(path), { params: this.toParams(params) }),
    );
  }

  post<T>(path: string, body?: unknown, params?: QueryParams): Observable<T> {
    return this.unwrap(
      this.http.post<ApiResponse<T>>(this.url(path), body ?? {}, {
        params: this.toParams(params),
      }),
    );
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.unwrap(this.http.put<ApiResponse<T>>(this.url(path), body ?? {}));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.unwrap(this.http.patch<ApiResponse<T>>(this.url(path), body ?? {}));
  }

  delete<T>(path: string, params?: QueryParams): Observable<T> {
    return this.unwrap(
      this.http.delete<ApiResponse<T>>(this.url(path), { params: this.toParams(params) }),
    );
  }

  /** Multipart upload; the caller builds the FormData so field names stay explicit. */
  upload<T>(path: string, form: FormData): Observable<T> {
    return this.unwrap(this.http.post<ApiResponse<T>>(this.url(path), form));
  }

  /** Turns a stored relative file path into an absolute URL. */
  fileUrl(path: string | null | undefined): string | null {
    if (!path) {
      return null;
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${this.config.filesBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private url(path: string): string {
    return `${this.config.apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private toParams(params?: QueryParams): HttpParams {
    let result = new HttpParams();
    if (!params) {
      return result;
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }
      if (Array.isArray(value)) {
        for (const entry of value) {
          result = result.append(key, String(entry));
        }
      } else {
        result = result.set(key, String(value));
      }
    }

    return result;
  }

  private unwrap<T>(source: Observable<ApiResponse<T>>): Observable<T> {
    return source.pipe(
      map((response) => {
        if (!response.success) {
          throw new ApiRequestError(response.message ?? 'حدث خطأ غير متوقع.', 400, response.errors ?? []);
        }
        return response.data as T;
      }),
      catchError((error: unknown) => {
        const failure = error instanceof HttpErrorResponse ? ApiRequestError.fromHttp(error) : error;
        return throwError(() => (failure instanceof ApiRequestError ? this.localise(failure) : failure));
      }),
    );
  }

  /** Puts the server's English messages into the interface language, top-level and per field. */
  private localise(error: ApiRequestError): ApiRequestError {
    const language = this.translations.language();

    return new ApiRequestError(
      translateServerMessage(error.message, language),
      error.status,
      error.errors.map((item) => ({ ...item, message: translateServerMessage(item.message, language) })),
    );
  }
}
