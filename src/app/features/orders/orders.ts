import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { PagedResult } from '../../core/models/api-response';
import type { OrderSummary } from '../../core/models/order';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { OrderStatusLabelPipe } from '../../shared/pipes/order-status.pipe';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../shared/ui/state-views';
import { UiPagination } from '../../shared/ui/pagination';

type PageState = 'loading' | 'ready' | 'error';

/** How many orders one page shows. */
const PAGE_SIZE = 10;

/**
 * The buyer's own orders, newest first. Each row says where the order has got to,
 * because that is the question somebody opening this page is asking.
 */
@Component({
  selector: 'app-orders',
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
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders {
  private readonly orders = inject(OrderService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<PageState>('loading');
  protected readonly result = signal<PagedResult<OrderSummary> | null>(null);
  protected readonly page = signal(1);

  protected readonly placeholders = [0, 1, 2];

  protected readonly isEmpty = computed(() => (this.result()?.totalCount ?? 0) === 0);

  constructor() {
    this.seo.apply({ titleKey: 'orders.title', descriptionKey: 'orders.lead' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.orders.list(this.page(), PAGE_SIZE).subscribe({
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
}
