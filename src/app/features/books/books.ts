import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CategoryNamePipe } from '../../shared/pipes/category-name.pipe';
import type { PagedResult } from '../../core/models/api-response';
import type {
  BookFilterOptions,
  BookLanguage,
  BookListItem,
  BookSearchCriteria,
  BookSortOption,
  ConditionGrade,
} from '../../core/models/book';
import type { CategoryBreadcrumb } from '../../core/models/category';
import { BookService } from '../../core/services/book.service';
import { CategoryService } from '../../core/services/category.service';
import { SeoService } from '../../core/services/seo.service';
import { BookCard, BookCardSkeleton } from '../../shared/ui/book-card';
import { UiEmptyState, UiErrorState } from '../../shared/ui/state-views';
import { UiPagination } from '../../shared/ui/pagination';
import { BookFilters, NO_FILTERS, type BookFilterSelection } from './book-filters';

/** The orderings offered in the sort menu. */
const SORT_OPTIONS: { value: BookSortOption; labelKey: string }[] = [
  { value: 'Newest', labelKey: 'books.sort.newest' },
  { value: 'Oldest', labelKey: 'books.sort.oldest' },
  { value: 'PriceLowToHigh', labelKey: 'books.sort.priceLowToHigh' },
  { value: 'PriceHighToLow', labelKey: 'books.sort.priceHighToLow' },
  { value: 'MostPopular', labelKey: 'books.sort.mostPopular' },
];

type ListState = 'loading' | 'ready' | 'error';

/**
 * The catalogue listing. The query string is the single source of truth for what is
 * shown, so a search, a filter, a sort and a page number are all shareable and
 * survive a reload or the back button.
 */
@Component({
  selector: 'app-books',
  imports: [
    RouterLink,
    TranslatePipe,
    CategoryNamePipe,
    BookCard,
    BookCardSkeleton,
    BookFilters,
    UiEmptyState,
    UiErrorState,
    UiPagination,
  ],
  templateUrl: './books.html',
  styleUrl: './books.scss',
})
export class Books {
  private readonly books = inject(BookService);
  private readonly categories = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly sortOptions = SORT_OPTIONS;

  protected readonly state = signal<ListState>('loading');
  protected readonly result = signal<PagedResult<BookListItem> | null>(null);

  /** What the filter panel may offer, or null until the first answer arrives. */
  protected readonly filterOptions = signal<BookFilterOptions | null>(null);

  /** Placeholder cards while a page loads. */
  protected readonly placeholders = Array.from({ length: 12 }, (_, index) => index);

