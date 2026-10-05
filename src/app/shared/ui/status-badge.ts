import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { BookStatus } from '../../core/models/seller';

/** Which colour a status is drawn in, grouped by what it means for the reader. */
const TONES: Record<BookStatus, string> = {
  draft: 'neutral',
  pendingReview: 'waiting',
  approved: 'waiting',
  rejected: 'danger',
  waitingForDelivery: 'waiting',
  received: 'info',
  available: 'success',
  reserved: 'info',
  sold: 'success',
  returned: 'danger',
  archived: 'neutral',
};

/**
 * A book status, shown the same way everywhere it appears. The label goes through
 * the dictionary rather than being written into a template, so a status reads the
 * same in the seller's list, the review queue and the timeline.
 */
@Component({
  selector: 'ui-status-badge',
  imports: [TranslatePipe],
  template: `
    <span class="badge badge--{{ tone() }}">{{ 'bookStatus.' + status() | t }}</span>
  `,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 0.15rem var(--bs-space-3);
        border-radius: var(--bs-radius-pill);
        font-size: var(--bs-text-xs);
        font-weight: 600;
        white-space: nowrap;
      }

      .badge--neutral { background: var(--bs-surface-muted); color: var(--bs-text-muted); }
      .badge--waiting { background: #fbf1dc; color: var(--bs-warning); }
      .badge--info { background: #e3edf3; color: var(--bs-info); }
      .badge--success { background: var(--bs-primary-soft); color: var(--bs-primary); }
      .badge--danger { background: #f6e3e1; color: var(--bs-danger); }
    `,
  ],
})
export class UiStatusBadge {
  readonly status = input.required<BookStatus>();

  protected readonly tone = computed(() => TONES[this.status()] ?? 'neutral');
}
