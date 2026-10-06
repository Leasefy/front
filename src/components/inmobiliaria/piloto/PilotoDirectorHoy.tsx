'use client'

/**
 * PilotoDirectorHoy — el plan del día del director (fase 1, 28-09-2026).
 *
 * Presentacional: recibe el plan ya normalizado (`DirectorHoy`) y lo pinta en
 * el orden en que se lee una mañana:
 *
 *   1. el estado del ciclo (a qué hora planeó, con qué, cuánto costó), y los
 *      avisos que cambian cómo leer lo demás: planeando, no salió, planeó sin
 *      IA (con su porqué) o es el plan de otro día;
 *   2. el resumen: una frase;
 *   3. las prioridades, cada una con su meta;
 *   4. las órdenes: agente, proceso, a quién (con enlace), cuándo, por qué, la
 *      evidencia enlazada, la meta, lo que descartó y el estado; con fila en
 *      la Bandeja, un botón abre el cajón que ya existe;
 *   5. retenciones, sugerencias, propuestas de autonomía y alertas;
 *   6. plegados: «Cómo lo pensó» (el resumen del pensamiento, decisión 12) y
 *      «Lo que el director quiso y la regla no dejó».
 *
 * Plegado ≠ ausente (DESIGN.md §19): los dos plegables son `<details>`, que
 * Ctrl-F encuentra y el lector de pantalla anuncia.
 *
 * Nada se inventa acá: los nombres y los enlaces los pone el micro al
 * responder (el modelo sólo ve ids, I-5). Sin nombre, se dice «sin nombre».
 */

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  CaretDown,
  Info,
  Lightbulb,
  Prohibit,
  SlidersHorizontal,
  WarningCircle,
  WarningOctagon,
  type Icon,
} from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type {
  DirectorHoy,
  EntidadDelDirector,
  OrdenDelDirector,
  RetencionDelDirector,
} from '@/lib/api/piloto-director'
import type { DirectorDeLaAccion } from '@/lib/api/piloto'
import {
  fechaDeHoyEnBogota,
  fechaLarga,
  horaConArticulo,
  humanizarClave,
  nombreDelModelo,
} from '@/lib/piloto/director'
import { EvidenciaDelDirectorLista } from './PilotoDirectorPorQue'
import { formatCurrency } from '@/lib/format'

/** Cuántas órdenes se ven antes de «Ver todas». */
const ORDENES_A_LA_VISTA = 5

type VarianteDeBadge = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'

const BADGE_DE_LA_ORDEN: Record<string, VarianteDeBadge> = {
  en_bandeja: 'warning',
  aprobada: 'default',
  ejecutada: 'success',
  descartada: 'secondary',
  fallida: 'destructive',
  deshecha: 'secondary',
  vencida: 'secondary',
  la_hace_el_agente: 'outline',
}

const BADGE_DE_LA_RETENCION: Record<string, VarianteDeBadge> = {
  en_bandeja: 'warning',
  activa: 'default',
  vencida: 'secondary',
  descartada: 'secondary',
}

const ALERTA: Record<string, { icono: Icon; clase: string }> = {
  critica: { icono: WarningOctagon, clase: 'text-danger' },
  atencion: { icono: WarningCircle, clase: 'text-warning' },
}
const ALERTA_INFO = { icono: Info, clase: 'text-info' }

/** Lo que el cajón muestra arriba cuando se abre desde una orden. */
export interface PorQueDeRespaldo {
  director: DirectorDeLaAccion | null
  motivo: string | null
}

export interface PilotoDirectorHoyProps {
  hoy: DirectorHoy
  isAdmin: boolean
  /** Abre el cajón de la Bandeja con la fila de esa orden (`acc:<accionId>`). */
  onAbrirAccion?: (accionId: string, porQue: PorQueDeRespaldo) => void
  /** Para las pruebas: «hoy» en Bogotá. */
  hoyEnBogota?: string
}

