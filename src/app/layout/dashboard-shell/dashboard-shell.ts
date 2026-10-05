import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { AuthService } from '../../core/services/auth.service';
import { UiToastHost } from '../../shared/ui/toast-host';

/** One entry in the sidebar. */
interface NavItem {
  path: string;
  labelKey: string;
  exact: boolean;
}

/**
 * The frame around every signed-in workspace, for sellers and for the back office
 * alike. One shell rather than two: the two roles do different work but navigate it
 * the same way, and a second copy would drift.
 */
@Component({
  selector: 'dashboard-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, UiToastHost],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.scss',
})
export class DashboardShell {
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthService);
  protected readonly translations = inject(TranslationService);

  /** Whether the sidebar is open on a narrow screen. */
  protected readonly menuOpen = signal(false);

  /**
   * The sidebar. Built from what the caller may actually do, so a seller is never
   * shown a review queue they would be turned away from.
   */
  protected readonly items = computed<NavItem[]>(() => {
    const items: NavItem[] = [];

    if (this.auth.isMember()) {
      items.push(
        { path: '/seller', labelKey: 'seller.nav.dashboard', exact: true },
        { path: '/seller/books', labelKey: 'seller.nav.books', exact: true },
        { path: '/seller/books/new', labelKey: 'seller.nav.addBook', exact: true },
      );
    }

    if (this.auth.isStaff()) {
      items.push(
        { path: '/admin', labelKey: 'admin.nav.dashboard', exact: true },
        { path: '/admin/books', labelKey: 'admin.nav.review', exact: true },
        { path: '/admin/books/all', labelKey: 'admin.nav.allBooks', exact: true },
        { path: '/admin/orders', labelKey: 'admin.nav.orders', exact: false },
        { path: '/admin/inventory', labelKey: 'admin.nav.inventory', exact: true },
        { path: '/admin/users', labelKey: 'admin.nav.users', exact: true },
        { path: '/admin/sellers', labelKey: 'admin.nav.sellers', exact: true },
        { path: '/admin/reports', labelKey: 'admin.nav.reports', exact: true },
      );
    }

    // The category tree shapes the whole catalogue, the trail names every member of
    // staff who has touched anything, and the settings say how the platform runs.
    // None of them is day-to-day work.
    if (this.auth.isAdmin()) {
      items.push(
        { path: '/admin/categories', labelKey: 'admin.nav.categories', exact: true },
        { path: '/admin/audit-logs', labelKey: 'admin.nav.audit', exact: true },
        { path: '/admin/settings', labelKey: 'admin.nav.settings', exact: true },
      );
    }

    return items;
  });

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.displayName ?? '';
    return name.trim().charAt(0) || '?';
  });

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected async switchLanguage(): Promise<void> {
    await this.translations.toggle();
  }

  protected signOut(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/auth/login']));
  }
}
