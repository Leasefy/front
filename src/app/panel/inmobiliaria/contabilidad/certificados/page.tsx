'use client';

/**
 * Certificado anual de retenciones — `/panel/inmobiliaria/contabilidad/certificados`.
 *
 * Permiso `reportes`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/retenciones/certificado` y el mismo con el que
 * se abre el resto de Contabilidad.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { CertificadoDeRetencionesPanel } from '@/components/finanzas/CertificadoDeRetenciones';

export default function CertificadosPage() {
  return (
    <PageGuard module="reportes">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Finanzas · contabilidad</SectionLabel>
          <h1 className="text-h2 text-fg">Certificados de retención</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Lo que los inquilinos le retuvieron a cada propietario en el año, para que pueda
            declarar. La cuota quedó saldada con el canon completo y lo retenido se le descontó en
            su liquidación: es su impuesto.
          </p>
        </header>
        <CertificadoDeRetencionesPanel />
      </div>
    </PageGuard>
  );
}
