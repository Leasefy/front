'use client'

/**
 * RespuestaDeNaira — UNA respuesta de la conversación con Naira (Fase 13, plan 13-06; D13-8, D13-9, D13-10, UI-SPEC §7.7).
 *
 * Las cuatro ramas de la unión de 9.5-06 van en el MISMO bloque neutro rotulado «RESPUESTA», que NO es una de las
 * categorías de INV-03 ni dice «DATO»: el texto del servidor puede traer citas causales (U6). Los textos del servidor se
 * pintan tal cual (sin Markdown, sin traducir; pueden llegar en voseo hasta E13-8).
 *
 * Con `oraciones` (E13-4, D13-23) cada una va en la categoría de su `seccion` —la declaración, neutra—, la causa pasa por
 * `OracionesCausales` (el chip sale solo de `claimClass`; sin clase, o una hipótesis sin banda, se oculta y se declara) y
 * cada cifra lleva su corte y su enlace, que sale del registro por `metricId`. Sin `oraciones` (agente sin la enmienda), el
 * bloque neutro de hoy: el texto (u oculto, si puede traer una causa), los cortes por respuesta sin enlace (C17) y el
 * alcance. Nada se ejecuta desde la conversación (🔔 H11): una acción pedida se manda a Aprobaciones, con enlace solo si
 * la página lo pasa. No conoce rutas: recibe `hrefDeAprobaciones` ya armado.
 */

import type { JSX } from 'react'
import { useId } from 'react'
import Link from 'next/link'
import { ChatTeardropText, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import type { NairaConversationAnswer, NairaConversationSentence } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DE_LA_FALLA,
  CLAVE_DEL_CARRIL_NO_SERVIDO,
  CLAVE_DEL_EJE,
  COPIA_PROPIA_DE_LA_NEGATIVA,
  causalesDeLaConversacion,
  oracionConCorte,
  sugerenciasDeLaNegativa,
  textoVisibleDeLaRespuesta,
  tramosDeLaRespuesta,
  type CopiaPropiaDeLaNegativa,
  type NairaConversacionNegada,
  type NairaConversacionRespondida,
  type TramoDeLaRespuesta as DatosDelTramo,
} from '@/lib/naira/conversacion'

import { BloqueDeCategoria } from './BloqueDeCategoria'
import { EnlaceALaFuente } from './EnlaceALaFuente'
import { MarcaDeCorte } from './MarcaDeCorte'
import { OracionesCausales } from './OracionesCausales'
import { ProveedorDeOrigen, type OrigenDeLosDatos } from './OrigenDeNaira'

export interface RespuestaDeNairaProps {
  readonly respuesta: NairaConversationAnswer
  readonly origen: OrigenDeLosDatos
  /** `null` ⇒ sin «Ir a Aprobaciones» (el rol no tiene action-view). */
  readonly hrefDeAprobaciones: string | null
  /** Precarga el compositor; NO envía. */
  readonly onSugerir: (pregunta: string) => void
  /** Reloj inyectable para MarcaDeCorte (tests). */
  readonly ahora?: Date
}

/** El texto del servidor, tal cual. */
function TextoDelServidor({ texto }: { readonly texto: string }): JSX.Element {
  return (
    <p data-naira-texto-del-servidor="" className="whitespace-pre-wrap break-words text-sm text-fg">
      {texto}
    </p>
  )
}

/** Una oración de dato, conocimiento, recomendación o acción: su texto y, debajo, el corte y el enlace de cada cifra. */
function OracionConSusCifras({ oracion, ahora }: { readonly oracion: NairaConversationSentence; readonly ahora?: Date }): JSX.Element {
  const { t } = useI18n()
  if (!oracionConCorte(oracion)) {
    return (
      <p data-naira-dato-sin-corte="" className="text-sm text-fg-muted">
        {t('inmobiliaria.ai.naira.corte.sinCorte')}
      </p>
    )
  }
  return (
    <>
      <p data-naira-oracion="" className="whitespace-pre-wrap break-words text-sm text-fg">
        {oracion.texto}
      </p>
      {oracion.cifras.length > 0 ? (
        <div data-naira-cifras-de-la-oracion="" className="flex flex-wrap items-center gap-2 text-sm">
          {oracion.cifras.map((c, i) => (
            <span key={i} data-naira-cifra-de-la-oracion={c.metricId} className="inline-flex items-center gap-2">
              <MarcaDeCorte asOf={c.asOf} ahora={ahora} />
              <EnlaceALaFuente de={{ kind: 'metrica', metricId: c.metricId }} />
            </span>
          ))}
        </div>
      ) : null}
    </>
  )
}

