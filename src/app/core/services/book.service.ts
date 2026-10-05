import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, QueryParams } from '../http/api-client';
import type { PagedResult } from '../models/api-response';
import type {
  BookDetails,
  BookFilterOptions,
  BookListItem,
  BookSearchCriteria,
} from '../models/book';

/**
 * Reads the public catalogue. Components call this rather than the HTTP client, so
 * the endpoint paths live in one place and every caller gets the same typed result.
 */
@Injectable({ providedIn: 'root' })
export class BookService {
  private readonly api = inject(ApiClient);

  /** One page of the catalogue. */
  search(criteria: BookSearchCriteria): Observable<PagedResult<BookListItem>> {
    return this.api.get<PagedResult<BookListItem>>('/books', criteria as QueryParams);
  }

  /**
   * The filters worth offering beside a set of results. Takes the same criteria as
   * the listing, so the panel counts against what the reader has already narrowed to.
   */
  filters(criteria: BookSearchCriteria): Observable<BookFilterOptions> {
    return this.api.get<BookFilterOptions>('/books/filters', criteria as QueryParams);
  }

  /**
   * One book. Accepts either the bare code or the full URL segment, because the
   * router hands over whatever is in the address bar.
   */
  get(publicIdOrSegment: string): Observable<BookDetails> {
    return this.api.get<BookDetails>(`/books/${encodeURIComponent(publicIdOrSegment)}`);
  }

  /** Other copies worth showing beside this one. */
  similar(publicIdOrSegment: string): Observable<BookListItem[]> {
    return this.api.get<BookListItem[]>(
      `/books/${encodeURIComponent(publicIdOrSegment)}/similar`,
    );
  }

  /** The newest copies to go on sale. */
  newArrivals(count = 8): Observable<BookListItem[]> {
    return this.api.get<BookListItem[]>('/books/new-arrivals', { count });
  }

  /** The most looked at copies. */
  featured(count = 8): Observable<BookListItem[]> {
    return this.api.get<BookListItem[]>('/books/featured', { count });
  }

  /** Turns a stored image path into an absolute URL. */
  imageUrl(path: string | null | undefined): string | null {
    return this.api.fileUrl(path);
  }
}
