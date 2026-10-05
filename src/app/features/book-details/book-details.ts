import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApiRequestError } from '../../core/http/api-error';
import type { BookDetails, BookListItem } from '../../core/models/book';
import { AuthService } from '../../core/services/auth.service';
import { BookService } from '../../core/services/book.service';
import { CartService } from '../../core/services/cart.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { BookCard } from '../../shared/ui/book-card';
import { CategoryNamePipe } from '../../shared/pipes/category-name.pipe';
import {
  ConditionLabelPipe,
  LanguageLabelPipe,
} from '../../shared/pipes/condition-label.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../shared/ui/state-views';

/** One reported defect, ready to render as a list item. */
interface ConditionFlag {
  key: string;
  labelKey: string;
}

type PageState = 'loading' | 'ready' | 'missing' | 'error';

/**
 * The book page. It says everything about the physical copy, and about the seller it
 * says only that the platform has verified them: there is no name and no way to make
 * contact, because every exchange goes through the platform.
 */
@Component({
  selector: 'app-book-details',
  imports: [
    RouterLink,
    TranslatePipe,
    PricePipe,
    ConditionLabelPipe,
    LanguageLabelPipe,
    CategoryNamePipe,
    BookCard,
    UiSkeleton,
    UiEmptyState,
    UiErrorState,
  ],
  templateUrl: './book-details.html',
  styleUrl: './book-details.scss',
})
export class BookDetailsPage {
  private readonly books = inject(BookService);
  private readonly cart = inject(CartService);
  private readonly favorites = inject(FavoriteService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly translations = inject(TranslationService);

  /** The URL segment, bound from the route by the router. */
  readonly segment = input.required<string>();

  protected readonly state = signal<PageState>('loading');
  protected readonly book = signal<BookDetails | null>(null);
  protected readonly similar = signal<BookListItem[]>([]);
  protected readonly activeImage = signal(0);

  protected readonly adding = signal(false);
  protected readonly saving = signal(false);

  /** Whether the visitor holds an account that can buy. */
  protected readonly canShop = computed(() => this.auth.isMember());

  protected readonly inCart = computed(() => {
    const code = this.book()?.publicId;
    return code ? this.cart.contains(code) : false;
  });

  protected readonly saved = computed(() => {
    const code = this.book()?.publicId;
    return code ? this.favorites.isSaved(code) : false;
  });

  /** The defects the seller reported, as a list the template can walk. */
  protected readonly flags = computed<ConditionFlag[]>(() => {
    const condition = this.book()?.condition;

    if (!condition) {
      return [];
    }

    const flags: ConditionFlag[] = [];

    if (condition.hasWritingInside) {
      flags.push({ key: 'writing', labelKey: 'condition.writingInside' });
    }
    if (condition.hasHighlighting) {
      flags.push({ key: 'highlighting', labelKey: 'condition.highlighting' });
    }
    if (condition.hasTornPages) {
      flags.push({ key: 'torn', labelKey: 'condition.tornPages' });
    }
    if (condition.hasMissingPages) {
      flags.push({ key: 'missing', labelKey: 'condition.missingPages' });
    }
    if (condition.hasYellowing) {
      flags.push({ key: 'yellowing', labelKey: 'condition.yellowing' });
    }

    return flags;
  });

  constructor() {
    // Reacting to the input rather than reading it once. A required input is not
    // available in the constructor, and a link from one book page to another changes
    // the segment without the component being torn down and rebuilt.
    effect(() => {
      const segment = this.segment();

      if (segment) {
        untracked(() => this.load());
      }
    });
  }

  protected load(): void {
    const segment = this.segment();

    if (!segment) {
      return;
    }

    this.state.set('loading');
    this.activeImage.set(0);
    this.similar.set([]);

    this.books.get(segment).subscribe({
      next: (book) => {
        this.book.set(book);
        this.state.set('ready');
        this.applyMetadata(book);
        this.loadSimilar(book.publicId);
      },
      error: (error: unknown) => {
        // A missing book is an ordinary outcome for a link that has gone stale, and
        // reads very differently from the server being unreachable.
        this.state.set(
          error instanceof ApiRequestError && error.isNotFound ? 'missing' : 'error',
        );
      },
    });
  }

  protected showImage(index: number): void {
    this.activeImage.set(index);
  }

  /**
   * Puts the copy in the basket. A basket is not a reservation, so this holds
   * nothing: the copy stays on sale until somebody pays for it.
   */
  protected addToCart(book: BookDetails): void {
    if (!this.requireAccount(book)) {
      return;
    }

    this.adding.set(true);

    this.cart.add(book.publicId).subscribe({
      next: () => {
        this.adding.set(false);
        this.toasts.success('cart.added');
      },
      error: (error: unknown) => {
        this.adding.set(false);
        this.report(error);
      },
    });
  }

  protected toggleSaved(book: BookDetails): void {
    if (!this.requireAccount(book)) {
      return;
    }

    const wasSaved = this.saved();
    this.saving.set(true);

    this.favorites.toggle(book.publicId).subscribe({
      next: () => {
        this.saving.set(false);
        this.toasts.success(wasSaved ? 'favorites.removed' : 'favorites.added');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.report(error);
      },
    });
  }

  /**
   * Sends a visitor without a shopping account to sign in, carrying the book they
   * were looking at so they come back to it rather than to a home page.
   */
  private requireAccount(book: BookDetails): boolean {
    if (this.canShop()) {
      return true;
    }

    void this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: `/books/${book.urlSegment}` },
    });

    return false;
  }

  /** The server names the rule that was broken, which is more use than a generic line. */
  private report(error: unknown): void {
    if (error instanceof ApiRequestError) {
      this.toasts.failure(error.message);
    } else {
      this.toasts.error('common.error');
    }
  }

  private loadSimilar(publicId: string): void {
    this.books.similar(publicId).subscribe({
      // Suggestions are a nicety; failing to load them must not disturb the page.
      next: (books) => this.similar.set(books),
      error: () => this.similar.set([]),
    });
  }

  private applyMetadata(book: BookDetails): void {
    const author = book.authorName ?? '';
    const condition = this.translations.translate(`condition.${book.condition.grade}`);

    this.seo.apply({
      title: book.title,
      description: book.description?.slice(0, 160) ?? `${book.title} ${author} — ${condition}`,
      canonicalPath: `/books/${book.urlSegment}`,
    });
  }
}
