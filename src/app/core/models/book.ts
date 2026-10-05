/** Overall condition of a used copy, best to worst. */
export type ConditionGrade =
  | 'new'
  | 'likeNew'
  | 'veryGood'
  | 'good'
  | 'acceptable'
  | 'poor';

/** Language a book is written in. */
export type BookLanguage = 'arabic' | 'english' | 'french' | 'german' | 'turkish' | 'other';

/** What a book photograph shows. */
export type BookImageType = 'cover' | 'backCover' | 'insidePage' | 'isbn' | 'damage' | 'other';

/** How the catalogue listing is ordered. */
export type BookSortOption =
  | 'Newest'
  | 'Oldest'
  | 'PriceLowToHigh'
  | 'PriceHighToLow'
  | 'MostPopular';

/** One copy as it appears in a grid. */
export interface BookListItem {
  publicId: string;
  urlSegment: string;
  title: string;
  authorName: string | null;
  coverImageUrl: string | null;
  price: number;
  currency: string;
  condition: ConditionGrade;
  language: BookLanguage;
  categoryNameAr: string;
  categoryNameEn: string;
  publishedAt: string | null;
}

/** The detailed condition shown on a book page. */
export interface BookConditionDetails {
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

/** One photograph of a copy. */
export interface BookImageItem {
  url: string;
  type: BookImageType;
  altText: string | null;
  width: number;
  height: number;
}

/**
 * What the buyer is told about the seller. There is no name and no way to make
 * contact: the platform is the only channel between the two parties.
 */
export interface SellerBadge {
  publicId: string;
  isVerified: boolean;
  totalSales: number;
  ratingAverage: number | null;
  ratingCount: number;
}

/** The full book page. */
export interface BookDetails {
  publicId: string;
  urlSegment: string;
  title: string;
  description: string | null;
  isbn: string | null;
  authorName: string | null;
  publisherName: string | null;
  categoryNameAr: string;
  categoryNameEn: string;
  categorySlug: string;
  language: BookLanguage;
  publicationYear: number | null;
  pageCount: number | null;
  price: number;
  currency: string;
  isAvailable: boolean;
  condition: BookConditionDetails;
  images: BookImageItem[];
  seller: SellerBadge;
  publishedAt: string | null;
}

/** Everything a caller can ask the catalogue for. */
export interface BookSearchCriteria {
  q?: string | null;
  category?: string | null;
  author?: string | null;
  publisher?: string | null;
  language?: BookLanguage | null;

  /** Repeat to accept several grades; empty means any. */
  condition?: ConditionGrade[] | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minYear?: number | null;
  maxYear?: number | null;
  sort?: BookSortOption;
  page?: number;
  pageSize?: number;
}

/** One value a filter can take, and how many copies are behind it. */
export interface NamedFacet {
  slug: string;
  name: string;
  nameEn: string | null;
  count: number;
}

/** One language on offer, with its count. */
export interface LanguageFacet {
  value: BookLanguage;
  count: number;
}

/** One condition grade on offer, with its count. */
export interface ConditionFacet {
  value: ConditionGrade;
  count: number;
}

/** The cheapest and dearest matching copy. */
export interface PriceBounds {
  min: number;
  max: number;
}

/** The earliest and latest publication year in the matching set. */
export interface YearBounds {
  min: number;
  max: number;
}

/**
 * What the filter panel offers beside a set of results. Every value listed would
 * return something, and the bounds ignore the range already chosen so a range can
 * always be widened again.
 */
export interface BookFilterOptions {
  authors: NamedFacet[];
  publishers: NamedFacet[];
  languages: LanguageFacet[];
  conditions: ConditionFacet[];

  /** Absent when nothing matches, because there is then no range to offer. */
  price?: PriceBounds | null;
  years?: YearBounds | null;
  currency: string;
}
