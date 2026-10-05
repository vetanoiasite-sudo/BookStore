import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';
import type { OrderStatus } from '../../core/models/order';

/** Renders where an order has got to, in the active language. */
@Pipe({ name: 'orderStatusLabel', pure: false })
export class OrderStatusLabelPipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(status: OrderStatus | null | undefined): string {
    return status ? this.translations.translate(`orderStatus.${status}`) : '';
  }
}
