import * as Sentry from '@sentry/react';
import { ENV } from '@/config/env';

export function initializeSentry() {
  Sentry.init({
    dsn: 'https://your-sentry-dsn@sentry.io/project-id', // Replace with actual DSN
    environment: ENV.APP_ENV,
    integrations: [
      // Add browser integrations here
    ],
    // Performance monitoring
    tracesSampleRate: 1.0,
    // Release tracking
    release: '1.0.0',
    // User context
    beforeSend(event) {
      // Filter out non-critical errors in production
      if (ENV.APP_ENV === 'production') {
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.type === 'ChunkLoadError' || 
              error?.value?.includes('Loading chunk')) {
            return null; // Ignore chunk loading errors
          }
        }
      }
      return event;
    },
  });
}

// Error boundary component
export const SentryErrorBoundary = Sentry.withErrorBoundary;

// Performance monitoring helpers
export const addBreadcrumb = Sentry.addBreadcrumb;
export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const setUser = Sentry.setUser;
export const setTag = Sentry.setTag;
export const setContext = Sentry.setContext;