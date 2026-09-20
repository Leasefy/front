'use client';

/**
 * Deterioro de cartera — `/panel/inmobiliaria/contabilidad/deterioro`.
 *
 * Permiso `reportes`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/deterioro` y el mismo con el que se abre el
 * resto de Contabilidad (ver `contabilidad/page.tsx`: el back todavía no tiene
 * un módulo `contabilidad` en la matriz de permisos).
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { DeterioroDeCarteraPanel } from '@/components/finanzas/DeterioroDeCartera';

export default function DeterioroPage() {
  return (
    <PageGuard module="reportes">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          {/* 🔴 20-09 · Nico, mirando esta pantalla: «no tiene navegación,
              uno no sabe cómo devolverse». Tres de las doce de Contabilidad
              —certificados, deterioro y presupuesto— no tenían el camino de
              vuelta que sí tienen las otras nueve. Se llega a ellas desde la
              portada y desde el menú de «Reportes», así que el botón atrás del
              navegador tampoco siempre sirve. */}
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Contabilidad
          </Link>
          <SectionLabel>Finanzas · contabilidad</SectionLabel>
          <h1 className="text-h2 text-fg">Deterioro de cartera</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Cuánta de la cartera se reconoce como incobrable, por edades. El sistema sugiere los
            porcentajes; el contador los edita y los aprueba cada mes. Lo que va al libro es el
            movimiento contra el mes anterior, no el saldo.
          </p>
        </header>
        <DeterioroDeCarteraPanel />
      </div>
    </PageGuard>
  );
}
