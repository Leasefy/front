'use client';

/**
 * El inventario y el historial del inmueble, vistos desde la ficha del
 * contrato.
 *
 * 🔴 Nico, 2026-09-12: «el historial que hoy vive en el inmueble debe
 * asociarse al contrato» y «el inventario debe verse también desde el
 * contrato, no sólo desde el inmueble». Hasta ahora las dos cosas sólo se
 * veían entrando a la ficha del inmueble: quien miraba un contrato tenía que
 * salir de él para saber qué se entregó y qué le pasó al inmueble.
 *
 * Son los MISMOS componentes de la ficha del inmueble (`ActaEntregaView`,
 * `ConsignacionTimeline`) sobre la misma consignación —resuelta por
 * `propertyId`, que es lo que el contrato tiene—, así que lo que se ve acá y
 * lo que se ve allá es una sola cosa. El inventario acá es de sólo lectura:
 * se edita donde vive, en la ficha del inmueble, y el enlace lo dice.
 *
 * Decisión conservadora (no está en la lista de Nico): NO se agrega ni se
 * quita inventario desde el contrato. Editarlo desde dos pantallas obliga a
 * mantener dos flujos iguales, y el de la ficha del inmueble ya existe.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Warning } from '@phosphor-icons/react';
import { useConsignacion } from '@/lib/hooks/useInmobiliaria';
import { ActaEntregaView } from '@/components/inmobiliaria/ActaEntregaView';
import { ConsignacionTimeline } from '@/components/inmobiliaria/ConsignacionTimeline';

interface InmuebleDelContratoProps {
  /** El inmueble del contrato. Sin él no hay consignación que mirar. */
  propertyId: string;
  /** A dónde volver desde la ficha del inmueble («volver» de `ruta-de-regreso`). */
  volverA?: string;
}

export function InmuebleDelContrato({ propertyId, volverA }: InmuebleDelContratoProps) {
  const router = useRouter();
  const { consignacion, isLoading, error } = useConsignacion(propertyId);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="inmueble-del-contrato-cargando">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5 animate-pulse space-y-3">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !consignacion) {
    /* «No se pudo traer» y «no existe» se dicen distinto: sobre algo que no
       existe, reintentar no tiene sentido. Sin consignación no hay inventario
       ni historial que mostrar, y se dice en vez de dejar un hueco. */
    return (
      <div
        className="rounded-lg border border-border bg-card p-5 flex items-start gap-3"
        data-testid="inmueble-del-contrato-sin-consignacion"
      >
        <Warning className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {error
              ? 'No pudimos traer el inventario ni el historial del inmueble.'
              : 'Este inmueble no tiene consignación en tu inmobiliaria.'}
          </p>
          <p className="text-muted-foreground mt-0.5">
            {error
              ? 'Recarga la página o entra a la ficha del inmueble.'
              : 'El inventario y el historial viven en la consignación; sin ella no hay nada que mostrar acá.'}
          </p>
        </div>
      </div>
    );
  }

  const fichaDelInmueble = `/panel/inmobiliaria/inmuebles/${consignacion.id}${
    volverA ? `?volver=${encodeURIComponent(volverA)}` : ''
  }`;

  return (
    <div className="space-y-6" data-testid="inmueble-del-contrato">
      <div className="space-y-2">
        <ActaEntregaView
          inventoryItems={consignacion.inventoryItems}
          contractDate={consignacion.contractDate}
          onPrint={() => router.push(`/panel/inmobiliaria/inmuebles/${consignacion.id}/acta`)}
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
          <Package className="w-3.5 h-3.5" aria-hidden />
          El inventario se edita en la ficha del inmueble.{' '}
          <Link
            href={fichaDelInmueble}
            className="font-medium text-primary hover:underline"
            data-testid="editar-inventario-en-el-inmueble"
          >
            Ir a la ficha →
          </Link>
        </p>
      </div>

      <ConsignacionTimeline consignacion={consignacion} titulo="Historial del inmueble" />
    </div>
  );
}

export default InmuebleDelContrato;
