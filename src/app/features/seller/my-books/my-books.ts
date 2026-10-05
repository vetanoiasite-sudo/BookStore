import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { ApiRequestError } from '../../../core/http/api-error';
import type { PagedResult } from '../../../core/models/api-response';
import type { BookStatus, SellerBookListItem } from '../../../core/models/seller';
import { SellerService } from '../../../core/services/seller.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiPagination } from '../../../shared/ui/pagination';
import { UiStatusBadge } from '../../../shared/ui/status-badge';

/** The filters offered above the list, in the order a listing moves through them. */
const FILTERS: { value: BookStatus | ''; labelKey: string }[] = [
  { value: '', labelKey: 'seller.books.filter.all' },
  { value: 'draft', labelKey: 'bookStatus.draft' },
  { value: 'pendingReview', labelKey: 'bookStatus.pendingReview' },
  { value: 'rejected', labelKey: 'bookStatus.rejected' },
  { value: 'waitingForDelivery', labelKey: 'bookStatus.waitingForDelivery' },
  { value: 'available', labelKey: 'bookStatus.available' },
  { value: 'sold', labelKey: 'bookStatus.sold' },
];

type State = 'loading' | 'ready' | 'error';

/**
 * The seller's own listings. The filter and the page live in the query string, so a
 * seller who opens a listing and comes back lands on the same view they left.
 */
@Component({
  selector: 'app-my-books',
  imports: [
    RouterLink,
    TranslatePipe,
    PricePipe,
    UiEmptyState,
    UiErrorState,
    UiSkeleton,
    UiPagination,
    UiStatusBadge,
  ],
  templateUrl: './my-books.html',
  styleUrl: './my-books.scss',
})
export class MyBooks {
  private readonly seller = inject(SellerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly translations = inject(TranslationService);
  private readonly seo = inject(SeoService);

  protected readonly filters = FILTERS;
  protected readonly placeholders = Array.from({ length: 6 }, (_, index) => index);

  protected readonly state = signal<State>('loading');
  protected readonly result = signal<PagedResult<SellerBookListItem> | null>(null);

  /** The listing an action is currently running against, so its buttons can wait. */
  protected readonly busy = signal<string | null>(null);

  private readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });

  protected readonly status = computed<BookStatus | ''>(
    () => (this.params()['status'] as BookStatus | undefined) ?? '',
  );

  protected readonly term = computed(() => (this.params()['q'] as string | undefined) ?? '');

  protected readonly page = computed(() => Number(this.params()['page'] ?? 1) || 1);

  protected readonly isEmpty = computed(
    () => this.state() === 'ready' && (this.result()?.totalCount ?? 0) === 0,
  );

  constructor() {
    this.seo.apply({ titleKey: 'seller.books.title' });
    this.route.queryParams.subscribe(() => this.load());
  }

  protected load(): void {
    this.state.set('loading');

    this.seller
      .list({
        status: this.status() || null,
        q: this.term() || null,
        page: this.page(),
        pageSize: 20,
      })
      .subscribe({
        next: (page) => {
          this.result.set(page);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }

  protected changeFilter(status: BookStatus | ''): void {
    // A new filter starts again from the first page; page four of a different
    // filter would show an arbitrary slice.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: status || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected search(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const value = (form.elements.namedItem('term') as HTMLInputElement).value.trim();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected changePage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page === 1 ? null : page },
      queryParamsHandling: 'merge',
    });
  }

  /** Sends a listing for review from the list, without opening it first. */
  protected submit(book: SellerBookListItem): void {
    this.run(book, this.seller.submit(book.publicId), 'seller.books.submitted');
  }

  /** Deletes a draft the platform has never seen. */
  protected remove(book: SellerBookListItem): void {
    if (!confirm(this.confirmText('seller.books.confirmDelete', book.title))) {
      return;
    }

    this.run(book, this.seller.delete(book.publicId), 'seller.books.deleted');
  }

  /** Withdraws a listing that has been through review. */
  protected withdraw(book: SellerBookListItem): void {
    if (!confirm(this.confirmText('seller.books.confirmWithdraw', book.title))) {
      return;
    }

    this.run(book, this.seller.archive(book.publicId, null), 'seller.books.withdrawn');
  }

  /** True when the copy can still be sent for review, which needs a photograph. */
  protected canSubmit(book: SellerBookListItem): boolean {
    return book.isEditable && book.imageCount > 0;
  }

  /** True when withdrawing is the way to remove it, rather than deleting. */
  protected canWithdraw(book: SellerBookListItem): boolean {
    return book.status === 'available' || book.status === 'approved';
  }

  private run(book: SellerBookListItem, action: Observable<unknown>, successKey: string): void {
    this.busy.set(book.publicId);

    action.subscribe({
      next: () => {
        this.busy.set(null);
        this.toasts.success(successKey);
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(null);

        // The server says exactly which rule was broken, and that message is more
        // use to the seller than anything this page could invent.
        this.toasts.failure(
          error instanceof ApiRequestError ? error.message : 'common.error',
        );
      },
    });
  }

  /**
   * Both removals are irreversible from the seller's side, so each one is confirmed
   * against the title rather than against a code. The browser dialog is deliberate
   * here: it cannot be missed and it needs no focus management of its own.
   */
  private confirmText(key: string, title: string): string {
    return `${title}\n\n${this.translations.translate(key)}`;
  }
}
