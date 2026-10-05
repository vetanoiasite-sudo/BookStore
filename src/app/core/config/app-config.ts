import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Language codes the UI ships with. */
export type LanguageCode = 'ar' | 'en';

/** Runtime configuration, injected rather than imported so tests can override it. */
export interface AppConfig {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly filesBaseUrl: string;
  readonly defaultLanguage: LanguageCode;
  readonly supportedLanguages: readonly LanguageCode[];
  readonly defaultPageSize: number;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => environment as AppConfig,
});
