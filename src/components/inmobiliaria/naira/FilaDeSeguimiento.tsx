'use client'

/**
 * FilaDeSeguimiento.tsx — UNA fila de la lista de loops vivos que Naira sigue de cerca (Fase 13, plan 13-04; UI-SPEC §7.3.1).
 *
 * Qué dice: el nombre conversacional de la métrica, el estado y la forma del seguimiento, el dueño SOLO como rol («Rol:
 * Cartera»; B-5, D13-11: ni una persona ni «quién cerró»), si nadie tiene ese rol, si ya se avisó, la última revisión, la
 * próxima, cuándo se cierra solo y, si Naira está por confirmar un desenlace, cuál.
 *
 *   · Los conteos de Naira no se escriben (U5): ni los ciclos, ni las confirmaciones del candidato, ni desde cuándo.
 *   · La razón del dueño no se pinta (la de `persona_espera_b5` es de B-5); tampoco la clave de causa, el episodio, el
 *     detector, la clase ni la familia (P9).
 *   · Las fechas pasan por `fechaLegible` (nunca crudas; sin «Corte» ni edad) dentro de un `<time>` con el valor de máquina.
 *     Con datos de ejemplo, «Última revisión» dice «DATO DE EJEMPLO» (P5).
 *   · El voto es el de equipo de 13-02 sobre la señal del loop, con origen `loop_abierto` (P2); solo si el rol puede votar.
 *   · No conoce ninguna ruta: los `href` los arma la página (D13-1, P3); `null` ⇒ sin enlace.
 *
 * `LineaConFecha` y `LineaDeSeguimientoDeLaSenal` (UI-SPEC §7.2, la usa el detalle de una señal) viven aquí para que la
 * fila, la bitácora y la señal digan una fecha y un estado de la misma manera.
 */

import type { JSX } from 'react'
import { useId } from 'react'
import Link from 'next/link'
import { Warning } from '@phosphor-icons/react'

import type { NairaOpenLoop } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DE_LA_FORMA_DEL_LOOP,
  CLAVE_DEL_CANDIDATO_DEL_LOOP,
  CLAVE_DEL_ESTADO_DEL_LOOP,
  CLAVE_DEL_ROL,
  fechaLegible,
  tituloDeLaMetrica,
} from '@/lib/naira/vocabulario-de-seguimiento'

import { BotonesDeUtilidad } from './BotonesDeUtilidad'
import { useOrigenDeNaira } from './OrigenDeNaira'

export interface FilaDeSeguimientoProps {
  readonly loop: NairaOpenLoop
  /** `null` ⇒ sin «Ver la señal» (sin signal-view o id vacío). */
  readonly hrefDeLaSenal: string | null
  /** `null` ⇒ sin «Ver la bitácora». */
  readonly hrefDeLaBitacora: string | null
  /** canAccess('naira', 'signal-feedback'); `false` ⇒ sin los botones de utilidad. */
  readonly puedeVotar: boolean
}

const CLASE_DEL_ENLACE = 'text-sm text-fg-muted underline underline-offset-2 hover:text-primary'
const SEPARADOR = '\u0001'

/** Una línea con una fecha legible dentro de un `<time>`; si la fecha no se puede leer, lo dice sin mostrarla cruda. */
export function LineaConFecha({
  clave,
  valor,
  params,
}: {
  readonly clave: string
  readonly valor: string
  readonly params?: Readonly<Record<string, string>>
}): JSX.Element {
  const { t } = useI18n()
  const legible = fechaLegible(valor)
  if (legible === null) {
    return <span>{t(clave, { ...params, fecha: t('inmobiliaria.ai.naira.seguimiento.fechaIlegible') })}</span>
  }
  const [antes = '', despues = ''] = t(clave, { ...params, fecha: SEPARADOR }).split(SEPARADOR)
  return (
    <span>
      {antes}
      <time dateTime={valor}>{legible}</time>
      {despues}
    </span>
  )
}

export interface LineaDeSeguimientoDeLaSenalProps {
  readonly loop: NairaOpenLoop
  readonly hrefDeLaBitacora: string | null
}

