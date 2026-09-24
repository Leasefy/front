'use client'

/**
 * PilotoOperaSola — «¿Opera sola?» de TODA la inmobiliaria (24-09-2026).
 *
 * Lo que Nico quiere más que nada: que la inmobiliaria opere de punta a punta
 * en Automático. El 24-09 casi todo está construido, pero detrás de tres
 * interruptores apagados a propósito (el Gerente, los pases, el chat sin
 * clic), con agentes que nadie puso en ningún modo y sin una pantalla que lo
 * dijera. La «Preparación» que había (oculta desde T-0051) sólo medía a Laura.
 *
 * Esto lo dice, con lo que MIDE el micro (`GET /piloto/opera-sola/que-falta`):
 *   1. una frase: ¿opera sola? y cuánto falta (el resumen es una frase);
 *   2. qué falta, agrupado por QUIÉN lo destraba — Leasefy (interruptores,
 *      migraciones: nunca la inmobiliaria), un administrador (modos,
 *      delegación), o «hay que programarlo»;
 *   3. por agente: su modo, su estado, a nombre de quién actúa, y sus
 *      procesos con los límites con que operan solos (topes, horario, gracia);
 *   4. los interruptores del servidor: encendido, apagado o «no se ve desde
 *      aquí» (los pases viven en el ERP) — nunca un verde sin evidencia;
 *   5. lo que el Piloto HIZO en 30 días (`GET /piloto/opera-sola`);
 *   6. los topes y la gracia, editables por un administrador (`PilotoTopes`).
 *
 * Nada de pasos que mientan: si algo está apagado se dice y se dice quién lo
 * prende; lo que no se pudo medir se dice como tal.
 *
 * `PilotoOperaSolaContenido` es presentacional (se prueba sin abrir el cajón:
 * abrir un Sheet por clic bajo happy-dom colgó la corrida, ver
 * `PilotoAutonomia.test.tsx`); `PilotoOperaSola` es el botón y el cajón.
 */

import { useMemo, useState, type ReactNode } from 'react'
import {
  CaretDown,
  CaretRight,
  CheckCircle,
  Circle,
  Gauge,
  HandPointing,
  MinusCircle,
  Power,
  Question,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  usePilotoLoQueHizo,
  usePilotoPreferencias,
  usePilotoQueFalta,
  type LecturaDelPiloto,
} from '@/lib/hooks/piloto/use-piloto-opera-sola'
import type {
  AgenteEnAutomatico,
  EstadoDelAgenteEnAutomatico,
  EstadoDelProcesoEnAutomatico,
  FaltaParaAutomatico,
  InterruptorDelPiloto,
  PilotoLoQueHizoResponse,
  PilotoQueFaltaResponse,
  QuienLoArregla,
} from '@/lib/api/piloto'
import { PilotoTopes } from './PilotoTopes'

const QUIENES: QuienLoArregla[] = ['leasefy', 'administrador', 'programar']

const BADGE_DEL_AGENTE: Record<EstadoDelAgenteEnAutomatico, 'success' | 'warning' | 'neutral' | 'info'> = {
  listo: 'success',
  frenado: 'warning',
  siempre_humano: 'info',
  apagado: 'neutral',
}

const ICONO_DEL_PROCESO: Record<EstadoDelProcesoEnAutomatico, { icono: typeof CheckCircle; clase: string }> = {
  opera_solo: { icono: CheckCircle, clase: 'text-success' },
  siempre_humano: { icono: HandPointing, clase: 'text-info' },
  frenado: { icono: WarningCircle, clase: 'text-warning' },
  apagado: { icono: MinusCircle, clase: 'text-fg-subtle' },
}

/** Una falta y los agentes a los que frena (la misma falta en dos agentes se dice una vez). */
interface FaltaAgrupada {
  falta: FaltaParaAutomatico
  agentes: string[]
}

/** Qué falta, una vez cada cosa, por quién lo destraba. Lo de los agentes apagados va aparte. */
export function faltasPorQuien(agentes: AgenteEnAutomatico[]): Record<QuienLoArregla, FaltaAgrupada[]> {
  const porId = new Map<string, FaltaAgrupada>()
  for (const a of agentes) {
    if (a.estado === 'apagado') continue
    for (const f of a.faltas) {
      if (f.tipo === 'agente_apagado') continue
      const previa = porId.get(f.id)
      if (previa) {
        if (!previa.agentes.includes(a.nombre)) previa.agentes.push(a.nombre)
      } else {
        porId.set(f.id, { falta: f, agentes: [a.nombre] })
      }
    }
  }
  const out: Record<QuienLoArregla, FaltaAgrupada[]> = { leasefy: [], administrador: [], programar: [] }
  for (const g of porId.values()) out[g.falta.quien].push(g)
  return out
}

const conMayuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function Seccion({ titulo, children, testid }: { titulo: string; children: ReactNode; testid: string }) {
  return (
    <section className="space-y-2" data-testid={testid}>
      <h3 className="text-label text-fg-muted">{titulo}</h3>
      {children}
    </section>
  )
}

function EstadoDelInterruptor({ i }: { i: InterruptorDelPiloto }) {
  const { t } = useI18n()
  const [Icono, clase, texto] =
    i.encendido === true
      ? [CheckCircle, 'text-success', t('inmobiliaria.piloto.operaSola.interruptor.encendido')]
      : i.encendido === false
        ? [Power, 'text-warning', t('inmobiliaria.piloto.operaSola.interruptor.apagado')]
        : [Question, 'text-fg-subtle', t('inmobiliaria.piloto.operaSola.interruptor.noSeVe')]
  return (
    <span className={cn('flex shrink-0 items-center gap-1 text-caption font-medium', clase)}>
      <Icono weight="duotone" className="h-4 w-4" aria-hidden="true" />
      {texto}
    </span>
  )
}

function FilaDeAgente({ a }: { a: AgenteEnAutomatico }) {
  const { t } = useI18n()
  const [abierto, setAbierto] = useState(false)
  const delegacion =
    a.delegacion.necesaria && a.modo === 'autonomo'
      ? a.delegacion.estado === 'registrada'
        ? t('inmobiliaria.piloto.operaSola.delegacion.registrada', { quien: a.delegacion.quien ?? '—' })
        : a.delegacion.estado === 'no_medida'
          ? t('inmobiliaria.piloto.operaSola.delegacion.noMedida')
          : t('inmobiliaria.piloto.operaSola.delegacion.falta')
      : null
  return (
    <li className="rounded-lg border border-border px-3 py-2.5" data-testid={`piloto-opera-sola-agente-${a.agente}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-fg">{conMayuscula(a.nombre)}</p>
          <p className="text-caption text-fg-muted">
            {t(`inmobiliaria.piloto.autonomia.modo.${a.modo}`)}
            {!a.modoElegido && a.agente !== 'chat' && ` · ${t('inmobiliaria.piloto.operaSola.sinModoElegido')}`}
            {delegacion && ` · ${delegacion}`}
          </p>
        </div>
        <Badge variant={BADGE_DEL_AGENTE[a.estado]} size="sm" className="shrink-0">
          {t(`inmobiliaria.piloto.operaSola.estadoAgente.${a.estado}`)}
        </Badge>
      </div>
      {a.faltas.length > 0 && (
        <ul className="mt-2 space-y-1">
          {a.faltas.map((f) => (
            <li key={f.id} className="text-caption text-fg">
              {f.que}
            </li>
          ))}
        </ul>
      )}
      {a.procesos.length > 0 && (
        <>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-primary"
            aria-expanded={abierto}
            onClick={() => setAbierto((v) => !v)}
            data-testid={`piloto-opera-sola-ver-${a.agente}`}
          >
            {abierto ? (
              <CaretDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {abierto
              ? t('inmobiliaria.piloto.operaSola.ocultarProcesos')
              : t('inmobiliaria.piloto.operaSola.verProcesos', { n: String(a.procesos.length) })}
          </button>
          {abierto && (
            <ul className="mt-2 space-y-2 border-t border-border-faint pt-2">
              {a.procesos.map((p) => {
                const meta = ICONO_DEL_PROCESO[p.estado] ?? { icono: Circle, clase: 'text-fg-subtle' }
                const Icono = meta.icono
                return (
                  <li key={p.id} className="flex items-start gap-2" data-testid={`piloto-opera-sola-proceso-${p.id}`}>
                    <Icono weight="duotone" className={cn('mt-0.5 h-4 w-4 shrink-0', meta.clase)} aria-hidden="true" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-caption text-fg">{p.queHace}</p>
                      <p className="text-caption text-fg-muted">
                        {t(`inmobiliaria.piloto.operaSola.estadoProceso.${p.estado}`)}
                        {p.siempreHumano ? ` — ${p.siempreHumano}` : ''}
                      </p>
                      {p.faltas.map((f) => (
                        <p key={f.id} className="text-caption text-warning">
                          {f.que}
                        </p>
                      ))}
                      {p.estado === 'opera_solo' &&
                        p.limites.map((l) => (
                          <p key={l} className="text-caption text-fg-subtle">
                            {l}
                          </p>
                        ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </li>
  )
}

export interface PilotoOperaSolaContenidoProps {
  queFalta: LecturaDelPiloto<PilotoQueFaltaResponse>
  loQueHizo: LecturaDelPiloto<PilotoLoQueHizoResponse>
}

export function PilotoOperaSolaContenido({ queFalta, loQueHizo }: PilotoOperaSolaContenidoProps) {
  const { t } = useI18n()
  const { data, isLoading, error, notAvailable, refetch } = queFalta
  const grupos = useMemo(() => (data ? faltasPorQuien(data.agentes) : null), [data])
  const migracionesPendientes = data?.migraciones.filter((m) => m.aplicada !== true) ?? []

  if (isLoading && !data) {
    return (
      <div className="space-y-2" data-testid="piloto-opera-sola-cargando">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    )
  }
  if (error && !data) {
    return <FalloDeCarga error={error} queEs="«¿Opera sola?»" onReintentar={refetch} enmarcado={false} />
  }
  if (notAvailable || !data || !grupos) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted px-3 py-3" data-testid="piloto-opera-sola-sin-fuente">
        <p className="text-body-sm font-medium text-fg">{t('inmobiliaria.piloto.operaSola.sinFuente')}</p>
        <p className="mt-1 text-caption text-fg-muted">{t('inmobiliaria.piloto.operaSola.sinFuenteHint')}</p>
      </div>
    )
  }

  const nadaQueFalta = QUIENES.every((q) => grupos[q].length === 0)

  return (
    <div className="space-y-6" data-testid="piloto-opera-sola">
      {/* 1. La frase: el resumen es UNA frase, y dice si opera sola. */}
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg px-3 py-3',
          data.listo ? 'bg-success-soft' : 'bg-warning-soft',
        )}
        data-testid="piloto-opera-sola-frase"
      >
        {data.listo ? (
          <CheckCircle weight="duotone" className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <WarningCircle weight="duotone" className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-body-sm font-medium text-fg">
            {data.listo ? t('inmobiliaria.piloto.operaSola.estadoListo') : t('inmobiliaria.piloto.operaSola.estadoNoListo')}
          </p>
          <p className="text-caption text-fg">{data.frase}</p>
        </div>
      </div>

      {/* 2. Qué falta, por quién lo destraba. */}
      <Seccion titulo={t('inmobiliaria.piloto.operaSola.secciones.queFalta')} testid="piloto-opera-sola-que-falta">
        {nadaQueFalta ? (
          <p className="text-caption text-fg-muted">{t('inmobiliaria.piloto.operaSola.nadaQueFalta')}</p>
        ) : (
          QUIENES.filter((q) => grupos[q].length > 0).map((q) => (
            <div key={q} className="space-y-1.5" data-testid={`piloto-opera-sola-quien-${q}`}>
              <p className="text-body-sm font-medium text-fg">
                {t(`inmobiliaria.piloto.operaSola.quien.${q}`)}{' '}
                <span className="font-mono tabular-nums text-fg-muted">{grupos[q].length}</span>
              </p>
              <ul className="space-y-1.5">
                {grupos[q].map((g) => (
                  <li key={g.falta.id} className="rounded-md bg-surface-muted px-3 py-2">
                    <p className="text-caption text-fg">{g.falta.que}</p>
                    <p className="mt-0.5 text-caption text-fg-muted">{g.falta.como}</p>
                    <p className="mt-0.5 text-caption text-fg-subtle">
                      {t('inmobiliaria.piloto.operaSola.afecta', { agentes: g.agentes.join(', ') })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Seccion>

      {/* 3. Por agente. */}
      <Seccion titulo={t('inmobiliaria.piloto.operaSola.secciones.porAgente')} testid="piloto-opera-sola-agentes">
        <ul className="space-y-2">
          {data.agentes.map((a) => (
            <FilaDeAgente key={a.agente} a={a} />
          ))}
        </ul>
      </Seccion>

      {/* 4. Los interruptores del servidor (y las migraciones que faltan). */}
      <Seccion titulo={t('inmobiliaria.piloto.operaSola.secciones.interruptores')} testid="piloto-opera-sola-interruptores">
        <p className="text-caption text-fg-muted">{t('inmobiliaria.piloto.operaSola.interruptoresAyuda')}</p>
        <ul className="space-y-2">
          {data.interruptores.map((i) => (
            <li key={i.id} className="rounded-lg border border-border px-3 py-2.5" data-testid={`piloto-opera-sola-interruptor-${i.id}`}>
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-body-sm font-medium text-fg">{i.nombre}</p>
                <EstadoDelInterruptor i={i} />
              </div>
              <p className="mt-1 text-caption text-fg-muted">{i.detalle}</p>
              <p className="mt-0.5 text-caption text-fg-subtle">{i.queHabilita}</p>
              <p className="mt-1 break-all font-mono text-caption text-fg-subtle">
                {t(`inmobiliaria.piloto.operaSola.interruptor.donde.${i.donde}`)} · {i.variables.join(' · ')}
              </p>
            </li>
          ))}
        </ul>
        {migracionesPendientes.length > 0 && (
          <div className="space-y-1.5 pt-1" data-testid="piloto-opera-sola-migraciones">
            <p className="text-body-sm font-medium text-fg">{t('inmobiliaria.piloto.operaSola.migraciones')}</p>
            <ul className="space-y-1">
              {migracionesPendientes.map((m) => (
                <li key={m.id} className="text-caption text-fg-muted">
                  <span className="break-all font-mono text-fg">{m.id}</span> —{' '}
                  {m.aplicada === false
                    ? t('inmobiliaria.piloto.operaSola.migracionSinAplicar')
                    : t('inmobiliaria.piloto.operaSola.migracionNoSe')}
                  : {m.queHabilita}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Seccion>

      {/* 5. Lo que hizo. */}
      <Seccion titulo={t('inmobiliaria.piloto.operaSola.secciones.loQueHizo')} testid="piloto-opera-sola-lo-que-hizo">
        {loQueHizo.isLoading && !loQueHizo.data ? (
          <div className="h-10 animate-pulse rounded-md bg-surface-muted" />
        ) : loQueHizo.error && !loQueHizo.data ? (
          <FalloDeCarga error={loQueHizo.error} queEs="lo que hizo el Piloto" onReintentar={loQueHizo.refetch} enmarcado={false} />
        ) : loQueHizo.data ? (
          <p className="text-caption text-fg">{loQueHizo.data.frase}</p>
        ) : (
          <p className="text-caption text-fg-muted">{t('inmobiliaria.piloto.operaSola.loQueHizoSinFuente')}</p>
        )}
      </Seccion>
    </div>
  )
}

/** El botón del encabezado del Piloto y su cajón. */
export function PilotoOperaSola() {
  const { t } = useI18n()
  const [abierto, setAbierto] = useState(false)
  const queFalta = usePilotoQueFalta()
  const loQueHizo = usePilotoLoQueHizo(abierto)
  const preferencias = usePilotoPreferencias(abierto)

  const data = queFalta.data
  // Sin dato, el punto queda neutro: ni verde ni amarillo.
  const punto = !data ? 'bg-fg-subtle' : data.listo ? 'bg-success' : 'bg-warning'
  const pendientes = data ? data.pendientes.leasefy + data.pendientes.administrador + data.pendientes.programar : 0

  return (
    <Sheet
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v)
        if (v) void queFalta.refetch()
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" hideArrow data-testid="piloto-opera-sola-abrir">
          <span className={cn('mr-2 inline-block h-2 w-2 rounded-full', punto)} aria-hidden="true" />
          {t('inmobiliaria.piloto.operaSola.boton')}
          {data && !data.listo && pendientes > 0 && (
            <span
              className="ml-1.5 font-mono text-caption tabular-nums text-fg-muted"
              aria-label={t('inmobiliaria.piloto.operaSola.pendientesAria', { n: String(pendientes) })}
              title={t('inmobiliaria.piloto.operaSola.pendientesAria', { n: String(pendientes) })}
            >
              {pendientes}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 !p-0 sm:max-w-lg">
        <CajonCabecera
          titulo={
            <span className="flex items-center gap-2">
              <Gauge weight="duotone" className="h-5 w-5 text-fg-muted" aria-hidden="true" />
              {t('inmobiliaria.piloto.operaSola.titulo')}
            </span>
          }
          descripcion={t('inmobiliaria.piloto.operaSola.descripcion')}
        />
        <CajonCuerpo className="space-y-8">
          <PilotoOperaSolaContenido queFalta={queFalta} loQueHizo={loQueHizo} />
          <Seccion titulo={t('inmobiliaria.piloto.topes.titulo')} testid="piloto-opera-sola-topes">
            <PilotoTopes
              data={preferencias.data}
              isLoading={preferencias.isLoading}
              error={preferencias.error}
              notAvailable={preferencias.notAvailable}
              guardando={preferencias.guardando}
              onGuardar={async (cambios) => {
                const r = await preferencias.guardar(cambios)
                // Los topes cambian los límites que dice «¿Opera sola?».
                if (r.ok) void queFalta.refetch()
                return r
              }}
              onReintentar={preferencias.refetch}
            />
          </Seccion>
        </CajonCuerpo>
      </SheetContent>
    </Sheet>
  )
}
