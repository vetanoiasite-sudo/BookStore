import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * One number on a dashboard, with what it counts underneath it. A card that names a
 * route becomes a link, because a count someone cares about is nearly always a count
 * they want to open.
 */
@Component({
  selector: 'ui-stat-card',
  imports: [RouterLink, TranslatePipe],
  template: `
    @if (link(); as target) {
      <a class="stat stat--link" [routerLink]="target" [queryParams]="queryParams()">
        <span class="stat__value">{{ value() }}</span>
        <span class="stat__label">{{ label() | t }}</span>
      </a>
    } @else {
      <div class="stat">
        <span class="stat__value">{{ value() }}</span>
        <span class="stat__label">{{ label() | t }}</span>
      </div>
    }
  `,
  styles: [
    `
      .stat {
        display: flex;
        flex-direction: column;
        gap: var(--bs-space-1);
        padding: var(--bs-space-4);
        border: 1px solid var(--bs-border);
        border-radius: var(--bs-radius-md);
        background: var(--bs-surface);
      }

      .stat--link {
        color: inherit;
        transition: border-color var(--bs-transition);
      }

      .stat--link:hover {
        border-color: var(--bs-primary);
        text-decoration: none;
      }

      .stat__value {
        font-size: var(--bs-text-2xl);
        font-weight: 700;
        line-height: 1.1;
        color: var(--bs-primary);
      }

      .stat__label {
        font-size: var(--bs-text-sm);
        color: var(--bs-text-muted);
      }
    `,
  ],
})
export class UiStatCard {
  readonly value = input.required<number | string>();

  /** Translation key describing what the number counts. */
  readonly label = input.required<string>();

  /** Where the card leads, when the count is worth opening. */
  readonly link = input<string | null>(null);

  readonly queryParams = input<Record<string, string | number> | null>(null);
}
