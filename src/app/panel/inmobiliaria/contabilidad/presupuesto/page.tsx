'use client';

/**
 * Presupuesto — `/panel/inmobiliaria/contabilidad/presupuesto`.
 *
 * Permiso `reportes:view`, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/presupuesto*` (contrato del 17-09, §11) y el
 * mismo con el que se abre toda la contabilidad.
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { PresupuestoPanel } from '@/components/finanzas/Presupuesto';

export default function PresupuestoPage() {
  return (
    <PageGuard module="reportes" action="view">
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
          <SectionLabel>Contabilidad</SectionLabel>
          <h1 className="text-h2 text-fg">Presupuesto</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Lo que se planeó para el mes, contra lo que pasó y contra el mismo mes del año pasado.
            Los rubros que el sistema todavía no sabe medir se pueden presupuestar igual: salen con
            guion y dicen por qué, en vez de un cero que se leería como «no gastaste nada».
          </p>
        </header>
        <PresupuestoPanel />
      </div>
    </PageGuard>
  );
}
