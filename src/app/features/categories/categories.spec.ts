import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';
import type { CategoryNode } from '../../core/models/category';
import { Categories } from './categories';

const tree: CategoryNode[] = [
  {
    slug: 'literature',
    nameAr: 'أدب',
    nameEn: 'Literature',
    bookCount: 5,
    children: [
      { slug: 'novels', nameAr: 'روايات', nameEn: 'Novels', bookCount: 5, children: [] },
      { slug: 'poetry', nameAr: 'شعر', nameEn: 'Poetry', bookCount: 0, children: [] },
    ],
  },
  {
    slug: 'philosophy',
    nameAr: 'فلسفة',
    nameEn: 'Philosophy',
    bookCount: 1,
    children: [],
  },
];

describe('Categories', () => {
  let fixture: ComponentFixture<Categories>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Categories],
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

    fixture = TestBed.createComponent(Categories);
  });

  afterEach(() => http.verify());

  async function render(respond: (request: never) => void) {
    fixture.detectChanges();
    const request = http.expectOne((candidate) => candidate.url.endsWith('/categories'));
    respond(request as never);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function flushWith(body: unknown) {
    return (request: never) =>
      (request as never as { flush: (value: unknown) => void }).flush(body);
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('shows placeholders while the tree loads', () => {
    fixture.detectChanges();
    http.expectOne((candidate) => candidate.url.endsWith('/categories'));

    expect(root().querySelector('ui-skeleton')).not.toBeNull();
  });

  it('renders one section per root category', async () => {
    await render(flushWith({ success: true, data: tree }));

    expect(root().querySelectorAll('.section').length).toBe(2);
  });

  it('lists sub-categories beneath their parent', async () => {
    await render(flushWith({ success: true, data: tree }));

    const children = root().querySelectorAll('.section')[0].querySelectorAll('.child');

    expect(children.length).toBe(2);
    expect(children[0].textContent).toContain('روايات');
  });

  it('says so when a category has no sub-categories', async () => {
    await render(flushWith({ success: true, data: tree }));

    const philosophy = root().querySelectorAll('.section')[1];

    expect(philosophy.querySelector('.section__none')).not.toBeNull();
    expect(philosophy.querySelector('.child')).toBeNull();
  });

  it('links every category to the catalogue filtered by its slug', async () => {
    await render(flushWith({ success: true, data: tree }));

    const links = [...root().querySelectorAll('a')].map((link) => link.getAttribute('href'));

    expect(links).toContain('/books?category=literature');
    expect(links).toContain('/books?category=novels');
  });

  it('shows the rolled up count beside each category', async () => {
    await render(flushWith({ success: true, data: tree }));

    // Literature holds no books directly; the five belong to Novels beneath it.
    expect(root().querySelectorAll('.section__count')[0].textContent?.trim()).toBe('5');
  });

  it('shows an empty state rather than a blank page when there are no categories', async () => {
    await render(flushWith({ success: true, data: [] }));

    expect(root().querySelector('ui-empty-state')).not.toBeNull();
    expect(root().querySelector('.section')).toBeNull();
  });

  it('shows an error state with a retry when the tree cannot be loaded', async () => {
    await render((request) =>
      (request as never as { error: (event: ProgressEvent) => void }).error(
        new ProgressEvent('failed'),
      ),
    );

    expect(root().querySelector('ui-error-state')).not.toBeNull();
  });
});
