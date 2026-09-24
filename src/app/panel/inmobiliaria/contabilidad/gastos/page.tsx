'use client';

/**
 * Gastos — `/panel/inmobiliaria/contabilidad/gastos`.
 *
 * Permiso `reportes:view`, el mismo con el que el back protege toda la
 * contabilidad (`ContabilidadLecturaGuard`). Escribir lo decide el back
 * (`ContabilidadEscrituraGuard`: ADMIN o CONTADOR) y la pantalla lo dice antes
 * del clic con `usePuedeEscribir`.
 *
 * `?estado=BORRADOR` abre la lista filtrada por ese estado: lo usa la alerta de
 * la portada («N facturas de proveedor sin causar»), que ya nombra exactamente
 * eso.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import {
  FacturasDeProveedor,
  estadoDe,
} from '@/components/contabilidad/gastos/FacturasDeProveedor';

export default function GastosPage() {
  const estado = estadoDe(useSearchParams().get('estado'));

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
          <h1 className="text-h2 text-fg">Gastos de la inmobiliaria</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Las facturas de los proveedores: el contador, la luz de la oficina, las cerraduras. Es lo
            que le da gastos propios al P&G y filas al formato 1001 de la exógena. Lo que se le gira
            al propietario no va acá — eso baja un pasivo y no es un gasto de la inmobiliaria.
          </p>
        </header>
        {/* `key`: si se llega de nuevo con otro `estado`, Next no remonta la
            página y el filtro se quedaría en el anterior. */}
        <FacturasDeProveedor key={estado} estadoInicial={estado} />
      </div>
    </PageGuard>
  );
}
