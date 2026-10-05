import type { ConditionGrade } from './book';

/** Where an order has got to. Orders only ever move forward through these. */
export type OrderStatus =
  | 'pendingPayment'
  | 'paid'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded'
  | 'completed';

/** A delivery address as its owner sees it. Sellers never see one of these. */
export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string | null;
  street: string;
  buildingNumber: string | null;
  apartment: string | null;
  postalCode: string | null;
  notes: string | null;
  isDefault: boolean;

  /** The address on one line, for a summary. */
  formatted: string;
}

/** The address form, used to add one and to edit one. */
export interface SaveAddressRequest {
  label: string;
  recipientName: string;
  phoneNumber: string;
  country: string;
  city: string;
  street: string;
  district?: string | null;
  buildingNumber?: string | null;
  apartment?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  isDefault?: boolean;
}

/** One order in the buyer's list. */
export interface OrderSummary {
  orderNumber: string;
  status: OrderStatus;
  itemCount: number;
  total: number;
  currency: string;
  placedAt: string;

  /** When the copies go back on sale if payment does not arrive. */
  reservationExpiresAt: string | null;
  title: string;
  coverImageUrl: string | null;
}

/** The order page. Everything on it was frozen at checkout. */
export interface OrderDetails {
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  items: OrderLine[];
  shippingAddress: ShippingAddressView;
  placedAt: string;
  reservationExpiresAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  canCancel: boolean;
  canConfirmReceipt: boolean;
}

/** One purchased copy, described as it was at the moment of purchase. */
export interface OrderLine {
  bookPublicId: string;
  title: string;
  authorName: string | null;
  isbn: string | null;
  condition: ConditionGrade;
  coverImageUrl: string | null;
  price: number;
}

/** Where the parcel is going, frozen at checkout. */
export interface ShippingAddressView {
  recipientName: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string | null;
  street: string;
  buildingNumber: string | null;
  apartment: string | null;
  postalCode: string | null;
  notes: string | null;
  formatted: string;
}