/** Un tramo de oraciones consecutivas de la misma sección. */
function TramoDeLaRespuesta({ tramo, ahora }: { readonly tramo: DatosDelTramo; readonly ahora?: Date }): JSX.Element {
  switch (tramo.seccion) {
    case 'declaracion':
    case 'MEMORY':
      // La declaración es neutra (D13-9); MEMORY no la emite la conversación y sin procedencia no hay categoría.
      return (
        <div data-naira-tramo-neutro="" className="space-y-2">
          {tramo.oraciones.map((oracion, i) => (
            <p key={i} data-naira-oracion="" className="whitespace-pre-wrap break-words text-sm text-fg">
              {oracion.texto}
            </p>
          ))}
        </div>
      )
    case 'INFERENCE':
      return (
        <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'INFERENCE' }}>
          <OracionesCausales oraciones={causalesDeLaConversacion(tramo.oraciones)} />
        </BloqueDeCategoria>
      )
    case 'LIVE_DATA':
    case 'KNOWLEDGE':
    case 'RECOMMENDATION':
    case 'ACTION':
      return (
        <BloqueDeCategoria origen={{ kind: 'seccion', seccion: tramo.seccion }}>
          {tramo.oraciones.map((oracion, i) => (
            <OracionConSusCifras key={i} oracion={oracion} ahora={ahora} />
          ))}
        </BloqueDeCategoria>
      )
    default: {
      const _exhaustivo: never = tramo.seccion
      return _exhaustivo
    }
  }
}

/** El alcance de la respuesta y lo que no consultó (D9.5-5). */
function AlcanceDeLaRespuesta({ respuesta }: { readonly respuesta: NairaConversacionRespondida }): JSX.Element {
  const { t } = useI18n()
  return (
    <>
      <p data-naira-alcance={respuesta.alcance.kind} className="text-label text-fg-muted">
        {respuesta.alcance.kind === 'por_eje'
          ? t('inmobiliaria.ai.naira.preguntar.alcancePorEje', { eje: t(CLAVE_DEL_EJE[respuesta.alcance.eje]) })
          : t('inmobiliaria.ai.naira.preguntar.alcanceToda')}
      </p>
      {respuesta.noServidos.map((carril) => (
        <p key={carril} data-naira-no-servido={carril} className="text-sm text-fg-muted">
          {t(CLAVE_DEL_CARRIL_NO_SERVIDO[carril])}
        </p>
      ))}
    </>
  )
}

function Respondida({ respuesta, ahora }: { readonly respuesta: NairaConversacionRespondida; readonly ahora?: Date }): JSX.Element {
  const { t } = useI18n()
  const tramos = tramosDeLaRespuesta(respuesta)
  if (tramos !== null) {
    return (
      <>
        <div data-naira-oraciones="" className="space-y-3">
          {tramos.map((tramo, i) => (
            <TramoDeLaRespuesta key={i} tramo={tramo} ahora={ahora} />
          ))}
        </div>
        <AlcanceDeLaRespuesta respuesta={respuesta} />
      </>
    )
  }
  const textoVisible = textoVisibleDeLaRespuesta(respuesta)
  return (
    <>
      <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.preguntar.sinSeparar')}</p>
      {textoVisible !== null ? (
        <TextoDelServidor texto={textoVisible} />
      ) : (
        <p data-naira-texto-oculto="" className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.naira.preguntar.textoOculto')}
        </p>
      )}
      {respuesta.asOfs.length > 0 ? (
        <div data-naira-cortes-de-la-respuesta="" className="flex flex-wrap items-center gap-2">
          <span className="text-label text-fg-muted">{t('inmobiliaria.ai.naira.preguntar.cortes')}</span>
          {respuesta.asOfs.map((asOf, i) => (
            <MarcaDeCorte key={i} asOf={asOf} ahora={ahora} />
          ))}
        </div>
      ) : null}
      <p data-naira-sin-fuente-por-cifra="" className="text-sm text-fg-muted">
        {t('inmobiliaria.ai.naira.preguntar.sinFuentePorCifra')}
      </p>
      <AlcanceDeLaRespuesta respuesta={respuesta} />
    </>
  )
}

