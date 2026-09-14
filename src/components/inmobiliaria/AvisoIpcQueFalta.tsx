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
    <div
      role="status"
      data-testid="aviso-ipc-que-falta"
      className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2"
    >
      <Warning className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-warning">
          <span className="tabular-nums">{contratos.toLocaleString('es-CO')}</span>{' '}
          {uno ? 'contrato se renueva' : 'contratos se renuevan'} sin incremento: falta el IPC {dato.anioDelIpc}
        </p>
        <p className="text-body-sm text-fg-muted mt-0.5">
          {uno ? 'Rige' : 'Rigen'} en {dato.anioQueRige} y la ley toma el IPC de {dato.anioDelIpc}, que Leasefy
          todavía no tiene. Cárgalo cuando el DANE lo publique.{' '}
          <Link
            href={`${hrefDeSeccion('perfil')}#${ANCLA_IPC_POR_ANIO}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
            data-testid="aviso-ipc-que-falta-enlace"
          >
            Cargar el IPC en Configuración → Perfil
          </Link>
        </p>
      </div>
    </div>
  );
}

export default AvisoIpcQueFalta;
