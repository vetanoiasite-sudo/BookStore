import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiClient, QueryParams } from '../http/api-client';
import type { PagedResult } from '../models/api-response';
import type { SavedBook } from '../models/cart';
import { AuthService } from './auth.service';

/**
 * The books a reader has saved. The set of saved codes is kept in a signal and
 * loaded once, so a grid of cards can fill in its hearts without asking the server
 * about each card in turn.
 *
 * Saving and unsaving are answered optimistically: the heart fills the instant it is
 * tapped and is put back only if the request fails, because a heart that waits for a
 * round trip reads as broken.
 */
@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);

  private readonly state = signal<ReadonlySet<string>>(new Set());

  /** How many books are saved, for the header. */
  readonly count = computed(() => this.state().size);

  constructor() {
    effect(() => {
      const canShop = this.auth.isMember();

      untracked(() => {
        if (canShop) {
          this.loadCodes().subscribe({ error: () => this.state.set(new Set()) });
        } else {
          this.state.set(new Set());
        }
      });
    });
  }

  isSaved(publicId: string): boolean {
    return this.state().has(publicId);
  }

  /** One page of saved books, most recently saved first. */
  list(page = 1, pageSize = 12): Observable<PagedResult<SavedBook>> {
    return this.api.get<PagedResult<SavedBook>>('/favorites', { page, pageSize } as QueryParams);
  }

  /** Saves or unsaves, whichever the current state calls for. */
  toggle(publicId: string): Observable<void> {
    return this.isSaved(publicId) ? this.remove(publicId) : this.add(publicId);
  }

  add(publicId: string): Observable<void> {
    const before = this.state();
    this.state.set(new Set(before).add(publicId));

    return this.api.post<void>('/favorites', { publicId }).pipe(
      tap({ error: () => this.state.set(before) }),
    );
  }

  remove(publicId: string): Observable<void> {
    const before = this.state();
    const next = new Set(before);
    next.delete(publicId);
    this.state.set(next);

    return this.api.delete<void>(`/favorites/${encodeURIComponent(publicId)}`).pipe(
      tap({ error: () => this.state.set(before) }),
    );
  }

  private loadCodes(): Observable<string[]> {
    return this.api
      .get<string[]>('/favorites/codes')
      .pipe(tap((codes) => this.state.set(new Set(codes))));
  }
}
