import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ConditionLabelPipe } from '../../../shared/pipes/condition-label.pipe';
import { ApiRequestError } from '../../../core/http/api-error';
import type { BookLanguage, ConditionGrade } from '../../../core/models/book';
import type { CategoryNode } from '../../../core/models/category';
import type { SellerBookDetails } from '../../../core/models/seller';
import { CategoryService } from '../../../core/services/category.service';
import { SellerService } from '../../../core/services/seller.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiStatusBadge } from '../../../shared/ui/status-badge';

/**
 * A category as the select shows it. The label already carries its indentation,
 * because a native option cannot be styled and the nesting is what tells a seller
 * that "Novels" sits under "Literature".
 */
interface CategoryOption {
  slug: string;
  label: string;
}

/** The grades a seller can choose from, worst last. */
const GRADES: ConditionGrade[] = ['new', 'likeNew', 'veryGood', 'good', 'acceptable', 'poor'];

/** The languages the platform lists books in. */
const LANGUAGES: BookLanguage[] = ['arabic', 'english', 'french', 'german', 'turkish', 'other'];

type State = 'loading' | 'ready' | 'error';

/**
 * The one form a seller fills in about a copy, used both to start a draft and to
 * correct one that came back rejected.
 *
 * Photographs are only offered once the draft exists, because a file has to be
 * attached to something. Creating the draft therefore navigates to its own address,
 * which also means a half-finished listing survives a closed tab.
 */
@Component({
  selector: 'app-book-form',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ConditionLabelPipe,
    UiErrorState,
    UiSkeleton,
    UiStatusBadge,
  ],
  templateUrl: './book-form.html',
  styleUrl: './book-form.scss',
})
export class BookForm implements OnInit {
  /** The book code from the route. Absent when starting a new listing. */
  readonly publicId = input<string | undefined>(undefined);

  private readonly seller = inject(SellerService);
  private readonly categories = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly translations = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly builder = inject(FormBuilder);

  protected readonly grades = GRADES;
  protected readonly languages = LANGUAGES;

  protected readonly state = signal<State>('loading');
  protected readonly book = signal<SellerBookDetails | null>(null);
  protected readonly options = signal<CategoryOption[]>([]);

  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly recognising = signal(false);

  /** Validation messages from the server, keyed by the field they belong to. */
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly isNew = computed(() => !this.publicId());

  /** True while the listing is still the seller's to change. */
  protected readonly editable = computed(() => this.isNew() || (this.book()?.isEditable ?? false));

  protected readonly canSubmit = computed(() => this.book()?.canSubmit ?? false);

