import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * A placeholder shaped like the content it stands in for. Shown while a request is
 * in flight so the page does not jump when the real content arrives.
 */
@Component({
  selector: 'ui-skeleton',
  imports: [],
  template: `<span class="skeleton" [style.width]="width()" [style.height]="height()" aria-hidden="true"></span>`,
  styles: [
    `
      .skeleton {
        display: block;
        border-radius: var(--bs-radius-sm);
        background: linear-gradient(
          90deg,
          var(--bs-surface-muted) 25%,
          var(--bs-border) 37%,
          var(--bs-surface-muted) 63%
        );
        background-size: 400% 100%;
        animation: skeleton-shimmer 1.4s ease infinite;
      }

      @keyframes skeleton-shimmer {
        from {
          background-position: 100% 50%;
        }
        to {
          background-position: 0 50%;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .skeleton {
          animation: none;
        }
      }
    `,
  ],
})
export class UiSkeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
}

/**
 * Shown when a request succeeded but there is nothing to display. Deliberately not
 * an error: an empty result is a normal outcome and should read like one.
 */
@Component({
  selector: 'ui-empty-state',
  imports: [TranslatePipe],
  template: `
    <div class="state" role="status">
      <div class="state__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 12h14a4 4 0 0 1 4 4v22a4 4 0 0 0-4-4H8z" />
          <path d="M40 12H26a4 4 0 0 0-4 4v22a4 4 0 0 1 4-4h14z" />
        </svg>
      </div>
      <h2 class="state__title">{{ title() | t }}</h2>
      @if (text()) {
        <p class="state__text">{{ text()! | t }}</p>
      }
      @if (actionLabel()) {
        <button type="button" class="state__action" (click)="action.emit()">
          {{ actionLabel()! | t }}
        </button>
      }
    </div>
  `,
  styleUrl: './state-views.scss',
})
export class UiEmptyState {
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();
}

/**
 * Shown when a request failed. Separate from the empty state because the reader
 * needs a different thing from it: a way to try again.
 */
@Component({
  selector: 'ui-error-state',
  imports: [TranslatePipe],
  template: `
    <div class="state state--error" role="alert">
      <div class="state__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="24" cy="24" r="18" />
          <path d="M24 15v12" stroke-linecap="round" />
          <circle cx="24" cy="33" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <h2 class="state__title">{{ title() | t }}</h2>
      @if (text()) {
        <p class="state__text">{{ text()! | t }}</p>
      }
      <button type="button" class="state__action" (click)="retry.emit()">
        {{ 'common.retry' | t }}
      </button>
    </div>
  `,
  styleUrl: './state-views.scss',
})
export class UiErrorState {
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
  readonly retry = output<void>();
}
