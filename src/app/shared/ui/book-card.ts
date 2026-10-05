import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ApiRequestError } from '../../core/http/api-error';
import type { BookListItem } from '../../core/models/book';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { ToastService } from '../../core/services/toast.service';
import { CategoryNamePipe } from '../pipes/category-name.pipe';
import { ConditionLabelPipe } from '../pipes/condition-label.pipe';
import { PricePipe } from '../pipes/price.pipe';
import { UiSkeleton } from './state-views';

/**
 * One copy in a grid. The body of the card is a single link, so the tap target on a
 * phone is the card rather than a small piece of text inside it.
 *
 * The heart sits outside that link rather than inside it: a button nested in an
 * anchor is neither valid markup nor reliably operable by a keyboard, and saving a
 * book must not also open it.
 */
@Component({
  selector: 'book-card',
  imports: [RouterLink, TranslatePipe, PricePipe, ConditionLabelPipe, CategoryNamePipe],
  template: `
    <article class="card" [class.card--gone]="unavailable()">
      <a class="card__link" [routerLink]="['/books', book().urlSegment]">
        <div class="card__cover">
          @if (book().coverImageUrl; as cover) {
            <img
              class="card__image"
              [src]="cover"
              [alt]="book().title"
              loading="lazy"
              decoding="async"
              width="600"
              height="900"
            />
          } @else {
            <div class="card__cover-fallback" aria-hidden="true">
              <span>{{ book().title.charAt(0) }}</span>
            </div>
          }

          <span class="card__condition">{{ book().condition | conditionLabel }}</span>

          @if (unavailable()) {
            <span class="card__gone">{{ 'book.soldOut' | t }}</span>
          }
        </div>

        <div class="card__body">
          <p class="card__category">
            {{ book().categoryNameAr | categoryName: book().categoryNameEn }}
          </p>
          <h3 class="card__title">{{ book().title }}</h3>
          <p class="card__author">{{ book().authorName ?? ('book.unknown' | t) }}</p>
          <p class="card__price">{{ book().price | price: book().currency }}</p>
        </div>
      </a>

      @if (auth.isMember()) {
        <button
          type="button"
          class="card__save"
          [class.card__save--on]="saved()"
          [disabled]="busy()"
          [attr.aria-pressed]="saved()"
          [attr.aria-label]="(saved() ? 'favorites.remove' : 'favorites.add') | t"
          [attr.title]="(saved() ? 'favorites.remove' : 'favorites.add') | t"
          (click)="toggleSaved()"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path
              d="M12 20.5 4.6 13.3a4.7 4.7 0 0 1 0-6.6 4.5 4.5 0 0 1 6.5 0l.9.9.9-.9a4.5 4.5 0 0 1 6.5 0 4.7 4.7 0 0 1 0 6.6z"
              [attr.fill]="saved() ? 'currentColor' : 'none'"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      }
    </article>
  `,
  styleUrl: './book-card.scss',
})
export class BookCard {
  private readonly favorites = inject(FavoriteService);
  private readonly toasts = inject(ToastService);

  protected readonly auth = inject(AuthService);

  readonly book = input.required<BookListItem>();

  /** Draws the card as a copy that can no longer be bought. */
  readonly unavailable = input(false);

  /** Raised after the reader takes the book off their saved list. */
  readonly unsaved = output<string>();

  protected readonly busy = signal(false);

  protected readonly saved = computed(() => this.favorites.isSaved(this.book().publicId));

  protected toggleSaved(): void {
    const publicId = this.book().publicId;
    const wasSaved = this.saved();

    this.busy.set(true);

    this.favorites.toggle(publicId).subscribe({
      next: () => {
        this.busy.set(false);

        if (wasSaved) {
          this.unsaved.emit(publicId);
        }
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toasts.failure(
          error instanceof ApiRequestError ? error.message : 'common.error',
        );
      },
    });
  }
}

/** The card's own shape, shown while a page of results is loading. */
@Component({
  selector: 'book-card-skeleton',
  imports: [UiSkeleton],
  template: `
    <article class="card card--skeleton" aria-hidden="true">
      <ui-skeleton height="100%" />
      <div class="card__body">
        <ui-skeleton width="40%" height="0.75rem" />
        <ui-skeleton width="85%" height="1.1rem" />
        <ui-skeleton width="60%" height="0.9rem" />
        <ui-skeleton width="35%" height="1.1rem" />
      </div>
    </article>
  `,
  styleUrl: './book-card.scss',
})
export class BookCardSkeleton {}
