'use client';

/**
 * El riel de «Giros a propietarios» con lo que ya está hecho en el mes que la
 * persona tiene a la vista (se lee de los lotes de ese mes).
 */
import { useMemo } from 'react';
import { useLotesDeDispersion } from '@/lib/hooks/use-lotes-de-dispersion';
import { estadoDeLosPasos } from '@/lib/giros/estado-de-los-pasos';
import { PasosDeLosGiros, type PasoDeLosGiros } from './PasosDeLosGiros';

export function PasosDeLosGirosDelMes({ paso, mes, className }: { paso: PasoDeLosGiros; mes: string; className?: string }) {
  const { lotes } = useLotesDeDispersion({ month: mes });
  const estados = useMemo(() => estadoDeLosPasos(lotes, mes), [lotes, mes]);
  return <PasosDeLosGiros paso={paso} estados={estados} className={className} />;
}
