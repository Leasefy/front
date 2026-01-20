/**
 * Formatting utilities for Colombian locale
 */

/**
 * Formats a number as Colombian Peso currency
 * @example formatCurrency(2500000) → "$ 2.500.000"
 */
export function formatCurrency(amount: number): string {
  return (
    '$ ' +
    amount.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
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
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date string with time
 * @example formatDateTime('2026-01-18T14:30:00Z') → "18 ene 2026, 9:30 AM"
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a relative time (e.g., "hace 2 dias")
 * @example formatRelativeTime('2026-01-18T14:30:00Z') → "hace 2 dias"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return 'ahora';
  }
  if (diffMinutes < 60) {
    return `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }
  if (diffDays < 7) {
    return `hace ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  const months = Math.floor(diffDays / 30);
  return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}
