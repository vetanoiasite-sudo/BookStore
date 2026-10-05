import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiRequestError } from '../../../core/http/api-error';
import type { PagedResult } from '../../../core/models/api-response';
import type { InventoryLocationOption } from '../../../core/models/admin';
import type {
  InventoryItemListItem,
  InventoryMovementEntry,
} from '../../../core/models/back-office';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiStatusBadge } from '../../../shared/ui/status-badge';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiPagination } from '../../../shared/ui/pagination';

type PageState = 'loading' | 'ready' | 'error';

/**
 * The warehouse screen.
 *
 * It is built around one search box, because the person using it is standing at a
 * shelf holding something: a book with a code on it, a shelf with a code on it, an
 * ISBN or just a title. One box that matches all four is faster than four fields, and
 * it is what a scanner types into.
 */
@Component({
  selector: 'app-admin-inventory',
  imports: [
    RouterLink,
    DatePipe,
    ReactiveFormsModule,
    TranslatePipe,
    UiStatusBadge,
    UiSkeleton,
    UiEmptyState,
    UiErrorState,
    UiPagination,
  ],
  templateUrl: './admin-inventory.html',
  styleUrl: './admin-inventory.scss',
})
export class AdminInventory {
  private readonly backOffice = inject(BackOfficeService);
  private readonly toasts = inject(ToastService);
  private readonly translations = inject(TranslationService);
  private readonly builder = inject(FormBuilder);
  private readonly seo = inject(SeoService);

  protected readonly placeholders = [0, 1, 2, 3, 4];

  protected readonly state = signal<PageState>('loading');
  protected readonly result = signal<PagedResult<InventoryItemListItem> | null>(null);
  protected readonly locations = signal<InventoryLocationOption[]>([]);

  protected readonly term = signal('');
  protected readonly page = signal(1);

  /** The copy whose history is open, and the history itself. */
  protected readonly openHistory = signal<string | null>(null);
  protected readonly history = signal<InventoryMovementEntry[]>([]);

  protected readonly busy = signal<string | null>(null);

  /** Whether the shelf list is showing, including the closed ones. */
  protected readonly showLocations = signal(false);
  protected readonly editingLocation = signal<InventoryLocationOption | null>(null);
  protected readonly savingLocation = signal(false);

  protected readonly locationForm = this.builder.nonNullable.group({
    warehouse: ['', [Validators.required, Validators.maxLength(100)]],
    zone: [''],
    rack: [''],
    shelf: [''],
    box: [''],
    capacity: [null as number | null],
  });

  protected readonly isEmpty = computed(
    () => this.state() === 'ready' && (this.result()?.totalCount ?? 0) === 0,
  );

  /** Only open shelves can receive a copy, so only those are offered as a destination. */
  protected readonly openShelves = computed(() =>
    this.locations().filter((location) => location.isActive),
  );

  constructor() {
    this.seo.apply({ titleKey: 'admin.inventory.title' });
    this.load();
    this.loadLocations();
  }

  protected load(): void {
    this.state.set('loading');

    this.backOffice
      .stock({ term: this.term() || null, page: this.page(), pageSize: 20 })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }

  protected search(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    this.term.set((form.elements.namedItem('term') as HTMLInputElement).value.trim());
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  // --- One copy ------------------------------------------------------------

  /** Opens or closes the movement history for one copy. */
  protected toggleHistory(item: InventoryItemListItem): void {
    if (this.openHistory() === item.itemId) {
      this.openHistory.set(null);
      return;
    }

    this.openHistory.set(item.itemId);
    this.history.set([]);

    this.backOffice.stockHistory(item.itemId).subscribe({
      next: (entries) => this.history.set(entries),
      error: () => this.history.set([]),
    });
  }

  /**
   * Moves a copy to another shelf. The reason is asked for rather than assumed: a
   * movement without one is a movement nobody can explain later.
   */
  protected move(item: InventoryItemListItem, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const locationId = select.value;

    if (!locationId || locationId === item.locationId) {
      return;
    }

    const reason = prompt(this.translations.translate('admin.inventory.moveReason')) ?? '';

    this.run(
      item.itemId,
      this.backOffice.moveStock(item.itemId, locationId, reason.trim() || null),
      'admin.inventory.moved',
    );
  }

  // --- The shelves ---------------------------------------------------------

  protected toggleLocations(): void {
    this.showLocations.update((open) => !open);
  }

  protected editLocation(location: InventoryLocationOption | null): void {
    this.editingLocation.set(location);

    // The form is filled from the code the shelf already has, which is built from
    // its parts; there is nothing else to read them back from.
    const parts = location?.code.split('/') ?? [];

    this.locationForm.reset({
      warehouse: parts[0] ?? '',
      zone: parts[1] ?? '',
      rack: parts[2] ?? '',
      shelf: parts[3] ?? '',
      box: parts[4] ?? '',
      capacity: location?.capacity ?? null,
    });
  }

  protected saveLocation(): void {
    if (this.locationForm.invalid) {
      this.locationForm.markAllAsTouched();
      return;
    }

    const value = this.locationForm.getRawValue();

    const request = {
      warehouse: value.warehouse.trim(),
      zone: value.zone.trim() || null,
      rack: value.rack.trim() || null,
      shelf: value.shelf.trim() || null,
      box: value.box.trim() || null,
      capacity: value.capacity,
    };

    const editing = this.editingLocation();
    this.savingLocation.set(true);

    const action = editing
      ? this.backOffice.updateLocation(editing.id, request)
      : this.backOffice.createLocation(request);

    action.subscribe({
      next: () => {
        this.savingLocation.set(false);
        this.editingLocation.set(null);
        this.locationForm.reset({ warehouse: '', zone: '', rack: '', shelf: '', box: '' });
        this.toasts.success('admin.inventory.locationSaved');
        this.loadLocations();
      },
      error: (error: unknown) => {
        this.savingLocation.set(false);
        this.report(error);
      },
    });
  }

  protected toggleLocationActive(location: InventoryLocationOption): void {
    this.run(
      location.id,
      this.backOffice.setLocationActive(location.id, !location.isActive),
      location.isActive ? 'admin.inventory.locationClosed' : 'admin.inventory.locationOpened',
    );
  }

  private loadLocations(): void {
    this.backOffice.locations(true).subscribe({
      next: (locations) => this.locations.set(locations),
      error: () => this.locations.set([]),
    });
  }

  private run(id: string, action: Observable<unknown>, successKey: string): void {
    this.busy.set(id);

    action.subscribe({
      next: () => {
        this.busy.set(null);
        this.toasts.success(successKey);
        this.load();
        this.loadLocations();
      },
      error: (error: unknown) => {
        this.busy.set(null);
        this.report(error);
      },
    });
  }

  private report(error: unknown): void {
    if (error instanceof ApiRequestError) {
      this.toasts.failure(error.message);
    } else {
      this.toasts.error('common.error');
    }
  }
}
