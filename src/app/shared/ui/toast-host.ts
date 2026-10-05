import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ToastService } from '../../core/services/toast.service';

/**
 * The corner of the screen where confirmations and failures appear. Rendered once by
 * each shell rather than by the pages that raise messages, so a message survives the
 * navigation that follows the action which produced it.
 */
@Component({
  selector: 'ui-toast-host',
  imports: [TranslatePipe],
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.tone }}">
          <p class="toast__text">
            @if (toast.literal) {
              {{ toast.message }}
            } @else {
              {{ toast.message | t }}
            }
          </p>
          <button
            type="button"
            class="toast__close"
            (click)="toasts.dismiss(toast.id)"
            [attr.aria-label]="'common.dismiss' | t"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-host.scss',
})
export class UiToastHost {
  protected readonly toasts = inject(ToastService);
}
