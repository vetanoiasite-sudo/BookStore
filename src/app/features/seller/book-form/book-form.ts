import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
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
import { compressImage } from '../../../shared/utils/compress-image';

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

/** The cover and three more. The server holds the same limit. */
const MAX_PHOTOS = 4;

/** Largest photograph accepted, matching the server's limit. */
const MAX_PHOTO_BYTES = 1024 * 1024;

/** Longest edge kept, the size the server scales photographs down to anyway. */
const MAX_PHOTO_EDGE = 1600;

/** The image types the server can read. */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * One line of the error summary. The form's own checks give translation keys; the
 * server's messages arrive as text and are shown as they are.
 */
interface FormMessage {
  text: string;
  translate: boolean;
}

/** A photograph chosen for a new listing but not yet sent, with a preview to show it. */
interface PendingPhoto {
  file: File;
  preview: string;
}

type State = 'loading' | 'ready' | 'error';

/**
 * The one form a seller fills in about a copy, used both to list a new one and to
 * correct one that came back rejected.
 *
 * There is no draft. A new listing goes out in one request with its photographs and
 * lands straight in review; saving the fix to a rejected listing sends it back.
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
  protected readonly maxPhotos = MAX_PHOTOS;
  /**
   * What the file picker offers. Wider than what the server reads, because anything
   * else the browser can decode is converted to JPEG before it is sent.
   */
  protected readonly photoPicker = 'image/*,.heic,.heif';

  /** Photographs chosen for a new listing. The first one is the cover. */
  protected readonly pending = signal<PendingPhoto[]>([]);

  /** A message about the photographs, shown under them. */
  protected readonly photoError = signal<string | null>(null);

  /** True while a chosen photograph is being shrunk. */
  protected readonly preparing = signal(false);

  /** Everything that stopped the last send, shown beside the send button. */
  protected readonly formErrors = signal<FormMessage[]>([]);

  protected readonly state = signal<State>('loading');
  protected readonly book = signal<SellerBookDetails | null>(null);
  protected readonly options = signal<CategoryOption[]>([]);

  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);

  /** Validation messages from the server, keyed by the field they belong to. */
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly isNew = computed(() => !this.publicId());

  /** True while the listing is still the seller's to change. */
  protected readonly editable = computed(() => this.isNew() || (this.book()?.isEditable ?? false));

  /** Whether another photograph may be added, counting what is chosen or stored. */
  protected readonly canAddPhoto = computed(() => {
    const count = this.isNew() ? this.pending().length : (this.book()?.images.length ?? 0);
    return count < MAX_PHOTOS;
  });

  constructor() {
    // The previews are object URLs, which the browser keeps until they are released.
    inject(DestroyRef).onDestroy(() =>
      this.pending().forEach((photo) => URL.revokeObjectURL(photo.preview)),
    );
  }

  protected readonly form = this.builder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(300)]],
    categorySlug: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(1)]],
    language: ['arabic' as BookLanguage, [Validators.required]],
    authorName: [''],
    publisherName: [''],
    isbn: [''],
    publicationYear: [null as number | null],
    pageCount: [null as number | null, [Validators.required, Validators.min(1), Validators.max(20000)]],
    description: [''],
    condition: this.builder.nonNullable.group({
      grade: ['veryGood' as ConditionGrade, [Validators.required]],
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
    const code = this.publicId();
    const [cover, ...photos] = this.pending().map((photo) => photo.file);
    const missingCover = !code && !cover;

    if (this.saving()) {
      return;
    }

    if (missingCover) {
      this.photoError.set('seller.form.photos.coverRequired');
    }

    if (this.form.invalid || missingCover) {
      this.form.markAllAsTouched();
      this.formErrors.set(this.clientErrors(missingCover));
      return;
    }

    this.saving.set(true);
    this.fieldErrors.set({});
    this.formErrors.set([]);

    const request = this.toRequest();

    const action = code
      ? this.seller.update(code, request)
      : this.seller.create(request, cover, photos);

    action.subscribe({
      next: (book) => {
        this.saving.set(false);
        this.book.set(book);
        this.toasts.success('seller.books.submitted');

        // A listing in review is no longer the seller's to change, so the list of
        // their books is where they go next.
        void this.router.navigate(['/seller/books']);
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  /** Adds a photograph to a new listing. Nothing is sent until the listing is. */
  protected async choosePhotograph(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const chosen = input.files?.[0];
    input.value = '';

    const file = chosen ? await this.prepare(chosen) : null;

    if (!file) {
      return;
    }

    this.pending.update((photos) => [...photos, { file, preview: URL.createObjectURL(file) }]);
  }

  /** Drops a chosen photograph. Removing the first makes the next one the cover. */
  protected removePending(index: number): void {
    this.pending.update((photos) => {
      URL.revokeObjectURL(photos[index].preview);
      return photos.filter((_, position) => position !== index);
    });
  }

  protected async addPhotograph(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const chosen = input.files?.[0];
    const code = this.publicId();
    const file = chosen && code ? await this.prepare(chosen) : null;

    if (!file || !code) {
      input.value = '';
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
   * Gets a photograph ready to send under the server's rules. A large photograph is
   * shrunk here rather than refused, and one the server cannot read (an iPhone HEIC,
   * say) is converted to JPEG when the browser can decode it. Returns null, with a
   * message for the seller, when the photograph cannot be used.
   */
  private async prepare(file: File): Promise<File | null> {
    this.photoError.set(null);

    if (!this.canAddPhoto()) {
      this.photoError.set('seller.form.photos.tooMany');
      return null;
    }

    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      this.photoError.set('seller.form.photos.badType');
      return null;
    }

    this.preparing.set(true);

    try {
      return await compressImage(file, {
        maxBytes: MAX_PHOTO_BYTES,
        maxEdge: MAX_PHOTO_EDGE,
        acceptedTypes: PHOTO_TYPES,
      });
    } catch {
      // Either the browser cannot decode it, or it would not shrink far enough.
      this.photoError.set(
        PHOTO_TYPES.includes(file.type) ? 'seller.form.photos.tooLarge' : 'seller.form.photos.badType',
      );
      return null;
    } finally {
      this.preparing.set(false);
    }
  }

  /** The category name in the reader's language. */
  private label(node: CategoryNode): string {
    return this.translations.language() === 'ar' ? node.nameAr : node.nameEn || node.nameAr;
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
      pageCount: Number(value.pageCount),
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

      // Every message the server sent, including those for fields the form has no
      // place for, such as the photographs.
      const messages = [...new Set(error.errors.map((item) => item.message).filter(Boolean))];
      this.formErrors.set(
        (messages.length > 0 ? messages : [error.message]).map((text) => ({ text, translate: false })),
      );
      return;
    }

    this.toasts.error('common.error');
    this.formErrors.set([{ text: 'common.error', translate: true }]);
  }

  /** What is still missing or wrong, for the summary beside the send button. */
  private clientErrors(missingCover: boolean): FormMessage[] {
    const controls = this.form.controls;
    const checks: [boolean, string][] = [
      [controls.title.invalid, 'seller.form.error.titleRequired'],
      [controls.categorySlug.invalid, 'seller.form.error.category'],
      [controls.price.invalid, 'seller.form.error.price'],
      [controls.pageCount.invalid, 'seller.form.error.pages'],
      [missingCover, 'seller.form.photos.coverRequired'],
    ];

    return checks
      .filter(([failed]) => failed)
      .map(([, key]) => ({ text: key, translate: true }));
  }

  private trimmed(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
