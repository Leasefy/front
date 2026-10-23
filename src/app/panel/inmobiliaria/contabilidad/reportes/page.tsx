'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PageGuard } from '@/components/auth/PageGuard';
import { ReportesContables, informeDe } from '@/components/contabilidad/reportes/ReportesContables';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function ReportesContablesPage() {
  const informe = informeDe(useSearchParams().get('informe'));

  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
          >
            Contabilidad
          </Link>
          <EncabezadoDePantalla
            seccion="Dinero"
            titulo="Reportes contables"
            descripcion="El libro como lo pide el contador: balance de prueba, mayor, auxiliares y cartera."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">
                  Todo sale de los movimientos, sin saldos guardados aparte: lo que se ve es lo que hay
                  en el libro. Cada informe se baja en el formato que pide el contador.
                </p>
              </ParaEntenderMas>
            }
          />
        </div>
        {/* `key`: si se llega de nuevo a esta ruta con otro `informe`, Next no
            remonta la página y la pestaña se quedaría en la anterior. */}
        <ReportesContables key={informe} inicial={informe} />
      </div>
    </PageGuard>
  );
}