  private readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });

  protected readonly term = computed(() => (this.params()['q'] as string | undefined) ?? '');

  protected readonly sort = computed<BookSortOption>(
    () => (this.params()['sort'] as BookSortOption | undefined) ?? 'Newest',
  );

  protected readonly page = computed(() => Number(this.params()['page'] ?? 1) || 1);

  protected readonly categorySlug = computed(
    () => (this.params()['category'] as string | undefined) ?? '',
  );

  /**
   * The filters from the address bar. Read rather than stored, so the panel, the
   * request and a pasted link can never disagree about what is being shown.
   */
  protected readonly selection = computed<BookFilterSelection>(() => {
    const params = this.params();

    return {
      author: (params['author'] as string | undefined) ?? null,
      publisher: (params['publisher'] as string | undefined) ?? null,
      language: (params['language'] as BookLanguage | undefined) ?? null,
      conditions: asArray(params['condition']) as ConditionGrade[],
      minPrice: asNumber(params['minPrice']),
      maxPrice: asNumber(params['maxPrice']),
      minYear: asNumber(params['minYear']),
      maxYear: asNumber(params['maxYear']),
    };
  });

  /** The category being filtered on, once its name has been fetched. */
  protected readonly category = signal<CategoryBreadcrumb | null>(null);

  protected readonly totalCount = computed(() => this.result()?.totalCount ?? 0);

  protected readonly isEmpty = computed(
    () => this.state() === 'ready' && this.totalCount() === 0,
  );

  /** Whether anything at all narrows the catalogue right now. */
  protected readonly isFiltered = computed(() => {
    const selection = this.selection();

    return (
      this.term() !== '' ||
      this.categorySlug() !== '' ||
      selection.author !== null ||
      selection.publisher !== null ||
      selection.language !== null ||
      selection.conditions.length > 0 ||
      selection.minPrice !== null ||
      selection.maxPrice !== null ||
      selection.minYear !== null ||
      selection.maxYear !== null
    );
  });

  constructor() {
    this.seo.apply({ titleKey: 'books.title', canonicalPath: '/books' });

    // Reloading on every query change is what makes the address bar authoritative:
    // a link someone pastes produces exactly the page they saw.
    this.route.queryParams.subscribe(() => {
      this.load();
      this.loadFilters();
      this.loadCategory();
    });
  }

  /**
   * Fetches the name of the category being filtered on. The listing itself does not
   * wait for it: the books are the point, and the heading fills in when it arrives.
   */
  private loadCategory(): void {
    const slug = this.categorySlug();

    if (!slug) {
      this.category.set(null);
      return;
    }

    if (this.category()?.slug === slug) {
      return;
    }

    this.categories.get(slug).subscribe({
      next: (category) => this.category.set(category),
      error: () => this.category.set(null),
    });
  }

  /**
   * Refreshes the panel alongside the results. A failure leaves the last answer in
   * place rather than emptying the panel: filters that are one request out of date
   * are more use than no filters at all.
   */
  private loadFilters(): void {
    this.books.filters(this.criteria()).subscribe({
      next: (options) => this.filterOptions.set(options),
      error: () => undefined,
    });
  }

  protected load(): void {
    this.state.set('loading');

    this.books.search({ ...this.criteria(), page: this.page(), pageSize: 12 }).subscribe({
      next: (page) => {
        this.result.set(page);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  /** What is being asked for, apart from where in the results the reader is. */
  private criteria(): BookSearchCriteria {
    const selection = this.selection();

    return {
      q: this.term() || null,
      category: this.categorySlug() || null,
      author: selection.author,
      publisher: selection.publisher,
      language: selection.language,
      condition: selection.conditions,
      minPrice: selection.minPrice,
      maxPrice: selection.maxPrice,
      minYear: selection.minYear,
      maxYear: selection.maxYear,
      sort: this.sort(),
    };
  }

  protected changeSort(event: Event): void {
    const sort = (event.target as HTMLSelectElement).value as BookSortOption;

    // A new ordering starts again from the first page; staying on page four of a
    // different ordering would show an arbitrary slice.
    this.navigate({ sort });
  }

  protected changePage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page === 1 ? null : page },
      queryParamsHandling: 'merge',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Writes a filter change into the address bar, which is what reloads the page. The
   * results always start again from page one: keeping the page number across a
   * change of filter would land the reader in the middle of a set they have not seen
   * the start of.
   */
  protected applyFilters(patch: Partial<BookFilterSelection>): void {
    this.navigate({
      author: patch.author,
      publisher: patch.publisher,
      language: patch.language,
      condition: patch.conditions,
      minPrice: patch.minPrice,
      maxPrice: patch.maxPrice,
      minYear: patch.minYear,
      maxYear: patch.maxYear,
    });
  }

  /** Drops every filter on the panel, keeping the search term and the category. */
  protected clearFilters(): void {
    this.applyFilters(NO_FILTERS);
  }

  protected clearSearch(): void {
    void this.router.navigate(['/books']);
  }

  /** Drops the category filter while keeping any search term. */
  protected clearCategory(): void {
    this.navigate({ category: null });
  }

  /**
   * Merges a change into the query string and returns to the first page. Undefined
   * values are left alone, nulls and empty arrays remove the parameter.
   */
  private navigate(changes: Record<string, unknown>): void {
    const queryParams: Params = { page: null };

    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) {
        continue;
      }

      queryParams[key] = Array.isArray(value) && value.length === 0 ? null : value;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}

/** Reads a parameter that may appear once, several times, or not at all. */
function asArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value as string[];
  }

  return typeof value === 'string' && value !== '' ? [value] : [];
}

/** Reads a numeric parameter, treating anything unparseable as absent. */
function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
