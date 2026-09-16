'use client';

/**
 * Paso 3 de 3: la respuesta para EL inmueble que la persona venía arrendando.
 *
 * Nico, 2026-09-14: después del estudio, si las aseguradoras no la respaldan se
 * le da feedback y se le deja la puerta abierta a otros inmuebles (el agente de
 * matching arma «Explorar» con lo que sí va con ella); si la respaldan, se le
 * dice qué sigue: postularse a este inmueble. El detalle del resultado (tope,
 * aseguradoras, cómo mejorar) lo sigue dando la vista de abajo.
 *
 * Sólo aparece si la persona llegó desde «¿Te podemos arrendar este inmueble?»
 * (`arriendo-en-curso`). Sin eso, esta página es «Mi tope de arriendo» a secas.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Compass, Hourglass, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { PasosDelArriendo } from '@/components/aprobacion/PasosDelArriendo';
import { PostularButton } from '@/components/tenant/PostularButton';
import { formatCurrency } from '@/lib/format';
import { leerArriendoEnCurso, type ArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso';

interface Props {
  estado: string;
  /** Tope que respaldan las aseguradoras; `null` = aprobado sin tope informado. */
  tope: number | null;
}

export function RespuestaDelArriendo({ estado, tope }: Props) {
  const [arriendo, setArriendo] = useState<ArriendoEnCurso | null>(null);
  useEffect(() => setArriendo(leerArriendoEnCurso()), []);

  if (!arriendo || !['aprobado', 'rechazado', 'en_proceso'].includes(estado)) return null;

  const cabeLaAprobacion = estado === 'aprobado' && (tope === null || arriendo.canon <= tope);
  const aprobadoPeroSePasa = estado === 'aprobado' && !cabeLaAprobacion;

  return (
    <section
      data-testid="respuesta-del-arriendo"
      aria-labelledby="respuesta-del-arriendo-titulo"
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-8"
    >
      <PasosDelArriendo actual={3} />

      <div className="mt-6 flex flex-col gap-2">
        {cabeLaAprobacion && (
          <div data-testid="respuesta-aprobado" className="flex items-start gap-3">
            <CheckCircle weight="fill" className="mt-1 h-7 w-7 flex-shrink-0 text-success" aria-hidden="true" />
            <div>
              <h2 id="respuesta-del-arriendo-titulo" className="font-heading text-2xl font-semibold text-fg text-balance">
                ¡Te lo podemos arrendar!
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Las aseguradoras respaldan tu arriendo de <span className="font-medium text-fg">{arriendo.titulo}</span>{' '}
                por <span className="font-mono tabular-nums">{formatCurrency(arriendo.canon)}</span> al mes. El siguiente
                paso es postularte: la inmobiliaria revisa tu solicitud y te contacta.
              </p>
            </div>
          </div>
        )}

        {aprobadoPeroSePasa && (
          <div data-testid="respuesta-se-pasa" className="flex items-start gap-3">
            <WarningCircle weight="fill" className="mt-1 h-7 w-7 flex-shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h2 id="respuesta-del-arriendo-titulo" className="font-heading text-2xl font-semibold text-fg text-balance">
                Te aprobaron, pero este inmueble se pasa de tu tope
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Te respaldan hasta <span className="font-mono tabular-nums">{formatCurrency(tope ?? 0)}</span> y{' '}
                {arriendo.titulo} pide <span className="font-mono tabular-nums">{formatCurrency(arriendo.canon)}</span>.
                Te mostramos los que sí entran en tu tope.
              </p>
            </div>
          </div>
        )}

        {estado === 'rechazado' && (
          <div data-testid="respuesta-rechazado" className="flex items-start gap-3">
            <Compass className="mt-1 h-7 w-7 flex-shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 id="respuesta-del-arriendo-titulo" className="font-heading text-2xl font-semibold text-fg text-balance">
                Por ahora no te podemos arrendar {arriendo.titulo}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Las aseguradoras no respaldaron este arriendo, pero la puerta sigue abierta: buscamos por ti inmuebles
                que sí van contigo, y abajo te contamos qué puedes hacer para mejorar tu resultado.
              </p>
            </div>
          </div>
        )}

        {estado === 'en_proceso' && (
          <div data-testid="respuesta-en-proceso" className="flex items-start gap-3">
            <Hourglass className="mt-1 h-7 w-7 flex-shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 id="respuesta-del-arriendo-titulo" className="font-heading text-2xl font-semibold text-fg text-balance">
                Estamos validando tus datos
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Consultamos a las aseguradoras para {arriendo.titulo}. Apenas tengamos la respuesta la verás acá.
              </p>
            </div>
          </div>
        )}
      </div>

      {estado !== 'en_proceso' && (
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-end">
          <Button asChild variant="ghost">
            <Link href={`/propiedades/${arriendo.propertyId}`}>Ver el inmueble</Link>
          </Button>
          {cabeLaAprobacion ? (
            <PostularButton propertyId={arriendo.propertyId} canonCop={arriendo.canon}>
              Postularme a este inmueble
            </PostularButton>
          ) : (
            <Button asChild>
              <Link href="/inquilino/explorar" data-testid="ver-inmuebles-para-ti">
                Ver inmuebles que van contigo
              </Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
