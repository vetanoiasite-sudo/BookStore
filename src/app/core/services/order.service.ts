import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiClient, QueryParams } from '../http/api-client';
import type { PagedResult } from '../models/api-response';
import type { OrderDetails, OrderStatus, OrderSummary } from '../models/order';
import { CartService } from './cart.service';

/**
 * Placing orders and everything the buyer does with them afterwards.
 *
 * Checkout empties the basket on the server, so this reloads it rather than leaving
 * the header showing a count for copies that are now on an order.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiClient);
  private readonly cart = inject(CartService);

  list(page = 1, pageSize = 10, status?: OrderStatus): Observable<PagedResult<OrderSummary>> {
    return this.api.get<PagedResult<OrderSummary>>('/orders', {
      page,
      pageSize,
      status,
    } as QueryParams);
  }

  get(orderNumber: string): Observable<OrderDetails> {
    return this.api.get<OrderDetails>(`/orders/${encodeURIComponent(orderNumber)}`);
  }

  /** Places the order for everything in the basket. */
  place(addressId: string): Observable<OrderDetails> {
    return this.api
      .post<OrderDetails>('/orders', { addressId })
      .pipe(tap(() => this.cart.load().subscribe({ error: () => undefined })));
  }

  cancel(orderNumber: string, reason?: string): Observable<OrderDetails> {
    return this.api.post<OrderDetails>(
      `/orders/${encodeURIComponent(orderNumber)}/cancel`,
      { reason: reason ?? null },
    );
  }

  confirmReceipt(orderNumber: string): Observable<OrderDetails> {
    return this.api.post<OrderDetails>(
      `/orders/${encodeURIComponent(orderNumber)}/confirm-receipt`,
    );
  }
}
