import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, QueryParams } from '../http/api-client';
import type { PagedResult } from '../models/api-response';
import type { BookImageType } from '../models/book';
import type {
  BookRecognitionResult,
  SaveSellerBookRequest,
  SellerBookDetails,
  SellerBookImage,
  SellerBookListItem,
  SellerBookQuery,
  SellerDashboard,
} from '../models/seller';

/**
 * The seller area. Every call is scoped to the signed-in seller by the server, so
 * nothing here has to pass an identity and nothing here can ask about someone else.
 */
@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly api = inject(ApiClient);

  dashboard(): Observable<SellerDashboard> {
    return this.api.get<SellerDashboard>('/seller/dashboard');
  }

  list(query: SellerBookQuery): Observable<PagedResult<SellerBookListItem>> {
    return this.api.get<PagedResult<SellerBookListItem>>(
      '/seller/books',
      query as QueryParams,
    );
  }

  get(publicId: string): Observable<SellerBookDetails> {
    return this.api.get<SellerBookDetails>(`/seller/books/${encodeURIComponent(publicId)}`);
  }

  create(request: SaveSellerBookRequest): Observable<SellerBookDetails> {
    return this.api.post<SellerBookDetails>('/seller/books', request);
  }

  update(publicId: string, request: SaveSellerBookRequest): Observable<SellerBookDetails> {
    return this.api.put<SellerBookDetails>(
      `/seller/books/${encodeURIComponent(publicId)}`,
      request,
    );
  }

  /** Removes a draft that was never submitted. */
  delete(publicId: string): Observable<unknown> {
    return this.api.delete<unknown>(`/seller/books/${encodeURIComponent(publicId)}`);
  }

  /** Sends the listing for review, or resends it after a rejection. */
  submit(publicId: string): Observable<SellerBookDetails> {
    return this.api.post<SellerBookDetails>(
      `/seller/books/${encodeURIComponent(publicId)}/submit`,
    );
  }

  /** Withdraws the copy from the platform. */
  archive(publicId: string, reason: string | null): Observable<SellerBookDetails> {
    return this.api.post<SellerBookDetails>(
      `/seller/books/${encodeURIComponent(publicId)}/archive`,
      { reason },
    );
  }

  uploadImage(
    publicId: string,
    file: File,
    type: BookImageType,
    altText?: string,
  ): Observable<SellerBookImage> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);

    if (altText) {
      form.append('altText', altText);
    }

    return this.api.upload<SellerBookImage>(
      `/seller/books/${encodeURIComponent(publicId)}/images`,
      form,
    );
  }

  removeImage(publicId: string, imageId: string): Observable<unknown> {
    return this.api.delete<unknown>(
      `/seller/books/${encodeURIComponent(publicId)}/images/${imageId}`,
    );
  }

  /** Suggests book details from a photograph. Nothing is saved. */
  recognize(file: File): Observable<BookRecognitionResult> {
    const form = new FormData();
    form.append('file', file);

    return this.api.upload<BookRecognitionResult>('/seller/books/recognize', form);
  }
}
