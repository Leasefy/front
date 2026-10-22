'use client';

/**
 * El mes de «Giros a propietarios»: UN selector, a la derecha del riel, que vale
 * para los cuatro pasos (ronda 19 de la revisora). Antes el paso 1 tenía un
 * select en la tarjeta de la tabla, el 2 ninguno y el 3 flechas en una tarjeta.
 */
import { useMemo } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTr } from '@/lib/i18n/use-tr';
import { mesesDeLosGiros } from '@/lib/giros/meses-de-los-giros';

export function MesDeLosGiros({ mes, onCambiar }: { mes: string; onCambiar: (mes: string) => void }) {
  const tr = useTr();
  const meses = useMemo(() => mesesDeLosGiros(), []);
  return (
    <Select value={mes} onValueChange={onCambiar}>
      {/* `w-56` y no `min-w`: el trigger del DS es `w-full` y se estiraba a todo el renglón. */}
      <SelectTrigger className="w-full gap-2 sm:w-56" aria-label={tr('Mes de los giros')} data-testid="mes-de-los-giros">
        <CalendarBlank className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {meses.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
