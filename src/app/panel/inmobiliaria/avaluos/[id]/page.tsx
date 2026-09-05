'use client';

/**
 * `/panel/inmobiliaria/avaluos/[id]` — se fue con su hermana `/avaluos`.
 *
 * Era una TERCERA implementación del detalle de un avalúo, divergente de la
 * canónica (`/inmuebles/avaluos/[id]`, que es la que enlaza el sidebar):
 *
 *   · Sin guard. La canónica está detrás de `PageGuard module="avaluos"`; ésta
 *     no comprobaba nada, así que cualquier miembro de la agencia —incluido
 *     uno sin el módulo— podía abrirla con un id en la URL.
 *   · Contra otro servicio. Leía `GET {AVALUO_API_URL}/api/avaluo/:id/status`
 *     del micro de avalúos, público y sin auth, en vez de
 *     `GET /ai-hub/work-items/avaluos/:id` del back.
 *   · Sin entrada. Ningún enlace del panel llevaba acá, y su propio «Todos los
 *     avalúos» apuntaba a `/avaluos`, que redirige a OTRO módulo.
 *
 * La ruta no se borra —puede haber enlaces guardados— pero manda a la pantalla
 * de verdad, que sí valida el permiso. `useAvaluoStatus` y `AvaluoEstadoCard`
 * siguen vivos: los usa el seguimiento público del avalúo.
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { Spinner } from '@/components/ui';

export default function AvaluoDetalleLegacyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  useEffect(() => {
    router.replace(
      id
        ? `/panel/inmobiliaria/inmuebles/avaluos/${id}`
        : '/panel/inmobiliaria/inmuebles/avaluos',
    );
  }, [id, router]);

  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="md" variant="muted" />
    </div>
  );
}