  protected readonly form = this.builder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(300)]],
    categorySlug: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(1)]],
    language: ['arabic' as BookLanguage, [Validators.required]],
    authorName: [''],
    publisherName: [''],
    isbn: [''],
    publicationYear: [null as number | null],
    pageCount: [null as number | null],
    description: [''],
    condition: this.builder.nonNullable.group({
      grade: ['veryGood' as ConditionGrade],
      coverCondition: ['veryGood' as ConditionGrade],
      pagesCondition: ['veryGood' as ConditionGrade],
      hasWritingInside: [false],
      hasHighlighting: [false],
      hasTornPages: [false],
      hasMissingPages: [false],
      hasYellowing: [false],
      otherDamage: [''],
      notes: [''],
    }),
  });

  /**
   * The book code arrives as a route input, and inputs are set after the constructor
   * runs. Loading from here is what tells an edit apart from a new listing; doing it
   * in the constructor would read an empty code and always start a new one.
   */
  ngOnInit(): void {
    this.seo.apply({ titleKey: 'seller.form.title' });
    this.loadCategories();
    this.load();
  }

  /** A server-side message for one field, when there is one. */
  protected errorFor(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  protected load(): void {
    const code = this.publicId();

    if (!code) {
      this.state.set('ready');
      return;
    }

    this.state.set('loading');

    this.seller.get(code).subscribe({
      next: (book) => {
        this.book.set(book);
        this.fill(book);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.fieldErrors.set({});

    const request = this.toRequest();
    const code = this.publicId();

    const action = code
      ? this.seller.update(code, request)
      : this.seller.create(request);

    action.subscribe({
      next: (book) => {
        this.saving.set(false);
        this.book.set(book);
        this.toasts.success(code ? 'seller.form.saved' : 'seller.form.created');

        // A new draft moves to its own address, which is where photographs can be
        // attached and where a reload will bring the seller back to.
        if (!code) {
          void this.router.navigate(['/seller/books', book.publicId]);
        }
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  /** Sends the listing for review, or sends it again after a rejection. */
  protected submitForReview(): void {
    const code = this.publicId();

    if (!code || this.saving()) {
      return;
    }

    this.saving.set(true);

    this.seller.submit(code).subscribe({
      next: (book) => {
        this.saving.set(false);
        this.book.set(book);
        this.toasts.success('seller.books.submitted');
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected addPhotograph(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const code = this.publicId();

    if (!file || !code) {
      return;
    }

    this.uploading.set(true);

    // The first photograph is the cover, and the rest are extra views. A seller
    // uploading a second cover is replacing the first, which the server handles.
    const type = (this.book()?.images.length ?? 0) === 0 ? 'cover' : 'other';

    this.seller.uploadImage(code, file, type, this.form.controls.title.value).subscribe({
      next: () => {
        this.uploading.set(false);
        input.value = '';
        this.reload();
      },
      error: (error: unknown) => {
        this.uploading.set(false);
        input.value = '';
        this.fail(error);
      },
    });
  }

  protected removePhotograph(imageId: string): void {
    const code = this.publicId();

    if (!code) {
      return;
    }

    this.seller.removeImage(code, imageId).subscribe({
      next: () => this.reload(),
      error: (error: unknown) => this.fail(error),
    });
  }

  /**
   * Reads a photograph of the cover and fills in what it recognised. Every field it
   * suggests is left editable and nothing is saved: the seller is the one who knows
   * which edition is in their hands.
   */
  protected recognise(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.recognising.set(true);

    this.seller.recognize(file).subscribe({
      next: (result) => {
        this.recognising.set(false);
        input.value = '';

        this.form.patchValue({
          title: result.title ?? this.form.controls.title.value,
          authorName: result.authorName ?? this.form.controls.authorName.value,
          publisherName: result.publisherName ?? this.form.controls.publisherName.value,
          isbn: result.isbn ?? this.form.controls.isbn.value,
          publicationYear: result.publicationYear ?? this.form.controls.publicationYear.value,
        });

        this.toasts.info('seller.form.recognised');
      },
      error: (error: unknown) => {
        this.recognising.set(false);
        input.value = '';
        this.fail(error);
      },
    });
  }

  /** The category name in the reader's language. */
  private label(node: CategoryNode): string {
    return this.translations.language() === 'ar' ? node.nameAr : node.nameEn;
  }

  private loadCategories(): void {
    this.categories.tree().subscribe({
      next: (tree) => this.options.set(this.flatten(tree, 0)),
      error: () => this.options.set([]),
    });
  }

  /** Turns the tree into a flat list the select can render, keeping the shape visible. */
  private flatten(nodes: CategoryNode[], depth: number): CategoryOption[] {
    const indent = '  '.repeat(depth);

    return nodes.flatMap((node) => [
      { slug: node.slug, label: `${indent}${this.label(node)}` },
      ...this.flatten(node.children, depth + 1),
    ]);
  }

  private fill(book: SellerBookDetails): void {
    this.form.patchValue({
      title: book.title,
      categorySlug: book.categorySlug,
      price: book.price,
      language: book.language,
      authorName: book.authorName ?? '',
      publisherName: book.publisherName ?? '',
      isbn: book.isbn ?? '',
      publicationYear: book.publicationYear,
      pageCount: book.pageCount,
      description: book.description ?? '',
      condition: {
        grade: book.condition.grade,
        coverCondition: book.condition.coverCondition,
        pagesCondition: book.condition.pagesCondition,
        hasWritingInside: book.condition.hasWritingInside,
        hasHighlighting: book.condition.hasHighlighting,
        hasTornPages: book.condition.hasTornPages,
        hasMissingPages: book.condition.hasMissingPages,
        hasYellowing: book.condition.hasYellowing,
        otherDamage: book.condition.otherDamage ?? '',
        notes: book.condition.notes ?? '',
      },
    });

    if (!book.isEditable) {
      this.form.disable({ emitEvent: false });
    }
  }

  private toRequest() {
    const value = this.form.getRawValue();

    return {
      title: value.title.trim(),
      categorySlug: value.categorySlug,
      price: Number(value.price),
      language: value.language,
      description: this.trimmed(value.description),
      isbn: this.trimmed(value.isbn),
      authorName: this.trimmed(value.authorName),
      publisherName: this.trimmed(value.publisherName),
      publicationYear: value.publicationYear ? Number(value.publicationYear) : null,
      pageCount: value.pageCount ? Number(value.pageCount) : null,
      condition: {
        ...value.condition,
        otherDamage: this.trimmed(value.condition.otherDamage),
        notes: this.trimmed(value.condition.notes),
      },
    };
  }

  /** Re-reads the listing after a change that the server owns, such as an upload. */
  private reload(): void {
    const code = this.publicId();

    if (code) {
      this.seller.get(code).subscribe({ next: (book) => this.book.set(book) });
    }
  }

  private fail(error: unknown): void {
    this.saving.set(false);

    if (error instanceof ApiRequestError) {
      this.fieldErrors.set(error.fieldErrors);
      this.toasts.failure(error.message);
      return;
    }

    this.toasts.error('common.error');
  }

  private trimmed(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
