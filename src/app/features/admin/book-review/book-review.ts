import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { ConditionLabelPipe, LanguageLabelPipe } from '../../../shared/pipes/condition-label.pipe';
import { ApiRequestError } from '../../../core/http/api-error';
import type { AdminBookDetails, InventoryLocationOption } from '../../../core/models/admin';
import { AdminService } from '../../../core/services/admin.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiStatusBadge } from '../../../shared/ui/status-badge';

type State = 'loading' | 'ready' | 'error';

/**
 * One listing, and the decision to be made about it.
 *
 * Which buttons appear is decided by what the server says the state machine allows
 * from here, never by this page's own idea of the order. A copy is approved, then it
 * arrives, then it is shelved, and only shelving puts it on sale — offering a step
 * out of turn would only produce a refusal the reviewer cannot act on.
 */
@Component({
  selector: 'app-book-review',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    PricePipe,
    ConditionLabelPipe,
    LanguageLabelPipe,
    UiErrorState,
    UiSkeleton,
    UiStatusBadge,
  ],
  templateUrl: './book-review.html',
  styleUrl: './book-review.scss',
})
export class BookReview implements OnInit {
  /** The book code from the route. */
  readonly publicId = input.required<string>();

  private readonly admin = inject(AdminService);
  private readonly toasts = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<State>('loading');
  protected readonly book = signal<AdminBookDetails | null>(null);
  protected readonly locations = signal<InventoryLocationOption[]>([]);

  protected readonly working = signal(false);

  /** Whether the rejection panel is open. */
  protected readonly rejecting = signal(false);

  protected rejectionReason = '';
  protected locationId = '';
  protected shelfNotes = '';

  /** The copy is waiting for a decision. */
  protected readonly canDecide = computed(() => this.book()?.status === 'pendingReview');

  /** The copy has been approved and the warehouse is expecting it. */
  protected readonly canReceive = computed(
    () => this.book()?.status === 'waitingForDelivery',
  );

  /** The copy is in the building and needs a shelf before it can be sold. */
  protected readonly canShelve = computed(() => this.book()?.status === 'received');

  /**
   * The book code arrives as a route input, and inputs are set after the constructor
   * runs. Loading from here is what makes the page read the address it was actually
   * opened at rather than an empty one.
   */
  ngOnInit(): void {
    this.seo.apply({ titleKey: 'admin.review.title' });
    this.load();
    this.loadLocations();
  }

  protected load(): void {
    this.state.set('loading');

    this.admin.book(this.publicId()).subscribe({
      next: (book) => {
        this.book.set(book);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected approve(): void {
    this.run(this.admin.approve(this.publicId()), 'admin.review.approved');
  }

  protected reject(): void {
    const reason = this.rejectionReason.trim();

    if (reason.length === 0) {
      this.toasts.error('admin.review.reasonRequired');
      return;
    }

    this.run(this.admin.reject(this.publicId(), reason), 'admin.review.rejected', () => {
      this.rejecting.set(false);
      this.rejectionReason = '';
    });
  }

  protected receive(): void {
    this.run(this.admin.receive(this.publicId()), 'admin.review.received');
  }

  protected shelve(): void {
    if (!this.locationId) {
      this.toasts.error('admin.review.locationRequired');
      return;
    }

    this.run(
      this.admin.assignLocation(
        this.publicId(),
        this.locationId,
        this.shelfNotes.trim() || null,
      ),
      'admin.review.shelved',
      () => {
        this.shelfNotes = '';
        this.loadLocations();
      },
    );
  }

  private loadLocations(): void {
    this.admin.locations().subscribe({
      next: (locations) => {
        this.locations.set(locations);

        // Pre-selecting the first free shelf saves a click on the common path, and
        // the reviewer can still choose another.
        this.locationId ||= locations[0]?.id ?? '';
      },
      error: () => this.locations.set([]),
    });
  }

  private run(action: Observable<AdminBookDetails>, successKey: string, after?: () => void): void {
    this.working.set(true);

    action.subscribe({
      next: (book) => {
        this.working.set(false);
        this.book.set(book);
        this.toasts.success(successKey);
        after?.();
      },
      error: (error: unknown) => {
        this.working.set(false);

        // The server names the rule that was broken, and that is more use to the
        // reviewer than a generic failure.
        this.toasts.failure(
          error instanceof ApiRequestError ? error.message : 'common.error',
        );
      },
    });
  }
}
