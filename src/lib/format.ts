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
