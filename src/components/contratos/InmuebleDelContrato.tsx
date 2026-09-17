'use client';

/**
 * El inventario y el historial del inmueble, vistos —y cargados— desde la
 * ficha del contrato.
 *
 * 🔴 Nico, 2026-09-12: «el historial que hoy vive en el inmueble debe
 * asociarse al contrato» y «el inventario debe verse también desde el
 * contrato, no sólo desde el inmueble».
 *
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario». Ayer esto mostraba el inventario en
 * sólo lectura con un texto que mandaba a la ficha del inmueble a editarlo.
 * Eso obligaba a salir del contrato justo cuando la persona está parada en el
 * apartamento con el teléfono en la mano — que es el único momento en que se
 * carga un inventario.
 *
 * Ahora monta el MISMO componente que la ficha del inmueble
 * (`InventarioDeLaConsignacion`) sobre la MISMA consignación —resuelta por
 * `propertyId`, que es lo que el contrato tiene—, con todo lo que allá se
 * puede hacer: agregar, editar y quitar ítems, foto con la cámara, imprimir el
 * acta, el borrador que espera sin señal con su barra, y «Preparar para
 * trabajar sin señal» (que acá guarda la página del CONTRATO, no la del
 * inmueble: el worker guarda páginas). No hay dos inventarios: es una sola
 * lista y un solo borrador, llaveados por la consignación.
 */

import { useEffect, useState } from 'react';
import { Buildings, Warning } from '@phosphor-icons/react';
import { useConsignacion } from '@/lib/hooks/useInmobiliaria';
import { useCopiaDeInmueble } from '@/lib/hooks/use-copia-de-inmueble';
import { usePuedeEditarInventario } from '@/lib/hooks/use-puede-editar-inventario';
import { useSinSenal } from '@/lib/hooks/use-sin-senal';
import { registrarServiceWorker } from '@/lib/inventario/sw-inventario';
import { rutaDeLaFichaDelContrato } from '@/lib/inventario/copia-de-inmueble';
import { InventarioDeLaConsignacion } from '@/components/inmobiliaria/InventarioDeLaConsignacion';
import { InventarioDelContrato } from '@/components/inmobiliaria/inventario/InventarioDelContrato';
import { ConsignacionTimeline } from '@/components/inmobiliaria/ConsignacionTimeline';
import type { Consignacion } from '@/lib/types/inmobiliaria';

interface InmuebleDelContratoProps {
  /** El inmueble del contrato. `null` = el contrato no tiene inmueble todavía. */
  propertyId: string | null;
  /** El contrato desde el que se abrió. Viaja al borrador y a la copia local. */
  contratoId: string;
  /** A dónde volver desde la ficha del inmueble («volver» de `ruta-de-regreso`). */
  volverA?: string;
}

export function InmuebleDelContrato({
  propertyId,
  contratoId,
  volverA,
}: InmuebleDelContratoProps) {
  const { consignacion: delBack, isLoading, error } = useConsignacion(propertyId ?? undefined);
  // Lo que devolvió el back al subir el borrador gana sobre lo que se pidió al
  // entrar: si no, quitar un ítem acá lo deja en pantalla hasta recargar.
  const [reciente, setReciente] = useState<Consignacion | null>(null);
  const consignacion = reciente ?? delBack;

  const puedeEditar = usePuedeEditarInventario();
  const sinSenal = useSinSenal();
  const copiaLocal = useCopiaDeInmueble(
    consignacion?.id,
    delBack ?? undefined,
    rutaDeLaFichaDelContrato(contratoId),
  );

  // El worker es lo único que puede servir ESTA página sin señal. Se registra
  // desde acá igual que desde la ficha del inmueble, y sólo en producción o
  // con `NEXT_PUBLIC_SW_INVENTARIO=1` (ver `sw-inventario.ts`).
  useEffect(() => {
    void registrarServiceWorker();
  }, []);

  /* Sin inmueble no hay inventario: se dice, y no se ofrece cargar nada. La
     tarjeta «Inmueble» de la izquierda es la que ofrece vincularlo. */
  if (!propertyId) {
    return (
      <div
        className="rounded-lg border border-border bg-card p-5 flex items-start gap-3"
        data-testid="contrato-sin-inmueble"
      >
        <Buildings className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            Este contrato no tiene inmueble asociado.
          </p>
          <p className="text-muted-foreground mt-0.5">
            El inventario es del inmueble: vinculá uno para poder cargarlo.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !consignacion) {
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

  if (!consignacion) {
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
      {/* El enlace al inmueble va DENTRO de la tarjeta, al lado del título: ya
          no manda a hacer el trabajo allá, es para ver el resto del inmueble
          (fotos, propietario, visitas). Suelto debajo parecía de otra cosa. */}
      {/* 🔴 Nico y Juan Camilo, 2026-09-16: el contrato muestra la COPIA fija
          del inventario con el que se inició (sólo lectura). Sin la migración
          del back, lo de siempre: la lista editable de la consignación. */}
      <InventarioDelContrato
        contratoId={contratoId}
        legado={
          <InventarioDeLaConsignacion
            consignacion={consignacion}
            puedeEditar={puedeEditar}
            contratoId={contratoId}
            copiaLocal={copiaLocal}
            sinSenal={sinSenal}
            onActualizada={setReciente}
            enlaceAlInmueble={{ href: fichaDelInmueble, testid: 'ver-el-inmueble' }}
          />
        }
      />

      <ConsignacionTimeline consignacion={consignacion} titulo="Historial del inmueble" />
    </div>
  );
}

export default InmuebleDelContrato;
