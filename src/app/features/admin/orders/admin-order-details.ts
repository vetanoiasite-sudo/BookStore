import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ApiRequestError } from '../../../core/http/api-error';
import type { AdminOrderDetails } from '../../../core/models/back-office';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { ConditionLabelPipe } from '../../../shared/pipes/condition-label.pipe';
import { OrderStatusLabelPipe } from '../../../shared/pipes/order-status.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { UiStatusBadge } from '../../../shared/ui/status-badge';
import { UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'missing' | 'error';

/**
 * One order, seen from inside the platform: who bought it, where it is going, what
 * each seller is owed, and which shelf each copy is on.
 *
 * The shelf is the reason this page exists. Everything else here is also on the
 * buyer's own order page; where the physical books are is the part only the warehouse
 * can see, and it is what somebody picking the order actually needs.
 */
@Component({
  selector: 'app-admin-order-details',
  imports: [
    RouterLink,
    DatePipe,
    TranslatePipe,
    PricePipe,
    ConditionLabelPipe,
    OrderStatusLabelPipe,
    UiStatusBadge,
    UiSkeleton,
    UiErrorState,
  ],
  templateUrl: './admin-order-details.html',
  styleUrl: './admin-order-details.scss',
})
export class AdminOrderDetailsPage {
  private readonly backOffice = inject(BackOfficeService);
  private readonly seo = inject(SeoService);

  /** The order number, bound from the route by the router. */
  readonly orderNumber = input.required<string>();

  protected readonly state = signal<PageState>('loading');
  protected readonly order = signal<AdminOrderDetails | null>(null);

  constructor() {
    effect(() => {
      const orderNumber = this.orderNumber();

      if (orderNumber) {
        untracked(() => this.load());
      }
    });
  }

  protected load(): void {
    const orderNumber = this.orderNumber();

    if (!orderNumber) {
      return;
    }

    this.state.set('loading');

    this.backOffice.order(orderNumber).subscribe({
      next: (order) => {
        this.order.set(order);
        this.state.set('ready');
        this.seo.apply({ title: order.orderNumber });
      },
      error: (error: unknown) => {
        this.state.set(
          error instanceof ApiRequestError && error.isNotFound ? 'missing' : 'error',
        );
      },
    });
  }
}