/** Un bloque con su rótulo (EL MOLDE, regla 6: cada bloque dice qué es). */
function Bloque({
  titulo,
  contador,
  testid,
  children,
}: {
  titulo: string
  contador?: number
  testid: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2.5" data-testid={testid}>
      <h3 className="flex items-center gap-2">
        <MonoLabel>{titulo}</MonoLabel>
        {typeof contador === 'number' && (
          <span className="font-mono text-caption tabular-nums text-fg-subtle">{contador}</span>
        )}
      </h3>
      {children}
    </section>
  )
}

/** Plegado, no ausente: `<details>` nativo. */
function Plegable({ titulo, contador, testid, children }: { titulo: string; contador?: number; testid: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-border" data-testid={testid}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-body-sm font-medium text-fg hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          {titulo}
          {typeof contador === 'number' && (
            <span className="ml-2 font-mono text-caption tabular-nums text-fg-subtle">{contador}</span>
          )}
        </span>
        <CaretDown
          weight="bold"
          className="h-4 w-4 shrink-0 text-fg-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border-faint px-4 pb-4 pt-3">{children}</div>
    </details>
  )
}

/** A quién: con enlace cuando el micro lo manda, con nombre cuando lo sabe. */
function Entidad({ entidad }: { entidad: EntidadDelDirector | null }) {
  const { t } = useI18n()
  if (!entidad) return null
  const nombre = entidad.nombre ?? t('inmobiliaria.piloto.director.sinNombre')
  return entidad.enlace ? (
    <Link href={entidad.enlace} className="font-medium text-fg hover:underline">
      {nombre}
    </Link>
  ) : (
    <span className="font-medium text-fg">{nombre}</span>
  )
}

/** Un aviso del estado del ciclo (tokens de feedback + ícono + texto: nunca sólo color). */
function Aviso({
  tono,
  icono: Icono,
  titulo,
  texto,
  testid,
}: {
  tono: 'warning' | 'info' | 'danger'
  icono: Icon
  titulo: string
  texto?: string | null
  testid: string
}) {
  const fondo = { warning: 'bg-warning-soft', info: 'bg-info-soft', danger: 'bg-danger-soft' }[tono]
  const color = { warning: 'text-warning', info: 'text-info', danger: 'text-danger' }[tono]
  return (
    <div className={cn('flex items-start gap-2.5 rounded-md border border-border p-3', fondo)} data-testid={testid}>
      <Icono weight="duotone" className={cn('mt-0.5 h-5 w-5 shrink-0', color)} aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-body-sm font-medium text-fg">{titulo}</p>
        {texto && <p className="text-caption text-fg-muted">{texto}</p>}
      </div>
    </div>
  )
}

