import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';
import type { BookFilterOptions, BookListItem } from '../../core/models/book';
import { Books } from './books';

function sampleBook(index: number): BookListItem {
  return {
    publicId: `BK-2026-00000${index}`,
    urlSegment: `book-${index}-BK-2026-00000${index}`,
    title: `كتاب ${index}`,
    authorName: 'مؤلف',
    coverImageUrl: '/uploads/samples/novels-1.svg',
    price: 100 + index,
    currency: 'EGP',
    condition: 'good',
    language: 'arabic',
    categoryNameAr: 'روايات',
    categoryNameEn: 'Novels',
    publishedAt: '2026-03-01T10:00:00+00:00',
  };
}

/** Builds a paged response the endpoint would return. */
function page(items: BookListItem[], totalCount = items.length) {
  return {
    success: true,
    data: {
      items,
      page: 1,
      pageSize: 12,
      totalCount,
      totalPages: Math.ceil(totalCount / 12),
      hasPrevious: false,
      hasNext: totalCount > 12,
    },
  };
}

/** Builds a filter panel the endpoint would return. */
function filters(overrides: Partial<BookFilterOptions> = {}) {
  return {
    success: true,
    data: {
      authors: [
        { slug: 'naguib-mahfouz', name: 'نجيب محفوظ', nameEn: 'Naguib Mahfouz', count: 2 },
        { slug: 'taha-hussein', name: 'طه حسين', nameEn: 'Taha Hussein', count: 1 },
      ],
      publishers: [
        { slug: 'dar-el-shorouk', name: 'دار الشروق', nameEn: 'Dar El Shorouk', count: 3 },
      ],
      languages: [{ value: 'arabic', count: 3 }],
      conditions: [
        { value: 'veryGood', count: 2 },
        { value: 'good', count: 1 },
      ],
      price: { min: 95, max: 250 },
      years: { min: 1910, max: 2008 },
      currency: 'EGP',
      ...overrides,
    },
  };
}

