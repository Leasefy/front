'use client';

/**
 * Un lote al banco: estado, acciones y pagos.
 *
 * Ruta: /panel/inmobiliaria/pagos/dispersiones/lotes/[id]
 * Permiso: `dispersiones`/view (el `GET :id` del back). Cada acción pide el
 * suyo aparte, adentro del componente.
 */

import { useParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { DetalleDelLote } from '@/components/dispersiones/lotes/DetalleDelLote';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { RUTA_LOTES } from '@/lib/api/dispersiones-errores';

export default function LoteDeDispersionPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return (
    <PageGuard module="dispersiones" action="view">
      <div className="p-6 lg:p-8">
        {/* Sin id la página quedaba en blanco (`{id && …}`): ni lote, ni
            mensaje, ni forma de volver. Un lote sin id es un lote que no
            existe, y se dice así. */}
        {id ? (
          <DetalleDelLote id={id} />
        ) : (
          <FalloDeCarga
            error={{ status: 404 }}
            queEs="el lote"
            volverA={{ label: 'Volver a Lotes', href: RUTA_LOTES }}
          />
        )}
      </div>
    </PageGuard>
  );
}
