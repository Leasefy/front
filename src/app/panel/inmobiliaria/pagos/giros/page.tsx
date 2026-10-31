'use client';

/**
 * «Giros a propietarios»: la tarea entera del mes en UNA pantalla (Nico,
 * 31-10-2026: «no se sabe qué es primero, segundo, se pierden en las
 * navegaciones»). Liquidar → Girar (el botón grande, con el código del
 * administrador) → Confirmar que el banco pagó. Ver `GirosDelMes`.
 *
 * Antes esta ruta sólo redirigía al paso 1 (Liquidaciones) o al 2 (Dispersiones).
 */
import { PageGuard } from '@/components/auth/PageGuard';
import { GirosDelMes } from '@/components/giros/GirosDelMes';

export default function GirosAPropietariosPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <GirosDelMes />
    </PageGuard>
  );
}
