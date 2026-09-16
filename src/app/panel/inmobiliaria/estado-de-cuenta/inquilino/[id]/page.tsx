'use client';

/**
 * El estado de cuenta de un INQUILINO, en su propia ruta.
 *
 * Tiene ruta propia —y no es sólo un cajón dentro de la lista— porque es un
 * documento que se enlaza: desde la ficha del inquilino, desde la del contrato,
 * desde un correo interno. Una pantalla a la que no se puede mandar un enlace
 * no se comparte, y compartirlo es medio pedido del CEO.
 */

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { CompartirEstadoDeCuenta } from '@/components/estado-de-cuenta/CompartirEstadoDeCuenta';
import { PantallaDelEstadoDeCuenta } from '@/components/estado-de-cuenta/PantallaDelEstadoDeCuenta';
import { RUTA_DE_REGLAS_DE_MORA } from '@/components/estado-de-cuenta/intereses';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';

const LISTA = '/panel/inmobiliaria/inquilinos';

function Contenido() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const volver = rutaDeRegreso(searchParams.get('volver'), LISTA);

  return (
    <PantallaDelEstadoDeCuenta
      /* El recorte lo hace el BACK (auditoría 13-09, E4): la pantalla manda
         el filtro y pinta lo que vuelve, que es exactamente lo mismo que ve
         quien abre el enlace compartido. */
      cargar={(filtro) => estadoDeCuentaApi.inquilino(id, filtro)}
      volverA={{ href: volver }}
      /* Es el panel: las cuotas en mora sin intereses dicen por qué y llevan
         a configurar las reglas. El portal y el enlace no lo pasan. */
      reglasDeMoraHref={RUTA_DE_REGLAS_DE_MORA}
      acciones={(doc, nota, filtros) => (
        <CompartirEstadoDeCuenta
          doc={doc}
          hoy={doc.fecha}
          tipo="inquilino"
          id={id}
          /* El `tenantRef` del inquilino ES su `User.id` cuando tiene cuenta
             del portal, que es justo lo que necesita el hilo del chat. Cuando
             no la tiene, el back responde `SIN_CUENTA` y el ítem lo cuenta. */
          personaId={id}
          nota={nota}
          /* Viaja con el enlace: el cliente ve la misma vista filtrada. */
          filtros={filtros}
        />
      )}
    />
  );
}

export default function EstadoDeCuentaDelInquilinoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <Suspense
        fallback={
          <div className="p-6 lg:p-8">
            <Skeleton className="mx-auto h-96 w-full max-w-[1200px]" />
          </div>
        }
      >
        <Contenido />
      </Suspense>
    </PageGuard>
  );
}
