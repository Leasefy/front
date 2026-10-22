'use client';

/**
 * El riel de «Giros a propietarios» con lo que ya está hecho en el mes que la
 * persona tiene a la vista (se lee de los lotes de ese mes) y, a su derecha, el
 * ÚNICO selector del mes, que vale para los cuatro pasos.
 */
import { useMemo } from 'react';
import { useLotesDeDispersion } from '@/lib/hooks/use-lotes-de-dispersion';
import { estadoDeLosPasos } from '@/lib/giros/estado-de-los-pasos';
import { cn } from '@/lib/utils';
import { PasosDeLosGiros, type PasoDeLosGiros } from './PasosDeLosGiros';
import { MesDeLosGiros } from './MesDeLosGiros';

export function PasosDeLosGirosDelMes({
  paso,
  mes,
  onCambiarMes,
  className,
}: {
  paso: PasoDeLosGiros;
  mes: string;
  /** Sin él, el riel va solo (sin selector). */
  onCambiarMes?: (mes: string) => void;
  className?: string;
}) {
  const { lotes } = useLotesDeDispersion({ month: mes });
  const estados = useMemo(() => estadoDeLosPasos(lotes, mes), [lotes, mes]);
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <PasosDeLosGiros paso={paso} estados={estados} mes={mes} className="min-w-0 sm:flex-1" />
      {onCambiarMes ? (
        <div className="shrink-0">
          <MesDeLosGiros mes={mes} onCambiar={onCambiarMes} />
        </div>
      ) : null}
    </div>
  );
}
