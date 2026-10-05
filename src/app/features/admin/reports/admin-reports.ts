import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { PlatformReport } from '../../../core/models/back-office';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { CategoryNamePipe } from '../../../shared/pipes/category-name.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { UiStatCard } from '../../../shared/ui/stat-card';
import { UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';

/** The windows worth offering. Anything else is typed into the two date boxes. */
const RANGES: { days: number; labelKey: string }[] = [
  { days: 7, labelKey: 'admin.reports.range.week' },
  { days: 30, labelKey: 'admin.reports.range.month' },
  { days: 90, labelKey: 'admin.reports.range.quarter' },
  { days: 365, labelKey: 'admin.reports.range.year' },
];

type PageState = 'loading' | 'ready' | 'error';

/**
 * What happened over a window of time.
 *
 * Deliberately a short report. A page of numbers nobody can hold in their head is a
 * page nobody reads, so this answers four questions — what was offered, what was
 * accepted, what was bought, and what the platform earned — and stops.
 */
@Component({
  selector: 'app-admin-reports',
  imports: [
    DatePipe,
    TranslatePipe,
    PricePipe,
    CategoryNamePipe,
    UiStatCard,
    UiSkeleton,
    UiErrorState,
  ],
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.scss',
})
export class AdminReports {
  private readonly backOffice = inject(BackOfficeService);
  private readonly seo = inject(SeoService);

  protected readonly ranges = RANGES;
  protected readonly placeholders = [0, 1, 2, 3];

  protected readonly state = signal<PageState>('loading');
  protected readonly report = signal<PlatformReport | null>(null);

  /** Which of the offered windows is showing, or null when the dates were typed. */
  protected readonly activeRange = signal<number | null>(30);

  protected readonly from = signal(isoDaysAgo(30));
  protected readonly to = signal(isoToday());

  constructor() {
    this.seo.apply({ titleKey: 'admin.reports.title' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.backOffice.report(this.from(), this.to()).subscribe({
      next: (report) => {
        this.report.set(report);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected chooseRange(days: number): void {
    this.activeRange.set(days);
    this.from.set(isoDaysAgo(days));
    this.to.set(isoToday());
    this.load();
  }

  protected changeFrom(event: Event): void {
    this.activeRange.set(null);
    this.from.set((event.target as HTMLInputElement).value);
  }

  protected changeTo(event: Event): void {
    this.activeRange.set(null);
    this.to.set((event.target as HTMLInputElement).value);
  }
}

/** A date input wants `yyyy-mm-dd`, and so does the API. */
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
