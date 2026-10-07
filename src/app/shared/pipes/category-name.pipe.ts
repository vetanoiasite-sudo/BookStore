import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';

/**
 * A category carries both names; this picks the one for the active language. The
 * English name is optional, so the Arabic one stands in when it is missing.
 */
@Pipe({ name: 'categoryName', pure: false })
export class CategoryNamePipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(arabic: string | null | undefined, english: string | null | undefined): string {
    return (this.translations.language() === 'ar' ? arabic : english || arabic) ?? '';
  }
}
