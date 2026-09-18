'use client';

/**
 * El selector de mes de las pantallas de finanzas: ‹ septiembre de 2026 ›.
 *
 * No deja pasar del mes actual —un mes futuro no tiene nada que mostrar y el
 * back lo devolvería en ceros, que se lee como «no se recaudó nada»— y usa el
 * mismo helper de meses que Recaudo (`@/lib/recaudo/meses`), que resuelve
 * «hoy» en Bogotá y no en el huso del navegador.
 */

import { CaretLeft, CaretRight } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { esFuturo, mesActual, nombreDelMes, sumarMeses } from '@/lib/recaudo/meses';

/** «septiembre de 2026» → «Septiembre de 2026». */
export function conMayusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function SelectorDeMes({
  mes,
  onCambiar,
  testId = 'selector-de-mes',
}: {
  mes: string;
  onCambiar: (mes: string) => void;
  testId?: string;
}) {
  const siguiente = sumarMeses(mes, 1);
  const haySiguiente = !esFuturo(siguiente, mesActual());

  return (
    <div className="flex items-center gap-1" data-testid={testId} data-mes={mes}>
      <Button
        variant="ghost"
        size="icon"
        hideArrow
        aria-label="Mes anterior"
        onClick={() => onCambiar(sumarMeses(mes, -1))}
      >
        <CaretLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span className="min-w-[10.5rem] text-center text-sm font-medium text-fg" data-testid={`${testId}-nombre`}>
        {conMayusculaInicial(nombreDelMes(mes))}
      </span>
      <Button
        variant="ghost"
        size="icon"
        hideArrow
        aria-label="Mes siguiente"
        disabled={!haySiguiente}
        onClick={() => onCambiar(siguiente)}
      >
        <CaretRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
