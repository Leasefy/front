'use client'

/**
 * PropuestaView — la ficha de UNA propuesta de Naira, en el orden de ACT-05 (Fase 13, plan 13-05; D13-14, D13-8, D13-9,
 * UI-SPEC §7.6, §11.1, §12).
 *
 * La consecuencia va PRIMERO (texto del servidor, tal cual) y en la línea inmediatamente siguiente, dentro del mismo
 * bloque ACCIÓN y fuera del desplegable, «Datos de esta propuesta:» con el corte de cada dato que cita (sin repetir, en el
 * orden del servidor) y el enlace al listado de su métrica (P7). Después el destinatario (un ROL), el tipo, la clase, el
 * vencimiento y la decisión. La huella que viaja al decidir es la del MISMO detalle que se pinta (FG13-15), y la decisión
 * se monta con esa huella como `key`. El razonamiento queda detrás de un tap. Este archivo no importa hooks de datos.
 */

import type { JSX } from 'react'
import { useState } from 'react'

import { BloqueDeCategoria } from '@/components/inmobiliaria/naira/BloqueDeCategoria'
import { DecisionDePropuesta } from '@/components/inmobiliaria/naira/DecisionDePropuesta'
import { EnlaceALaFuente } from '@/components/inmobiliaria/naira/EnlaceALaFuente'
import { LineaConFecha } from '@/components/inmobiliaria/naira/FilaDeSeguimiento'
import { MarcaDeCorte } from '@/components/inmobiliaria/naira/MarcaDeCorte'
import { RazonamientoDePropuesta } from '@/components/inmobiliaria/naira/RazonamientoDePropuesta'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NairaActionDetail } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DE_LA_CLASE_DE_CONSECUENCIA,
  CLAVE_DEL_DESTINO_EXTERNO,
  CLAVE_DEL_ESTADO_DE_LA_PROPUESTA,
  CLAVE_DEL_TIPO_DE_ACCION,
  cortesDeLosHechos,
} from '@/lib/naira/vocabulario-de-aprobaciones'
import { CLAVE_DEL_ROL } from '@/lib/naira/vocabulario-de-seguimiento'

export interface PropuestaViewProps {
  readonly proposalId: string
  readonly detalle: NairaActionDetail
  /** `null` sin signal-view o id vacío. */
  readonly hrefDeLaSenal: string | null
  /** `null` si sin investigación, sin signal-view o id vacío. */
  readonly hrefDeLaExplicacion: string | null
  /** El `recargar()` de la ficha: «Actualizar propuesta» y «Cargar la versión actual». */
  readonly onRecargar: () => void
  /** Dentro del cajón de Aprobaciones (18-10-2026): sin el título grande (el cajón trae el suyo). */
  readonly enCajon?: boolean
}

export function PropuestaView({
  proposalId,
  detalle,
  hrefDeLaSenal,
  hrefDeLaExplicacion,
  onRecargar,
  enCajon = false,
}: PropuestaViewProps): JSX.Element {
  const { t } = useI18n()
  const [decidida, setDecidida] = useState<'aprobada' | 'rechazada' | null>(null)
  const estadoMostrado = decidida ?? detalle.estado
  const cortes = cortesDeLosHechos(detalle.razonamiento.hechos)
  const { consecuencia } = detalle
  const d = consecuencia.destinatario
  const destinatario =
    d.kind === 'rol'
      ? t('inmobiliaria.ai.naira.seguimiento.rol', { rol: t(CLAVE_DEL_ROL[d.rol]) })
      : d.kind === 'externo'
        ? t('inmobiliaria.ai.naira.propuesta.externo', { aQuien: t(CLAVE_DEL_DESTINO_EXTERNO[d.aQuien]) })
        : t('inmobiliaria.ai.naira.propuesta.otroAgente', { evento: d.evento })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {enCajon ? null : (
            <h1 className="text-2xl font-semibold tracking-tight leading-tight text-fg">
              {t('inmobiliaria.ai.naira.propuesta.titulo')}
            </h1>
          )}
          <Badge variant="secondary">{t(CLAVE_DEL_ESTADO_DE_LA_PROPUESTA[estadoMostrado])}</Badge>
        </div>
      </header>

      <article data-naira-huella={detalle.huella} className="min-w-0 max-w-3xl">
        <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'ACTION' }}>
          <p data-naira-consecuencia="" className="text-base font-semibold text-fg">
            {consecuencia.texto}
          </p>
          <div data-naira-cortes-de-la-propuesta="" className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-fg-muted">{t('inmobiliaria.ai.naira.propuesta.datosDeLaPropuesta')}</span>
            {cortes.map((asOf) => (
              <MarcaDeCorte key={asOf} asOf={asOf} />
            ))}
            <EnlaceALaFuente de={{ kind: 'metrica', metricId: detalle.razonamiento.senal.metricId }} />
          </div>
          <p data-naira-meta-de-la-propuesta="" className="text-sm text-fg-muted">
            {destinatario} · {t(CLAVE_DEL_TIPO_DE_ACCION[consecuencia.tipo])} ·{' '}
            {t(CLAVE_DE_LA_CLASE_DE_CONSECUENCIA[consecuencia.clase])}
          </p>
          <p className="text-sm text-fg-muted">
            <LineaConFecha clave="inmobiliaria.ai.naira.aprobaciones.vence" valor={consecuencia.venceEn} />
          </p>
          <DecisionDePropuesta
            key={detalle.huella}
            proposalId={proposalId}
            huellaMostrada={detalle.huella}
            puedeDecidir={detalle.puedeDecidir}
            estado={detalle.estado}
            venceEn={consecuencia.venceEn}
            onDecidida={setDecidida}
            onCargarVersionActual={onRecargar}
          />
        </BloqueDeCategoria>
      </article>

      <RazonamientoDePropuesta
        razonamiento={detalle.razonamiento}
        hrefDeLaSenal={hrefDeLaSenal}
        hrefDeLaExplicacion={hrefDeLaExplicacion}
      />

      <Button type="button" variant="ghost" size="sm" data-testid="naira-actualizar-propuesta" onClick={onRecargar}>
        {t('inmobiliaria.ai.naira.propuesta.actualizar')}
      </Button>
    </div>
  )
}
