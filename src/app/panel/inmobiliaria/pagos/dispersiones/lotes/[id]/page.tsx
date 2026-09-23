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
import { BackButton } from '@/components/ui/back-button';
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
          <div className="space-y-6">
        {/* 🔴 20-09 · El camino de vuelta va ARRIBA, no sólo dentro de la
            tarjeta: un fallo a pantalla completa sin encabezado no dice en qué
            parte del panel estás (Nico: «ni se entiende y no tiene navegación
            para recuperarse»). Ver `el-fallo-de-una-ficha-tiene-salida`. */}
            <BackButton href={RUTA_LOTES} label="Lotes" />
            <h1 className="text-h2 text-fg">Lote</h1>
            <FalloDeCarga
              error={{ status: 404 }}
              queEs="el lote"
              volverA={{ label: 'Lotes', href: RUTA_LOTES }}
            />
          </div>
        )}
      </div>
    </PageGuard>
  );
}
