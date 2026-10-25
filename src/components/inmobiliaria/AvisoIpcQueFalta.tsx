'use client';

/**
 * AvisoIpcQueFalta — «N contratos se renuevan sin incremento: falta el IPC 2026».
 *
 * 🔴 N3 (P0). La renovación sube el canon con el IPC del año calendario
 * anterior al que rige (Ley 820, art. 20). Ese número vivía en una tabla del
 * código que alguien tiene que actualizar cada enero; sin el de 2026, toda
 * renovación que rige en 2027 salía con el MISMO canon y nadie lo veía.
 *
 * El número de contratos lo CUENTA el back con la misma regla que ejecuta el
 * cron (`GET /inmobiliaria/renovaciones/ipc-que-falta`): acá no se estima nada
 * y no se muestra ningún porcentaje — la cifra del IPC la carga la
 * inmobiliaria mirando al DANE, en Configuración → Perfil.
 *
 * Si la consulta falla no se pinta nada. Es información de más —la pantalla se
 * usa entera sin ella— y un fallo de red no es «no falta nada», así que
 * tampoco se afirma eso.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Warning } from '@phosphor-icons/react';
import { renovacionAutomaticaApi, type IpcQueFalta } from '@/lib/api/renovacion-automatica.service';
import { hrefDeSeccion } from '@/app/panel/inmobiliaria/configuracion/secciones';
import { ANCLA_IPC_POR_ANIO } from './ConfigIpcPorAnio';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

export function AvisoIpcQueFalta() {
  const [dato, setDato] = useState<IpcQueFalta | null>(null);

  useEffect(() => {
    let vigente = true;
    // El pedido va DENTRO del try: un fallo antes de que haya promesa no puede
    // subir a la frontera de error y tumbar la pantalla de renovaciones.
    void (async () => {
      try {
        const respuesta = await renovacionAutomaticaApi.ipcQueFalta();
        if (vigente) setDato(respuesta);
      } catch {
        /* silencio: no saber si falta no es saber que no falta */
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const contratos = Number(dato?.contratos);
  // Sin IPC que falte, o sin ningún contrato que rija ese año, no hay nada que
  // avisar. Y una respuesta con otra forma no se pinta: «NaN contratos» asusta
  // más que callarse.
  if (!dato || dato.anioDelIpc == null || !Number.isFinite(contratos) || contratos <= 0) {
    return null;
  }

  const uno = contratos === 1;

  return (
    // 21-10 (revisión de Operación): un renglón, no una franja de dos párrafos. El IPC del
    // año lo publica el DANE en enero: hasta entonces es un aviso para tener presente.
    <div
      role="status"
      data-testid="aviso-ipc-que-falta"
      className="flex flex-col gap-1.5 rounded-[16px] bg-warning-soft px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <p className="flex min-w-0 items-start gap-2 text-body-sm">
        <Warning className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" weight="duotone" aria-hidden="true" />
        <span>
          <span className="font-medium text-warning">
            <span className="tabular-nums">{contratos.toLocaleString(localeDeLasCifras())}</span>{' '}
            {uno ? 'contrato se renueva' : 'contratos se renuevan'} sin incremento: falta el IPC {dato.anioDelIpc}
          </span>
          <span className="text-fg-muted">
            {' '}· {uno ? 'Rige' : 'Rigen'} en {dato.anioQueRige} y la ley toma el IPC de {dato.anioDelIpc}, que el DANE publica en enero.
          </span>
        </span>
      </p>
      <Link
        href={`${hrefDeSeccion('perfil')}#${ANCLA_IPC_POR_ANIO}`}
        className="shrink-0 pl-6 text-body-sm font-medium text-primary underline-offset-4 hover:underline sm:pl-0"
        data-testid="aviso-ipc-que-falta-enlace"
      >
        Cargar el IPC
      </Link>
    </div>
  );
}

export default AvisoIpcQueFalta;
