import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import type { AdminDashboard } from '../../../core/models/back-office';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { OrderStatusLabelPipe } from '../../../shared/pipes/order-status.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { UiMiniChart, type ChartPoint } from '../../../shared/ui/mini-chart';
import { UiStatCard } from '../../../shared/ui/stat-card';
import { UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiStatusBadge } from '../../../shared/ui/status-badge';

type PageState = 'loading' | 'ready' | 'error';

/**
 * The back-office landing page.
 *
 * It opens with the queues rather than with the takings. A listing nobody reviewed
 * and an order nobody packed are the two ways this marketplace actually fails, so
 * they are the first thing on the screen and each one is a link straight to the work.
 */
@Component({
  selector: 'app-admin-dashboard',
  imports: [
    RouterLink,
    DatePipe,
    TranslatePipe,
    PricePipe,
    OrderStatusLabelPipe,
    UiStatCard,
    UiMiniChart,
    UiStatusBadge,
    UiSkeleton,
    UiErrorState,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardPage {
  private readonly backOffice = inject(BackOfficeService);
  private readonly translations = inject(TranslationService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<PageState>('loading');
  protected readonly data = signal<AdminDashboard | null>(null);

  protected readonly placeholders = [0, 1, 2, 3, 4];

  /** Orders placed on each of the last fourteen days. */
  protected readonly orderPoints = computed(() => this.toPoints(this.data()?.ordersPerDay));

  /** Copies submitted on each of those days. */
  protected readonly listingPoints = computed(() => this.toPoints(this.data()?.listingsPerDay));

  constructor() {
    this.seo.apply({ titleKey: 'admin.dashboard.title' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.backOffice.dashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  /**
   * Turns the daily counts into columns. The label under a column is the day of the
   * month on its own: a fortnight of full dates under a chart this size is a row of
   * text nobody can read.
   */
  private toPoints(days: { date: string; count: number }[] | undefined): ChartPoint[] {
    if (!days) {
      return [];
    }

    const locale = this.translations.language() === 'ar' ? 'ar-EG' : 'en-GB';

    return days.map((day) => {
      const date = new Date(day.date);

      return {
        label: date.toLocaleDateString(locale, { day: 'numeric' }),
        value: day.count,
        title: `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} — ${day.count}`,
      };
    });
  }
}
