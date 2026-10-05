'use client';

/**
 * El estado de cuenta de un INQUILINO, en su propia ruta.
 *
 * Tiene ruta propia —y no es sólo un cajón dentro de la lista— porque es un
 * documento que se enlaza: desde la ficha del inquilino, desde la del contrato,
 * desde un correo interno. Una pantalla a la que no se puede mandar un enlace
 * no se comparte, y compartirlo es medio pedido del CEO.
 */

import * as React from 'react';
import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { CompartirEstadoDeCuenta } from '@/components/estado-de-cuenta/CompartirEstadoDeCuenta';
import { PantallaDelEstadoDeCuenta } from '@/components/estado-de-cuenta/PantallaDelEstadoDeCuenta';
import { RUTA_DE_REGLAS_DE_MORA } from '@/components/estado-de-cuenta/intereses';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ProveedorDeAnularRecibo } from '@/components/estado-de-cuenta/AnularReciboDeLaFila';
import { GestionesDeLaPersona } from '@/components/cobranza-manual/GestionesDeLaPersona';

const LISTA = '/panel/inmobiliaria/inquilinos';

function Contenido() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const volver = rutaDeRegreso(searchParams.get('volver'), LISTA);
  // Desde la ficha de un contrato llega `?contrato=<número>`: abre sólo ese.
  const contrato = searchParams.get('contrato') ?? '';
  const filtrosIniciales = React.useMemo(() => ({ contrato }), [contrato]);
  // Anular un recibo desde su fila: sólo un administrador (regla del CEO).
  // Al anular se vuelve a montar la pantalla, que relee el documento.
  const { isAdmin } = usePermissions();
  const [version, setVersion] = React.useState(0);
  // COBRANZA-MANUAL (04-10-2026): las gestiones de cobro de la persona, con
  // «Registrar gestión», debajo del documento. La persona es la del documento
  // que devolvió el back (su número de documento), no el `id` de la ruta, que
  // puede ser la cuenta del portal.
  const [cliente, setCliente] = React.useState<{ documento: string; nombre: string } | null>(null);
  // QA-INQ-95 (04-10-2026): `cargar` es estable por `id` y `cliente` sólo cambia si cambió
  // la persona. Antes era una flecha nueva en cada render y guardaba un objeto nuevo al
  // resolver: otro render → otro `cargar` → la pantalla volvía a pedir, ~27 veces por
  // segundo, hasta que el limitador del back respondía 429.
  const cargar = React.useCallback(
    (filtro?: Parameters<typeof estadoDeCuentaApi.inquilino>[1]) =>
      estadoDeCuentaApi.inquilino(id, filtro).then((doc) => {
        const documento = doc.cliente?.documento?.trim();
        const nombre = doc.cliente?.nombre ?? '';
        setCliente((antes) => {
          if (!documento) return antes === null ? antes : null;
          if (antes && antes.documento === documento && antes.nombre === nombre) return antes;
          return { documento, nombre };
        });
        return doc;
      }),
    [id],
  );

  return (
    <ProveedorDeAnularRecibo habilitado={isAdmin} onAnulado={() => setVersion((v) => v + 1)}>
      <PantallaDelEstadoDeCuenta
        key={version}
        /* El recorte lo hace el BACK (auditoría 13-09, E4): la pantalla manda
           el filtro y pinta lo que vuelve, que es exactamente lo mismo que ve
           quien abre el enlace compartido. */
        cargar={cargar}
        volverA={{ href: volver }}
        /* Es el panel: las cuotas en mora sin intereses dicen por qué y llevan
           a configurar las reglas. El portal y el enlace no lo pasan. */
        reglasDeMoraHref={RUTA_DE_REGLAS_DE_MORA}
        /* El anticipo del contrato (lo que se descuenta mes a mes) sólo se
           lee desde el panel. */
        conAnticipoDelContrato
        filtrosIniciales={filtrosIniciales}
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
      {cliente ? (
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 sm:px-6 lg:px-8 print:hidden">
          <GestionesDeLaPersona
            quien={{ documento: cliente.documento }}
            nombre={cliente.nombre}
            className="rounded-lg border border-border bg-card p-4 sm:p-5"
          />
        </div>
      ) : null}
    </ProveedorDeAnularRecibo>
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
