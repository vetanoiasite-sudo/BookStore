import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type {
  BookFilterOptions,
  BookLanguage,
  ConditionGrade,
} from '../../core/models/book';
import { CategoryNamePipe } from '../../shared/pipes/category-name.pipe';
import {
  ConditionLabelPipe,
  LanguageLabelPipe,
} from '../../shared/pipes/condition-label.pipe';

/**
 * What the reader has narrowed the catalogue to, apart from the search term, the
 * category and the ordering. Those three have their own controls elsewhere on the
 * page.
 */
export interface BookFilterSelection {
  author: string | null;
  publisher: string | null;
  language: BookLanguage | null;
  conditions: ConditionGrade[];
  minPrice: number | null;
  maxPrice: number | null;
  minYear: number | null;
  maxYear: number | null;
}

/** Nothing chosen. Used to reset, and as the starting point for a fresh page. */
export const NO_FILTERS: BookFilterSelection = {
  author: null,
  publisher: null,
  language: null,
  conditions: [],
  minPrice: null,
  maxPrice: null,
  minYear: null,
  maxYear: null,
};

/**
 * The filter panel beside the catalogue. It renders the values the server says are
 * worth offering and reports what the reader picked; it does not fetch anything and
 * does not touch the address bar, so the listing stays the one place that decides
 * what is shown.
 */
@Component({
  selector: 'book-filters',
  imports: [
    TranslatePipe,
    CategoryNamePipe,
    ConditionLabelPipe,
    LanguageLabelPipe,
  ],
  templateUrl: './book-filters.html',
  styleUrl: './book-filters.scss',
})
export class BookFilters {
  /** What the server offers, or null while the first panel is still loading. */
  readonly options = input<BookFilterOptions | null>(null);

  readonly selection = input.required<BookFilterSelection>();

  /** Only the filters that changed, so the caller can merge rather than replace. */
  readonly changed = output<Partial<BookFilterSelection>>();

  readonly cleared = output<void>();

  /** Whether the panel is expanded on a narrow screen. */
  protected readonly open = signal(false);

  /**
   * The range boxes are edited before they are applied, so they need somewhere to
   * hold a half-typed value. Linked to the selection so that clearing a filter, or
   * arriving on a shared link, refills the boxes from the address bar.
   */
  protected readonly minPrice = linkedSignal(() => this.selection().minPrice);
  protected readonly maxPrice = linkedSignal(() => this.selection().maxPrice);
  protected readonly minYear = linkedSignal(() => this.selection().minYear);
  protected readonly maxYear = linkedSignal(() => this.selection().maxYear);

  /** How many filters are on, shown beside the toggle on a phone. */
  protected readonly activeCount = computed(() => {
    const selection = this.selection();

    return (
      (selection.author ? 1 : 0) +
      (selection.publisher ? 1 : 0) +
      (selection.language ? 1 : 0) +
      selection.conditions.length +
      (selection.minPrice !== null || selection.maxPrice !== null ? 1 : 0) +
      (selection.minYear !== null || selection.maxYear !== null ? 1 : 0)
    );
  });

  /** Whether there is anything on the panel to show at all. */
  protected readonly hasOptions = computed(() => {
    const options = this.options();

    return (
      options !== null &&
      (options.authors.length > 0 ||
        options.publishers.length > 0 ||
        options.languages.length > 1 ||
        options.conditions.length > 0 ||
        options.price != null ||
        options.years != null)
    );
  });

  protected toggleOpen(): void {
    this.open.update((open) => !open);
  }

  /** Choosing the value already chosen clears it, which is what a second tap means. */
  protected chooseAuthor(slug: string): void {
    this.changed.emit({ author: this.selection().author === slug ? null : slug });
  }

  protected choosePublisher(slug: string): void {
    this.changed.emit({ publisher: this.selection().publisher === slug ? null : slug });
  }

  protected chooseLanguage(language: BookLanguage): void {
    this.changed.emit({
      language: this.selection().language === language ? null : language,
    });
  }

  /** Conditions are a multiple choice: each one is added to or taken off the list. */
  protected toggleCondition(grade: ConditionGrade): void {
    const current = this.selection().conditions;

    this.changed.emit({
      conditions: current.includes(grade)
        ? current.filter((value) => value !== grade)
        : [...current, grade],
    });
  }

  protected isChosen(grade: ConditionGrade): boolean {
    return this.selection().conditions.includes(grade);
  }

  /**
   * Applies both range boxes at once. A range is only meaningful once both ends are
   * settled, so it waits for the button rather than reloading on every keystroke.
   */
  protected applyPrice(): void {
    const [min, max] = order(this.minPrice(), this.maxPrice());
    this.minPrice.set(min);
    this.maxPrice.set(max);
    this.changed.emit({ minPrice: min, maxPrice: max });
  }

  protected applyYears(): void {
    const [min, max] = order(this.minYear(), this.maxYear());
    this.minYear.set(min);
    this.maxYear.set(max);
    this.changed.emit({ minYear: min, maxYear: max });
  }

  protected clearAll(): void {
    this.cleared.emit();
  }

  /** Reads a number box, treating an emptied one as no bound rather than as zero. */
  protected read(event: Event): number | null {
    const value = (event.target as HTMLInputElement).value.trim();
    if (value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

/**
 * Puts a range the right way round. Someone who types the larger number into the
 * first box means the range between them, not an empty one.
 */
function order(min: number | null, max: number | null): [number | null, number | null] {
  return min !== null && max !== null && min > max ? [max, min] : [min, max];
}
