'use client';

/**
 * Calendario de días hábiles — `/panel/inmobiliaria/pagos/calendario`.
 *
 * Permiso `configuracion:view`: es un ajuste de la inmobiliaria, no una
 * operación de plata. Vive bajo Pagos porque el plazo que corrige es el de la
 * factura electrónica y el del SLA de una PQRS, y ahí es donde se nota.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { CalendarioDeFestivosPanel } from '@/components/tesoreria/CalendarioDeFestivos';

export default function CalendarioPage() {
  return (
    <PageGuard module="configuracion" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Tesorería · configuración</SectionLabel>
          <h1 className="text-h2 text-fg">Días hábiles y festivos</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            La aceptación tácita de una factura corre a los 3 días hábiles y el SLA de una PQRS son
            15. Los 18 festivos de Colombia se calculan solos (Ley 51 de 1983 y la Pascua); acá se
            revisan y se corrigen si hace falta.
          </p>
        </header>
        <CalendarioDeFestivosPanel />
      </div>
    </PageGuard>
  );
}
