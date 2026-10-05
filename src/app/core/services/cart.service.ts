import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiClient } from '../http/api-client';
import type { CartView } from '../models/cart';
import { AuthService } from './auth.service';

/**
 * The basket, held as a signal so the header count, the book page and the basket
 * page all show the same thing without any of them subscribing to the others.
 *
 * Every call answers with the whole basket rather than with the line that changed,
 * because the server reads it against a live catalogue: adding one copy can be the
 * moment another one in it turns out to have been sold.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);

  private readonly state = signal<CartView | null>(null);

  /** The basket, or null before the first load and while signed out. */
  readonly cart = this.state.asReadonly();

  /**
   * Copies that can still be bought. A copy sold to someone else stays in the list
   * so the buyer is told, but the header must not count it as something to buy.
   */
  readonly count = computed(() => this.state()?.availableCount ?? 0);

  /** The codes in the basket, so a card can show that it is already in there. */
  private readonly codes = computed(
    () => new Set(this.state()?.items.map((line) => line.book.publicId) ?? []),
  );

  constructor() {
    // The basket belongs to the account, so it follows the session: loaded when
    // someone who can shop signs in, and dropped the moment they sign out rather
    // than lingering in the header of a signed-out page.
    effect(() => {
      const canShop = this.auth.isMember();

      untracked(() => {
        if (canShop) {
          this.load().subscribe({ error: () => this.state.set(null) });
        } else {
          this.state.set(null);
        }
      });
    });
  }

  contains(publicId: string): boolean {
    return this.codes().has(publicId);
  }

  load(): Observable<CartView> {
    return this.api.get<CartView>('/cart').pipe(tap((cart) => this.state.set(cart)));
  }

  add(publicId: string): Observable<CartView> {
    return this.api
      .post<CartView>('/cart/items', { publicId })
      .pipe(tap((cart) => this.state.set(cart)));
  }

  remove(publicId: string): Observable<CartView> {
    return this.api
      .delete<CartView>(`/cart/items/${encodeURIComponent(publicId)}`)
      .pipe(tap((cart) => this.state.set(cart)));
  }

  clear(): Observable<CartView> {
    return this.api.delete<CartView>('/cart').pipe(tap((cart) => this.state.set(cart)));
  }
}
