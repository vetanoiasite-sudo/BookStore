import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { PagedResult } from '../../core/models/api-response';
import type { SavedBook } from '../../core/models/cart';
import { FavoriteService } from '../../core/services/favorite.service';
import { SeoService } from '../../core/services/seo.service';
import { BookCard, BookCardSkeleton } from '../../shared/ui/book-card';
import { UiEmptyState, UiErrorState } from '../../shared/ui/state-views';
import { UiPagination } from '../../shared/ui/pagination';

type PageState = 'loading' | 'ready' | 'error';

/** How many saved books one page shows. */
const PAGE_SIZE = 12;

/**
 * The books a reader has saved. Saving holds nothing, so a copy can be sold while it
 * sits here: each card says whether it is still on sale rather than quietly turning
 * into a dead link.
 */
@Component({
  selector: 'app-favorites',
  imports: [
    RouterLink,
    TranslatePipe,
    BookCard,
    BookCardSkeleton,
    UiEmptyState,
    UiErrorState,
    UiPagination,
  ],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites {
  private readonly favorites = inject(FavoriteService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<PageState>('loading');
  protected readonly result = signal<PagedResult<SavedBook> | null>(null);
  protected readonly page = signal(1);

  protected readonly placeholders = Array.from({ length: PAGE_SIZE }, (_, index) => index);

  protected readonly isEmpty = computed(() => (this.result()?.totalCount ?? 0) === 0);

  constructor() {
    this.seo.apply({ titleKey: 'favorites.title', descriptionKey: 'favorites.lead' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.favorites.list(this.page(), PAGE_SIZE).subscribe({
      next: (result) => {
        this.result.set(result);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Unsaving from this page removes the card, so the list is reloaded rather than
   * left showing something the reader has just taken off it.
   */
  protected onRemoved(): void {
    const result = this.result();

    // Emptying the last page steps back to the one before it, so unsaving the only
    // card on page three does not leave the reader looking at nothing.
    if (result && result.items.length === 1 && this.page() > 1) {
      this.page.update((page) => page - 1);
    }

    this.load();
  }
}
