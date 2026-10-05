import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';

/**
 * Formats a price for the active language. Arabic uses Arabic-Indic digits, which is
 * what a reader of the Arabic interface expects to see on a price tag.
 */
@Pipe({ name: 'price', pure: false })
export class PricePipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(value: number | null | undefined, currency = 'EGP'): string {
    if (value === null || value === undefined) {
      return '';
    }

    const locale = this.translations.language() === 'ar' ? 'ar-EG' : 'en-EG';

    const amount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);

    return `${amount} ${this.translations.translate('common.currency', { currency })}`;
  }
}
