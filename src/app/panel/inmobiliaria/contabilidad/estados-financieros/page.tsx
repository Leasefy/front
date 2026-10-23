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

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PageGuard } from '@/components/auth/PageGuard';
import {
  EstadosFinancieros,
  informeFinancieroDe,
} from '@/components/contabilidad/estados-financieros/EstadosFinancieros';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function EstadosFinancierosPage() {
  const informe = informeFinancieroDe(useSearchParams().get('informe'));

  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
          >
            Contabilidad
          </Link>
          <EncabezadoDePantalla
            seccion="Finanzas"
            titulo="Estados financieros"
            descripcion="El estado de resultados y el balance general, del mes y del acumulado del año, contra el presupuesto y contra el año pasado."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">Los dos salen del libro: lo que no está asentado no aparece, y el informe dice cuánto falta. El canon recaudado no es ingreso de la inmobiliaria — es plata del propietario y vive en el pasivo.</p>
              </ParaEntenderMas>
            }
          />
        </div>
        <EstadosFinancieros key={informe} inicial={informe} />
      </div>
    </PageGuard>
  );
}
