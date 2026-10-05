import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ApiRequestError } from '../../core/http/api-error';
import type { Address, SaveAddressRequest } from '../../core/models/order';
import { AddressService } from '../../core/services/address.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { AddressForm } from '../../shared/ui/address-form';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { UiErrorState, UiSkeleton } from '../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'error';

/**
 * Checkout: where a basket becomes an order and the copies stop being available to
 * anybody else.
 *
 * The page asks for one decision — where the parcel goes — and shows exactly what is
 * about to be bought beside it. It is deliberately not a wizard: there are two things
 * to look at, and hiding one behind a step would only make the reader click.
 *
 * Losing a race for a copy is an ordinary outcome here rather than an error, because
 * every listing is a single physical book. The server says which rule was broken and
 * the basket is reloaded, so the reader sees the truth rather than a stale page.
 */
@Component({
  selector: 'app-checkout',
  imports: [
    RouterLink,
    TranslatePipe,
    PricePipe,
    AddressForm,
    UiSkeleton,
    UiErrorState,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly addresses = inject(AddressService);
  private readonly orders = inject(OrderService);
  private readonly cartService = inject(CartService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<PageState>('loading');
  protected readonly saved = signal<Address[]>([]);
  protected readonly selectedId = signal<string | null>(null);

  /** Whether the new-address form is open. It opens itself when there are none. */
  protected readonly formOpen = signal(false);

  protected readonly savingAddress = signal(false);
  protected readonly placing = signal(false);

  /** The basket, shared with the header count and the basket page. */
  protected readonly cart = this.cartService.cart;

  protected readonly placeholders = [0, 1];

  /** Nothing can be ordered while a copy in the basket has been sold to someone else. */
  protected readonly blocked = computed(() => {
    const cart = this.cart();
    return !cart || cart.itemCount === 0 || cart.hasUnavailableItems;
  });

  constructor() {
    this.seo.apply({ titleKey: 'checkout.title', descriptionKey: 'checkout.lead' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.cartService.load().subscribe({
      next: () => this.loadAddresses(),
      error: () => this.state.set('error'),
    });
  }

  protected select(address: Address): void {
    this.selectedId.set(address.id);
  }

  protected openForm(): void {
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  /** Saves a new address and selects it, because that is why it was being typed. */
  protected saveAddress(request: SaveAddressRequest): void {
    this.savingAddress.set(true);

    this.addresses.create(request).subscribe({
      next: (address) => {
        this.savingAddress.set(false);
        this.formOpen.set(false);
        this.saved.update((current) => [...current, address]);
        this.selectedId.set(address.id);
        this.toasts.success('address.added');
      },
      error: (error: unknown) => {
        this.savingAddress.set(false);
        this.report(error);
      },
    });
  }

  protected place(): void {
    const addressId = this.selectedId();

    if (!addressId || this.blocked()) {
      return;
    }

    this.placing.set(true);

    this.orders.place(addressId).subscribe({
      next: (order) => {
        this.placing.set(false);
        this.toasts.success('checkout.placed');
        void this.router.navigate(['/orders', order.orderNumber]);
      },
      error: (error: unknown) => {
        this.placing.set(false);
        this.report(error);

        // Whatever went wrong, the basket is the thing that may have changed
        // underneath the page, so it is read again rather than left as it was.
        this.cartService.load().subscribe({ error: () => undefined });
      },
    });
  }

  private loadAddresses(): void {
    this.addresses.list().subscribe({
      next: (addresses) => {
        this.saved.set(addresses);

        // The default is pre-selected, so the common purchase needs no decision at
        // all. A buyer with no addresses is shown the form rather than an empty list.
        this.selectedId.set(addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? null);
        this.formOpen.set(addresses.length === 0);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  private report(error: unknown): void {
    if (error instanceof ApiRequestError) {
      this.toasts.failure(error.message);
    } else {
      this.toasts.error('common.error');
    }
  }
}
