import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, QueryParams } from '../http/api-client';
import type { PagedResult } from '../models/api-response';
import type { InventoryLocationOption } from '../models/admin';
import type {
  AdminCategoryNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../models/category';
import type {
  AdminDashboard,
  AdminOrderDetails,
  AdminOrderListItem,
  AdminOrderQuery,
  AdminSellerListItem,
  AdminSellerQuery,
  AdminUserListItem,
  AuditLogEntry,
  AuditLogQuery,
  InventoryItemListItem,
  InventoryMovementEntry,
  InventorySearchQuery,
  PlatformReport,
  PlatformSettingView,
  SaveLocationRequest,
  UserSearchQuery,
} from '../models/back-office';

/**
 * The back office beyond the review queue: the dashboard, orders, people, the
 * warehouse, the audit trail, reports and the settings the platform runs on.
 *
 * Separate from {@link AdminService}, which is about one listing at a time. These
 * are the screens about the platform itself, and keeping them apart stops one very
 * long service from becoming the place everything back-office lands.
 */
@Injectable({ providedIn: 'root' })
export class BackOfficeService {
  private readonly api = inject(ApiClient);

  // --- The dashboard -------------------------------------------------------

  dashboard(): Observable<AdminDashboard> {
    return this.api.get<AdminDashboard>('/admin/dashboard');
  }

  // --- Orders --------------------------------------------------------------

  orders(query: AdminOrderQuery): Observable<PagedResult<AdminOrderListItem>> {
    return this.api.get<PagedResult<AdminOrderListItem>>('/admin/orders', query as QueryParams);
  }

  order(orderNumber: string): Observable<AdminOrderDetails> {
    return this.api.get<AdminOrderDetails>(`/admin/orders/${encodeURIComponent(orderNumber)}`);
  }

  // --- People --------------------------------------------------------------

  users(query: UserSearchQuery): Observable<PagedResult<AdminUserListItem>> {
    return this.api.get<PagedResult<AdminUserListItem>>('/admin/users', query as QueryParams);
  }

  /** Opens or closes an account. Nothing it has already done is removed. */
  setUserActive(id: string, isActive: boolean): Observable<void> {
    return this.api.post<void>(`/admin/users/${encodeURIComponent(id)}/active`, { isActive });
  }

  sellers(query: AdminSellerQuery): Observable<PagedResult<AdminSellerListItem>> {
    return this.api.get<PagedResult<AdminSellerListItem>>('/admin/sellers', query as QueryParams);
  }

  verifySeller(id: string): Observable<void> {
    return this.api.post<void>(`/admin/sellers/${encodeURIComponent(id)}/verify`);
  }

  suspendSeller(id: string, reason: string): Observable<void> {
    return this.api.post<void>(`/admin/sellers/${encodeURIComponent(id)}/suspend`, { reason });
  }

  reinstateSeller(id: string): Observable<void> {
    return this.api.post<void>(`/admin/sellers/${encodeURIComponent(id)}/reinstate`);
  }

  // --- The warehouse -------------------------------------------------------

  stock(query: InventorySearchQuery): Observable<PagedResult<InventoryItemListItem>> {
    return this.api.get<PagedResult<InventoryItemListItem>>(
      '/admin/inventory/items',
      query as QueryParams,
    );
  }

  stockHistory(itemId: string): Observable<InventoryMovementEntry[]> {
    return this.api.get<InventoryMovementEntry[]>(
      `/admin/inventory/items/${encodeURIComponent(itemId)}/history`,
    );
  }

  moveStock(
    itemId: string,
    locationId: string,
    reason: string | null,
  ): Observable<InventoryItemListItem> {
    return this.api.post<InventoryItemListItem>(
      `/admin/inventory/items/${encodeURIComponent(itemId)}/move`,
      { locationId, reason },
    );
  }

  locations(includeInactive = false): Observable<InventoryLocationOption[]> {
    return this.api.get<InventoryLocationOption[]>('/admin/inventory/locations', {
      includeInactive,
    });
  }

  createLocation(request: SaveLocationRequest): Observable<InventoryLocationOption> {
    return this.api.post<InventoryLocationOption>('/admin/inventory/locations', request);
  }

  updateLocation(
    id: string,
    request: SaveLocationRequest,
  ): Observable<InventoryLocationOption> {
    return this.api.put<InventoryLocationOption>(
      `/admin/inventory/locations/${encodeURIComponent(id)}`,
      request,
    );
  }

  setLocationActive(id: string, isActive: boolean): Observable<InventoryLocationOption> {
    return this.api.post<InventoryLocationOption>(
      `/admin/inventory/locations/${encodeURIComponent(id)}/active`,
      { isActive },
    );
  }

  // --- Categories ----------------------------------------------------------

  /** The whole tree, including categories the storefront hides. */
  categories(): Observable<AdminCategoryNode[]> {
    return this.api.get<AdminCategoryNode[]>('/admin/categories');
  }

  createCategory(request: CreateCategoryRequest): Observable<AdminCategoryNode> {
    return this.api.post<AdminCategoryNode>('/admin/categories', request);
  }

  updateCategory(id: string, request: UpdateCategoryRequest): Observable<AdminCategoryNode> {
    return this.api.put<AdminCategoryNode>(`/admin/categories/${id}`, request);
  }

  /** Moves a category under another parent, or up to a main category with null. */
  moveCategory(id: string, parentId: string | null): Observable<void> {
    return this.api.post<void>(`/admin/categories/${id}/move`, { parentId });
  }

  deleteCategory(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/categories/${id}`);
  }

  // --- Operations ----------------------------------------------------------

  auditLogs(query: AuditLogQuery): Observable<PagedResult<AuditLogEntry>> {
    return this.api.get<PagedResult<AuditLogEntry>>('/admin/audit-logs', query as QueryParams);
  }

  auditEntities(): Observable<string[]> {
    return this.api.get<string[]>('/admin/audit-logs/entities');
  }

  report(from: string | null, to: string | null): Observable<PlatformReport> {
    return this.api.get<PlatformReport>('/admin/reports', { from, to });
  }

  settings(): Observable<PlatformSettingView[]> {
    return this.api.get<PlatformSettingView[]>('/admin/settings');
  }
}
