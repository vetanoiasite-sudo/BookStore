import type { BookImageType, BookLanguage, ConditionGrade } from './book';

/** Where a copy is in its lifecycle, exactly as the API spells it. */
export type BookStatus =
  | 'draft'
  | 'pendingReview'
  | 'approved'
  | 'rejected'
  | 'waitingForDelivery'
  | 'received'
  | 'available'
  | 'reserved'
  | 'sold'
  | 'returned'
  | 'archived';

/** One of the seller's own listings, as it appears in their list. */
export interface SellerBookListItem {
  publicId: string;
  title: string;
  authorName: string | null;
  coverImageUrl: string | null;
  price: number;
  currency: string;
  condition: ConditionGrade;
  status: BookStatus;
  rejectionReason: string | null;
  imageCount: number;
  viewCount: number;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/** The detailed condition of a copy, as stored. */
export interface SellerBookCondition {
  grade: ConditionGrade;
  coverCondition: ConditionGrade;
  pagesCondition: ConditionGrade;
  hasWritingInside: boolean;
  hasHighlighting: boolean;
  hasTornPages: boolean;
  hasMissingPages: boolean;
  hasYellowing: boolean;
  otherDamage: string | null;
  notes: string | null;
}

/** One stored photograph of a copy. */
export interface SellerBookImage {
  id: string;
  url: string;
  type: BookImageType;
  altText: string | null;
  width: number;
  height: number;
  sizeInBytes: number;
}

/** One recorded step in a copy's life. */
export interface BookTimelineEntry {
  fromStatus: BookStatus;
  toStatus: BookStatus;
  reason: string | null;
  at: string;
}

/** One listing in full, as the seller's form needs it. */
export interface SellerBookDetails {
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
  isEditable: boolean;
  canSubmit: boolean;
  viewCount: number;
  condition: SellerBookCondition;
  images: SellerBookImage[];
  timeline: BookTimelineEntry[];
  createdAt: string;
  updatedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  soldAt: string | null;
}

/** Everything a seller fills in about a copy. */
export interface SaveSellerBookRequest {
  title: string;
  categorySlug: string;
  price: number;
  language: BookLanguage;
  condition: SellerBookCondition;
  description: string | null;
  isbn: string | null;
  authorName: string | null;
  publisherName: string | null;
  publicationYear: number | null;
  pageCount: number | null;
}

/** What the seller can ask their own list for. */
export interface SellerBookQuery {
  status?: BookStatus | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
}

/** The numbers on the seller's landing page. */
export interface SellerDashboard {
  sellerPublicId: string;
  displayName: string;
  isVerified: boolean;
  isSuspended: boolean;
  drafts: number;
  awaitingReview: number;
  rejected: number;
  awaitingDelivery: number;
  inWarehouse: number;
  onSale: number;
  reserved: number;
  sold: number;
  totalListings: number;
  totalViews: number;
  totalSales: number;
  ratingAverage: number | null;
  ratingCount: number;
  recent: SellerBookListItem[];
}

/** What the recogniser thinks it saw on a cover. */
export interface BookRecognitionResult {
  title: string | null;
  authorName: string | null;
  publisherName: string | null;
  isbn: string | null;
  publicationYear: number | null;
  language: string | null;
  confidence: number;
  provider: string;
}
