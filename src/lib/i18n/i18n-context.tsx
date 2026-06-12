'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Locale, I18nContextValue, TranslationParams, Translations } from './types';
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil } from '@/lib/format';
import es from './locales/es.json';
import en from './locales/en.json';

const translations: Record<Locale, Translations> = { es, en };

const STORAGE_KEY = 'leasefy-locale';
const DEFAULT_LOCALE: Locale = 'es';

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/**
 * Get nested value from translations object using dot notation
 */
function getNestedValue(obj: Translations, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Replace template parameters in translation string
 * Supports {{param}} syntax
 */
function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale = DEFAULT_LOCALE }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (savedLocale && (savedLocale === 'es' || savedLocale === 'en')) {
      setLocaleState(savedLocale);
    }
    setIsHydrated(true);
  }, []);

  // FloppyDisk locale to localStorage when it changes
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Update document lang attribute for accessibility
    document.documentElement.lang = newLocale;
  }, []);

  // Translation function
  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      const translation = getNestedValue(translations[locale], key);
      if (!translation) {
        console.warn(`[i18n] Missing translation for key: "${key}" in locale: "${locale}"`);
        return key;
      }
      return interpolate(translation, params);
    },
    [locale]
  );

  // Format currency — delegates to shared format.ts utility (null-safe).
  const formatCurrency = useCallback(
    (amount: number | null | undefined): string => formatCurrencyUtil(amount, locale),
    [locale]
  );

  // Format number — delegates to shared format.ts utility (null-safe).
  const formatNumber = useCallback(
    (value: number | null | undefined): string => formatNumberUtil(value, locale),
    [locale]
  );

  // Format date based on locale
  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const defaultOptions: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      };
      const localeString = locale === 'es' ? 'es-CO' : 'en-US';
      return dateObj.toLocaleDateString(localeString, options || defaultOptions);
    },
    [locale]
  );

  // Format relative date (e.g., "in 5 days", "2 days ago")
  const formatRelativeDate = useCallback(
    (date: Date | string): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = dateObj.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return locale === 'es' ? 'Hoy' : 'Today';
      }
      if (diffDays === 1) {
        return locale === 'es' ? 'Mañana' : 'Tomorrow';
      }
      if (diffDays === -1) {
        return locale === 'es' ? 'Ayer' : 'Yesterday';
      }
      if (diffDays > 0) {
        return locale === 'es' ? `En ${diffDays} días` : `In ${diffDays} days`;
      }
      return locale === 'es' ? `Hace ${Math.abs(diffDays)} días` : `${Math.abs(diffDays)} days ago`;
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatCurrency,
      formatNumber,
      formatDate,
      formatRelativeDate,
    }),
    [locale, setLocale, t, formatCurrency, formatNumber, formatDate, formatRelativeDate]
  );

  // Prevent hydration mismatch by rendering default locale until hydrated
  if (!isHydrated) {
    return (
      <I18nContext.Provider value={{ ...value, locale: defaultLocale }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * Non-throwing variant of useI18n. Returns the context when an I18nProvider
 * is present in the tree, otherwise undefined. Use this for components mounted
 * at the root layout (outside any route-group provider), e.g. RouteAnnouncer,
 * so they can localize when a provider exists without crashing public routes.
 */
export function useOptionalI18n(): I18nContextValue | undefined {
  return useContext(I18nContext);
}
