import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';
import type { BookDetails } from '../../core/models/book';
import { BookDetailsPage } from './book-details';

/** A book with every reported defect set, so the condition panel has work to do. */
const book: BookDetails = {
  publicId: 'BK-2026-000001',
  urlSegment: 'the-art-of-war-BK-2026-000001',
  title: 'فن الحرب',
  description: 'نسخة مستعملة بحالة جيدة.',
  isbn: '9789953685012',
  authorName: 'سون تزو',
  publisherName: 'المركز الثقافي العربي',
  categoryNameAr: 'فلسفة',
  categoryNameEn: 'Philosophy',
  categorySlug: 'philosophy',
  language: 'arabic',
  publicationYear: 1910,
  pageCount: 273,
  price: 140,
  currency: 'EGP',
  isAvailable: true,
  condition: {
    grade: 'good',
    coverCondition: 'good',
    pagesCondition: 'veryGood',
    hasWritingInside: true,
    hasHighlighting: false,
    hasTornPages: false,
    hasMissingPages: false,
    hasYellowing: true,
    otherDamage: null,
    notes: 'الغلاف سليم.',
  },
  images: [
    { url: '/uploads/samples/philosophy-1.svg', type: 'cover', altText: 'فن الحرب', width: 600, height: 900 },
    { url: '/uploads/samples/philosophy-2.svg', type: 'backCover', altText: null, width: 600, height: 900 },
  ],
  seller: {
    publicId: 'SL-7HQ2K4M9',
    isVerified: true,
    totalSales: 12,
    ratingAverage: 4.5,
    ratingCount: 8,
  },
  publishedAt: '2026-03-01T10:00:00+00:00',
};

describe('BookDetailsPage', () => {
  let fixture: ComponentFixture<BookDetailsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [BookDetailsPage],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);

    // The dictionary request is made once at start-up; the labels themselves are
    // covered by the translation service tests.
    const translations = TestBed.inject(TranslationService);
    const started = translations.initialise();
    http.expectOne('assets/i18n/ar.json').flush({});
    await started;

    fixture = TestBed.createComponent(BookDetailsPage);
    fixture.componentRef.setInput('segment', 'the-art-of-war-BK-2026-000001');
  });

  afterEach(() => http.verify());

  /** Renders the page with a given response from the book endpoint. */
  async function render(respond: (request: ReturnType<HttpTestingController['expectOne']>) => void) {
    fixture.detectChanges();

    const request = http.expectOne((candidate) =>
      candidate.url.includes('/books/the-art-of-war-BK-2026-000001') &&
      !candidate.url.endsWith('/similar'),
    );

    respond(request as never);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows the book once it loads', async () => {
    await render((request) => request.flush({ success: true, data: book }));
    http.expectOne((candidate) => candidate.url.endsWith('/similar')).flush({
      success: true,
      data: [],
    });

    expect(text()).toContain('فن الحرب');
    expect(text()).toContain('سون تزو');
    expect(text()).toContain('BK-2026-000001');
  });

  it('never shows a seller name or any way to contact them', async () => {
    await render((request) => request.flush({ success: true, data: book }));
    http.expectOne((candidate) => candidate.url.endsWith('/similar')).flush({
      success: true,
      data: [],
    });

    const rendered = text();

    // The page says the seller is verified and how they have performed, and stops
    // there. This is the rule the whole platform is built around.
    expect(rendered).not.toContain('@');
    expect(rendered).not.toContain('SL-7HQ2K4M9');

    const markup = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(markup).not.toContain('mailto:');
    expect(markup).not.toContain('tel:');
    expect(markup).not.toContain('wa.me');
  });

  it('lists the defects the seller reported and nothing else', async () => {
    await render((request) => request.flush({ success: true, data: book }));
    http.expectOne((candidate) => candidate.url.endsWith('/similar')).flush({
      success: true,
      data: [],
    });

    const flags = (fixture.nativeElement as HTMLElement).querySelectorAll('.flags__item');

    // Handwriting and yellowing were reported; the other three were not.
    expect(flags.length).toBe(2);
  });

  it('offers every image as a thumbnail', async () => {
    await render((request) => request.flush({ success: true, data: book }));
    http.expectOne((candidate) => candidate.url.endsWith('/similar')).flush({
      success: true,
      data: [],
    });

    const thumbnails = (fixture.nativeElement as HTMLElement).querySelectorAll('.gallery__thumb');

    expect(thumbnails.length).toBe(2);
  });

  it('treats a missing book as an empty state rather than an error', async () => {
    await render((request) =>
      request.flush(
        { success: false, message: 'not found', errors: [{ code: 'not_found', message: 'x' }] },
        { status: 404, statusText: 'Not Found' },
      ),
    );

    expect(fixture.nativeElement.querySelector('ui-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ui-error-state')).toBeNull();
  });

  it('shows an error state with a retry when the server cannot be reached', async () => {
    await render((request) => request.error(new ProgressEvent('failed')));

    expect(fixture.nativeElement.querySelector('ui-error-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ui-empty-state')).toBeNull();
  });

  it('says a copy is sold instead of offering it', async () => {
    await render((request) =>
      request.flush({ success: true, data: { ...book, isAvailable: false } }),
    );
    http.expectOne((candidate) => candidate.url.endsWith('/similar')).flush({
      success: true,
      data: [],
    });

    expect(fixture.nativeElement.querySelector('.summary__sold')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.button--primary')).toBeNull();
  });

  it('still renders the book when suggestions fail to load', async () => {
    await render((request) => request.flush({ success: true, data: book }));
    http
      .expectOne((candidate) => candidate.url.endsWith('/similar'))
      .error(new ProgressEvent('failed'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('فن الحرب');
  });
});
