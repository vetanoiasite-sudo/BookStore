import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG, LanguageCode } from '../config/app-config';

/** A loaded translation file: dotted keys mapped to their text. */
type Dictionary = Record<string, string>;

const STORAGE_KEY = 'bookstore.language';

/**
 * Loads the translation files and exposes the active language as a signal, so any
 * component that reads a translation re-renders when the language changes.
 *
 * No user-visible string is written inside a component. Every one goes through
 * `translate`, which is what makes the whole interface switchable between Arabic and
 * English, and what makes a missing translation visible rather than silent.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly document = inject(DOCUMENT);

  private readonly dictionaries = signal<Partial<Record<LanguageCode, Dictionary>>>({});

  /** The language the interface is currently in. */
  readonly language = signal<LanguageCode>(this.config.defaultLanguage);

  /** Text direction for the active language. */
  readonly direction = computed<'rtl' | 'ltr'>(() =>
    this.language() === 'ar' ? 'rtl' : 'ltr',
  );

  /** True while the interface is right to left, which most layout decisions key off. */
  readonly isRtl = computed(() => this.direction() === 'rtl');

  private readonly active = computed<Dictionary>(
    () => this.dictionaries()[this.language()] ?? {},
  );

  /**
   * Loads the saved language, or the default, and its dictionary. Called once during
   * application start so the first paint is already in the right language.
   */
  async initialise(): Promise<void> {
    const stored = this.readStoredLanguage();
    await this.use(stored ?? this.config.defaultLanguage);
  }

  /** Switches language, loading its dictionary if this is the first time. */
  async use(language: LanguageCode): Promise<void> {
    if (!this.config.supportedLanguages.includes(language)) {
      return;
    }

    if (!this.dictionaries()[language]) {
      await this.load(language);
    }

    this.language.set(language);
    this.applyToDocument();
    this.storeLanguage(language);
  }

  /** Switches between the two shipped languages. */
  async toggle(): Promise<void> {
    await this.use(this.language() === 'ar' ? 'en' : 'ar');
  }

  /**
   * Looks up a key. Parameters are substituted for `{name}` placeholders. A key with
   * no translation is returned as written, so the gap shows up in the interface
   * rather than rendering as an empty space.
   */
  translate(key: string, parameters?: Record<string, string | number>): string {
    const template = this.active()[key] ?? key;

    if (!parameters) {
      return template;
    }

    return Object.entries(parameters).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template,
    );
  }

  private async load(language: LanguageCode): Promise<void> {
    try {
      const dictionary = await firstValueFrom(
        this.http.get<Dictionary>(`assets/i18n/${language}.json`),
      );

      this.dictionaries.update((current) => ({ ...current, [language]: dictionary }));
    } catch {
      // A missing dictionary must not stop the application. Keys render as
      // themselves, which is ugly but usable, and the failure is obvious.
      this.dictionaries.update((current) => ({ ...current, [language]: {} }));
    }
  }

  /**
   * Sets `lang` and `dir` on the root element. One attribute flips the entire
   * layout, because the stylesheets use logical properties rather than left and right.
   */
  private applyToDocument(): void {
    const root = this.document.documentElement;
    root.setAttribute('lang', this.language());
    root.setAttribute('dir', this.direction());
  }

  private readStoredLanguage(): LanguageCode | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return this.config.supportedLanguages.includes(value as LanguageCode)
        ? (value as LanguageCode)
        : null;
    } catch {
      // Private browsing and blocked site data both throw here.
      return null;
    }
  }

  private storeLanguage(language: LanguageCode): void {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Remembering the choice is a convenience, not a requirement.
    }
  }
}
