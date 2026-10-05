import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { TranslationService } from '../i18n/translation.service';

/** What a page wants to say about itself. Keys are translated; literals are not. */
export interface PageMetadata {
  /** Translation key for the page title. */
  titleKey?: string;

  /** Literal title, for a value that comes from data such as a book name. */
  title?: string;

  /** Translation key for the description. */
  descriptionKey?: string;

  /** Literal description. */
  description?: string;

  /** Canonical path, so a book reached through several links has one address. */
  canonicalPath?: string;
}

/**
 * Sets the title, description and canonical link for a page. Book pages are the ones
 * that matter here: they are public, they are what search engines index, and the same
 * copy can be reached through more than one URL.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly translations = inject(TranslationService);

  apply(metadata: PageMetadata): void {
    const siteName = this.translations.translate('app.name');

    const pageTitle =
      metadata.title ??
      (metadata.titleKey ? this.translations.translate(metadata.titleKey) : null);

    this.title.setTitle(pageTitle && pageTitle !== siteName ? `${pageTitle} | ${siteName}` : siteName);

    const description =
      metadata.description ??
      (metadata.descriptionKey ? this.translations.translate(metadata.descriptionKey) : null);

    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
    }

    this.setCanonical(metadata.canonicalPath);
  }

  /**
   * Points the canonical link at the given path. A book is reachable from a stale
   * slug as well as its current one, so the canonical says which address is the real
   * one.
   */
  private setCanonical(path?: string): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!path) {
      link?.remove();
      return;
    }

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }

    const origin = this.document.location?.origin ?? '';
    link.setAttribute('href', `${origin}${path.startsWith('/') ? path : `/${path}`}`);
  }
}
