import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ApiRequestError } from '../../../core/http/api-error';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';

/**
 * Signing in. On success the caller goes back to wherever they were headed when the
 * guard stopped them, and to their own workspace when they arrived here directly.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);

  /** What the server said, when it refused. Already in the reader's language. */
  protected readonly failure = signal<string | null>(null);

  constructor() {
    this.seo.apply({ titleKey: 'auth.signIn', canonicalPath: '/auth/login' });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.failure.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.goOn(),
      error: (error: unknown) => {
        this.submitting.set(false);

        // The server distinguishes a wrong password from a locked account, and that
        // distinction is useful to the person typing. It is passed through as sent.
        this.failure.set(
          error instanceof ApiRequestError ? error.message : 'auth.error.unexpected',
        );
      },
    });
  }

  /**
   * Sends the caller on. A returnUrl is only honoured when it is a path on this
   * site: taking an absolute URL from the query string would turn the sign-in page
   * into an open redirect.
   */
  private goOn(): void {
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    const target = requested?.startsWith('/') && !requested.startsWith('//')
      ? requested
      : this.home();

    void this.router.navigateByUrl(target);
  }

  private home(): string {
    if (this.auth.isStaff()) {
      return '/admin/books';
    }

    return this.auth.isMember() ? '/seller' : '/';
  }
}
