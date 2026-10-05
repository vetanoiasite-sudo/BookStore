/** One node of the public category tree. Addressed by slug, never by an internal id. */
export interface CategoryNode {
  slug: string;
  nameAr: string;
  nameEn: string;

  /** Copies on sale here and in everything beneath, so a parent is never emptier. */
  bookCount: number;

  children: CategoryNode[];
}

/** A link to a category, used for breadcrumbs. */
export interface CategoryLink {
  slug: string;
  nameAr: string;
  nameEn: string;
}

/** One category with the path back to the root and its direct children. */
export interface CategoryBreadcrumb {
  slug: string;
  nameAr: string;
  nameEn: string;
  bookCount: number;

  /** Root first, ending with the parent. Empty for a root category. */
  ancestors: CategoryLink[];

  children: CategoryNode[];
}

/**
 * One node of the category tree as the back office sees it: inactive categories
 * included, with the id the management endpoints take.
 */
export interface AdminCategoryNode {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;

  /** Whether the storefront shows it. */
  isActive: boolean;

  /** Position among its siblings. */
  sortOrder: number;

  /** Books filed directly in this category. */
  directBookCount: number;

  /** Books here and in everything beneath. */
  totalBookCount: number;

  children: AdminCategoryNode[];
}

export interface CreateCategoryRequest {
  nameAr: string;
  nameEn: string;

  /** The parent, or null for a main category. */
  parentId: string | null;
  sortOrder: number;
}

export interface UpdateCategoryRequest {
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  isActive: boolean;
}
