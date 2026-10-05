import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiRequestError } from '../../../core/http/api-error';
import type { PagedResult } from '../../../core/models/api-response';
import type { AdminSellerListItem } from '../../../core/models/back-office';
import { AuthService } from '../../../core/services/auth.service';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiPagination } from '../../../shared/ui/pagination';

/** How the list can be narrowed, as one row of chips rather than two menus. */
const FILTERS: { key: string; labelKey: string }[] = [
  { key: '', labelKey: 'admin.books.filter.all' },
  { key: 'verified', labelKey: 'admin.sellers.filter.verified' },
  { key: 'unverified', labelKey: 'admin.sellers.filter.unverified' },
  { key: 'suspended', labelKey: 'admin.sellers.filter.suspended' },
];

type PageState = 'loading' | 'ready' | 'error';

/**
 * The sellers on the platform, and the two decisions the platform makes about them:
 * whether it has checked who they are, and whether they may keep listing.
 *
 * Suspending a seller stops new listings and nothing else. The copies they already
 * have on sale stay on sale, because a buyer with one in a basket has done nothing
 * wrong and a copy already in the warehouse still belongs to somebody.
 */
@Component({
  selector: 'app-admin-sellers',
  imports: [
    DatePipe,
    TranslatePipe,
    UiSkeleton,
    UiEmptyState,
    UiErrorState,
    UiPagination,
  ],
  templateUrl: './admin-sellers.html',
  styleUrl: './admin-sellers.scss',
})
export class AdminSellers {
  private readonly backOffice = inject(BackOfficeService);
  private readonly toasts = inject(ToastService);
  private readonly translations = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly auth = inject(AuthService);

  protected readonly filters = FILTERS;
  protected readonly placeholders = [0, 1, 2, 3];

  protected readonly state = signal<PageState>('loading');
  protected readonly result = signal<PagedResult<AdminSellerListItem> | null>(null);
  protected readonly busy = signal<string | null>(null);

  private readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });

  protected readonly filter = computed(() => {
    const params = this.params();

    if (params['suspended'] === 'true') {
      return 'suspended';
    }

    return (params['show'] as string | undefined) ?? '';
  });

  protected readonly term = computed(() => (this.params()['q'] as string | undefined) ?? '');

  protected readonly page = computed(() => Number(this.params()['page'] ?? 1) || 1);

  protected readonly isEmpty = computed(
    () => this.state() === 'ready' && (this.result()?.totalCount ?? 0) === 0,
  );

  constructor() {
    this.seo.apply({ titleKey: 'admin.sellers.title' });
    this.route.queryParams.subscribe(() => this.load());
  }

  protected load(): void {
    const filter = this.filter();
    this.state.set('loading');

    this.backOffice
      .sellers({
        term: this.term() || null,
        isVerified: filter === 'verified' ? true : filter === 'unverified' ? false : null,
        isSuspended: filter === 'suspended' ? true : null,
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

  protected changeFilter(key: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { show: key || null, suspended: null, page: null },
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

  protected verify(seller: AdminSellerListItem): void {
    this.run(seller, this.backOffice.verifySeller(seller.id), 'admin.sellers.verified');
  }

  /** Suspending needs a reason, because the seller is told it. */
  protected suspend(seller: AdminSellerListItem): void {
    const reason = prompt(
      `${seller.displayName}\n\n${this.translations.translate('admin.sellers.suspendReason')}`,
    );

    if (reason === null || reason.trim().length === 0) {
      return;
    }

    this.run(
      seller,
      this.backOffice.suspendSeller(seller.id, reason.trim()),
      'admin.sellers.suspended',
    );
  }

  protected reinstate(seller: AdminSellerListItem): void {
    this.run(seller, this.backOffice.reinstateSeller(seller.id), 'admin.sellers.reinstated');
  }

  private run(
    seller: AdminSellerListItem,
    action: Observable<unknown>,
    successKey: string,
  ): void {
    this.busy.set(seller.id);

    action.subscribe({
      next: () => {
        this.busy.set(null);
        this.toasts.success(successKey);
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(null);

        if (error instanceof ApiRequestError) {
          this.toasts.failure(error.message);
        } else {
          this.toasts.error('common.error');
        }
      },
    });
  }
}
