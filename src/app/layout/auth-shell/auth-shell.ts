import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ThemeService } from '../../core/services/theme.service';
import { UiToastHost } from '../../shared/ui/toast-host';

/**
 * The frame around signing in and signing up: a hero photo across two thirds of the
 * screen and the form in the remaining third. Deliberately bare otherwise, since the
 * storefront's search and catalogue are not what someone signing in came for.
 */
@Component({
  selector: 'auth-shell',
  imports: [RouterOutlet, RouterLink, TranslatePipe, UiToastHost],
  template: `
    <div class="auth">
      <aside class="auth__visual">
        <img class="auth__photo" [src]="theme.asset('hero/slide-2.webp')" alt="" />

        <a class="auth__brand" routerLink="/" dir="ltr">
          <img
            class="auth__mark"
            [src]="theme.asset('preloader/preloader-logo.svg')"
            alt=""
            width="162"
            height="244"
          />
          <span class="auth__brand-name">Vetanoia Store</span>
        </a>

        <p class="auth__tagline">{{ 'app.tagline' | t }}</p>
      </aside>

      <section class="auth__panel">
        <header class="auth__header">
          <a class="auth__back" routerLink="/">{{ 'auth.backToStorefront' | t }}</a>

          <button
            type="button"
            class="auth__language"
            (click)="switchLanguage()"
            [attr.aria-label]="'nav.languageLabel' | t"
          >
            <img
              class="auth__flag"
              [src]="translations.language() === 'ar' ? 'flags/gb.svg' : 'flags/eg.svg'"
              alt=""
              width="24"
              height="16"
            />
            <span>{{ 'nav.language' | t }}</span>
          </button>
        </header>

        <main class="auth__form">
          <router-outlet />
        </main>
      </section>
    </div>

    <ui-toast-host />
  `,
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  protected readonly translations = inject(TranslationService);
  protected readonly theme = inject(ThemeService);

  protected async switchLanguage(): Promise<void> {
    await this.translations.toggle();
  }
}
