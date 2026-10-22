'use client';

/**
 * «2 candidatos esperan tu decisión · Revisar» — lo primero del Resumen de un
 * inmueble disponible (revisión de diseño del 22-10-2026: «lo pendiente de verdad
 * no aparece»). Sólo se pinta si alguien espera; sin candidatos, o si no se
 * pudieron leer, no ocupa lugar (la pestaña Arrendarlo los muestra con su vacío
 * y su fallo).
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Avatar } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { ESPERANDO } from '@/components/inmobiliaria/CandidatosDelInmueble';
import { SUPERFICIE_DE_LA_FICHA } from '@/components/pantalla/TarjetaDeLaFicha';
import { landlordApplicationsApi } from '@/lib/api/applications.service';
import type { LandlordCandidate } from '@/lib/api/applications.types';
import { cn } from '@/lib/utils';

export function CandidatosQueEsperan({
  propertyId,
  consignacionId,
}: {
  propertyId?: string;
  consignacionId: string;
}) {
  const [esperan, setEsperan] = useState<LandlordCandidate[]>([]);

  useEffect(() => {
    if (!propertyId) return;
    let vivo = true;
    landlordApplicationsApi
      .getCandidates(propertyId)
      .then((lista) => {
        if (vivo) setEsperan(lista.filter((c) => ESPERANDO.includes(c.status)));
      })
      .catch(() => {
        /* Sin candidatos que mostrar: la pestaña Arrendarlo dice el fallo. */
      });
    return () => {
      vivo = false;
    };
  }, [propertyId]);

  if (esperan.length === 0) return null;
  const n = esperan.length;
  return (
    <section
      className={cn(SUPERFICIE_DE_LA_FICHA, 'flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between')}
      data-testid="candidatos-que-esperan"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 -space-x-2">
          {esperan.slice(0, 3).map((c) => (
            <Avatar key={c.id} name={c.tenantName || '?'} size="sm" className="ring-2 ring-surface" />
          ))}
        </div>
        <p className="min-w-0 text-body font-medium text-fg">
          {n === 1 ? '1 candidato espera tu decisión' : `${n} candidatos esperan tu decisión`}
        </p>
      </div>
      <Button asChild size="sm" variant="secondary" hideArrow className="self-start sm:self-auto">
        <Link href={`/panel/inmobiliaria/inmuebles/${consignacionId}/candidatos`}>
          {n === 1 ? 'Revisar la postulación' : 'Revisar las postulaciones'}
        </Link>
      </Button>
    </section>
  );
}
