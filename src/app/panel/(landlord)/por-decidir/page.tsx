'use client';

/**
 * «Por decidir» — la primera pestaña de Solicitudes en el portal del
 * propietario de inmobiliaria (Nico eligió «Tablero + 3 secciones», 21-10-2026).
 *
 * Junta en UNA lista lo que la inmobiliaria le pregunta: escoger inquilino,
 * revisar el canon, una reparación o un sobrecosto por aprobar y el giro que
 * devolvió el banco. Cada fila lleva a la pantalla donde se decide (que sigue
 * en su ruta). Es la misma lista del Inicio (`LoQueEsperaTuRespuesta`).
 *
 * Mientras alguna fuente no ha contestado no se afirma «no tienes nada»: se
 * espera; si una falla, esa fila simplemente no sale (nunca un falso vacío
 * por una falla, mismo criterio que el Inicio).
 */
import { ClipboardText } from '@phosphor-icons/react';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LoQueEsperaTuRespuesta,
  usePendientesDelPropietarioConEstado,
} from '@/components/landlord/portal/LoQueEsperaTuRespuesta';

export default function PorDecidirPage() {
  const { pendientes, cargando } = usePendientesDelPropietarioConEstado();
  return (
    <div className="min-h-screen bg-bg">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Solicitudes"
          titulo="Por decidir"
          descripcion="Lo que tu inmobiliaria te pregunta. Cada fila te lleva a decidirlo."
        />
        {pendientes.length > 0 ? (
          <LoQueEsperaTuRespuesta pendientes={pendientes} />
        ) : cargando ? (
          <div className="space-y-2" aria-label="Cargando" data-testid="por-decidir-cargando">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <section className="rounded-lg border border-border bg-surface" data-testid="por-decidir-vacio">
            <EmptyState
              icon={ClipboardText}
              ilustracion="escudo"
              title="No tienes nada por decidir"
              description="Cuando tu inmobiliaria te pregunte algo —escoger un inquilino, revisar el canon, aprobar una reparación—, va a aparecer acá."
            />
          </section>
        )}
      </div>
    </div>
  );
}
