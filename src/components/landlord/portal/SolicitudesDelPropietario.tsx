'use client';

/**
 * SO-27 (PQRS-FIX, 04-10-2026): las solicitudes del PROPIETARIO en su portal.
 *
 * Hasta hoy la página existía pero leía una ruta vieja del micro y decía
 * «Próximamente», y el menú no la mostraba: el propietario no tenía dónde
 * radicar una PQRS ni reportar un daño. Ahora usa las MISMAS rutas que el
 * inquilino (`GET /pqrs/mine`, `POST /pqrs`) con SUS inmuebles, y el MISMO modal.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CaretRight, ChatCircleText, Plus } from '@phosphor-icons/react';
import { PageHeader } from '@leasefy/cadence';

import { Button, Card } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { NuevaSolicitudModal } from '@/components/tenant/NuevaSolicitudModal';
import { pqrsApi, type ContratoParaRadicar } from '@/lib/api/pqrs.service';
import type { SolicitudPqrs } from '@/lib/api/pqrs.types';
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service';

const ESTADO: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  recibida: { label: 'Recibida', variant: 'secondary' },
  asignada: { label: 'Asignada', variant: 'secondary' },
  en_proceso: { label: 'En proceso', variant: 'secondary' },
  en_cotizacion: { label: 'En cotización', variant: 'secondary' },
  resuelta: { label: 'Resuelta', variant: 'outline' },
  cerrada: { label: 'Cerrada', variant: 'outline' },
};
const TIPO: Record<string, string> = {
  peticion: 'Petición',
  queja: 'Queja',
  reclamo: 'Reclamo',
  solicitud: 'Solicitud',
  reparacion: 'Reparación',
  sugerencia: 'Sugerencia',
};

export function SolicitudesDelPropietario({ abrirNueva = false }: { abrirNueva?: boolean }) {
  const [items, setItems] = useState<SolicitudPqrs[]>([]);
  const [contratos, setContratos] = useState<ContratoParaRadicar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [nueva, setNueva] = useState(abrirNueva);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    pqrsApi
      .listMineConDisponibilidad()
      .then((r) => {
        setItems(r.items);
        setContratos(r.contratos);
      })
      .catch(setError)
      .finally(() => setCargando(false));
  }, []);
  useEffect(() => cargar(), [cargar]);

  if (cargando) return <EsqueletoDePagina variante="list" className="mx-auto max-w-4xl" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Solicitudes"
        subtitle="Peticiones, quejas, reclamos y daños de tus inmuebles. Tu inmobiliaria te responde aquí."
        actions={
          <Button
            hideArrow
            onClick={() => setNueva(true)}
            disabled={contratos.length === 0}
            data-testid="propietario-nueva-solicitud"
          >
            <Plus className="h-4 w-4" weight="bold" />
            Nueva solicitud
          </Button>
        }
      />
      {contratos.length === 0 && !error && (
        <p className="text-sm text-fg-muted">
          Para radicar una solicitud necesitas un inmueble consignado con una inmobiliaria.
        </p>
      )}
      {error ? (
        <FalloDeCarga error={error} queEs="tus solicitudes" onReintentar={cargar} />
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <ChatCircleText className="mx-auto h-8 w-8 text-fg-subtle" />
          <p className="mt-3 text-sm text-fg-muted">Todavía no has radicado ninguna solicitud.</p>
        </Card>
      ) : (
        <ul className="space-y-2" data-testid="propietario-solicitudes">
          {items.map((s) => {
            const estado = ESTADO[s.estado] ?? { label: s.estado, variant: 'secondary' as const };
            return (
              <li key={s.id}>
                <Link
                  href={`/panel/solicitudes/${s.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-surface-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-fg">{s.asunto}</span>
                      <Badge variant={estado.variant}>{estado.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">
                      <span className="font-mono">{s.radicado}</span> · {TIPO[s.tipo] ?? s.tipo}
                      {s.propiedadDireccion ? ` · ${s.propiedadDireccion}` : ''} · {fechaLegible(s.createdAt)}
                    </p>
                  </div>
                  <CaretRight className="h-4 w-4 shrink-0 text-fg-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <NuevaSolicitudModal
        open={nueva}
        onClose={() => setNueva(false)}
        onCreated={cargar}
        contratos={contratos}
      />
    </div>
  );
}
