'use client';

import { Suspense } from 'react';
import { PageGuard } from '@/components/auth/PageGuard';
import { ServiciosPublicos } from '@/components/servicios-publicos/ServiciosPublicos';

/** Operación → Servicios públicos (Portofino, 22-10-2026). Ver `ServiciosPublicos`. */
export default function ServiciosPublicosPage() {
  return (
    <PageGuard module="operaciones">
      <Suspense>
        <ServiciosPublicos />
      </Suspense>
    </PageGuard>
  );
}
