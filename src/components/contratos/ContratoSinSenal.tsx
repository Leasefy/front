'use client';

/**
 * Cuando la ficha del contrato no puede traer el contrato, pero el inventario
 * del inmueble SÍ está guardado en este teléfono.
 *
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario», y eso incluye el caso que motivó todo
 * lo de sin señal: llegar al apartamento y recién ahí abrir la pantalla.
 *
 * El service worker ya guarda la PÁGINA del contrato, pero el contrato mismo
 * vive en el back: sin red no hay estado, ni partes, ni cobros que mostrar. Lo
 * que sí hay es la copia de la consignación —el inventario es del inmueble—,
 * así que se muestra eso y se dice exactamente qué es: no se inventa un
 * contrato con datos viejos.
 *
 * Se monta ENCIMA del fallo, no en su lugar: el «no se pudo cargar» con su
 * reintentar sigue ahí, porque el contrato sigue sin cargarse. Lo único que se
 * agrega es lo que sí se puede hacer.
 */

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { WifiSlash } from '@phosphor-icons/react';
import { InventarioDeLaConsignacion } from '@/components/inmobiliaria/InventarioDeLaConsignacion';
import { usePuedeEditarInventario } from '@/lib/hooks/use-puede-editar-inventario';
import { useSinSenal } from '@/lib/hooks/use-sin-senal';
import {
  leerCopiaPorContrato,
  rutaDeLaFichaDelInmueble,
  type CopiaDeInmueble,
} from '@/lib/inventario/copia-de-inmueble';
import type { Consignacion } from '@/lib/types/inmobiliaria';

/** «12 de septiembre, 9:19 p. m.» */
function cuando(marca: number): string {
  return new Date(marca).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface Props {
  contratoId: string;
  /** Lo que la página ya mostraba: el fallo de carga con su reintentar. */
  children: ReactNode;
}

export function ContratoSinSenal({ contratoId, children }: Props) {
  const [copia, setCopia] = useState<CopiaDeInmueble | null>(null);
  const [reciente, setReciente] = useState<Consignacion | null>(null);
  const puedeEditar = usePuedeEditarInventario();
  const sinSenal = useSinSenal();

  useEffect(() => {
    let vivo = true;
    void leerCopiaPorContrato(contratoId)
      .then((c) => {
        if (vivo) setCopia(c);
      })
      .catch(() => {
        /* Sin copia se muestra sólo el fallo, que es lo de antes. */
      });
    return () => {
      vivo = false;
    };
  }, [contratoId]);

  if (!copia) return <>{children}</>;

  const consignacion = reciente ?? copia.consignacion;

  return (
    <div className="space-y-4">
      {children}

      <div className="space-y-2" data-testid="contrato-sin-senal">
        <div className="rounded-md border border-border bg-surface p-3 flex items-start gap-2">
          <WifiSlash className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-fg">
              Del contrato no tenemos nada guardado; del inmueble sí.
            </p>
            <p className="text-xs text-fg-muted mt-0.5">
              {copia.titulo} · {copia.direccion} · guardado el {cuando(copia.guardadoEn)}. Lo que
              cargues en el inventario se sube cuando vuelva la señal.
            </p>
          </div>
        </div>

        <InventarioDeLaConsignacion
          consignacion={consignacion}
          puedeEditar={puedeEditar}
          contratoId={contratoId}
          sinSenal={sinSenal}
          onActualizada={setReciente}
        />

        <p className="text-xs text-fg-muted px-1">
          <Link
            href={rutaDeLaFichaDelInmueble(copia.consignacionId)}
            className="font-medium text-primary hover:underline"
            data-testid="ver-el-inmueble-sin-senal"
          >
            Ver el inmueble →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ContratoSinSenal;
