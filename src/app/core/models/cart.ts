import type { BookListItem } from './book';

/**
 * The basket as the server sees it. Prices are re-read from the catalogue on every
 * call, so a basket left open overnight comes back describing what the copies cost
 * now rather than what they cost when they were added.
 */
export interface CartView {
  items: CartLine[];

  /** Lines in the basket, including copies that can no longer be bought. */
  itemCount: number;

  /** Copies that can still be bought. What the header and the summary count. */
  availableCount: number;

  /** What the copies still on sale come to at today's prices. */
  subtotal: number;

  /** Flat delivery charge, or nothing while there is nothing to deliver. */
  shippingCost: number;

  /** What the buyer would pay: the copies plus delivery. */
  total: number;
  currency: string;

  /** True when a line can no longer be bought. */
  hasUnavailableItems: boolean;

  /** True when a price moved since a line was added. */
  hasPriceChanges: boolean;
}

/** One copy in the basket. There is no quantity: a used listing is a single item. */
export interface CartLine {
  book: BookListItem;
  priceAtAdd: number;
  isAvailable: boolean;
  priceChanged: boolean;
  addedAt: string;
}

/**
 * A book saved for later. Saving is not reserving: the copy stays on sale, which is
 * why the entry says whether it can still be bought.
 */
export interface SavedBook {
  book: BookListItem;
  savedAt: string;
  isAvailable: boolean;
}