/** La línea «Seguimiento: <estado> · Ver la bitácora» del detalle de una señal (UI-SPEC §7.2): nada más del loop. */
export function LineaDeSeguimientoDeLaSenal({ loop, hrefDeLaBitacora }: LineaDeSeguimientoDeLaSenalProps): JSX.Element {
  const { t } = useI18n()
  return (
    <p data-naira-seguimiento-de-la-senal="" className="flex flex-wrap items-center gap-2 text-sm text-fg">
      <span>
        {t('inmobiliaria.ai.naira.seguimiento.lineaDeLaSenal', { estado: t(CLAVE_DEL_ESTADO_DEL_LOOP[loop.estado]) })}
      </span>
      {hrefDeLaBitacora !== null ? (
        <Link href={hrefDeLaBitacora} className={CLASE_DEL_ENLACE}>
          {t('inmobiliaria.ai.naira.seguimiento.verLaBitacora')}
        </Link>
      ) : null}
    </p>
  )
}

export function FilaDeSeguimiento({ loop, hrefDeLaSenal, hrefDeLaBitacora, puedeVotar }: FilaDeSeguimientoProps): JSX.Element {
  const { t } = useI18n()
  const idTitulo = useId()
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'

  return (
    <article
      data-naira-loop=""
      aria-labelledby={idTitulo}
      className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-4 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id={idTitulo} className="text-base font-semibold text-fg">
          {tituloDeLaMetrica(loop.metricId) ?? t('inmobiliaria.ai.naira.seguimiento.metricaSinNombre')}
        </h2>
        <p className="text-overline text-fg-muted">
          {t(CLAVE_DEL_ESTADO_DEL_LOOP[loop.estado])} · {t(CLAVE_DE_LA_FORMA_DEL_LOOP[loop.forma])}
        </p>
      </div>

      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p className="text-fg">{t('inmobiliaria.ai.naira.seguimiento.rol', { rol: t(CLAVE_DEL_ROL[loop.owner]) })}</p>
        {loop.huerfanoDeRol ? (
          <p data-naira-huerfano="" className="flex items-start gap-2 text-fg">
            <Warning weight="fill" className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>{t('inmobiliaria.ai.naira.seguimiento.huerfanoDeRol')}</span>
          </p>
        ) : null}
        <p className="text-fg-muted">
          {loop.comunicacion.kind === 'comunicado' ? (
            <LineaConFecha clave="inmobiliaria.ai.naira.seguimiento.comunicado" valor={loop.comunicacion.primerDia} />
          ) : (
            t('inmobiliaria.ai.naira.seguimiento.sinComunicar')
          )}
        </p>
        <p className="text-fg-muted">
          {esEjemplo ? (
            <span data-naira-ejemplo="true">
              {t('inmobiliaria.ai.naira.seguimiento.ultimaRevision', { fecha: t('inmobiliaria.ai.naira.corte.datoDeEjemplo') })}
            </span>
          ) : (
            <LineaConFecha clave="inmobiliaria.ai.naira.seguimiento.ultimaRevision" valor={loop.ultimoDiaVerificado} />
          )}
        </p>
        <p className="text-fg-muted">
          {loop.nextCheckAt.kind === 'programada' ? (
            <LineaConFecha clave="inmobiliaria.ai.naira.seguimiento.proximaRevision" valor={loop.nextCheckAt.en} />
          ) : (
            t('inmobiliaria.ai.naira.seguimiento.sinRevisionProgramada')
          )}
        </p>
        <p className="text-fg-muted">
          <LineaConFecha clave="inmobiliaria.ai.naira.seguimiento.expira" valor={loop.expiraEn} />
        </p>
        {loop.candidato.kind === 'en_curso' ? (
          <p className="text-fg md:col-span-2">{t(CLAVE_DEL_CANDIDATO_DEL_LOOP[loop.candidato.desenlace])}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {puedeVotar ? (
          <div className="overflow-x-auto">
            <BotonesDeUtilidad promocionId={loop.promocionId} origenDelVoto={{ kind: 'loop_abierto' }} />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          {hrefDeLaSenal !== null ? (
            <Link href={hrefDeLaSenal} className={CLASE_DEL_ENLACE}>
              {t('inmobiliaria.ai.naira.seguimiento.verLaSenal')}
            </Link>
          ) : null}
          {hrefDeLaBitacora !== null ? (
            <Link href={hrefDeLaBitacora} className={CLASE_DEL_ENLACE}>
              {t('inmobiliaria.ai.naira.seguimiento.verLaBitacora')}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}
