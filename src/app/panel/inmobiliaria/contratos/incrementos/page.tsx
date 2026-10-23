'use client';

import { Suspense } from 'react';
import { PageGuard } from '@/components/auth/PageGuard';
import { IncrementosDelPeriodo } from '@/components/contratos/IncrementosDelPeriodo';

/** Contratos → Incrementos (Portofino, 22-10-2026). Ver `IncrementosDelPeriodo`. */
export default function IncrementosPage() {
  return (
    <PageGuard module="operaciones">
      <Suspense>
        <IncrementosDelPeriodo />
      </Suspense>
    </PageGuard>
  );
}
