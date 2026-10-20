'use client';

/**
 * La Calificación Leasefy de quien se postuló, en el cajón del candidato,
 * cuando no hay estudio de documentos (Nico, 19-10-2026: «mostrarla en el
 * cajón»). Sale de la CUENTA de la persona: con todo su historial en Leasefy si
 * autorizó compartirla; si no, sólo lo que pasó con esta inmobiliaria.
 *
 * Es un dato de más, no el centro del cajón: si no se puede leer (sin permiso,
 * sin las tablas del buró, el back caído) no se pinta nada.
 */

import { useEffect, useState } from 'react';
import { Presence } from '@leasefy/cadence';

import { calificacionLeasefyApi, type CalificacionParaLaInmobiliaria } from '@/lib/api/calificacion-leasefy.service';
import { useTr } from '@/lib/i18n/use-tr';
import { TarjetaDeCalificacion } from './TarjetaDeCalificacion';

export function CalificacionDelPostulante({ applicationId }: { applicationId: string }) {
  const tr = useTr();
  const [r, setR] = useState<CalificacionParaLaInmobiliaria | null>(null);

  useEffect(() => {
    let vivo = true;
    setR(null);
    calificacionLeasefyApi
      .deLaPostulacion(applicationId)
      .then((x) => {
        if (vivo) setR(x.disponible ? x.resultado : null);
      })
      .catch(() => {
        /* opcional: sin dato, no se muestra */
      });
    return () => {
      vivo = false;
    };
  }, [applicationId]);

  return (
    <Presence show={r !== null}>
      {r && (
        <section className="space-y-1.5" data-testid="calificacion-del-postulante">
          <TarjetaDeCalificacion calificacion={r.calificacion} className="p-4" compacta />
          <p className="text-caption text-fg-subtle">
            {r.alcance === 'TODO_LEASEFY'
              ? tr('Con todo su historial en Leasefy.')
              : tr('Sólo lo que pasó con tu inmobiliaria: no autorizó compartir su calificación.')}
          </p>
        </section>
      )}
    </Presence>
  );
}
