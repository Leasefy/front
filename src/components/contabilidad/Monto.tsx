'use client';

/**
 * Un monto en COP, en mono y tabular, alineado a la derecha por la celda.
 *
 * `vacioSiCero`: en una columna Débito/Crédito, el lado que no se usó va en
 * blanco — un «$ 0» en cada línea es ruido que tapa el que sí importa.
 * `conSigno`: para saldos que pueden ser negativos (estado de cuenta).
 */

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface MontoProps {
  valor: number;
  vacioSiCero?: boolean;
  className?: string;
}

export function Monto({ valor, vacioSiCero = false, className }: MontoProps) {
  const { formatCurrency } = useI18n();
  if (vacioSiCero && valor === 0) {
    return (
      <span className={cn('font-mono tabular-nums text-fg-subtle', className)} aria-label="sin monto">
        —
      </span>
    );
  }
  const negativo = valor < 0;
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        negativo && 'text-danger',
        className,
      )}
    >
      {negativo ? `−${formatCurrency(Math.abs(valor))}` : formatCurrency(valor)}
    </span>
  );
}
