'use client'

/**
 * PilotoDirectorMetas — las cinco metas del director (fase 1, decisión 11).
 *
 * El director las PROPONE a partir de la historia de la inmobiliaria (la
 * mediana de 90 días como línea base; un objetivo alcanzable de su propia
 * serie) y la inmobiliaria las acepta o las ajusta. Por meta:
 *
 *   · línea base, objetivo y cómo va hoy, en su unidad («84 %», «12 días»);
 *   · la mini serie (lo que va de los últimos 90 días y del horizonte);
 *   · su estado y el porqué de la propuesta, con las cifras;
 *   · aceptar / ajustar / pausar — SÓLO un administrador (el micro responde
 *     403 al resto). «Ajustar» valida en el micro contra los topes duros: el
 *     422 trae una frase y se lee debajo del campo, no en un toast que se va;
 *   · el historial: quién propuso, aceptó, ajustó o pausó, y cuándo.
 *
 * 🔴 Las horas ahorradas son una ESTIMACIÓN (cuentan acciones aprobadas o
 * hechas y no deshechas, por los minutos de cada proceso): la pantalla lo dice
 * siempre. `normalizarMeta` la marca estimada aunque el micro no lo diga.
 */

import { useId, useState, type FormEvent } from 'react'
import { CaretDown, Target } from '@phosphor-icons/react'
import { Sparkline } from '@leasefy/cadence'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { useI18n } from '@/lib/i18n'
import type {
  AccionSobreMeta,
  DirectorMetas,
  MetaDelDirector,
  ResultadoDeMeta,
} from '@/lib/api/piloto-director'
import type { LecturaDelDirector } from '@/lib/hooks/piloto/use-piloto-director'
import {
  fechaLarga,
  humanizarClave,
  objetivoDesdeElCampo,
  objetivoEnElCampo,
  valorDeMeta,
} from '@/lib/piloto/director'

type VarianteDeBadge = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'

const BADGE_DE_LA_META: Record<string, VarianteDeBadge> = {
  propuesta: 'warning',
  activa: 'default',
  pausada: 'secondary',
  cumplida: 'success',
  vencida: 'secondary',
}

const HITOS_CONOCIDOS = new Set(['propuso', 'acepto', 'ajusto', 'pauso', 'cumplio', 'vencio'])

export interface PilotoDirectorMetasProps {
  lectura: LecturaDelDirector<DirectorMetas>
  isAdmin: boolean
  /** `metaId:accion` en vuelo. */
  enVuelo: string | null
  onActuar: (metaId: string, accion: AccionSobreMeta, objetivo?: number) => Promise<ResultadoDeMeta>
}

