import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

/** The two colour schemes: the bookshop browns, and the original purple and yellow. */
export type ThemeName = 'brown' | 'purple';

const STORAGE_KEY = 'bookstore.theme';

/** Browser chrome colour for each scheme, matching --bs-primary. */
const THEME_COLOR: Record<ThemeName, string> = { brown: '#743014', purple: '#662483' };

/**
 * The active colour scheme. Colours come from the tokens under
 * `:root[data-theme]`; the photos and logos are baked per scheme, so components ask
 * for them through `asset()` and follow the switch.
 *
 * index.html sets `data-theme` from storage before the app boots, so the first paint
 * is already in the reader's chosen scheme.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<ThemeName>(this.stored());

  constructor() {
    effect(() => this.apply(this.theme()));
  }

  toggle(): void {
    this.theme.update((theme) => (theme === 'brown' ? 'purple' : 'brown'));
  }

  /**
   * The scheme's version of a themed image. The brown files carry the plain name and
   * the purple ones a `-purple` suffix, e.g. `hero/slide-1.webp` / `hero/slide-1-purple.webp`.
   */
  asset(path: string): string {
    return this.theme() === 'brown' ? path : path.replace(/(\.\w+)$/, '-purple$1');
  }

  private apply(theme: ThemeName): void {
    const root = this.document.documentElement;
    root.dataset['theme'] = theme;

    this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    this.document.querySelector('link[rel="icon"]')?.setAttribute('href', this.asset('logo.svg'));

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode); the scheme still applies for this visit.
    }
  }

  private stored(): ThemeName {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'purple' ? 'purple' : 'brown';
    } catch {
      return 'brown';
    }
  }
}
