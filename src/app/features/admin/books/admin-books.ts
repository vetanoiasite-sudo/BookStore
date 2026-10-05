import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import type { PagedResult } from '../../../core/models/api-response';
import type { AdminBookListItem } from '../../../core/models/admin';
import type { BookStatus } from '../../../core/models/seller';
import { AdminService } from '../../../core/services/admin.service';
import { SeoService } from '../../../core/services/seo.service';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiPagination } from '../../../shared/ui/pagination';
import { UiStatusBadge } from '../../../shared/ui/status-badge';

/**
 * The statuses the back office works through, in the order a copy passes them. Only
 * the ones staff act on: a draft belongs to its seller and never appears here.
 */
const FILTERS: { value: BookStatus | ''; labelKey: string }[] = [
  { value: '', labelKey: 'admin.books.filter.all' },
  { value: 'pendingReview', labelKey: 'bookStatus.pendingReview' },
  { value: 'waitingForDelivery', labelKey: 'bookStatus.waitingForDelivery' },
  { value: 'received', labelKey: 'bookStatus.received' },
  { value: 'available', labelKey: 'bookStatus.available' },
  { value: 'rejected', labelKey: 'bookStatus.rejected' },
  { value: 'sold', labelKey: 'bookStatus.sold' },
];

type State = 'loading' | 'ready' | 'error';

/**
 * The back-office book list. The same component serves the review queue and the full
 * catalogue: they differ only in what they are filtered to, and splitting them would
 * mean maintaining one table twice.
 */
@Component({
  selector: 'app-admin-books',
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
  templateUrl: './admin-books.html',
  styleUrl: './admin-books.scss',
})
export class AdminBooks implements OnInit {
  /** Set by the route: the queue shows only what is waiting for a decision. */
  readonly queue = input(false);

  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly filters = FILTERS;
  protected readonly placeholders = Array.from({ length: 6 }, (_, index) => index);

  protected readonly state = signal<State>('loading');
  protected readonly result = signal<PagedResult<AdminBookListItem> | null>(null);

  private readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });

  protected readonly status = computed<BookStatus | ''>(
    () => (this.params()['status'] as BookStatus | undefined) ?? '',
  );

  protected readonly term = computed(() => (this.params()['q'] as string | undefined) ?? '');

  protected readonly page = computed(() => Number(this.params()['page'] ?? 1) || 1);

  protected readonly isEmpty = computed(
    () => this.state() === 'ready' && (this.result()?.totalCount ?? 0) === 0,
  );

  /**
   * Whether this is the review queue comes from the route, and route inputs are set
   * after the constructor runs. Subscribing here means the first load already knows
   * which of the two lists it is.
   */
  ngOnInit(): void {
    this.seo.apply({ titleKey: 'admin.books.title' });
    this.route.queryParams.subscribe(() => this.load());
  }

  protected load(): void {
    this.state.set('loading');

    const query = {
      q: this.term() || null,
      page: this.page(),
      pageSize: 20,
    };

    const request = this.queue()
      ? this.admin.pending(query)
      : this.admin.books({ ...query, status: this.status() || null });

    request.subscribe({
      next: (page) => {
        this.result.set(page);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected changeFilter(status: BookStatus | ''): void {
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
}
