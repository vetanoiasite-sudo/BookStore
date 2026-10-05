/** A heading and its text in both languages. */
export interface LocalizedEntry {
  titleAr: string;
  titleEn: string;
  textAr: string;
  textEn: string;
}

/** One path through the platform: selling or buying. */
export interface Journey {
  key: 'sell' | 'buy';
  titleAr: string;
  titleEn: string;
  introAr: string;
  introEn: string;

  /** In the order they happen. */
  steps: LocalizedEntry[];
}

/** The live commercial settings the page text quotes. */
export interface PlatformFigures {
  currency: string;
  feePercent: number;
  shippingCost: number;
  reservationMinutes: number;
  settlementDays: number;
}

/** The "how it works" page as the API serves it. */
export interface HowItWorksContent {
  figures: PlatformFigures;
  journeys: Journey[];
  rules: LocalizedEntry[];
  questions: LocalizedEntry[];
}