describe('Books', () => {
  let fixture: ComponentFixture<Books>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Books],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),

        // A route the listing can navigate to, so writing a filter into the query
        // string actually reaches the address bar.
        provideRouter([{ path: '**', children: [] }]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    const translations = TestBed.inject(TranslationService);
    const started = translations.initialise();
    http.expectOne('assets/i18n/ar.json').flush({});
    await started;

    fixture = TestBed.createComponent(Books);
  });

  afterEach(() => http.verify());

  /** The parameters the most recent listing request was made with. */
  let lastSearch: URLSearchParams;

  /**
   * Answers whatever the page has asked for, and lets it render. A click on a filter
   * navigates before it fetches, and the navigation settles a turn later, so this
   * keeps answering until the page stops asking.
   */
  async function settle(
    listing: object = page([sampleBook(1)]),
    panel: object = filters(),
  ) {
    for (let round = 0; round < 5; round++) {
      await fixture.whenStable();

      const pending = http.match(
        (candidate) =>
          candidate.url.endsWith('/books') || candidate.url.endsWith('/books/filters'),
      );

      if (pending.length === 0) {
        break;
      }

      for (const request of pending) {
        if (request.request.url.endsWith('/filters')) {
          request.flush(panel);
        } else {
          lastSearch = new URLSearchParams(request.request.params.toString());
          request.flush(listing);
        }
      }
    }

    fixture.detectChanges();
  }

  async function render(listing?: object, panel?: object) {
    fixture.detectChanges();
    await settle(listing, panel);
  }

  function element(selector: string): Element | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  function elements(selector: string): Element[] {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll(selector)];
  }

  // --- The listing ---------------------------------------------------------

  it('shows placeholder cards while the page is loading', () => {
    fixture.detectChanges();
    http.expectOne((candidate) => candidate.url.endsWith('/books'));
    http.expectOne((candidate) => candidate.url.endsWith('/books/filters'));

    expect(element('book-card-skeleton')).not.toBeNull();
    expect(element('book-card')).toBeNull();
  });

  it('renders a card for every book in the page', async () => {
    await render(page([sampleBook(1), sampleBook(2), sampleBook(3)]));

    expect(elements('book-card').length).toBe(3);
    expect(element('book-card-skeleton')).toBeNull();
  });

  it('shows an empty state rather than a blank grid when nothing matches', async () => {
    await render(page([], 0));

    expect(element('ui-empty-state')).not.toBeNull();
    expect(element('book-card')).toBeNull();
  });

  it('shows an error state with a retry when the request fails', async () => {
    fixture.detectChanges();

    http
      .expectOne((candidate) => candidate.url.endsWith('/books'))
      .error(new ProgressEvent('failed'));
    http.expectOne((candidate) => candidate.url.endsWith('/books/filters')).flush(filters());

    await fixture.whenStable();
    fixture.detectChanges();

    expect(element('ui-error-state')).not.toBeNull();
    expect(element('ui-empty-state')).toBeNull();
  });

  it('hides the pager when everything fits on one page', async () => {
    await render(page([sampleBook(1), sampleBook(2)]));

    // The component is present but renders nothing while there is a single page.
    expect(element('.pagination')).toBeNull();
  });

  it('shows the pager once there is more than one page', async () => {
    await render(page([sampleBook(1)], 40));

    expect(element('.pagination')).not.toBeNull();
  });

  // --- The filter panel ----------------------------------------------------

  it('offers the values the server says are worth filtering on', async () => {
    await render();

    const labels = elements('.filters__label').map((node) => node.textContent?.trim());

    expect(labels).toContain('نجيب محفوظ');
    expect(labels).toContain('دار الشروق');
    expect(element('book-filters')).not.toBeNull();
  });

  it('leaves out a facet the server offers nothing for', async () => {
    await render(undefined, filters({ authors: [], publishers: [] }));

    const legends = elements('.filters__legend').map((node) => node.textContent?.trim());

    expect(legends).not.toContain('filters.author');
    expect(legends).toContain('filters.condition');
  });

  it('does not offer a language filter when everything is in one language', async () => {
    await render();

    // The sample panel carries a single language, which is not a choice.
    const legends = elements('.filters__legend').map((node) => node.textContent?.trim());
    expect(legends).not.toContain('filters.language');
  });

  it('keeps the panel it has when the filter request fails', async () => {
    await render();
    expect(elements('.filters__label').length).toBeGreaterThan(0);

    // A second load whose panel request fails must not empty the panel: filters one
    // request out of date are more use than none.
    fixture.componentInstance['load']();
    fixture.componentInstance['loadFilters']();

    http.expectOne((candidate) => candidate.url.endsWith('/books')).flush(page([sampleBook(1)]));
    http
      .expectOne((candidate) => candidate.url.endsWith('/books/filters'))
      .error(new ProgressEvent('failed'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(elements('.filters__label').length).toBeGreaterThan(0);
  });

  // --- Filters and the address bar -----------------------------------------

  it('writes a chosen condition into the query string', async () => {
    await render();

    (element('.filters__check input') as HTMLInputElement).click();
    await settle();

    expect(router.url).toContain('condition=veryGood');
  });

  it('takes a filter off again when the same value is chosen twice', async () => {
    await render();

    const author = elements('.filters__option')[0] as HTMLButtonElement;

    author.click();
    await settle();
    expect(router.url).toContain('author=naguib-mahfouz');

    (elements('.filters__option')[0] as HTMLButtonElement).click();
    await settle();
    expect(router.url).not.toContain('author=');
  });

  it('sends every filter in the query string on to the API', async () => {
    await router.navigate([], {
      queryParams: {
        q: 'محفوظ',
        author: 'naguib-mahfouz',
        condition: ['veryGood', 'good'],
        minPrice: 100,
        maxYear: 1980,
      },
    });

    fixture.detectChanges();
    await settle();

    expect(lastSearch.get('q')).toBe('محفوظ');
    expect(lastSearch.get('author')).toBe('naguib-mahfouz');
    expect(lastSearch.getAll('condition')).toEqual(['veryGood', 'good']);
    expect(lastSearch.get('minPrice')).toBe('100');
    expect(lastSearch.get('maxYear')).toBe('1980');
  });

  it('applies a price range only once the reader asks for it', async () => {
    await render();

    const [from, to] = elements('.filters__range input') as HTMLInputElement[];

    from.value = '150';
    from.dispatchEvent(new Event('input'));
    to.value = '200';
    to.dispatchEvent(new Event('input'));
    await settle();

    // Typing alone must not reload the page.
    expect(router.url).not.toContain('minPrice');

    (element('.filters__apply') as HTMLButtonElement).click();
    await settle();

    expect(router.url).toContain('minPrice=150');
    expect(router.url).toContain('maxPrice=200');
  });

  it('puts a back-to-front price range the right way round', async () => {
    await render();

    const [from, to] = elements('.filters__range input') as HTMLInputElement[];

    from.value = '250';
    from.dispatchEvent(new Event('input'));
    to.value = '100';
    to.dispatchEvent(new Event('input'));

    (element('.filters__apply') as HTMLButtonElement).click();
    await settle();

    expect(router.url).toContain('minPrice=100');
    expect(router.url).toContain('maxPrice=250');
  });

  it('goes back to the first page when a filter changes', async () => {
    await router.navigate([], { queryParams: { page: 3 } });
    fixture.detectChanges();
    await settle();

    (element('.filters__check input') as HTMLInputElement).click();
    await settle();

    // Page four of a different set of results is an arbitrary slice.
    expect(router.url).not.toContain('page=');
  });

  it('clears every filter while keeping the search term', async () => {
    await router.navigate([], {
      queryParams: { q: 'محفوظ', author: 'naguib-mahfouz', condition: 'veryGood' },
    });

    fixture.detectChanges();
    await settle();

    (element('.filters__clear') as HTMLButtonElement).click();
    await settle();

    expect(router.url).not.toContain('author=');
    expect(router.url).not.toContain('condition=');
    expect(router.url).toContain('q=');
  });
});