export function PilotoDirectorMetas({ lectura, isAdmin, enVuelo, onActuar }: PilotoDirectorMetasProps) {
  const { t } = useI18n()
  const { data, isLoading, error, notAvailable, refetch } = lectura

  if (isLoading && !data) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="status" data-testid="piloto-director-metas-cargando">
        <span className="sr-only">{t('inmobiliaria.piloto.director.metas.cargando')}</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-lg bg-surface-muted" aria-hidden="true" />
        ))}
      </div>
    )
  }
  if (error && !data) {
    return (
      <FalloDeCarga
        error={error}
        queEs={t('inmobiliaria.piloto.director.metas.queEsFallo')}
        onReintentar={refetch}
        enmarcado={false}
      />
    )
  }
  if (notAvailable || !data) {
    return (
      <p className="text-body-sm text-fg-muted" data-testid="piloto-director-metas-sin-fuente">
        {t('inmobiliaria.piloto.director.metas.sinFuente')}
      </p>
    )
  }
  if (!data.encendido) {
    return (
      <p className="text-body-sm text-fg-muted" data-testid="piloto-director-metas-apagado">
        {t('inmobiliaria.piloto.director.apagado')}
      </p>
    )
  }
  if (data.metas.length === 0) {
    return (
      <div className="space-y-1 py-2" data-testid="piloto-director-metas-vacia">
        <p className="text-body-sm font-medium text-fg">{t('inmobiliaria.piloto.director.metas.vacia')}</p>
        <p className="text-caption text-fg-muted">{t('inmobiliaria.piloto.director.metas.vaciaHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="piloto-director-metas">
      <p className="max-w-3xl text-caption text-fg-muted">{t('inmobiliaria.piloto.director.metas.queEs')}</p>
      {!isAdmin && (
        <p className="text-caption text-fg-subtle" data-testid="piloto-director-metas-solo-admin">
          {t('inmobiliaria.piloto.director.metas.soloAdmin')}
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.metas.map((m) => (
          <TarjetaDeMeta key={m.id} meta={m} isAdmin={isAdmin} enVuelo={enVuelo} onActuar={onActuar} />
        ))}
      </ul>
    </div>
  )
}

function TarjetaDeMeta({
  meta: m,
  isAdmin,
  enVuelo,
  onActuar,
}: {
  meta: MetaDelDirector
  isAdmin: boolean
  enVuelo: string | null
  onActuar: PilotoDirectorMetasProps['onActuar']
}) {
  const { t, locale } = useI18n()
  const idioma = locale === 'en' ? 'en' : 'es'
  const idCampo = useId()
  const [ajustando, setAjustando] = useState(false)
  const [escrito, setEscrito] = useState('')
  const [errorDelCampo, setErrorDelCampo] = useState<string | null>(null)

  const estado = String(m.estado)
  const estadoConocido = estado in BADGE_DE_LA_META
  const unidad = String(m.unidad)
  const valor = (v: number | null) => valorDeMeta(v, unidad, idioma)
  const ocupado = (accion: AccionSobreMeta) => enVuelo === `${m.id}:${accion}`
  const hasta = fechaLarga(m.hasta, idioma)
  const terminada = estado === 'cumplida' || estado === 'vencida'

  const actuar = async (accion: AccionSobreMeta, objetivo?: number) => {
    const r = await onActuar(m.id, accion, objetivo)
    if (r.ok) {
      setAjustando(false)
      setErrorDelCampo(null)
      toast.success(t(`inmobiliaria.piloto.director.metas.toast.${accion}`, { meta: m.nombre }))
      return
    }
    if (r.status === 422) {
      // El micro dice POR QUÉ ese objetivo no se puede: se lee debajo del campo.
      setErrorDelCampo(r.mensaje ?? t('inmobiliaria.piloto.director.metas.objetivoInvalido'))
      return
    }
    toast.error(
      r.status === 403 || r.error === 'solo_admin'
        ? t('inmobiliaria.piloto.director.metas.soloAdmin')
        : t('inmobiliaria.piloto.director.metas.fallo'),
    )
  }

  const abrirAjuste = () => {
    setEscrito(m.objetivo !== null ? objetivoEnElCampo(m.objetivo, unidad) : '')
    setErrorDelCampo(null)
    setAjustando(true)
  }

  const enviarAjuste = (e: FormEvent) => {
    e.preventDefault()
    const objetivo = objetivoDesdeElCampo(escrito, unidad)
    if (objetivo === null) {
      setErrorDelCampo(t('inmobiliaria.piloto.director.metas.escribeUnNumero'))
      return
    }
    void actuar('ajustar', objetivo)
  }

  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4" data-testid={`piloto-director-meta-${m.metrica}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium text-fg">
            <Target weight="duotone" className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
            {m.nombre}
            {m.estimada && (
              <Badge variant="secondary" data-testid={`piloto-director-meta-estimado-${m.metrica}`}>
                {t('inmobiliaria.piloto.director.metas.estimado')}
              </Badge>
            )}
          </p>
          <p className="text-caption text-fg-muted">
            {t(`inmobiliaria.piloto.director.metas.direccion.${m.direccion === 'bajar' ? 'bajar' : 'subir'}`)}
            {hasta && ` · ${t('inmobiliaria.piloto.director.metas.hasta', { fecha: hasta })}`}
          </p>
        </div>
        <Badge variant={BADGE_DE_LA_META[estado] ?? 'secondary'} className="shrink-0">
          {estadoConocido ? t(`inmobiliaria.piloto.director.metas.estado.${estado}`) : humanizarClave(estado)}
        </Badge>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {(
          [
            ['lineaBase', m.lineaBase],
            ['objetivo', m.objetivo],
            ['actual', m.actual],
          ] as const
        ).map(([clave, v]) => (
          <div key={clave} className="min-w-0">
            <dt className="text-label text-fg-muted">{t(`inmobiliaria.piloto.director.metas.${clave}`)}</dt>
            <dd
              className="truncate font-mono text-body-sm tabular-nums text-fg"
              data-testid={`piloto-director-meta-${m.metrica}-${clave}`}
            >
              {valor(v)}
            </dd>
          </div>
        ))}
      </dl>

      {m.serie.length >= 2 && (
        <div className="text-fg-muted">
          <Sparkline
            values={m.serie.map((p) => p.valor)}
            width={160}
            height={36}
            color="hsl(var(--primary))"
            data-testid={`piloto-director-meta-serie-${m.metrica}`}
          />
          <span className="sr-only">
            {t('inmobiliaria.piloto.director.metas.serie', {
              meta: m.nombre,
              desde: valor(m.serie[0]?.valor ?? null),
              hasta: valor(m.serie[m.serie.length - 1]?.valor ?? null),
            })}
          </span>
        </div>
      )}

      {m.porQue && <p className="text-caption text-fg-muted">{m.porQue}</p>}
      {m.estimada && (
        <p className="text-caption text-fg-subtle">{t('inmobiliaria.piloto.director.metas.estimadoPorQue')}</p>
      )}

      {isAdmin && !terminada && !ajustando && (
        // La principal a la DERECHA sin cambiar el orden del DOM (el tabulador
        // llega primero a la principal): la misma regla del cajón.
        <div className="mt-auto flex flex-wrap-reverse flex-row-reverse justify-start gap-2">
          {estado === 'propuesta' || estado === 'pausada' ? (
            <Button
              size="sm"
              hideArrow
              isLoading={ocupado('aceptar')}
              onClick={() => void actuar('aceptar')}
              data-testid={`piloto-director-meta-aceptar-${m.metrica}`}
            >
              {estado === 'pausada'
                ? t('inmobiliaria.piloto.director.metas.reactivar')
                : t('inmobiliaria.piloto.director.metas.aceptar')}
            </Button>
          ) : null}
          <Button
            size="sm"
            hideArrow
            variant="outline"
            onClick={abrirAjuste}
            data-testid={`piloto-director-meta-ajustar-${m.metrica}`}
          >
            {t('inmobiliaria.piloto.director.metas.ajustarMeta')}
          </Button>
          {estado === 'activa' && (
            <Button
              size="sm"
              hideArrow
              variant="ghost"
              isLoading={ocupado('pausar')}
              onClick={() => void actuar('pausar')}
              data-testid={`piloto-director-meta-pausar-${m.metrica}`}
            >
              {t('inmobiliaria.piloto.director.metas.pausar')}
            </Button>
          )}
        </div>
      )}

      {isAdmin && ajustando && (
        <form onSubmit={enviarAjuste} className="space-y-1.5" data-testid={`piloto-director-meta-form-${m.metrica}`}>
          <Label htmlFor={idCampo} className="text-caption text-fg-muted">
            {t('inmobiliaria.piloto.director.metas.nuevoObjetivo', {
              unidad: t(`inmobiliaria.piloto.director.metas.unidad.${['porcentaje', 'dias', 'horas'].includes(unidad) ? unidad : 'porcentaje'}`),
            })}
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={idCampo}
              inputMode="decimal"
              autoComplete="off"
              value={escrito}
              onChange={(e) => {
                setEscrito(e.target.value)
                setErrorDelCampo(null)
              }}
              invalid={errorDelCampo !== null}
              aria-invalid={errorDelCampo !== null}
              {...(errorDelCampo ? { 'aria-describedby': `${idCampo}-error` } : {})}
              className="w-28"
              data-testid={`piloto-director-meta-campo-${m.metrica}`}
            />
            <div className="flex flex-row-reverse gap-2">
              <Button
                type="submit"
                size="sm"
                hideArrow
                isLoading={ocupado('ajustar')}
                data-testid={`piloto-director-meta-guardar-${m.metrica}`}
              >
                {t('inmobiliaria.piloto.director.metas.guardar')}
              </Button>
              <Button type="button" size="sm" hideArrow variant="ghost" onClick={() => setAjustando(false)}>
                {t('inmobiliaria.piloto.director.metas.cancelar')}
              </Button>
            </div>
          </div>
          {errorDelCampo && (
            <p
              id={`${idCampo}-error`}
              role="alert"
              className="text-caption text-danger"
              data-testid={`piloto-director-meta-error-${m.metrica}`}
            >
              {errorDelCampo}
            </p>
          )}
        </form>
      )}

      {m.historial.length > 0 && (
        <details className="group" data-testid={`piloto-director-meta-historial-${m.metrica}`}>
          <summary className="flex cursor-pointer list-none items-center gap-1 text-caption font-medium text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            <CaretDown weight="bold" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
            {t('inmobiliaria.piloto.director.metas.historial', { n: String(m.historial.length) })}
          </summary>
          <ol className="mt-2 space-y-1 border-l border-border-faint pl-3">
            {m.historial.map((h, i) => (
              <li key={`${h.en}-${i}`} className="text-caption text-fg-muted">
                <span className="font-mono tabular-nums text-fg-subtle">
                  {h.en
                    ? new Date(h.en).toLocaleString(idioma === 'en' ? 'en-US' : 'es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'America/Bogota',
                      })
                    : '—'}
                </span>{' '}
                · {h.quien}{' '}
                {HITOS_CONOCIDOS.has(h.que) ? t(`inmobiliaria.piloto.director.metas.hito.${h.que}`) : h.que}
                {h.objetivo !== null && (
                  <>
                    {' · '}
                    {t('inmobiliaria.piloto.director.metas.hitoObjetivo', { valor: valor(h.objetivo) })}
                  </>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  )
}
