import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { PlatformSettingView } from '../../../core/models/back-office';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'error';

/**
 * What the platform is configured to do.
 *
 * Read-only, and honestly so. These values come from the environment the API runs in,
 * which is where a deployment sets them; a screen that let them be typed here would
 * either not take effect or quietly disagree with the environment, and both are worse
 * than a screen that simply says what is true.
 */
@Component({
  selector: 'app-admin-settings',
  imports: [TranslatePipe, UiSkeleton, UiErrorState],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.scss',
})
export class AdminSettings {
  private readonly backOffice = inject(BackOfficeService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<PageState>('loading');
  protected readonly settings = signal<PlatformSettingView[]>([]);
  protected readonly placeholders = [0, 1, 2, 3, 4];

  constructor() {
    this.seo.apply({ titleKey: 'admin.settings.title' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.backOffice.settings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }
}
