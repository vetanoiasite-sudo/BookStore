import { Component, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApiRequestError } from '../../core/http/api-error';
import type { Address, SaveAddressRequest } from '../../core/models/order';
import { AddressService } from '../../core/services/address.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { AddressForm } from '../../shared/ui/address-form';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'error';

/**
 * The buyer's delivery addresses. One of them is always the default, which is what
 * checkout pre-selects, so the common case is a purchase that needs no decision here
 * at all.
 */
@Component({
  selector: 'app-addresses',
  imports: [TranslatePipe, AddressForm, UiSkeleton, UiEmptyState, UiErrorState],
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss',
})
export class Addresses {
  private readonly addresses = inject(AddressService);
  private readonly toasts = inject(ToastService);
  private readonly translations = inject(TranslationService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<PageState>('loading');
  protected readonly items = signal<Address[]>([]);

  /** The address being edited, or null when the form is adding a new one. */
  protected readonly editing = signal<Address | null>(null);

  /** Whether the form is open at all. */
  protected readonly formOpen = signal(false);

  protected readonly saving = signal(false);

  /** The address a row action is working on, so only that row looks busy. */
  protected readonly busy = signal<string | null>(null);

  protected readonly placeholders = [0, 1];

  constructor() {
    this.seo.apply({ titleKey: 'address.title', descriptionKey: 'address.lead' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.addresses.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected add(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected edit(address: Address): void {
    this.editing.set(address);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected save(request: SaveAddressRequest): void {
    const editing = this.editing();
    this.saving.set(true);

    const action = editing
      ? this.addresses.update(editing.id, request)
      : this.addresses.create(request);

    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.toasts.success(editing ? 'address.saved' : 'address.added');
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.report(error);
      },
    });
  }

  protected makeDefault(address: Address): void {
    this.run(address, this.addresses.makeDefault(address.id), 'address.defaultSet');
  }

  /**
   * Removes an address from the list. Past orders keep the copy they were shipped
   * to, so nothing that has already happened changes; the confirmation is about the
   * list, not about history.
   */
  protected remove(address: Address): void {
    if (!confirm(`${address.label}\n\n${this.translations.translate('address.confirmDelete')}`)) {
      return;
    }

    this.run(address, this.addresses.remove(address.id), 'address.removed');
  }

  private run(address: Address, action: Observable<unknown>, successKey: string): void {
    this.busy.set(address.id);

    action.subscribe({
      next: () => {
        this.busy.set(null);
        this.toasts.success(successKey);
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(null);
        this.report(error);
      },
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
