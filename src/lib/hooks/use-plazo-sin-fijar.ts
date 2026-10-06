'use client';

/**
 * ¿La inmobiliaria todavía no fijó sus días de plazo? (QA-CONT, Nico
 * 03-10-2026 · CR-31 / J-13.)
 *
 * Con la configuración de fábrica (plazo 0) el arriendo del día 1 es «cartera»
 * ese mismo día. La regla: la inmobiliaria debe fijar su plazo (sugerido 5) y,
 * mientras no lo haga, no se cobra interés y la ficha lo avisa fuerte. Lo dice
 * `Agency.plazoDePagoFijadoAt` (`GET /inmobiliaria/agency`, que ven todos los
 * roles): `null` = nunca lo fijó.
 *
 * Devuelve `true` SÓLO cuando se sabe: cargando, con un fallo o con un back
 * que no manda el campo, `false` (no se avisa sobre un supuesto).
 */
import { useEffect, useState } from 'react';
import { agencyApi } from '@/lib/api/inmobiliaria.service';

export function usePlazoSinFijar(activo = true): boolean {
  const [sinFijar, setSinFijar] = useState(false);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    Promise.resolve()
      .then(() => agencyApi.getMyAgency())
      .then((a) => {
        const fila = a as unknown as Record<string, unknown> | null;
        if (vivo) setSinFijar(Boolean(fila && 'plazoDePagoFijadoAt' in fila && fila.plazoDePagoFijadoAt === null));
      })
      .catch(() => {
        if (vivo) setSinFijar(false);
      });
    return () => {
      vivo = false;
    };
  }, [activo]);
  return sinFijar;
}