function EstadoDelCiclo({ hoy, isAdmin, hoyEnBogota }: { hoy: DirectorHoy; isAdmin: boolean; hoyEnBogota: string }) {
  const { t, locale } = useI18n()
  const idioma = locale === 'en' ? 'en' : 'es'
  const ciclo = hoy.ciclo
  if (!ciclo) return null

  const hora = horaConArticulo(ciclo.fin ?? ciclo.inicio, idioma)
  const horaDeInicio = horaConArticulo(ciclo.inicio, idioma)
  const titulo =
    ciclo.estado === 'en_curso'
      ? horaDeInicio
        ? t('inmobiliaria.piloto.director.ciclo.enCurso', { hora: horaDeInicio })
        : t('inmobiliaria.piloto.director.ciclo.enCursoSinHora')
      : ciclo.estado === 'fallido'
        ? t('inmobiliaria.piloto.director.ciclo.fallido')
        : ciclo.estado === 'sin_modelo'
          ? hora
            ? t('inmobiliaria.piloto.director.ciclo.sinModelo', { hora })
            : t('inmobiliaria.piloto.director.ciclo.sinModeloSinHora')
          : ciclo.tipo === 'replan'
            ? t('inmobiliaria.piloto.director.ciclo.replan', { hora: hora ?? '—' })
            : t('inmobiliaria.piloto.director.ciclo.listo', { hora: hora ?? '—' })
  const modelo = ciclo.estado === 'sin_modelo' ? null : nombreDelModelo(ciclo.modelo)
  const otroDia = hoy.fecha !== null && hoy.fecha !== hoyEnBogota

  return (
    <div className="space-y-2.5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-fg-muted" data-testid="piloto-director-ciclo">
        {ciclo.estado === 'en_curso' && <Spinner size="sm" variant="muted" />}
        <span>{titulo}</span>
        {modelo && (
          <>
            <span aria-hidden="true">·</span>
            <span>{modelo}</span>
          </>
        )}
        {typeof ciclo.costoCop === 'number' && ciclo.estado !== 'en_curso' && (
          <>
            <span aria-hidden="true">·</span>
            <span data-testid="piloto-director-costo">
              {t('inmobiliaria.piloto.director.ciclo.costo')}{' '}
              <span className="font-mono tabular-nums text-fg">{formatCurrency(ciclo.costoCop, idioma)}</span>
            </span>
          </>
        )}
      </p>

      {otroDia && (
        <p className="text-caption text-fg-muted" data-testid="piloto-director-otro-dia">
          {t('inmobiliaria.piloto.director.ciclo.otroDia', { fecha: fechaLarga(hoy.fecha, idioma) ?? hoy.fecha ?? '' })}
        </p>
      )}

      {ciclo.estado === 'fallido' && (
        <Aviso
          tono="warning"
          icono={WarningCircle}
          titulo={t('inmobiliaria.piloto.director.ciclo.fallidoTitulo')}
          texto={
            isAdmin
              ? `${t('inmobiliaria.piloto.director.ciclo.fallidoTexto')} ${t('inmobiliaria.piloto.director.ciclo.fallidoAdmin')}`
              : t('inmobiliaria.piloto.director.ciclo.fallidoTexto')
          }
          testid="piloto-director-fallido"
        />
      )}

      {ciclo.estado === 'sin_modelo' && (
        <Aviso
          tono="info"
          icono={Info}
          titulo={t('inmobiliaria.piloto.director.ciclo.sinModeloTitulo')}
          texto={
            ciclo.sinModeloPorque
              ? // QA-IA-95 (DIR-08): el porqué del micro ya termina en punto y la frase pone el suyo («…reglas..»).
                t('inmobiliaria.piloto.director.ciclo.sinModeloPorque', { porque: ciclo.sinModeloPorque.replace(/[.\s]+$/, '') })
              : null
          }
          testid="piloto-director-sin-modelo"
        />
      )}
    </div>
  )
}

