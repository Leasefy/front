'use client';

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { MapeoContable } from '@/components/contabilidad/mapeo/MapeoContable';

export default function MapeoContablePage() {
  return (
    <PageGuard module="reportes">
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
          <h1 className="text-h2 text-fg">Mapeo contable</h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            A qué cuenta del PUC va cada movimiento que el sistema asienta solo: los recibos de caja
            cuando entran, su reversa cuando se anulan y los giros a propietarios cuando el banco
            paga el lote. Sin una cuenta en un evento, ese asiento no se genera.
          </p>
        </header>
        <MapeoContable />
      </div>
    </PageGuard>
  );
}
