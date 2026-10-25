'use client';

/**
 * «No pudimos traer tus acuerdos de pago ahora» — GLOW UP (21-10-2026).
 *
 * Una lista que junta varias fuentes (pagos, solicitudes, acuerdos…) no se
 * borra entera porque UNA no respondió: muestra lo que llegó y dice, en una
 * línea, qué faltó, con «Reintentar». Sin culpar a nadie (regla de las caídas).
 */
import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import type { FuenteDeCasos } from '@/lib/hooks/use-tenant-cases';

const NOMBRE: Record<FuenteDeCasos, { es: string; en: string }> = {
  pagos: { es: 'tus pagos', en: 'your payments' },
  arriendo: { es: 'lo de tu arriendo', en: 'your rental details' },
  postulaciones: { es: 'tus postulaciones', en: 'your applications' },
  solicitudes: { es: 'tus solicitudes', en: 'your requests' },
  acuerdos: { es: 'tus acuerdos de pago', en: 'your payment agreements' },
};

/** «tus solicitudes y tus acuerdos de pago». */
export function fuentesEnPalabras(fuentes: readonly FuenteDeCasos[], locale: string): string {
  const es = locale !== 'en';
  const nombres = fuentes.map((f) => (es ? NOMBRE[f].es : NOMBRE[f].en));
  return new Intl.ListFormat(es ? 'es-CO' : 'en-US', { type: 'conjunction' }).format(nombres);
}

export function AvisoDeFuentesCaidas({
  fuentes,
  locale,
  onReintentar,
  className,
}: {
  fuentes: readonly FuenteDeCasos[];
  locale: string;
  onReintentar: () => void;
  className?: string;
}) {
  if (!fuentes || fuentes.length === 0) return null;
  const es = locale !== 'en';
  return (
    <div
      role="status"
      className={`flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
      data-testid="fuentes-caidas"
    >
      <p className="flex items-start gap-2 text-body-sm text-fg">
        <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <span>
          {es
            ? `No pudimos traer ${fuentesEnPalabras(fuentes, locale)} ahora. Lo demás que ves está al día.`
            : `We couldn't load ${fuentesEnPalabras(fuentes, locale)} right now. Everything else you see is up to date.`}
        </span>
      </p>
      <Button variant="outline" size="sm" hideArrow onClick={onReintentar} className="self-start sm:self-auto">
        <ArrowClockwise className="h-4 w-4" aria-hidden="true" />
        {es ? 'Reintentar' : 'Retry'}
      </Button>
    </div>
  );
}
