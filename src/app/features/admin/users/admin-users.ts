import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiRequestError } from '../../../core/http/api-error';
import type { PagedResult } from '../../../core/models/api-response';
import type { AdminUserListItem } from '../../../core/models/back-office';
import { AuthService } from '../../../core/services/auth.service';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiPagination } from '../../../shared/ui/pagination';

/** The roles worth filtering by. */
const ROLES: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'admin.books.filter.all' },
  { value: 'Member', labelKey: 'admin.users.role.member' },
  { value: 'Staff', labelKey: 'admin.users.role.staff' },
  { value: 'Admin', labelKey: 'admin.users.role.admin' },
];

type PageState = 'loading' | 'ready' | 'error';

/**
 * The accounts on the platform.
 *
 * Closing an account is the only thing this screen changes, and it removes nothing:
 * the orders, listings and history of a closed account all stay, because the platform
 * has to be able to answer for them afterwards.
 */
@Component({
  selector: 'app-admin-users',
  imports: [
    DatePipe,
    TranslatePipe,
    UiSkeleton,
    UiEmptyState,
    UiErrorState,
    UiPagination,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers {
  private readonly backOffice = inject(BackOfficeService);
  private readonly toasts = inject(ToastService);
  private readonly translations = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly auth = inject(AuthService);

  protected readonly roles = ROLES;
  protected readonly placeholders = [0, 1, 2, 3, 4, 5];

  protected readonly state = signal<PageState>('loading');
  protected readonly result = signal<PagedResult<AdminUserListItem> | null>(null);
  protected readonly busy = signal<string | null>(null);

  private readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });

  protected readonly role = computed(() => (this.params()['role'] as string | undefined) ?? '');

  protected readonly term = computed(() => (this.params()['q'] as string | undefined) ?? '');

  protected readonly page = computed(() => Number(this.params()['page'] ?? 1) || 1);

  protected readonly isEmpty = computed(
    () => this.state() === 'ready' && (this.result()?.totalCount ?? 0) === 0,
  );

  constructor() {
    this.seo.apply({ titleKey: 'admin.users.title' });
    this.route.queryParams.subscribe(() => this.load());
  }

  protected load(): void {
    this.state.set('loading');

    this.backOffice
      .users({
        role: this.role() || null,
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

  protected changeRole(role: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { role: role || null, page: null },
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

  /**
   * Opens or closes an account. Closing one ends the sessions it already has, so it
   * is confirmed against the person's name rather than against a code.
   */
  protected toggleActive(user: AdminUserListItem): void {
    const key = user.isActive ? 'admin.users.confirmClose' : 'admin.users.confirmReopen';

    if (!confirm(`${user.displayName}\n\n${this.translations.translate(key)}`)) {
      return;
    }

    this.busy.set(user.id);

    this.backOffice.setUserActive(user.id, !user.isActive).subscribe({
      next: () => {
        this.busy.set(null);
        this.toasts.success(user.isActive ? 'admin.users.closed' : 'admin.users.reopened');
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
