import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ApiRequestError } from '../../core/http/api-error';
import type { CartLine } from '../../core/models/cart';
import { CartService } from '../../core/services/cart.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CategoryNamePipe } from '../../shared/pipes/category-name.pipe';
import { ConditionLabelPipe } from '../../shared/pipes/condition-label.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'error';

/**
 * The basket. It lists physical copies rather than products, so there is no quantity
 * anywhere on the page: each line is one book, and the only thing to do with a line
 * is keep it or take it out.
 *
 * Nothing here is held for the buyer. A copy is reserved at checkout and not before,
 * which is why the page re-reads the basket every time it opens and says plainly when
 * something in it has been sold or repriced since it went in.
 */
@Component({
  selector: 'app-cart',
  imports: [
    RouterLink,
    TranslatePipe,
    PricePipe,
    ConditionLabelPipe,
    CategoryNamePipe,
    UiSkeleton,
    UiEmptyState,
    UiErrorState,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private readonly cart = inject(CartService);
  private readonly toasts = inject(ToastService);
  private readonly translations = inject(TranslationService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<PageState>('loading');

  /** The copy being taken out, so only its own button shows as busy. */
  protected readonly removing = signal<string | null>(null);

  protected readonly clearing = signal(false);

  /** The basket itself, shared with the header count. */
  protected readonly view = this.cart.cart;

  /** Placeholder rows while the basket loads. */
  protected readonly placeholders = [0, 1, 2];

  constructor() {
    this.seo.apply({ titleKey: 'cart.title', descriptionKey: 'cart.lead' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.cart.load().subscribe({
      next: () => this.state.set('ready'),
      error: () => this.state.set('error'),
    });
  }

  protected remove(line: CartLine): void {
    this.removing.set(line.book.publicId);

    this.cart.remove(line.book.publicId).subscribe({
      next: () => {
        this.removing.set(null);
        this.toasts.success('cart.removed');
      },
      error: (error: unknown) => {
        this.removing.set(null);
        this.report(error);
      },
    });
  }

  /**
   * Empties the basket. Adding the copies back is easy, but it is not obvious that
   * it is, so this asks first. The browser dialog is deliberate until the platform
   * has a dialog of its own: it cannot be missed and it needs no focus management.
   */
  protected clear(): void {
    if (!confirm(this.translations.translate('cart.confirmClear'))) {
      return;
    }

    this.clearing.set(true);

    this.cart.clear().subscribe({
      next: () => {
        this.clearing.set(false);
        this.toasts.success('cart.cleared');
      },
      error: (error: unknown) => {
        this.clearing.set(false);
        this.report(error);
      },
    });
  }

  /** The server says which rule was broken, and that is more use than anything here. */
  private report(error: unknown): void {
    if (error instanceof ApiRequestError) {
      this.toasts.failure(error.message);
    } else {
      this.toasts.error('common.error');
    }
  }
}
