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

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import {
  FacturasDeProveedor,
  estadoDe,
} from '@/components/contabilidad/gastos/FacturasDeProveedor';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function GastosPage() {
  const estado = estadoDe(useSearchParams().get('estado'));

  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad" action="view">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/panel/inmobiliaria/contabilidad"
          className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
        >
          Contabilidad
        </Link>
        {/* `key`: si se llega de nuevo con otro `estado`, Next no remonta la
            página y el filtro se quedaría en el anterior. El encabezado lo pinta la lista: la
            acción principal lleva su permiso y su motivo. */}
        <FacturasDeProveedor
          key={estado}
          estadoInicial={estado}
          encabezado={(accionPrincipal) => (
            <EncabezadoDePantalla
              seccion="Finanzas"
              titulo="Gastos de la inmobiliaria"
              descripcion="Registra la factura de un proveedor, cáusala para que quede en el libro y págala. Lo que se le gira al propietario no va aquí: eso baja un pasivo y no es un gasto de la inmobiliaria."
              accionPrincipal={accionPrincipal}
            />
          )}
        />
      </div>
    </PageGuard>
  );
}
