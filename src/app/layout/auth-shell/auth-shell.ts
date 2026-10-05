import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { UiToastHost } from '../../shared/ui/toast-host';

/**
 * The frame around signing in and signing up. Deliberately bare: the storefront
 * header offers a search box and a catalogue, and neither is what someone in the
 * middle of signing in came for.
 */
@Component({
  selector: 'auth-shell',
  imports: [RouterOutlet, RouterLink, TranslatePipe, UiToastHost],
  template: `
    <div class="auth">
      <header class="auth__header">
        <a class="auth__brand" routerLink="/">{{ 'app.name' | t }}</a>

        <button
          type="button"
          class="auth__language"
          (click)="switchLanguage()"
          [attr.aria-label]="'nav.languageLabel' | t"
        >
          {{ 'nav.language' | t }}
        </button>
      </header>

      <main class="auth__card">
        <router-outlet />
      </main>

      <p class="auth__back">
        <a routerLink="/">{{ 'auth.backToStorefront' | t }}</a>
      </p>
    </div>

    <ui-toast-host />
  `,
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  private readonly translations = inject(TranslationService);

  protected async switchLanguage(): Promise<void> {
    await this.translations.toggle();
  }
}
