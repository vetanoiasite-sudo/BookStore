import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, QueryParams } from '../http/api-client';
import type { PagedResult } from '../models/api-response';
import type {
  AdminBookDetails,
  AdminBookListItem,
  AdminBookQuery,
  InventoryLocationOption,
} from '../models/admin';
import type { BookTimelineEntry } from '../models/seller';

/**
 * The back-office side of a listing: the review queue, the decisions, and the
 * warehouse lookup that shelving a copy depends on.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiClient);

  /** Copies in any status. */
  books(query: AdminBookQuery): Observable<PagedResult<AdminBookListItem>> {
    return this.api.get<PagedResult<AdminBookListItem>>('/admin/books', query as QueryParams);
  }

  /** Copies waiting for a decision, oldest first. */
  pending(query: AdminBookQuery): Observable<PagedResult<AdminBookListItem>> {
    return this.api.get<PagedResult<AdminBookListItem>>(
      '/admin/books/pending',
      query as QueryParams,
    );
  }

  book(publicId: string): Observable<AdminBookDetails> {
    return this.api.get<AdminBookDetails>(`/admin/books/${encodeURIComponent(publicId)}`);
  }

  history(publicId: string): Observable<BookTimelineEntry[]> {
    return this.api.get<BookTimelineEntry[]>(
      `/admin/books/${encodeURIComponent(publicId)}/history`,
    );
  }

  approve(publicId: string): Observable<AdminBookDetails> {
    return this.api.post<AdminBookDetails>(
      `/admin/books/${encodeURIComponent(publicId)}/approve`,
    );
  }

  reject(publicId: string, reason: string): Observable<AdminBookDetails> {
    return this.api.post<AdminBookDetails>(
      `/admin/books/${encodeURIComponent(publicId)}/reject`,
      { reason },
    );
  }

  /** Records that the physical copy has arrived. */
  receive(publicId: string): Observable<AdminBookDetails> {
    return this.api.post<AdminBookDetails>(
      `/admin/books/${encodeURIComponent(publicId)}/receive`,
    );
  }

  /** Shelves the copy, which is what puts it on sale. */
  assignLocation(
    publicId: string,
    locationId: string,
    notes: string | null,
  ): Observable<AdminBookDetails> {
    return this.api.post<AdminBookDetails>(
      `/admin/books/${encodeURIComponent(publicId)}/assign-location`,
      { locationId, notes },
    );
  }

  locations(includeInactive = false): Observable<InventoryLocationOption[]> {
    return this.api.get<InventoryLocationOption[]>('/admin/inventory/locations', {
      includeInactive,
    });
  }
}
