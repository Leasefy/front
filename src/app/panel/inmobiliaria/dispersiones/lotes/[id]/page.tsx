'use client';

/**
 * Un lote al banco: estado, acciones y pagos.
 *
 * Ruta: /panel/inmobiliaria/dispersiones/lotes/[id]
 * Permiso: `dispersiones`/view (el `GET :id` del back). Cada acción pide el
 * suyo aparte, adentro del componente.
 */

import { useParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { DetalleDelLote } from '@/components/dispersiones/lotes/DetalleDelLote';

export default function LoteDeDispersionPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return (
    <PageGuard module="dispersiones" action="view">
      <div className="p-6 lg:p-8">{id && <DetalleDelLote id={id} />}</div>
    </PageGuard>
  );
}
