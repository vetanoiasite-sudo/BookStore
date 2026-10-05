import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslationService } from '../../../core/i18n/translation.service';
import type { AdminBookDetails, InventoryLocationOption } from '../../../core/models/admin';
import type { BookStatus } from '../../../core/models/seller';
import { BookReview } from './book-review';

const locations: InventoryLocationOption[] = [
  {
    id: '0195f0a0-0000-7000-8000-000000000001',
    code: 'WAREHOUSE-A/Z1/R04/S03/B17',
    description: 'Warehouse A, Zone Z1, Rack 04, Shelf 03, Box 17',
    isActive: true,
    capacity: 50,
    itemCount: 3,
  },
];

function details(status: BookStatus): AdminBookDetails {
  return {
    publicId: 'BK-2026-000001',
    urlSegment: 'althlathya-BK-2026-000001',
    title: 'الثلاثية',
    description: 'نسخة مستعملة بحالة جيدة.',
    isbn: '9789770914564',
    authorName: 'نجيب محفوظ',
    publisherName: 'دار الشروق',
    categorySlug: 'novels',
    categoryNameAr: 'روايات',
    categoryNameEn: 'Novels',
    language: 'arabic',
    publicationYear: 1956,
    pageCount: 1500,
    price: 250,
    currency: 'EGP',
    status,
    rejectionReason: status === 'rejected' ? 'الصور غير واضحة.' : null,
    viewCount: 12,
    seller: {
      publicId: 'SL-7HQ2K4M9',
      displayName: 'مكتبة القاهرة',
      isVerified: true,
      isSuspended: false,
      totalSales: 6,
      ratingAverage: 4.5,
      ratingCount: 4,
      totalListings: 17,
    },
    condition: {
      grade: 'veryGood',
      coverCondition: 'veryGood',
      pagesCondition: 'good',
      hasWritingInside: false,
      hasHighlighting: true,
      hasTornPages: false,
      hasMissingPages: false,
      hasYellowing: true,
      otherDamage: null,
      notes: null,
    },
    images: [
      {
        id: '0195f0a0-0000-7000-8000-00000000000a',
        url: '/uploads/books/BK-2026-000001/cover.jpg',
        type: 'cover',
        altText: 'الثلاثية',
        width: 600,
        height: 900,
        sizeInBytes: 40_000,
      },
    ],
    timeline: [
      {
        fromStatus: 'draft',
        toStatus: 'pendingReview',
        reason: null,
        at: '2026-09-01T10:00:00Z',
      },
    ],
    placement:
      status === 'available'
        ? {
            locationId: locations[0].id,
            code: locations[0].code,
            description: locations[0].description,
            receivedAt: '2026-09-03T10:00:00Z',
            notes: 'Checked against the photographs.',
          }
        : null,
    allowedNextStatuses: [],
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    approvedAt: null,
    receivedAt: null,
    publishedAt: null,
    soldAt: null,
  };
}

describe('BookReview', () => {
  let fixture: ComponentFixture<BookReview>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [BookReview],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);

    const translations = TestBed.inject(TranslationService);
    const started = translations.initialise();
    http.expectOne('assets/i18n/ar.json').flush({});
    await started;

    fixture = TestBed.createComponent(BookReview);
    fixture.componentRef.setInput('publicId', 'BK-2026-000001');
  });

  afterEach(() => http.verify());

  async function render(status: BookStatus): Promise<void> {
    fixture.detectChanges();

    http.expectOne((request) => request.url.endsWith('/admin/books/BK-2026-000001'))
      .flush({ success: true, data: details(status) });

    http.expectOne((request) => request.url.includes('/admin/inventory/locations'))
      .flush({ success: true, data: locations });

    await fixture.whenStable();
    fixture.detectChanges();
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function buttonLabels(): string[] {
    return [...root().querySelectorAll('.side button')].map(
      (button) => button.textContent?.trim() ?? '',
    );
  }

  it('shows the photographs the decision rests on', async () => {
    await render('pendingReview');

    expect(root().querySelectorAll('.gallery__image').length).toBe(1);
  });

  it('offers approval and rejection while a copy is waiting for a decision', async () => {
    await render('pendingReview');

    expect(buttonLabels()).toEqual(['admin.review.approve', 'admin.review.reject']);
  });

  it('asks for a reason before a rejection can be sent', async () => {
    await render('pendingReview');

    // The panel is closed until the reviewer chooses to reject, so a rejection
    // cannot be sent by a single stray click.
    expect(root().querySelector('#reason')).toBeNull();

    root().querySelectorAll<HTMLButtonElement>('.side button')[1].click();
    fixture.detectChanges();

    expect(root().querySelector('#reason')).not.toBeNull();
  });

  it('offers only receiving once the copy has been approved', async () => {
    await render('waitingForDelivery');

    expect(buttonLabels()).toEqual(['admin.review.receive']);
    expect(root().querySelector('#location')).toBeNull();
  });

  it('asks for a shelf once the copy is in the building', async () => {
    await render('received');

    expect(root().querySelector('#location')).not.toBeNull();
    expect(buttonLabels()).toEqual(['admin.review.shelve']);
  });

  it('sends the chosen shelf when the copy is put on sale', async () => {
    await render('received');

    root().querySelector<HTMLButtonElement>('.side button')!.click();

    const request = http.expectOne(
      (candidate) => candidate.url.endsWith('/assign-location'),
    );

    expect(request.request.body.locationId).toBe(locations[0].id);
    request.flush({ success: true, data: details('available') });

    await fixture.whenStable();
    fixture.detectChanges();

    // Shelving re-reads the locations, because one of them just filled up a little.
    http.expectOne((candidate) => candidate.url.includes('/admin/inventory/locations'))
      .flush({ success: true, data: locations });
  });

  it('offers nothing to do on a copy that is already on sale, and says where it is', async () => {
    await render('available');

    expect(buttonLabels()).toEqual([]);
    expect(root().querySelector('.placement__code')?.textContent).toContain('WAREHOUSE-A');
  });

  it('shows the rejection reason on a copy that was refused', async () => {
    await render('rejected');

    expect(root().querySelector('.notice--danger')?.textContent).toContain('الصور');
  });

  it('offers a retry when the copy cannot be loaded', async () => {
    fixture.detectChanges();

    http.expectOne((request) => request.url.endsWith('/admin/books/BK-2026-000001'))
      .error(new ProgressEvent('failed'));
    http.expectOne((request) => request.url.includes('/admin/inventory/locations'))
      .flush({ success: true, data: locations });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().querySelector('ui-error-state')).not.toBeNull();
  });
});
