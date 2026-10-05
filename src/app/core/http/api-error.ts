import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError, ApiResponse } from '../models/api-response';

/**
 * Normalised failure raised by {@link ApiClient}. Components and services deal
 * with this instead of the raw {@link HttpErrorResponse}.
 */
export class ApiRequestError extends Error {
  constructor(
    override readonly message: string,
    readonly status: number,
    readonly errors: ApiError[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  /** Validation messages keyed by camel-cased field name. */
  get fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const error of this.errors) {
      if (error.field) {
        result[error.field] ??= error.message;
      }
    }
    return result;
  }

  get isValidation(): boolean {
    return this.status === 400;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  static fromHttp(response: HttpErrorResponse): ApiRequestError {
    const body = response.error as ApiResponse | string | null;

    if (body && typeof body === 'object' && 'success' in body) {
      return new ApiRequestError(
        body.message ?? 'حدث خطأ غير متوقع.',
        response.status,
        body.errors ?? [],
      );
    }

    const message =
      response.status === 0
        ? 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.'
        : 'حدث خطأ غير متوقع.';

    return new ApiRequestError(message, response.status);
  }
}
