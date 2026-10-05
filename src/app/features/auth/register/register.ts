import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiRequestError } from '../../../core/http/api-error';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';

/**
 * Opening an account. Selling is a checkbox rather than a separate sign-up, because
 * one account both buys and sells and asking someone to choose a side up front would
 * mean a second account later.
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: '../login/login.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translations = inject(TranslationService);
  private readonly seo = inject(SeoService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly submitting = signal(false);

  protected readonly failure = signal<string | null>(null);

  /** Validation messages from the server, keyed by field name. */
  protected readonly fieldErrors = signal<Record<string, string>>({});

  constructor() {
    this.seo.apply({ titleKey: 'auth.register', canonicalPath: '/auth/register' });
  }

  /** A server-side message for one field, when there is one. */
  protected errorFor(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.failure.set(null);
    this.fieldErrors.set({});

    this.auth
      .register({
        ...this.form.getRawValue(),
        preferredLanguage: this.translations.language(),
      })
      .subscribe({
        next: () => {
          // A new seller lands on their own workspace, which is empty and says so;
          // a buyer lands on the catalogue, which is what they came for.
          void this.router.navigateByUrl(this.auth.isMember() ? '/seller' : '/');
        },
        error: (error: unknown) => {
          this.submitting.set(false);

          if (error instanceof ApiRequestError) {
            this.fieldErrors.set(error.fieldErrors);
            this.failure.set(error.message);
            return;
          }

          this.failure.set('auth.error.unexpected');
        },
      });
  }
}
