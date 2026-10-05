import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Page controls for a list. It shows a window of page numbers around the current
 * one rather than every page, so a catalogue of a thousand books still fits on a
 * phone.
 */
@Component({
  selector: 'ui-pagination',
  imports: [TranslatePipe],
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" [attr.aria-label]="'pagination.page' | t: { page: page(), total: totalPages() }">
        <button
          type="button"
          class="pagination__step"
          [disabled]="page() <= 1"
          (click)="goTo(page() - 1)"
        >
          <span aria-hidden="true">‹</span>
          {{ 'pagination.previous' | t }}
        </button>

        <ul class="pagination__pages">
          @for (entry of pages(); track entry.key) {
            @if (entry.number === null) {
              <li class="pagination__gap" aria-hidden="true">…</li>
            } @else {
              <li>
                <button
                  type="button"
                  class="pagination__page"
                  [class.pagination__page--current]="entry.number === page()"
                  [attr.aria-current]="entry.number === page() ? 'page' : null"
                  [attr.aria-label]="'pagination.goToPage' | t: { page: entry.number }"
                  (click)="goTo(entry.number)"
                >
                  {{ entry.number }}
                </button>
              </li>
            }
          }
        </ul>

        <button
          type="button"
          class="pagination__step"
          [disabled]="page() >= totalPages()"
          (click)="goTo(page() + 1)"
        >
          {{ 'pagination.next' | t }}
          <span aria-hidden="true">›</span>
        </button>
      </nav>
    }
  `,
  styleUrl: './pagination.scss',
})
export class UiPagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  /** How many numbers to show on each side of the current page. */
  private static readonly Window = 1;

  /** The numbers to render, with nulls standing for the gaps. */
  protected readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.page();

    const wanted = new Set<number>([1, total, current]);

    for (let offset = 1; offset <= UiPagination.Window; offset++) {
      wanted.add(current - offset);
      wanted.add(current + offset);
    }

    const numbers = [...wanted]
      .filter((value) => value >= 1 && value <= total)
      .sort((first, second) => first - second);

    const entries: { key: string; number: number | null }[] = [];
    let previous = 0;

    for (const number of numbers) {
      if (number - previous > 1) {
        entries.push({ key: `gap-${number}`, number: null });
      }
      entries.push({ key: `page-${number}`, number });
      previous = number;
    }

    return entries;
  });

  protected goTo(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) {
      this.pageChange.emit(page);
    }
  }
}
