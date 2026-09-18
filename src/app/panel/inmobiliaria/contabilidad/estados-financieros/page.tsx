'use client';

/**
 * Estados financieros — `/panel/inmobiliaria/contabilidad/estados-financieros`.
 *
 * Permiso `reportes:view`: son lecturas, y es el mismo permiso con el que el
 * back protege toda la contabilidad (`ContabilidadLecturaGuard`). Acá no se
 * escribe nada — los dos informes salen del libro y no se pueden editar.
 *
 * `?informe=balance` abre esa pestaña: lo usa la alerta de la portada del libro
 * que no cuadra, y cualquier enlace que quiera llevar directo al balance.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import {
  EstadosFinancieros,
  informeFinancieroDe,
} from '@/components/contabilidad/estados-financieros/EstadosFinancieros';

export default function EstadosFinancierosPage() {
  const informe = informeFinancieroDe(useSearchParams().get('informe'));

  return (
    <PageGuard module="reportes" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Contabilidad
          </Link>
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-h2 text-fg">Estados financieros</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            El estado de resultados y el balance general, del mes y del acumulado del año, contra el
            presupuesto y contra el año pasado. Los dos salen del libro: lo que no está asentado no
            aparece, y el informe dice cuánto falta. El canon recaudado no es ingreso de la
            inmobiliaria — es plata del propietario y vive en el pasivo.
          </p>
        </header>
        <EstadosFinancieros key={informe} inicial={informe} />
      </div>
    </PageGuard>
  );
}
