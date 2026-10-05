import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';
import type { BookLanguage, ConditionGrade } from '../../core/models/book';

/** Renders a condition grade in the active language. */
@Pipe({ name: 'conditionLabel', pure: false })
export class ConditionLabelPipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(grade: ConditionGrade | null | undefined): string {
    return grade ? this.translations.translate(`condition.${grade}`) : '';
  }
}

/** Renders a book language in the active language. */
@Pipe({ name: 'languageLabel', pure: false })
export class LanguageLabelPipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(language: BookLanguage | null | undefined): string {
    return language ? this.translations.translate(`language.${language}`) : '';
  }
}
