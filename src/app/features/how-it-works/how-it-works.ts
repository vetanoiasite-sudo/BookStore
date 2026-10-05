import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import type { HowItWorksContent } from '../../core/models/content';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { UiErrorState, UiSkeleton } from '../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'error';

/**
 * Explains the platform: selling and buying step by step, the rules every sale
 * follows and the common questions. The text comes from the API in both languages,
 * so the fee and delivery charge it quotes are the ones the checkout applies.
 */
@Component({
  selector: 'app-how-it-works',
  imports: [RouterLink, TranslatePipe, UiSkeleton, UiErrorState],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.scss',
})
export class HowItWorks {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);
  private readonly translation = inject(TranslationService);

  protected readonly state = signal<PageState>('loading');
  protected readonly page = signal<HowItWorksContent | null>(null);

  /** Placeholder rows while the page loads. */
  protected readonly placeholders = Array.from({ length: 5 }, (_, index) => index);

  constructor() {
    this.seo.apply({ titleKey: 'nav.howItWorks', canonicalPath: '/how-it-works' });
    this.load();
  }

  /** Picks the text for the active language. */
  protected pick(ar: string, en: string): string {
    return this.translation.language() === 'ar' ? ar : en;
  }

  protected load(): void {
    this.state.set('loading');

    this.content.howItWorks().subscribe({
      next: (page) => {
        this.page.set(page);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }
}
