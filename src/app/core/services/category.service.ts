import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiClient } from '../http/api-client';
import type { CategoryBreadcrumb, CategoryNode } from '../models/category';

/**
 * Reads the category tree. The tree is small and changes rarely, so the full tree is
 * fetched once and shared: the header, the storefront listing and the filter panel
 * all need it, and none of them should cause a second request.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiClient);

  private tree$?: Observable<CategoryNode[]>;

  /** The whole tree of active categories. Cached for the life of the page. */
  tree(): Observable<CategoryNode[]> {
    this.tree$ ??= this.api
      .get<CategoryNode[]>('/categories')
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    return this.tree$;
  }

  /** One category with its breadcrumb and children. */
  get(slug: string): Observable<CategoryBreadcrumb> {
    return this.api.get<CategoryBreadcrumb>(`/categories/${encodeURIComponent(slug)}`);
  }
}
