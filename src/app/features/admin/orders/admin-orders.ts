import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { PagedResult } from '../../../core/models/api-response';
import type { AdminOrderListItem } from '../../../core/models/back-office';
import type { OrderStatus } from '../../../core/models/order';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { OrderStatusLabelPipe } from '../../../shared/pipes/order-status.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiPagination } from '../../../shared/ui/pagination';

/** The states worth filtering by, in the order an order passes through them. */
const FILTERS: { value: OrderStatus | ''; labelKey: string }[] = [
  { value: '', labelKey: 'admin.books.filter.all' },
  { value: 'pendingPayment', labelKey: 'orderStatus.pendingPayment' },
  { value: 'paid', labelKey: 'orderStatus.paid' },
  { value: 'processing', labelKey: 'orderStatus.processing' },
  { value: 'shipped', labelKey: 'orderStatus.shipped' },
  { value: 'completed', labelKey: 'orderStatus.completed' },
  { value: 'cancelled', labelKey: 'orderStatus.cancelled' },
];

type PageState = 'loading' | 'ready' | 'error';

/**
 * Every order on the platform. The query string holds the filter and the page, so a
 * link to "everything waiting for payment" is a link somebody can send to a colleague.
 */
@Component({
  selector: 'app-admin-orders',
  imports: [
    RouterLink,
    DatePipe,
    TranslatePipe,
    PricePipe,
    OrderStatusLabelPipe,
    UiSkeleton,
    UiEmptyState,
    UiErrorState,
    UiPagination,
  ],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
})
export class AdminOrders {
  private readonly backOffice = inject(BackOfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly filters = FILTERS;
  protected readonly placeholders = [0, 1, 2, 3, 4, 5];

  protected readonly state = signal<PageState>('loading');
  protected readonly result = signal<PagedResult<AdminOrderListItem> | null>(null);

  private readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });

  protected readonly status = computed<OrderStatus | ''>(
    () => (this.params()['status'] as OrderStatus | undefined) ?? '',
  );

  protected readonly term = computed(() => (this.params()['q'] as string | undefined) ?? '');

  protected readonly page = computed(() => Number(this.params()['page'] ?? 1) || 1);

  protected readonly isEmpty = computed(
    () => this.state() === 'ready' && (this.result()?.totalCount ?? 0) === 0,
  );

  constructor() {
    this.seo.apply({ titleKey: 'admin.orders.title' });

    // The query string is the single source of truth, so the back button and a
    // pasted link both land on exactly the list they describe.
    this.route.queryParams.subscribe(() => this.load());
  }

  protected changeFilter(status: OrderStatus | ''): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: status || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected search(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const term = (form.elements.namedItem('term') as HTMLInputElement).value.trim();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: term || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  protected load(): void {
    this.state.set('loading');

    this.backOffice
      .orders({
        status: this.status() || null,
        term: this.term() || null,
        page: this.page(),
        pageSize: 20,
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }
}
