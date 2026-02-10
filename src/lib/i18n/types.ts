// i18n Types for Leasefy Tenant Dashboard

export type Locale = 'es' | 'en';

export type TranslationKey = string;

export interface TranslationParams {
  [key: string]: string | number;
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (value: number) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeDate: (date: Date | string) => string;
}

export interface Translations {
  [key: string]: string | Translations;
}

// Nested key access type helper
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;
