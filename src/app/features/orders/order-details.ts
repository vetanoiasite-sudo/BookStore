import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApiRequestError } from '../../core/http/api-error';
import type { OrderDetails, OrderStatus } from '../../core/models/order';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { ConditionLabelPipe } from '../../shared/pipes/condition-label.pipe';
import { OrderStatusLabelPipe } from '../../shared/pipes/order-status.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { UiErrorState, UiSkeleton } from '../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'missing' | 'error';

/** One step of the journey an order takes, as the page draws it. */
interface Step {
  key: string;
  labelKey: string;
  at: string | null;
  done: boolean;
}

/**
 * One order. Everything on the page is a snapshot taken at checkout, so it keeps
 * saying what was bought even after the listing has been archived or its photographs
 * removed.
 *
 * It says nothing about who sold the copies. The order is the only link between the
 * two sides, and each of them sees only their own view of it.
 */
@Component({
  selector: 'app-order-details',
  imports: [
    RouterLink,
    DatePipe,
    TranslatePipe,
    PricePipe,
    ConditionLabelPipe,
    OrderStatusLabelPipe,
    UiSkeleton,
    UiErrorState,
  ],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetailsPage {
  private readonly orders = inject(OrderService);
  private readonly toasts = inject(ToastService);
  private readonly translations = inject(TranslationService);
  private readonly seo = inject(SeoService);

  /** The order number, bound from the route by the router. */
  readonly orderNumber = input.required<string>();

  protected readonly state = signal<PageState>('loading');
  protected readonly order = signal<OrderDetails | null>(null);
  protected readonly busy = signal(false);

  /**
   * The journey, with the dates the platform actually recorded. A cancelled or
   * returned order is not drawn as a half-finished delivery, because it is not one.
   */
  protected readonly steps = computed<Step[]>(() => {
    const order = this.order();

    if (!order || order.status === 'cancelled') {
      return [];
    }

    return [
      { key: 'placed', labelKey: 'orders.step.placed', at: order.placedAt, done: true },
      { key: 'paid', labelKey: 'orders.step.paid', at: order.paidAt, done: !!order.paidAt },
      { key: 'shipped', labelKey: 'orders.step.shipped', at: order.shippedAt, done: !!order.shippedAt },
      {
        key: 'delivered',
        labelKey: 'orders.step.delivered',
        at: order.deliveredAt,
        done: !!order.deliveredAt,
      },
      {
        key: 'completed',
        labelKey: 'orders.step.completed',
        at: order.completedAt,
        done: !!order.completedAt,
      },
    ];
  });

  /** True while the copies are held and nobody has paid for them yet. */
  protected readonly awaitingPayment = computed(
    () => this.order()?.status === ('pendingPayment' satisfies OrderStatus),
  );

  constructor() {
    // Reacting to the input rather than reading it once: following a link from one
    // order to another changes the number without rebuilding the component.
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

    this.orders.get(orderNumber).subscribe({
      next: (order) => {
        this.order.set(order);
        this.state.set('ready');
        this.seo.apply({ title: order.orderNumber, descriptionKey: 'orders.lead' });
      },
      error: (error: unknown) => {
        this.state.set(
          error instanceof ApiRequestError && error.isNotFound ? 'missing' : 'error',
        );
      },
    });
  }

  /**
   * Calls the order off and puts the copies straight back on sale. Only possible
   * while nobody has paid, which is why the button disappears rather than failing.
   */
  protected cancel(order: OrderDetails): void {
    if (!confirm(this.translations.translate('orders.confirmCancel'))) {
      return;
    }

    this.run(this.orders.cancel(order.orderNumber), 'orders.cancelled');
  }

  protected confirmReceipt(order: OrderDetails): void {
    this.run(this.orders.confirmReceipt(order.orderNumber), 'orders.receiptConfirmed');
  }

  private run(action: ReturnType<OrderService['cancel']>, successKey: string): void {
    this.busy.set(true);

    action.subscribe({
      next: (order) => {
        this.busy.set(false);
        this.order.set(order);
        this.toasts.success(successKey);
      },
      error: (error: unknown) => {
        this.busy.set(false);

        if (error instanceof ApiRequestError) {
          this.toasts.failure(error.message);
        } else {
          this.toasts.error('common.error');
        }

        // Whatever was refused, the order has probably moved on since the page was
        // drawn, so it is read again rather than left saying something untrue.
        this.load();
      },
    });
  }
}