function FilaDeOrden({
  o,
  motivoComun,
  onAbrirAccion,
}: {
  o: OrdenDelDirector
  motivoComun: string | null
  onAbrirAccion?: PilotoDirectorHoyProps['onAbrirAccion']
}) {
  const { t } = useI18n()
  const estado = String(o.estado)
  const conocido = estado in BADGE_DE_LA_ORDEN
  const enBandeja = estado === 'en_bandeja'
  return (
    <li className="space-y-1.5 py-4 first:pt-0 last:pb-0" data-testid={`piloto-director-orden-${o.ordenId}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-body-sm font-medium text-fg">
          {o.agenteNombre}
          {o.procesoNombre && <span className="font-normal text-fg-muted"> · {o.procesoNombre}</span>}
        </p>
        <Badge variant={BADGE_DE_LA_ORDEN[estado] ?? 'secondary'} className="shrink-0">
          {conocido ? t(`inmobiliaria.piloto.director.orden.estado.${estado}`) : humanizarClave(estado)}
        </Badge>
      </div>
      {(o.entidad || o.cuando) && (
        <p className="text-caption text-fg-muted">
          <Entidad entidad={o.entidad} />
          {o.entidad && o.cuando && <span aria-hidden="true"> · </span>}
          {o.cuando && t('inmobiliaria.piloto.director.orden.cuando', { cuando: o.cuando })}
        </p>
      )}
      {o.porQue && <p className="text-body-sm text-fg">{o.porQue}</p>}
      <EvidenciaDelDirectorLista evidencia={o.evidencia} testid={`piloto-director-evidencia-${o.ordenId}`} />
      {o.meta && (
        <p className="text-caption text-fg-muted">
          {t('inmobiliaria.piloto.director.porQue.meta', { meta: o.meta.nombre })}
        </p>
      )}
      {o.alternativaDescartada && (
        <p className="text-caption text-fg-muted">
          {t('inmobiliaria.piloto.director.porQue.descarto', { que: o.alternativaDescartada })}
        </p>
      )}
      {o.conflictoResuelto && (
        <p className="text-caption text-fg-muted">
          {t('inmobiliaria.piloto.director.orden.conflicto', { que: o.conflictoResuelto })}
        </p>
      )}
      {o.motivoDeLaPerilla && o.motivoDeLaPerilla !== motivoComun && (
        <p className="text-caption text-fg-subtle">
          {t('inmobiliaria.piloto.director.porQue.motivo', { motivo: o.motivoDeLaPerilla })}
        </p>
      )}
      {o.accionId && onAbrirAccion && (
        <div className="pt-1">
          <Button
            size="sm"
            hideArrow
            variant={enBandeja ? 'default' : 'outline'}
            data-testid={`piloto-director-abrir-${o.ordenId}`}
            onClick={() =>
              onAbrirAccion(o.accionId as string, {
                director: {
                  prioridad: o.prioridad,
                  porQue: o.porQue,
                  evidencia: o.evidencia,
                  meta: o.meta,
                  alternativaDescartada: o.alternativaDescartada,
                },
                motivo: o.motivoDeLaPerilla,
              })
            }
          >
            {enBandeja
              ? t('inmobiliaria.piloto.director.orden.decidir')
              : t('inmobiliaria.piloto.director.orden.verDetalle')}
          </Button>
        </div>
      )}
    </li>
  )
}

function FilaDeRetencion({
  r,
  onAbrirAccion,
}: {
  r: RetencionDelDirector
  onAbrirAccion?: PilotoDirectorHoyProps['onAbrirAccion']
}) {
  const { t, locale } = useI18n()
  const idioma = locale === 'en' ? 'en' : 'es'
  const estado = String(r.estado)
  const conocido = estado in BADGE_DE_LA_RETENCION
  const hasta = fechaLarga(r.hasta, idioma)
  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0" data-testid={`piloto-director-retencion-${r.retencionId}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-body-sm">
          <Entidad entidad={r.entidad} />
        </p>
        <Badge variant={BADGE_DE_LA_RETENCION[estado] ?? 'secondary'} className="shrink-0">
          {conocido ? t(`inmobiliaria.piloto.director.retencion.estado.${estado}`) : humanizarClave(estado)}
        </Badge>
      </div>
      <p className="text-caption text-fg-muted">
        {r.agentes.length > 0 &&
          t('inmobiliaria.piloto.director.retencion.agentes', { agentes: r.agentes.map(humanizarClave).join(', ') })}
        {r.agentes.length > 0 && hasta && <span aria-hidden="true"> · </span>}
        {hasta && t('inmobiliaria.piloto.director.retencion.hasta', { fecha: hasta })}
      </p>
      {r.porQue && <p className="text-body-sm text-fg">{r.porQue}</p>}
      <EvidenciaDelDirectorLista evidencia={r.evidencia} />
      {r.accionId && onAbrirAccion && (
        <div className="pt-1">
          <Button
            size="sm"
            hideArrow
            variant={estado === 'en_bandeja' ? 'default' : 'outline'}
            data-testid={`piloto-director-abrir-retencion-${r.retencionId}`}
            onClick={() =>
              onAbrirAccion(r.accionId as string, {
                director: { prioridad: 0, porQue: r.porQue, evidencia: r.evidencia, meta: null, alternativaDescartada: null },
                motivo: null,
              })
            }
          >
            {estado === 'en_bandeja'
              ? t('inmobiliaria.piloto.director.orden.decidir')
              : t('inmobiliaria.piloto.director.orden.verDetalle')}
          </Button>
        </div>
      )}
    </li>
  )
}

export function PilotoDirectorHoy({ hoy, isAdmin, onAbrirAccion, hoyEnBogota }: PilotoDirectorHoyProps) {
  const { t } = useI18n()
  const [todas, setTodas] = useState(false)
  const hoyBogota = hoyEnBogota ?? fechaDeHoyEnBogota()

  const ordenes = useMemo(() => [...hoy.ordenes].sort((a, b) => b.prioridad - a.prioridad), [hoy.ordenes])
  const visibles = todas ? ordenes : ordenes.slice(0, ORDENES_A_LA_VISTA)

  /**
   * El motivo de la perilla es, en la fase 1, casi siempre el mismo («toda
   * orden del director espera tu clic»). Repetido en cada orden sería ruido:
   * si todas traen el mismo, se dice UNA vez arriba de la lista.
   */
  const motivoComun = useMemo(() => {
    const motivos = new Set(ordenes.map((o) => o.motivoDeLaPerilla).filter((m): m is string => Boolean(m)))
    return motivos.size === 1 && ordenes.every((o) => o.motivoDeLaPerilla) ? ([...motivos][0] as string) : null
  }, [ordenes])

  /** Los nombres de proceso que ya conocemos, para las rechazadas (que no traen el suyo). */
  const nombreDeProceso = useMemo(() => new Map(ordenes.map((o) => [o.proceso, o.procesoNombre])), [ordenes])

  if (!hoy.ciclo) {
    return (
      <p className="text-body-sm text-fg-muted" data-testid="piloto-director-sin-plan">
        {t('inmobiliaria.piloto.director.sinPlan')}
      </p>
    )
  }

  return (
    <div className="space-y-6" data-testid="piloto-director-hoy">
      <div className="space-y-3">
        <EstadoDelCiclo hoy={hoy} isAdmin={isAdmin} hoyEnBogota={hoyBogota} />
        {hoy.resumen && (
          <p className="max-w-3xl text-balance text-subtitle text-fg" data-testid="piloto-director-resumen">
            {hoy.resumen}
          </p>
        )}
      </div>

      {hoy.prioridades.length > 0 && (
        <Bloque titulo={t('inmobiliaria.piloto.director.secciones.prioridades')} testid="piloto-director-prioridades">
          <ol className="space-y-2">
            {hoy.prioridades.map((p, i) => (
              <li key={`${p.meta?.id ?? 'p'}-${i}`} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted font-mono text-caption tabular-nums text-fg-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 space-y-0.5">
                  {p.meta && <p className="text-body-sm font-medium text-fg">{p.meta.nombre}</p>}
                  {p.porQue && <p className="text-caption text-fg-muted">{p.porQue}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Bloque>
      )}

      <Bloque
        titulo={t('inmobiliaria.piloto.director.secciones.ordenes')}
        contador={ordenes.length}
        testid="piloto-director-ordenes"
      >
        {ordenes.length === 0 ? (
          <p className="text-caption text-fg-muted">{t('inmobiliaria.piloto.director.orden.ninguna')}</p>
        ) : (
          <>
            {motivoComun && (
              <p className="text-caption text-fg-subtle" data-testid="piloto-director-motivo-comun">
                {t('inmobiliaria.piloto.director.porQue.motivo', { motivo: motivoComun })}
              </p>
            )}
            <ul className="divide-y divide-border-faint">
              {visibles.map((o) => (
                <FilaDeOrden key={o.ordenId} o={o} motivoComun={motivoComun} {...(onAbrirAccion ? { onAbrirAccion } : {})} />
              ))}
            </ul>
            {ordenes.length > ORDENES_A_LA_VISTA && (
              <Button
                variant="link"
                size="sm"
                hideArrow
                onClick={() => setTodas((v) => !v)}
                aria-expanded={todas}
                data-testid="piloto-director-ver-todas"
              >
                {todas
                  ? t('inmobiliaria.piloto.director.orden.verMenos')
                  : t('inmobiliaria.piloto.director.orden.verTodas', { n: String(ordenes.length) })}
              </Button>
            )}
          </>
        )}
        {hoy.grupoDeControl.activo && (
          <p className="text-caption text-fg-muted" data-testid="piloto-director-control">
            {hoy.grupoDeControl.omitidas > 0
              ? t('inmobiliaria.piloto.director.grupoDeControl.omitidas', { n: String(hoy.grupoDeControl.omitidas) })
              : t('inmobiliaria.piloto.director.grupoDeControl.ninguna')}
          </p>
        )}
      </Bloque>

      {hoy.retenciones.length > 0 && (
        <Bloque
          titulo={t('inmobiliaria.piloto.director.secciones.retenciones')}
          contador={hoy.retenciones.length}
          testid="piloto-director-retenciones"
        >
          <ul className="divide-y divide-border-faint">
            {hoy.retenciones.map((r) => (
              <FilaDeRetencion key={r.retencionId} r={r} {...(onAbrirAccion ? { onAbrirAccion } : {})} />
            ))}
          </ul>
        </Bloque>
      )}

      {hoy.sugerencias.length > 0 && (
        <Bloque titulo={t('inmobiliaria.piloto.director.secciones.sugerencias')} testid="piloto-director-sugerencias">
          <ul className="space-y-2">
            {hoy.sugerencias.map((s, i) => (
              <li key={`${s.agente}-${i}`} className="flex items-start gap-2.5">
                <Lightbulb weight="duotone" className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-body-sm text-fg">
                    <span className="font-medium">{s.agenteNombre}:</span> {s.que}
                  </p>
                  {s.porQue && <p className="text-caption text-fg-muted">{s.porQue}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {hoy.propuestasDeAutonomia.length > 0 && (
        <Bloque titulo={t('inmobiliaria.piloto.director.secciones.propuestas')} testid="piloto-director-propuestas">
          <ul className="space-y-2">
            {hoy.propuestasDeAutonomia.map((p, i) => (
              <li key={`${p.agente}-${i}`} className="flex items-start gap-2.5">
                <SlidersHorizontal weight="duotone" className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <p className="text-body-sm text-fg">
                    <span className="font-medium">{p.agenteNombre}:</span>{' '}
                    {t('inmobiliaria.piloto.director.propuesta.cambio', {
                      de: nombreDelModo(p.de, t),
                      a: nombreDelModo(p.a, t),
                    })}
                  </p>
                  <EvidenciaDelDirectorLista evidencia={p.evidencia} />
                </div>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {hoy.alertas.length > 0 && (
        <Bloque titulo={t('inmobiliaria.piloto.director.secciones.alertas')} testid="piloto-director-alertas">
          <ul className="space-y-2">
            {hoy.alertas.map((a, i) => {
              const meta = ALERTA[a.nivel] ?? ALERTA_INFO
              const Icono = meta.icono
              return (
                <li key={`${a.que}-${i}`} className="flex items-start gap-2.5">
                  <Icono weight="duotone" className={cn('mt-0.5 h-4 w-4 shrink-0', meta.clase)} aria-hidden="true" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-body-sm font-medium text-fg">{a.que}</p>
                    {a.porQue && <p className="text-caption text-fg-muted">{a.porQue}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Bloque>
      )}

      {(hoy.pensamiento || hoy.rechazadas.length > 0) && (
        <div className="space-y-2">
          {hoy.pensamiento && (
            <Plegable titulo={t('inmobiliaria.piloto.director.secciones.pensamiento')} testid="piloto-director-pensamiento">
              <p className="max-w-3xl whitespace-pre-line text-body-sm text-fg-muted">{hoy.pensamiento}</p>
            </Plegable>
          )}
          {hoy.rechazadas.length > 0 && (
            <Plegable
              titulo={t('inmobiliaria.piloto.director.secciones.rechazadas')}
              contador={hoy.rechazadas.length}
              testid="piloto-director-rechazadas"
            >
              <ul className="space-y-2.5">
                {hoy.rechazadas.map((r, i) => {
                  const proceso = r.procesoNombre ?? nombreDeProceso.get(r.proceso) ?? null
                  return (
                    <li key={`${r.ordenId}-${i}`} className="flex items-start gap-2.5">
                      <Prohibit weight="duotone" className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-body-sm text-fg">
                          {r.entidad?.nombre ?? t('inmobiliaria.piloto.director.sinNombre')}
                          {proceso && <span className="text-fg-muted"> · {proceso}</span>}
                        </p>
                        {r.motivo && <p className="text-caption text-fg-muted">{r.motivo}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Plegable>
          )}
        </div>
      )}
    </div>
  )
}

/** El modo con el nombre de la pantalla (Manual / Copiloto / Automático). */
function nombreDelModo(modo: string, t: (k: string) => string): string {
  return ['sombra', 'copiloto', 'autonomo'].includes(modo)
    ? t(`inmobiliaria.piloto.autonomia.modo.${modo}`)
    : humanizarClave(modo)
}
