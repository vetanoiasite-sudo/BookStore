import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';

/** A category carries both names; this picks the one for the active language. */
@Pipe({ name: 'categoryName', pure: false })
export class CategoryNamePipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(arabic: string | null | undefined, english: string | null | undefined): string {
    return (this.translations.language() === 'ar' ? arabic : english) ?? '';
  }
}
