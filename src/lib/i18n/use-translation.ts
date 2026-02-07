'use client';

import { useI18n } from './i18n-context';

/**
 * Convenient hook for translations
 * Re-exports useI18n for easier imports
 */
export function useTranslation() {
  return useI18n();
}

/**
 * Hook that returns only the translation function
 * Useful for components that only need translations
 */
export function useT() {
  const { t } = useI18n();
  return t;
}
