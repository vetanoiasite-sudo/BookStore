import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * Renders a translation key. Impure because the active language is a signal that can
 * change while the page is open, and the pipe must re-evaluate when it does.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(key: string, parameters?: Record<string, string | number>): string {
    return this.translations.translate(key, parameters);
  }
}
