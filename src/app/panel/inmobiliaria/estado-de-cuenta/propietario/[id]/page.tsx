'use client';

/**
 * El estado de cuenta de un PROPIETARIO.
 *
 * Del otro lado del mismo contrato: lo que la inmobiliaria le ha girado y lo
 * que le falta por girar, con la comisión y sus impuestos en columnas propias.
 * CEO: «También hay un estado de cuenta a favor del propietario, que es lo que
 * yo le debo pagar mes a mes hasta completar el contrato.»
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { CompartirEstadoDeCuenta } from '@/components/estado-de-cuenta/CompartirEstadoDeCuenta';
import { PantallaDelEstadoDeCuenta } from '@/components/estado-de-cuenta/PantallaDelEstadoDeCuenta';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';

const LISTA = '/panel/inmobiliaria/propietarios';

function Contenido() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const volver = rutaDeRegreso(searchParams.get('volver'), `${LISTA}/${id}`);

  /*
   * 🔴 El id del PROPIETARIO no es el de su cuenta del portal: `Propietario` es
   * la ficha comercial de la agencia y casi ninguno tiene usuario (en la
   * cartera real: 1.733 propietarios, 57 con cuenta). El hilo del chat —y con
   * él el envío por WhatsApp— se abre contra un `User`, así que hay que
   * buscarlo. Si esa llamada falla, el documento sale igual: lo único que se
   * pierde es el ítem de WhatsApp, y el menú ya lo dice.
   */
  const [cuentaDePortalId, setCuentaDePortalId] = useState<string | null>(null);
  /*
   * Una sola lectura de la ficha: la cuenta del portal (WhatsApp) y el TIPO de
   * documento, que el estado de cuenta todavía no trae (P-19, QA-PROP 03-10:
   * el encabezado decía «NIT/CC 52123456» a una persona con cédula). Si falla,
   * el documento sale igual con lo de siempre.
   */
  const fichaDelPropietario = useMemo(
    () => propietariosApi.getById(id).catch(() => null),
    [id],
  );
  useEffect(() => {
    let vivo = true;
    void fichaDelPropietario.then((p) => {
      /* sin cuenta conocida: el ítem de WhatsApp queda apagado */
      if (vivo) setCuentaDePortalId(p?.cuentaDePortalId ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [fichaDelPropietario]);

  return (
    <PantallaDelEstadoDeCuenta
      /* El recorte lo hace el BACK (auditoría 13-09, E4): la pantalla manda
         el filtro y pinta lo que vuelve, que es exactamente lo mismo que ve
         quien abre el enlace compartido. */
      cargar={async (filtro) => {
        const [doc, ficha] = await Promise.all([
          estadoDeCuentaApi.propietario(id, filtro),
          fichaDelPropietario,
        ]);
        // Lo que mande el back gana; la ficha sólo llena el hueco.
        return doc.cliente.tipoDocumento || !ficha?.documentType
          ? doc
          : { ...doc, cliente: { ...doc.cliente, tipoDocumento: ficha.documentType } };
      }}
      volverA={{ href: volver }}
      acciones={(doc, nota, filtros) => (
        <CompartirEstadoDeCuenta
          doc={doc}
          hoy={doc.fecha}
          tipo="propietario"
          id={id}
          personaId={cuentaDePortalId}
          nota={nota}
          /* Viaja con el enlace: el cliente ve la misma vista filtrada. */
          filtros={filtros}
        />
      )}
    />
  );
}

export default function EstadoDeCuentaDelPropietarioPage() {
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
