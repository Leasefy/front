'use client'

/**
 * TarjetaDePropuesta — una propuesta de Naira en la pestaña Aprobaciones (Fase 13, plan 13-05; UI-SPEC §7.5).
 *
 * Pinta tipo · rol (o «Otro agente»), el estado, la clase, la consecuencia SOLO con sus cortes al lado (E13-6 aplicada,
 * D13-23: sin un corte válido no sale, INV-07), el vencimiento y «Revisar propuesta». El enlace a la ficha no pre-carga
 * (el prefetch de la ruta está apagado) y ningún paso del cursor o del foco pide nada: el detalle de una propuesta
 * registra que se presentó y solo lo pide la ficha al abrirse (D13-14, FG13-14).
 *
 * NO pinta: cuándo se propuso (con una decisión al lado se leería un tiempo de aprobación, 🔔 H9), si es reversible
 * aparte (la clase ya lo dice) ni si se puede decidir (eso lo dice la ficha). El destinatario es un ROL (B-5). No conoce
 * rutas: el `href` de la ficha llega armado (D13-1).
 */

import type { JSX } from 'react'
import { useId } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NairaActionSummary } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DE_LA_CLASE_DE_CONSECUENCIA,
  CLAVE_DEL_DESTINO_EXTERNO,
  CLAVE_DEL_ESTADO_DE_LA_PROPUESTA,
  CLAVE_DEL_TIPO_DE_ACCION,
  consecuenciaDelListado,
} from '@/lib/naira/vocabulario-de-aprobaciones'
import { CLAVE_DEL_ROL } from '@/lib/naira/vocabulario-de-seguimiento'

import { BloqueDeCategoria } from './BloqueDeCategoria'
import { LineaConFecha } from './FilaDeSeguimiento'
import { MarcaDeCorte } from './MarcaDeCorte'

export interface TarjetaDePropuestaProps {
  readonly accion: NairaActionSummary
  /** `null` ⇒ sin «Revisar propuesta» (id vacío). */
  readonly hrefDeLaFicha: string | null
}

export function TarjetaDePropuesta({ accion, hrefDeLaFicha }: TarjetaDePropuestaProps): JSX.Element {
  const { t } = useI18n()
  const idTitulo = useId()
  const consecuencia = consecuenciaDelListado(accion)
  const tipo = t(CLAVE_DEL_TIPO_DE_ACCION[accion.tipo])
  const d = accion.destinatario
  const titular =
    d.kind === 'rol'
      ? t('inmobiliaria.ai.naira.aprobaciones.titularConRol', { tipo, rol: t(CLAVE_DEL_ROL[d.rol]) })
      : d.kind === 'externo'
        ? t('inmobiliaria.ai.naira.aprobaciones.titularExterno', { tipo, aQuien: t(CLAVE_DEL_DESTINO_EXTERNO[d.aQuien]) })
        : t('inmobiliaria.ai.naira.aprobaciones.titularOtroAgente', { tipo, evento: d.evento })

  return (
    <article data-naira-propuesta={accion.estado} aria-labelledby={idTitulo} className="min-w-0">
      <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'ACTION' }}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 id={idTitulo} className="text-base font-semibold text-fg">
              {titular}
            </h3>
            <Badge variant="secondary">{t(CLAVE_DEL_ESTADO_DE_LA_PROPUESTA[accion.estado])}</Badge>
          </div>
          <p className="text-sm text-fg-muted">{t(CLAVE_DE_LA_CLASE_DE_CONSECUENCIA[accion.clase])}</p>
          {consecuencia.kind === 'con_corte' ? (
            <>
              <p data-naira-consecuencia-del-listado="" className="text-sm text-fg">
                {consecuencia.texto}
              </p>
              <div data-naira-cortes-del-listado="" className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-fg-muted">{t('inmobiliaria.ai.naira.propuesta.datosDeLaPropuesta')}</span>
                {consecuencia.asOfs.map((asOf) => <MarcaDeCorte key={asOf} asOf={asOf} />)}
              </div>
            </>
          ) : null}
          {consecuencia.kind === 'no_reproducible' ? (
            <p data-naira-no-reproducible="" className="text-sm text-fg">
              {t('inmobiliaria.ai.naira.aprobaciones.noReproducible')}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">
              <LineaConFecha clave="inmobiliaria.ai.naira.aprobaciones.vence" valor={accion.venceEn} />
            </p>
            {hrefDeLaFicha !== null ? (
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href={hrefDeLaFicha} prefetch={false}>
                  {t('inmobiliaria.ai.naira.aprobaciones.revisar')}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </BloqueDeCategoria>
    </article>
  )
}
