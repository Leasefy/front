'use client';

/**
 * Egresos — `/panel/inmobiliaria/contabilidad/egresos`.
 *
 * Permiso `reportes:view`, el mismo con el que el back protege toda la
 * contabilidad. Lo que escribe se deshabilita con su motivo si el rol no es
 * ADMIN ni CONTADOR (`ContabilidadEscrituraGuard`), y además la aprobación de
 * un lote la tiene que dar otra persona que la que lo armó.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { Egresos, parteDeEgresos } from '@/components/contabilidad/egresos/Egresos';

export default function EgresosPage() {
  const parte = parteDeEgresos(useSearchParams().get('parte'));

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
          <h1 className="text-h2 text-fg">Egresos</h1>
          {/* 🔴 LA MISMA FRASE NO SE DICE DOS VECES (Nico, 21-09). Acá estaba
              escrito, palabra por palabra, lo mismo que la cabecera de la
              tarjeta de abajo: la definición, el circuito del lote y la
              distinción con el giro al propietario, dos veces y a 80 px de
              distancia. El subtítulo se queda con lo que ES el módulo; el
              circuito lo dice la pestaña «Lotes», que es de lo que habla, y la
              distinción la dice la pestaña «Egresos», pegada a su tabla. */}
          <p className="max-w-2xl text-sm text-fg-muted">
            Lo que la inmobiliaria le paga a sus proveedores, abogados, técnicos y empleados.
          </p>
        </header>
        <Egresos key={parte} inicial={parte} />
      </div>
    </PageGuard>
  );
}
