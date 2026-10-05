import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { PagedResult } from '../../../core/models/api-response';
import type { AuditAction, AuditLogEntry } from '../../../core/models/back-office';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';
import { UiPagination } from '../../../shared/ui/pagination';

/** The actions worth filtering by: the ones somebody investigates. */
const ACTIONS: { value: AuditAction | ''; labelKey: string }[] = [
  { value: '', labelKey: 'admin.books.filter.all' },
  { value: 'created', labelKey: 'admin.audit.action.created' },
  { value: 'updated', labelKey: 'admin.audit.action.updated' },
  { value: 'deleted', labelKey: 'admin.audit.action.deleted' },
  { value: 'statusChanged', labelKey: 'admin.audit.action.statusChanged' },
  { value: 'loginFailed', labelKey: 'admin.audit.action.loginFailed' },
  { value: 'inventoryMoved', labelKey: 'admin.audit.action.inventoryMoved' },
];

type PageState = 'loading' | 'ready' | 'error';

/**
 * The audit trail: who did what to which row, and when.
 *
 * It deliberately does not show the values that changed. Those can hold personal
 * details, and a trail that leaks them is worse than no trail at all; what it answers
 * is who touched something and when, which is what an investigation starts from.
 */
@Component({
  selector: 'app-admin-audit',
  imports: [
    DatePipe,
    TranslatePipe,
    UiSkeleton,
    UiEmptyState,
    UiErrorState,
    UiPagination,
  ],
  templateUrl: './admin-audit.html',
  styleUrl: './admin-audit.scss',
})
export class AdminAudit {
  private readonly backOffice = inject(BackOfficeService);
  private readonly seo = inject(SeoService);

  protected readonly actions = ACTIONS;
  protected readonly placeholders = [0, 1, 2, 3, 4, 5, 6];

  protected readonly state = signal<PageState>('loading');
  protected readonly result = signal<PagedResult<AuditLogEntry> | null>(null);
  protected readonly entities = signal<string[]>([]);

  protected readonly action = signal<AuditAction | ''>('');
  protected readonly entity = signal('');
  protected readonly page = signal(1);

  protected readonly isEmpty = computed(
    () => this.state() === 'ready' && (this.result()?.totalCount ?? 0) === 0,
  );

  constructor() {
    this.seo.apply({ titleKey: 'admin.audit.title' });
    this.load();

    this.backOffice.auditEntities().subscribe({
      next: (names) => this.entities.set(names),
      error: () => this.entities.set([]),
    });
  }

  protected load(): void {
    this.state.set('loading');

    this.backOffice
      .auditLogs({
        action: this.action() || null,
        entityName: this.entity() || null,
        page: this.page(),
        pageSize: 25,
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }

  protected changeAction(action: AuditAction | ''): void {
    this.action.set(action);
    this.page.set(1);
    this.load();
  }

  protected changeEntity(event: Event): void {
    this.entity.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }
}