/** Lo que la UI agrega a una negativa (P8). */
function CopiaPropia({ copia, hrefDeAprobaciones }: { readonly copia: CopiaPropiaDeLaNegativa; readonly hrefDeAprobaciones: string | null }): JSX.Element | null {
  const { t } = useI18n()
  switch (copia.kind) {
    case 'ninguna':
      return null
    case 'frase':
      return (
        <p data-naira-copia-propia="frase" className="text-sm text-fg">
          {t(copia.clave)}
        </p>
      )
    case 'precaucion':
      return (
        <p
          data-naira-copia-propia="precaucion"
          data-naira-precaucion=""
          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-caption text-fg"
        >
          <Warning aria-hidden size={16} className="text-warning" />
          {t(copia.clave)}
        </p>
      )
    case 'aprobaciones':
      return (
        <div data-naira-copia-propia="aprobaciones" className="space-y-1">
          <p className="text-sm text-fg">{t(copia.clave)}</p>
          {hrefDeAprobaciones !== null ? (
            <Button asChild variant="link" size="sm">
              <Link href={hrefDeAprobaciones}>{t('inmobiliaria.ai.naira.preguntar.negativa.irAAprobaciones')}</Link>
            </Button>
          ) : null}
        </div>
      )
    default: {
      const _exhaustivo: never = copia
      return _exhaustivo
    }
  }
}

function Negada({
  respuesta,
  hrefDeAprobaciones,
  onSugerir,
}: {
  readonly respuesta: NairaConversacionNegada
  readonly hrefDeAprobaciones: string | null
  readonly onSugerir: (pregunta: string) => void
}): JSX.Element {
  const { t } = useI18n()
  const copia: CopiaPropiaDeLaNegativa = COPIA_PROPIA_DE_LA_NEGATIVA[respuesta.razon]
  const sugerencias = sugerenciasDeLaNegativa(respuesta)
  return (
    <>
      <TextoDelServidor texto={respuesta.texto} />
      <CopiaPropia copia={copia} hrefDeAprobaciones={hrefDeAprobaciones} />
      {sugerencias.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.preguntar.puedesPreguntar')}</p>
          <ul data-naira-sugerencias="" className="flex flex-wrap gap-2">
            {sugerencias.map((s, i) =>
              s.kind === 'metrica' ? (
                <li key={i}>
                  <Button type="button" variant="link" size="sm" onClick={() => onSugerir(s.pregunta)}>
                    {s.etiqueta}
                  </Button>
                </li>
              ) : (
                <li key={i} className="text-sm text-fg-muted">
                  {t(s.clave)}
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}
    </>
  )
}

export function RespuestaDeNaira({ respuesta, origen, hrefDeAprobaciones, onSugerir, ahora }: RespuestaDeNairaProps): JSX.Element {
  const { t } = useI18n()
  const idDeLaEtiqueta = useId()

  function cuerpo(): JSX.Element {
    switch (respuesta.kind) {
      case 'respondida':
        return <Respondida respuesta={respuesta} ahora={ahora} />
      case 'negada':
        return <Negada respuesta={respuesta} hrefDeAprobaciones={hrefDeAprobaciones} onSugerir={onSugerir} />
      case 'bloqueada':
        return (
          <>
            <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.preguntar.bloqueada')}</p>
            <TextoDelServidor texto={respuesta.texto} />
          </>
        )
      case 'fallida':
        return (
          <>
            <TextoDelServidor texto={respuesta.texto} />
            <p className="text-sm text-fg">{t(CLAVE_DE_LA_FALLA[respuesta.razon])}</p>
          </>
        )
      default: {
        const _exhaustivo: never = respuesta
        return _exhaustivo
      }
    }
  }

  return (
    <ProveedorDeOrigen origen={origen}>
      <article
        data-naira-respuesta={respuesta.kind}
        aria-labelledby={idDeLaEtiqueta}
        className="space-y-3 rounded-lg border border-border-faint bg-surface p-4"
      >
        <p id={idDeLaEtiqueta} data-naira-etiqueta-respuesta="" className="flex items-center gap-2 text-overline text-fg-muted">
          <ChatTeardropText aria-hidden size={16} className="text-fg-muted" />
          {t('inmobiliaria.ai.naira.preguntar.respuesta')}
        </p>
        {cuerpo()}
      </article>
    </ProveedorDeOrigen>
  )
}
