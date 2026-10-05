import type { ConditionGrade } from './book';
import type { OrderStatus } from './order';
import type { BookStatus } from './seller';

// --- The dashboard ---------------------------------------------------------

/** The back-office landing page, in one response. */
export interface AdminDashboard {
  work: WorkloadCounts;
  catalogue: CatalogueCounts;
  commerce: CommerceCounts;
  people: PeopleCounts;
  ordersPerDay: DailyCount[];
  listingsPerDay: DailyCount[];
  reviewQueue: QueueEntry[];
  recentOrders: AdminOrderListItem[];
  currency: string;
}

/** The queues. Every number here is something somebody has to do next. */
export interface WorkloadCounts {
  awaitingReview: number;
  awaitingDelivery: number;
  awaitingShelf: number;
  awaitingPayment: number;
  readyToProcess: number;
}

export interface CatalogueCounts {
  onSale: number;
  reserved: number;
  sold: number;
  inStock: number;
  locations: number;
  totalListings: number;
}

export interface CommerceCounts {
  ordersToday: number;
  ordersThisWeek: number;
  ordersTotal: number;
  grossValue: number;
  platformFees: number;
  cancelled: number;
}

export interface PeopleCounts {
  users: number;
  sellers: number;
  verifiedSellers: number;
  suspendedSellers: number;
}

/** One column of a chart: a day and what happened on it. */
export interface DailyCount {
  date: string;
  count: number;
}

/** A listing waiting for a decision, with how long it has waited. */
export interface QueueEntry {
  publicId: string;
  title: string;
  sellerPublicId: string;
  status: BookStatus;
  since: string;
}

// --- Orders ----------------------------------------------------------------

/** One order in the back-office list. Unlike the buyer's own list, this names them. */
export interface AdminOrderListItem {
  orderNumber: string;
  status: OrderStatus;
  itemCount: number;
  total: number;
  platformFee: number;
  currency: string;
  placedAt: string;
  buyerPublicId: string;
  buyerName: string;
  reservationExpiresAt: string | null;
}

/** One order in full: the only view that sees both sides of a sale. */
export interface AdminOrderDetails {
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  platformFee: number;
  sellerEarnings: number;
  total: number;
  items: AdminOrderLine[];
  buyer: AdminOrderBuyer;
  shippingAddress: AdminShippingAddress;
  placedAt: string;
  reservationExpiresAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface AdminOrderLine {
  bookPublicId: string;
  title: string;
  authorName: string | null;
  isbn: string | null;
  condition: ConditionGrade;
  coverImageUrl: string | null;
  price: number;
  platformFee: number;
  sellerEarnings: number;
  sellerPublicId: string;
  bookStatus: BookStatus;

  /** Where the copy physically sits, or null once it has been dispatched. */
  locationCode: string | null;
}

export interface AdminOrderBuyer {
  publicId: string;
  displayName: string;
  email: string;
}

export interface AdminShippingAddress {
  recipientName: string;
  phoneNumber: string;
  formatted: string;
  notes: string | null;
}

/** What the back office can narrow the order list by. */
export interface AdminOrderQuery {
  status?: OrderStatus | null;
  term?: string | null;
  page?: number;
  pageSize?: number;
}

// --- People ----------------------------------------------------------------

/** One account as the back office lists it. */
export interface AdminUserListItem {
  id: string;
  publicId: string;
  email: string;
  displayName: string;
  emailConfirmed: boolean;
  isActive: boolean;
  roles: string[];
  sellerPublicId: string | null;
  orderCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserSearchQuery {
  term?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  page?: number;
  pageSize?: number;
}

/** A seller as the back office sees them. */
export interface AdminSellerListItem {
  id: string;
  publicId: string;
  displayName: string;
  email: string;
  isVerified: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  listings: number;
  onSale: number;
  sold: number;
  totalSales: number;
  ratingAverage: number | null;
  ratingCount: number;
  joinedAt: string;
}

export interface AdminSellerQuery {
  term?: string | null;
  isVerified?: boolean | null;
  isSuspended?: boolean | null;
  page?: number;
  pageSize?: number;
}

// --- The warehouse ---------------------------------------------------------

/** A physical copy: what it is, where it sits, what the catalogue says about it. */
export interface InventoryItemListItem {
  itemId: string;
  bookPublicId: string;
  title: string;
  authorName: string | null;
  isbn: string | null;
  bookStatus: BookStatus;
  condition: ConditionGrade;
  locationId: string;
  locationCode: string;
  locationDescription: string;
  receivedAt: string;
  dispatchedAt: string | null;
  notes: string | null;
}

/** One step in a copy's physical journey. */
export interface InventoryMovementEntry {
  fromCode: string | null;
  toCode: string | null;
  reason: string;
  actor: string;
  at: string;
}

export interface InventorySearchQuery {
  term?: string | null;
  locationId?: string | null;
  inStock?: boolean | null;
  page?: number;
  pageSize?: number;
}

/** The shelf form, used to add a place and to correct one. */
export interface SaveLocationRequest {
  warehouse: string;
  zone?: string | null;
  rack?: string | null;
  shelf?: string | null;
  box?: string | null;
  capacity?: number | null;
}

// --- Operations ------------------------------------------------------------

/** What an audit entry records. */
export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'statusChanged'
  | 'loggedIn'
  | 'loginFailed'
  | 'passwordChanged'
  | 'bookApproved'
  | 'bookRejected'
  | 'orderPaid'
  | 'orderRefunded'
  | 'withdrawalProcessed'
  | 'inventoryMoved'
  | 'settingChanged';

/** One line of the audit trail. */
export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  actor: string;
  actorPublicId: string | null;
  description: string | null;
  ipAddress: string | null;
  at: string;
}

export interface AuditLogQuery {
  action?: AuditAction | null;
  entityName?: string | null;
  userId?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
}

/** What happened over a window of time. */
export interface PlatformReport {
  from: string;
  to: string;
  catalogue: ReportCatalogue;
  sales: ReportSales;
  topCategories: ReportCategoryRow[];
  currency: string;
}

export interface ReportCatalogue {
  submitted: number;
  approved: number;
  rejected: number;
  published: number;
}

export interface ReportSales {
  orders: number;
  cancelled: number;
  copies: number;
  gross: number;
  fees: number;
  sellerEarnings: number;
  averageOrderValue: number;
}

export interface ReportCategoryRow {
  nameAr: string;
  nameEn: string;
  copies: number;
  value: number;
}

/** One setting the platform runs on. */
export interface PlatformSettingView {
  key: string;
  value: string;
  description: string;
}
