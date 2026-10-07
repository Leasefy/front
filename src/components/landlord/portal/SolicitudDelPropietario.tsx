'use client';

/**
 * SO-27 (PQRS-FIX, 04-10-2026): una solicitud del propietario — número, estado,
 * plazo, historial, la respuesta de la inmobiliaria y sus archivos.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { RespuestaYArchivosDelCaso } from '@/components/tenant/RespuestaYArchivosDelCaso';
import { pqrsApi } from '@/lib/api/pqrs.service';
import type { SolicitudPqrs } from '@/lib/api/pqrs.types';
import { pqrsToCase } from '@/lib/types/tenant-case';
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service';

export function SolicitudDelPropietario({ id }: { id: string }) {
  const [s, setS] = useState<SolicitudPqrs | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    pqrsApi
      .getMine(id)
      .then(setS)
      .catch(setError)
      .finally(() => setCargando(false));
  }, [id]);
  useEffect(() => cargar(), [cargar]);

  if (cargando) return <EsqueletoDePagina variante="detail" className="mx-auto max-w-3xl" />;
  if (error || !s) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <FalloDeCarga
          error={error ?? new Error('No encontramos esa solicitud.')}
          queEs="esa solicitud"
          onReintentar={cargar}
          volverA={{ label: 'Volver a solicitudes', href: '/panel/solicitudes' }}
        />
      </div>
    );
  }
  const caso = pqrsToCase(s);
  const abierta = s.estado !== 'resuelta' && s.estado !== 'cerrada';

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <Link href="/panel/solicitudes" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver a solicitudes
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-medium text-fg">{s.asunto}</h1>
        <p className="font-mono text-sm text-fg-muted" data-testid="solicitud-radicado">
          {s.radicado}
        </p>
        <Badge variant="secondary">{caso.estadoLabel}</Badge>
      </header>
      <dl className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-fg-muted">Inmueble</dt>
          <dd className="text-fg">{s.propiedadDireccion ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted">Radicada el</dt>
          <dd className="text-fg">{fechaLegible(s.createdAt)}</dd>
        </div>
        {abierta && s.slaVenceAt && (
          <div>
            <dt className="text-xs text-fg-muted">Respuesta a más tardar el</dt>
            <dd className="text-fg">{fechaLegible(s.slaVenceAt)}</dd>
          </div>
        )}
      </dl>
      {s.descripcion && <p className="whitespace-pre-wrap text-sm text-fg-muted">{s.descripcion}</p>}
      {caso.solicitud && <RespuestaYArchivosDelCaso caseId={s.id} solicitud={caso.solicitud} onCambio={cargar} />}
      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-fg">Historial</h2>
        <ol className="space-y-2 text-sm">
          {caso.events.map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span className="text-fg">{e.label}</span>
              <span className="shrink-0 text-xs text-fg-muted">{fechaLegible(e.timestamp)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
