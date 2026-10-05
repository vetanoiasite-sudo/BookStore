import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { BookListItem } from '../../core/models/book';
import { BookService } from '../../core/services/book.service';
import { SeoService } from '../../core/services/seo.service';
import { BookCard, BookCardSkeleton } from '../../shared/ui/book-card';

/** How many copies each home page strip shows. */
const STRIP_SIZE = 8;

/** What a strip is currently doing, so the template can render the right thing. */
type StripState = 'loading' | 'ready' | 'error';

/**
 * The storefront home page: what the platform is, what is new, and how selling
 * works. Both book strips load independently, so one failing does not blank the page.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe, BookCard, BookCardSkeleton],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly books = inject(BookService);
  private readonly seo = inject(SeoService);

  protected readonly featured = signal<BookListItem[]>([]);
  protected readonly featuredState = signal<StripState>('loading');

  protected readonly arrivals = signal<BookListItem[]>([]);
  protected readonly arrivalsState = signal<StripState>('loading');

  /** Placeholder cards, so the strip reserves its space while loading. */
  protected readonly placeholders = Array.from({ length: STRIP_SIZE }, (_, index) => index);

  constructor() {
    this.seo.apply({ titleKey: 'app.name', descriptionKey: 'home.hero.lead' });
    this.loadFeatured();
    this.loadArrivals();
  }

  protected loadFeatured(): void {
    this.featuredState.set('loading');

    this.books.featured(STRIP_SIZE).subscribe({
      next: (books) => {
        this.featured.set(books);
        this.featuredState.set('ready');
      },
      error: () => this.featuredState.set('error'),
    });
  }

  protected loadArrivals(): void {
    this.arrivalsState.set('loading');

    this.books.newArrivals(STRIP_SIZE).subscribe({
      next: (books) => {
        this.arrivals.set(books);
        this.arrivalsState.set('ready');
      },
      error: () => this.arrivalsState.set('error'),
    });
  }
}
