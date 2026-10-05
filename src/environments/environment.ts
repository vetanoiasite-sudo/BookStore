/**
 * Development configuration. The API base URL is never hard-coded inside
 * components or services; everything reads it from here.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  filesBaseUrl: '',
  defaultLanguage: 'ar' as const,
  supportedLanguages: ['ar', 'en'] as const,
  defaultPageSize: 20,
};
