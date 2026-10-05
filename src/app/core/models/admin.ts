import type { BookLanguage, ConditionGrade } from './book';
import type {
  BookStatus,
  BookTimelineEntry,
  SellerBookCondition,
  SellerBookImage,
} from './seller';

/** One copy in the back-office queue. */
export interface AdminBookListItem {
  publicId: string;
  title: string;
  authorName: string | null;
  coverImageUrl: string | null;
  price: number;
  currency: string;
  condition: ConditionGrade;
  status: BookStatus;
  sellerPublicId: string;
  sellerDisplayName: string;
  categoryNameAr: string;
  categoryNameEn: string;
  imageCount: number;
  locationCode: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/** The seller as the back office sees them: enough to judge, nothing to contact. */
export interface AdminSellerSummary {
  publicId: string;
  displayName: string;
  isVerified: boolean;
  isSuspended: boolean;
  totalSales: number;
  ratingAverage: number | null;
  ratingCount: number;
  totalListings: number;
}

/** Where a copy physically sits, once the warehouse has shelved it. */
export interface InventoryPlacement {
  locationId: string;
  code: string;
  description: string;
  receivedAt: string;
  notes: string | null;
}

/** A shelf a copy can be assigned to. */
export interface InventoryLocationOption {
  id: string;
  code: string;
  description: string;
  isActive: boolean;
  capacity: number | null;
  itemCount: number;
}

/** Everything a reviewer needs on one screen to decide. */
export interface AdminBookDetails {
  publicId: string;
  urlSegment: string;
  title: string;
  description: string | null;
  isbn: string | null;
  authorName: string | null;
  publisherName: string | null;
  categorySlug: string;
  categoryNameAr: string;
  categoryNameEn: string;
  language: BookLanguage;
  publicationYear: number | null;
  pageCount: number | null;
  price: number;
  currency: string;
  status: BookStatus;
  rejectionReason: string | null;
  viewCount: number;
  seller: AdminSellerSummary;
  condition: SellerBookCondition;
  images: SellerBookImage[];
  timeline: BookTimelineEntry[];
  placement: InventoryPlacement | null;

  /** What the state machine allows from here, so the screen never offers more. */
  allowedNextStatuses: BookStatus[];
  createdAt: string;
  updatedAt: string | null;
  approvedAt: string | null;
  receivedAt: string | null;
  publishedAt: string | null;
  soldAt: string | null;
}

/** What the back office can ask the book list for. */
export interface AdminBookQuery {
  status?: BookStatus | null;
  q?: string | null;
  seller?: string | null;
  page?: number;
  pageSize?: number;
}
