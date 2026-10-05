import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  inject,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { authInterceptor } from './core/http/auth.interceptor';
import { TranslationService } from './core/i18n/translation.service';
import { AuthService } from './core/services/auth.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    // Every call carries the bearer token and survives one expiry, so no feature
    // service has to know that tokens exist at all.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      // Route parameters arrive as component inputs, so a page reads its own address
      // rather than subscribing to the router.
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),

    // The dictionary is loaded before the first render, so no page ever flashes its
    // translation keys before the text arrives.
    provideAppInitializer(() => inject(TranslationService).initialise()),

    // The session is restored before the first render too. Without this a guard
    // would run against an empty session and bounce a signed-in reader to the
    // sign-in page on every reload.
    provideAppInitializer(() => inject(AuthService).restore()),
  ],
};
