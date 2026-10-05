import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import type { SellerDashboard } from '../../../core/models/seller';
import { SellerService } from '../../../core/services/seller.service';
import { SeoService } from '../../../core/services/seo.service';
import { UiErrorState } from '../../../shared/ui/state-views';
import { UiSkeleton } from '../../../shared/ui/state-views';
import { UiStatCard } from '../../../shared/ui/stat-card';
import { UiStatusBadge } from '../../../shared/ui/status-badge';

type State = 'loading' | 'ready' | 'error';

/**
 * Where a seller lands. The counts are per stage rather than a single total, because
 * what a seller has to do next is decided entirely by which pile a copy is sitting
 * in: a rejected listing needs editing, an approved one needs posting.
 */
@Component({
  selector: 'app-seller-dashboard',
  imports: [
    RouterLink,
    TranslatePipe,
    PricePipe,
    UiErrorState,
    UiSkeleton,
    UiStatCard,
    UiStatusBadge,
  ],
  templateUrl: './seller-dashboard.html',
  styleUrl: './seller-dashboard.scss',
})
export class SellerDashboardPage {
  private readonly seller = inject(SellerService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<State>('loading');
  protected readonly data = signal<SellerDashboard | null>(null);

  protected readonly placeholders = Array.from({ length: 6 }, (_, index) => index);

  /** True once the seller has listed nothing at all, which needs a different page. */
  protected readonly isNew = computed(() => (this.data()?.totalListings ?? 0) === 0);

  /** The piles that need the seller to do something. */
  protected readonly needsAttention = computed(() => {
    const data = this.data();

    if (!data) {
      return 0;
    }

    return data.drafts + data.rejected + data.awaitingDelivery;
  });

  constructor() {
    this.seo.apply({ titleKey: 'seller.dashboard.title' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.seller.dashboard().subscribe({
      next: (dashboard) => {
        this.data.set(dashboard);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }
}
