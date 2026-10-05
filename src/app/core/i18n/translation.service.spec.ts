import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TranslationService } from './translation.service';

/**
 * The translation service decides what language the whole interface is in, and
 * whether it reads right to left. Both are load-bearing: the catalogue is Arabic
 * first, and the layout flips off a single attribute.
 */
describe('TranslationService', () => {
  let service: TranslationService;
  let http: HttpTestingController;

  const arabic = {
    'nav.books': 'الكتب',
    'books.count': '{count} كتاب متاح',
    'seller.rating': '{rating} من ٥ ({count} تقييم)',
  };

  const english = {
    'nav.books': 'Books',
    'books.count': '{count} books available',
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TranslationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Starts the service and answers the dictionary request it makes. */
  async function initialise(dictionary: Record<string, string> = arabic): Promise<void> {
    const started = service.initialise();
    http.expectOne('assets/i18n/ar.json').flush(dictionary);
    await started;
  }

  it('starts in Arabic and reads right to left', async () => {
    await initialise();

    expect(service.language()).toBe('ar');
    expect(service.direction()).toBe('rtl');
    expect(service.isRtl()).toBe(true);
  });

  it('sets lang and dir on the document, which is what flips the layout', async () => {
    await initialise();

    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('translates a key', async () => {
    await initialise();

    expect(service.translate('nav.books')).toBe('الكتب');
  });

  it('substitutes parameters into a translation', async () => {
    await initialise();

    expect(service.translate('books.count', { count: 12 })).toBe('12 كتاب متاح');
    expect(service.translate('seller.rating', { rating: 4.5, count: 8 })).toBe(
      '4.5 من ٥ (8 تقييم)',
    );
  });

  it('returns the key itself when there is no translation, so the gap is visible', async () => {
    await initialise();

    expect(service.translate('some.missing.key')).toBe('some.missing.key');
  });

  it('switches to English and turns the layout around', async () => {
    await initialise();

    const switched = service.use('en');
    http.expectOne('assets/i18n/en.json').flush(english);
    await switched;

    expect(service.language()).toBe('en');
    expect(service.direction()).toBe('ltr');
    expect(service.translate('nav.books')).toBe('Books');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('loads each dictionary only once', async () => {
    await initialise();

    const first = service.use('en');
    http.expectOne('assets/i18n/en.json').flush(english);
    await first;

    await service.use('ar');
    await service.use('en');

    // No further requests: verify() in afterEach would fail if one were pending.
    expect(service.language()).toBe('en');
  });

  it('remembers the chosen language for the next visit', async () => {
    await initialise();

    const switched = service.use('en');
    http.expectOne('assets/i18n/en.json').flush(english);
    await switched;

    expect(localStorage.getItem('bookstore.language')).toBe('en');
  });

  it('ignores a language it does not ship', async () => {
    await initialise();

    await service.use('fr' as never);

    expect(service.language()).toBe('ar');
  });

  it('keeps working when a dictionary cannot be loaded', async () => {
    const started = service.initialise();
    http.expectOne('assets/i18n/ar.json').error(new ProgressEvent('failed'));
    await started;

    // Keys render as themselves rather than the application failing to start.
    expect(service.translate('nav.books')).toBe('nav.books');
  });
});
