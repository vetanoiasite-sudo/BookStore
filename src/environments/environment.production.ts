/**
 * Production configuration. Same-origin by default, so the API is expected to be
 * served behind the same host under /api.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  filesBaseUrl: '',
  defaultLanguage: 'ar' as const,
  supportedLanguages: ['ar', 'en'] as const,
  defaultPageSize: 20,
};
