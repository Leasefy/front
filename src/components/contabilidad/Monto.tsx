'use client';

/**
 * Un monto en COP, en mono y tabular, alineado a la derecha por la celda.
 *
 * `vacioSiCero`: en una columna Débito/Crédito, el lado que no se usó va en
 * blanco — un «$ 0» en cada línea es ruido que tapa el que sí importa.
 * `conSigno`: para saldos que pueden ser negativos (estado de cuenta).
 *
 * 🔴 20-09 · `whitespace-nowrap` va acá y no en cada celda. Con el libro mayor
 * abierto en el navegador —quince columnas de meses apretadas en 1440 px— los
 * montos se partían en dos renglones: el «$» arriba y «2.000» abajo, y el
 * signo menos de un saldo negativo quedaba solo en la primera línea. El
 * espacio que pone `formatCurrency` entre el símbolo y la cifra es un espacio
 * común, así que el navegador corta ahí en cuanto la columna aprieta.
 *
 * Es del PRIMITIVO, no de la pantalla: lo mismo iba a pasar en cualquier tabla
 * contable angosta, y ponerlo celda por celda deja el próximo caso sin cubrir.
 * Un monto no se parte nunca; si no cabe, la columna es la que tiene que ceder.
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
      <span
        className={cn('whitespace-nowrap font-mono tabular-nums text-fg-subtle', className)}
        aria-label="sin monto"
      >
        —
      </span>
    );
  }
  const negativo = valor < 0;
  return (
    <span
      className={cn(
        'whitespace-nowrap font-mono tabular-nums',
        negativo && 'text-danger',
        className,
      )}
    >
      {negativo ? `−${formatCurrency(Math.abs(valor))}` : formatCurrency(valor)}
    </span>
  );
}
