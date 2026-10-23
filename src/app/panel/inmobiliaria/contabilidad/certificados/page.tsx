'use client';

/**
 * Certificado anual de retenciones — `/panel/inmobiliaria/contabilidad/certificados`.
 *
 * Permiso `reportes`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/retenciones/certificado` y el mismo con el que
 * se abre el resto de Contabilidad.
 */

import Link from 'next/link';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { CertificadoDeRetencionesPanel } from '@/components/finanzas/CertificadoDeRetenciones';

export default function CertificadosPage() {
  return (
    <PageGuard module="reportes" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Contabilidad">
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
            titulo="Certificados de retención"
            descripcion="Lo que los inquilinos le retuvieron a cada propietario en el año, para que pueda declarar."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">La cuota quedó saldada con el canon completo y lo retenido se le descontó en su liquidación: es su impuesto.</p>
              </ParaEntenderMas>
            }
          />
        </div>
        <CertificadoDeRetencionesPanel />
      </div>
    </PageGuard>
  );
}
