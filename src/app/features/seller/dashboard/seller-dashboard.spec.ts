import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslationService } from '../../../core/i18n/translation.service';
import type { SellerDashboard } from '../../../core/models/seller';
import { SellerDashboardPage } from './seller-dashboard';

const dashboard: SellerDashboard = {
  sellerPublicId: 'SL-7HQ2K4M9',
  displayName: 'مكتبة القاهرة',
  isVerified: true,
  isSuspended: false,
  drafts: 2,
  awaitingReview: 1,
  rejected: 1,
  awaitingDelivery: 3,
  inWarehouse: 0,
  onSale: 4,
  reserved: 0,
  sold: 6,
  totalListings: 17,
  totalViews: 240,
  totalSales: 6,
  ratingAverage: 4.5,
  ratingCount: 4,
  recent: [
    {
      publicId: 'BK-2026-000001',
      title: 'الثلاثية',
      authorName: 'نجيب محفوظ',
      coverImageUrl: null,
      price: 250,
      currency: 'EGP',
      condition: 'veryGood',
      status: 'available',
      rejectionReason: null,
      imageCount: 2,
      viewCount: 30,
      isEditable: false,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-02T10:00:00Z',
    },
  ],
};

describe('SellerDashboardPage', () => {
  let fixture: ComponentFixture<SellerDashboardPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SellerDashboardPage],
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

    // Only the keys these tests read back. A missing key renders as itself, which
    // is deliberate, but it would hide the parameter substitution being checked.
    http.expectOne('assets/i18n/ar.json').flush({
      'seller.dashboard.attention': 'لديك {count} كتاب يحتاج إلى إجراء منك.',
    });
    await started;

    fixture = TestBed.createComponent(SellerDashboardPage);
  });

  afterEach(() => http.verify());

  async function render(body: object | null, failed = false): Promise<void> {
    fixture.detectChanges();

    const request = http.expectOne((candidate) => candidate.url.endsWith('/seller/dashboard'));

    if (failed) {
      request.error(new ProgressEvent('failed'));
    } else {
      request.flush(body);
    }

    await fixture.whenStable();
    fixture.detectChanges();
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('shows placeholders while the numbers load', () => {
    fixture.detectChanges();
    http.expectOne((candidate) => candidate.url.endsWith('/seller/dashboard'));

    expect(root().querySelector('ui-skeleton')).not.toBeNull();
  });

  it('shows one card per stage a copy can be sitting in', async () => {
    await render({ success: true, data: dashboard });

    const values = [...root().querySelectorAll('.stats .stat__value')].map(
      (element) => element.textContent?.trim(),
    );

    expect(values).toEqual(['2', '1', '1', '3', '4', '6']);
  });

  it('links each count to that filter of the seller list', async () => {
    await render({ success: true, data: dashboard });

    const links = [...root().querySelectorAll('.stats a')].map((link) =>
      link.getAttribute('href'),
    );

    expect(links).toContain('/seller/books?status=draft');
    expect(links).toContain('/seller/books?status=rejected');
  });

  it('says how many listings are waiting on the seller', async () => {
    await render({ success: true, data: dashboard });

    // Drafts, rejections and copies still to be posted: 2 + 1 + 3.
    expect(root().querySelector('.notice')?.textContent).toContain('6');
  });

  it('warns a suspended seller instead of inviting them to list', async () => {
    await render({ success: true, data: { ...dashboard, isSuspended: true } });

    expect(root().querySelector('.notice--danger')).not.toBeNull();
  });

  it('greets a seller who has listed nothing with a first step', async () => {
    await render({
      success: true,
      data: { ...dashboard, totalListings: 0, recent: [] },
    });

    expect(root().querySelector('.recent__empty')).not.toBeNull();
    expect(root().querySelector('.recent__item')).toBeNull();
  });

  it('lists what changed most recently', async () => {
    await render({ success: true, data: dashboard });

    const item = root().querySelector('.recent__item');

    expect(item?.textContent).toContain('الثلاثية');
    expect(item?.querySelector('ui-status-badge')).not.toBeNull();
  });

  it('offers a retry when the dashboard cannot be loaded', async () => {
    await render(null, true);

    expect(root().querySelector('ui-error-state')).not.toBeNull();
  });
});
