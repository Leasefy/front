'use client'

/**
 * PilotoDirectorPorQue — el «por qué» de una fila de la Bandeja (fase 1 del
 * director, 28-09-2026).
 *
 * Dos cosas que hasta hoy la pantalla no decía:
 *
 *   1. Por qué la pidió el DIRECTOR, cuando la pidió él: su `porQue`, la meta
 *      a la que apunta, la evidencia (enlazada) y lo que descartó.
 *   2. El `motivo` de la perilla —la frase de por qué esto espera un clic—,
 *      que se guardaba NOT NULL en `acciones_del_piloto` y ninguna pantalla
 *      pintaba. Va SIEMPRE que venga, sea del director o no.
 *
 * Dos tamaños: `PorQueEnLaFila` (dos renglones dentro de la fila de la
 * Bandeja, sin enlaces: la fila entera es clicable y abre el cajón) y
 * `PorQueEnElCajon` (todo, con la evidencia enlazada).
 */

import Link from 'next/link'
import { ArrowSquareOut, Compass } from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import type { DirectorDeLaAccion, EvidenciaDelDirector } from '@/lib/api/piloto'

/** Un enlace externo (http…) sale del panel; uno relativo navega adentro. */
const esExterno = (href: string) => /^https?:\/\//i.test(href)

/** La evidencia que cita el director: con enlace cuando lo trae, texto cuando no. */
export function EvidenciaDelDirectorLista({
  evidencia,
  testid,
}: {
  evidencia: EvidenciaDelDirector[]
  testid?: string
}) {
  if (evidencia.length === 0) return null
  return (
    <ul className="space-y-1" data-testid={testid}>
      {evidencia.map((e, i) => (
        <li key={`${e.ref}-${i}`} className="text-caption text-fg-muted">
          {e.enlace ? (
            esExterno(e.enlace) ? (
              <a
                href={e.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-fg hover:underline"
              >
                {e.texto}
                <ArrowSquareOut weight="bold" className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <Link href={e.enlace} className="inline-flex items-center gap-1 font-medium text-fg hover:underline">
                {e.texto}
                <ArrowSquareOut weight="bold" className="h-3 w-3 shrink-0" aria-hidden="true" />
              </Link>
            )
          ) : (
            e.texto
          )}
        </li>
      ))}
    </ul>
  )
}

export interface PorQueProps {
  director?: DirectorDeLaAccion | null | undefined
  motivo?: string | null | undefined
  /** Para los `data-testid` (el id del ítem). */
  id: string
}

/** Dentro de la fila de la Bandeja: dos renglones, sin enlaces. */
export function PorQueEnLaFila({ director, motivo, id }: PorQueProps) {
  const { t } = useI18n()
  if (!director && !motivo) return null
  return (
    <div className="mt-1 space-y-0.5">
      {director && (
        <p className="line-clamp-2 text-caption text-fg" data-testid={`piloto-bandeja-director-${id}`}>
          <Compass weight="duotone" className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-fg-muted" aria-hidden="true" />
          <span className="font-medium">{t('inmobiliaria.piloto.director.porQue.elDirector')}</span> {director.porQue}
          {director.meta && (
            <span className="text-fg-muted">
              {' · '}
              {t('inmobiliaria.piloto.director.porQue.meta', { meta: director.meta.nombre })}
            </span>
          )}
        </p>
      )}
      {motivo && (
        <p className="line-clamp-2 text-caption text-fg-subtle" data-testid={`piloto-bandeja-motivo-${id}`}>
          {t('inmobiliaria.piloto.director.porQue.motivo', { motivo })}
        </p>
      )}
    </div>
  )
}

/** En el cajón: el por qué entero, con la evidencia enlazada, y siempre el motivo. */
export function PorQueEnElCajon({ director, motivo, id }: PorQueProps) {
  const { t } = useI18n()
  if (!director && !motivo) return null
  return (
    <section className="space-y-3 rounded-lg border border-border px-4 py-4" data-testid={`piloto-cajon-porque-${id}`}>
      {director && (
        <div className="space-y-2" data-testid="piloto-cajon-director">
          <h3 className="flex items-center gap-1.5">
            <Compass weight="duotone" className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            <MonoLabel>{t('inmobiliaria.piloto.director.porQue.titulo')}</MonoLabel>
          </h3>
          <p className="text-body-sm text-fg">{director.porQue}</p>
          {director.meta && (
            <p className="text-caption text-fg-muted">
              {t('inmobiliaria.piloto.director.porQue.meta', { meta: director.meta.nombre })}
            </p>
          )}
          <EvidenciaDelDirectorLista evidencia={director.evidencia} testid="piloto-cajon-evidencia" />
          {director.alternativaDescartada && (
            <p className="text-caption text-fg-muted">
              {t('inmobiliaria.piloto.director.porQue.descarto', { que: director.alternativaDescartada })}
            </p>
          )}
        </div>
      )}
      {motivo && (
        <div className={director ? 'border-t border-border-faint pt-3' : undefined} data-testid="piloto-cajon-motivo">
          <h3 className="mb-1">
            <MonoLabel>{t('inmobiliaria.piloto.director.porQue.motivoTitulo')}</MonoLabel>
          </h3>
          <p className="text-caption text-fg">{motivo}</p>
        </div>
      )}
    </section>
  )
}
