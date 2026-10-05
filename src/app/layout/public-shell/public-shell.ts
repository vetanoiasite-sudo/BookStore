import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { UiToastHost } from '../../shared/ui/toast-host';

/**
 * The storefront frame: header, search, navigation and footer. Every page a visitor
 * can reach without signing in renders inside this shell.
 */
@Component({
  selector: 'public-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, UiToastHost],
  templateUrl: './public-shell.html',
  styleUrl: './public-shell.scss',
})
export class PublicShell {
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthService);
  protected readonly translations = inject(TranslationService);

  /** Both are signals, so the header counts follow a change made anywhere else. */
  protected readonly cart = inject(CartService);
  protected readonly favorites = inject(FavoriteService);

  /**
   * Where the header sends a signed-in reader. Back-office accounts land in the
   * review queue and sellers in their own workspace, because that is what each of
   * them opened the site to do.
   */
  protected readonly workspace = computed(() => {
    if (this.auth.isStaff()) {
      return '/admin/books';
    }

    return this.auth.isMember() ? '/seller' : null;
  });

  /** Whether the mobile navigation drawer is open. */
  protected readonly menuOpen = signal(false);

  /** What is currently typed in the header search box. */
  protected readonly searchTerm = signal('');

  protected readonly currentYear = new Date().getFullYear();

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected async switchLanguage(): Promise<void> {
    await this.translations.toggle();
  }

  /**
   * Runs a search. An empty box navigates to the unfiltered catalogue rather than
   * doing nothing, which is what a reader who has just cleared the field expects.
   */
  protected submitSearch(event: Event): void {
    event.preventDefault();

    const term = this.searchTerm().trim();
    this.closeMenu();

    void this.router.navigate(['/books'], {
      queryParams: term ? { q: term } : {},
    });
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  /**
   * Signs out from the storefront and goes to the sign-in page, so the next person
   * at the machine starts from signing in rather than from a page that was open.
   */
  protected signOut(): void {
    this.closeMenu();
    this.auth.logout().subscribe(() => void this.router.navigate(['/auth/login']));
  }
}
