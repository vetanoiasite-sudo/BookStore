/** Mirrors the envelope returned by every backend endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string | null;
  data?: T;
  errors?: ApiError[];
}

/** A single error entry; `field` is present only for validation failures. */
export interface ApiError {
  code: string;
  message: string;
  field?: string | null;
}

/** A page of results returned by every list endpoint. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}
