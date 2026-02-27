/**
 * Formatting utilities with locale support
 * For React components, prefer useI18n() hooks (formatCurrency, formatDate, formatNumber)
 * These utilities are for non-component contexts (PDF generation, data processing, etc.)
 */

type SupportedLocale = 'es-CL' | 'en-US';

function getLocaleString(locale?: 'es' | 'en'): SupportedLocale {
  return locale === 'en' ? 'en-US' : 'es-CL';
}

/**
 * Formats a number as currency
 * @example formatCurrency(2500000) → "$ 2.500.000"
 */
export function formatCurrency(amount: number, locale?: 'es' | 'en'): string {
  return (
    '$ ' +
    amount.toLocaleString(getLocaleString(locale), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

/**
 * Formats a number with locale-appropriate separators
 * @example formatNumber(2500000) → "2.500.000"
 */
export function formatNumber(value: number, locale?: 'es' | 'en'): string {
  return value.toLocaleString(getLocaleString(locale));
}

/**
 * Formats area in square meters
 * @example formatArea(75) → "75 m²"
 */
export function formatArea(area: number): string {
  return `${area} m²`;
}

/**
 * Formats a date string for display
 * @example formatDate('2026-01-18T14:30:00Z') → "18 ene 2026"
 */
export function formatDate(dateString: string, locale?: 'es' | 'en'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(getLocaleString(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date string with time
 * @example formatDateTime('2026-01-18T14:30:00Z') → "18 ene 2026, 9:30 AM"
 */
export function formatDateTime(dateString: string, locale?: 'es' | 'en'): string {
  const date = new Date(dateString);
  return date.toLocaleString(getLocaleString(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a relative time (e.g., "hace 2 dias" / "2 days ago")
 */
export function formatRelativeTime(dateString: string, locale?: 'es' | 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const isEs = locale !== 'en';

  if (diffMinutes < 1) {
    return isEs ? 'ahora' : 'now';
  }
  if (diffMinutes < 60) {
    return isEs
      ? `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`
      : `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    return isEs
      ? `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
      : `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays < 7) {
    return isEs
      ? `hace ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
      : `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return isEs
      ? `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
      : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  const months = Math.floor(diffDays / 30);
  return isEs
    ? `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
    : `${months} ${months === 1 ? 'month' : 'months'} ago`;
}
