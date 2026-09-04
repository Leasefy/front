'use client'

/**
 * PilotoAutonomia — cuánto puede hacer cada agente sin vos.
 *
 * ── Por qué se rediseñó (2026-08-30) ───────────────────────────────────────
 * Era una card fija en la columna derecha con 7 filas × 3 botones = 21
 * controles compitiendo con la bandeja por la atención, sin explicar qué
 * significa ninguno de los tres modos. Configuración no es operación: se
 * mira una vez al mes, no cada mañana.
 *
 * Ahora vive en un panel lateral que se abre desde el encabezado, y ahí sí
 * hay espacio para decir qué hace cada modo — que es la información que
 * convierte tres botones en una decisión informada.
 *
 * Usa el `SegmentedControl` del design system en vez del control artesanal
 * que tenía antes.
 */

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, SlidersHorizontal } from '@phosphor-icons/react'
import { SegmentedControl, Switch } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana'
import { cn } from '@/lib/utils'
import type { AgentePiloto, UsePilotoAutonomiaResult } from '@/lib/hooks/piloto/use-piloto-autonomia'
import type { AutonomiaModo } from '@/lib/api/piloto'
import {
  fetchPilotoGobierno,
  putPilotoGobierno,
  type GobiernoItem,
} from '@/lib/api/piloto'
import { useAuth } from '@/lib/auth'

const MODOS: AutonomiaModo[] = ['sombra', 'copiloto', 'autonomo']

/**
 * Agentes que hoy NO están disponibles en el Piloto — decisión de producto
 * TEMPORAL (T-0051, 2026-09-02), no un estado que publique el micro. La
 * tarjeta se sigue viendo (nunca se borra), pero muda y sin controles.
 * Reactivar un agente es sacarlo de esta lista, nada más.
 */
export const AGENTES_NO_DISPONIBLES: ReadonlySet<AgentePiloto> = new Set<AgentePiloto>([
  'retencion',
  'prospectos',
])

/** Qué significa cada modo, en una línea. Es lo que faltaba para decidir. */
const MODO_EXPLICACION: Record<AutonomiaModo, string> = {
  sombra: 'Propone y registra, pero no ejecuta nada. Sirve para auditarlo antes de soltarlo.',
  copiloto: 'Ejecuta lo reversible solo y te pide permiso para lo que cuesta plata.',
  autonomo: 'Ejecuta también lo irreversible, dentro de los topes que la ley y tus reglas fijan.',
}

export interface PilotoAutonomiaProps {
  /**
   * La lectura de autonomía, IZADA a la página.
   *
   * Antes este panel llamaba al hook por su cuenta y la página llamaba al
   * mismo hook otra vez: catorce peticiones donde había siete, y —peor— dos
   * verdades. Medido en pantalla el 2026-08-31: el botón decía «6/7» y el
   * indicador «Agentes autónomos» decía «—» al mismo tiempo, porque cada
   * instancia estaba en un punto distinto de su carga. Una sola fuente.
   */
  autonomia: UsePilotoAutonomiaResult
}

export function PilotoAutonomia({ autonomia }: PilotoAutonomiaProps) {
  const { t } = useI18n()
  const { rows, totalRoster, isLoading, busyAgente, setModo } = autonomia
  const { isAdmin } = usePermissionsContext()
  const { agency } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const mudos = totalRoster - rows.length

  // ── El gobierno por inmobiliaria (agentes_habilitados) ──────────────────
  // Se carga al ABRIR el panel: es configuración, no operación. El switch
  // dice si el agente corre para ESTA agencia; la perilla de abajo, con
  // cuánta correa. Optimista con rollback, como el modo.
  const [gobierno, setGobierno] = useState<Map<string, GobiernoItem>>(new Map())
  const [gobiernoBusy, setGobiernoBusy] = useState<string | null>(null)
  useEffect(() => {
    if (!abierto || !agency?.id) return
    const controller = new AbortController()
    void fetchPilotoGobierno(agency.id, controller.signal).then((r) => {
      if (controller.signal.aborted || !r.ok || !r.data) return
      setGobierno(new Map(r.data.agentes.map((a) => [a.agente, a])))
    })
    return () => controller.abort()
  }, [abierto, agency?.id])

  const cambiarCorre = async (agente: string, habilitado: boolean) => {
    if (!agency?.id) return
    const previa = gobierno
    setGobiernoBusy(agente)
    setGobierno((cur) => {
      const next = new Map(cur)
      const item = next.get(agente)
      if (item) next.set(agente, { ...item, corre: habilitado && item.disponibleGlobal })
      return next
    })
    const res = await putPilotoGobierno(agency.id, agente, habilitado)
    setGobiernoBusy(null)
    if (res.ok && res.data) {
      setGobierno(new Map(res.data.agentes.map((a) => [a.agente, a])))
      toast.success(
        habilitado
          ? t('inmobiliaria.piloto.gobierno.toastOn', { agente: workspaceVocab(t, 'agente', agente) })
          : t('inmobiliaria.piloto.gobierno.toastOff', { agente: workspaceVocab(t, 'agente', agente) }),
      )
    } else {
      setGobierno(previa)
      toast.error(t('inmobiliaria.piloto.autonomia.toastFail', { error: res.error ?? 'error' }))
    }
  }

  const autonomos = useMemo(() => rows.filter((r) => r.modo === 'autonomo').length, [rows])

  const cambiar = async (agente: (typeof rows)[number]['agente'], modo: AutonomiaModo) => {
    const res = await setModo(agente, modo)
    if (res.ok) {
      toast.success(
        t('inmobiliaria.piloto.autonomia.toastOk', {
          agente: workspaceVocab(t, 'agente', agente),
          modo: t(`inmobiliaria.piloto.autonomia.modo.${modo}`).toLowerCase(),
        }),
      )
    } else {
      toast.error(
        t('inmobiliaria.piloto.autonomia.toastFail', { error: res.error ?? 'error' }),
      )
    }
  }

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" hideArrow>
          <SlidersHorizontal weight="duotone" className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('inmobiliaria.piloto.autonomia.titulo')}
          {!isLoading && rows.length > 0 && (
            <span className="ml-1.5 font-mono text-caption tabular-nums text-fg-muted">
              {autonomos}/{totalRoster}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-fg">{t('inmobiliaria.piloto.autonomia.titulo')}</SheetTitle>
          <SheetDescription>{t('inmobiliaria.piloto.autonomia.hint')}</SheetDescription>
        </SheetHeader>

        {/* Qué significa cada modo — sin esto, los tres botones son adivinanza */}
        <dl className="mt-4 space-y-2 rounded-lg border border-border bg-surface-muted p-3">
          {MODOS.map((modo) => (
            <div key={modo} className="text-caption">
              <dt className="font-medium text-fg">
                {t(`inmobiliaria.piloto.autonomia.modo.${modo}`)}
              </dt>
              <dd className="text-fg-muted">{MODO_EXPLICACION[modo]}</dd>
            </div>
          ))}
        </dl>

        {/* Honestidad: si algún agente no reportó, se dice — su modo no se sabe. */}
        {mudos > 0 && !isLoading && (
          <p className="mt-3 text-caption text-fg-subtle">
            {t('inmobiliaria.piloto.autonomia.mudos', { n: String(mudos) })}
          </p>
        )}

        {!isAdmin && (
          <p className="mt-3 text-caption text-fg-subtle">
            {t('inmobiliaria.piloto.autonomia.soloAdmin')}
          </p>
        )}

        <div className="mt-4 space-y-4">
          {isLoading &&
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-surface-muted"
                role="status"
                aria-label="Cargando"
              />
            ))}

          {!isLoading && rows.length === 0 && (
            <p className="text-body-sm text-fg-muted">
              {t('inmobiliaria.piloto.autonomia.vacia')}
            </p>
          )}

          {rows.map((row) => {
            const etiqueta = workspaceVocab(t, 'agente', row.agente)
            const opciones = MODOS.filter((m) => row.modosDisponibles.includes(m)).map((m) => ({
              value: m,
              label: t(`inmobiliaria.piloto.autonomia.modo.${m}`),
            }))
            const gob = gobierno.get(row.agente)
            // T-0051: agente en pausa de producto — la tarjeta entera se lee
            // como no disponible, sin importar lo que diga el gobierno real.
            const noDisponible = AGENTES_NO_DISPONIBLES.has(row.agente)
            const estadoTexto = noDisponible
              ? t('inmobiliaria.piloto.gobierno.proximamente')
              : gob
                ? !gob.disponibleGlobal
                  ? t('inmobiliaria.piloto.gobierno.apagadoServidor')
                  : gob.corre
                    ? t('inmobiliaria.piloto.gobierno.activo')
                    : t('inmobiliaria.piloto.gobierno.inactivo')
                : null
            return (
              <div
                key={row.agente}
                className={cn('space-y-1.5', noDisponible && 'opacity-60')}
                data-testid={`piloto-autonomia-fila-${row.agente}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'text-body-sm font-medium',
                      noDisponible ? 'text-fg-muted' : 'text-fg',
                    )}
                  >
                    {etiqueta}
                  </p>
                  {(gob || noDisponible) && (
                    <span className="flex items-center gap-1.5">
                      {estadoTexto && (
                        <span className="text-caption text-fg-subtle">{estadoTexto}</span>
                      )}
                      {isAdmin && (
                        <Switch
                          checked={noDisponible ? false : Boolean(gob?.corre)}
                          disabled={
                            noDisponible || !gob?.disponibleGlobal || gobiernoBusy === row.agente
                          }
                          onCheckedChange={(v: boolean) => void cambiarCorre(row.agente, v)}
                          aria-label={t('inmobiliaria.piloto.gobierno.switchAria', { agente: etiqueta })}
                        />
                      )}
                    </span>
                  )}
                </div>
                {isAdmin ? (
                  <SegmentedControl<AutonomiaModo>
                    options={opciones}
                    value={row.modo}
                    onChange={(modo) => void cambiar(row.agente, modo)}
                    disabled={noDisponible || busyAgente === row.agente}
                    size="sm"
                    fullWidth
                    aria-label={t('inmobiliaria.piloto.autonomia.grupoAria', {
                      agente: etiqueta,
                    })}
                  />
                ) : (
                  <p className="text-caption text-fg-muted">
                    {t(`inmobiliaria.piloto.autonomia.modo.${row.modo}`)}
                  </p>
                )}

                {/* Qué significa HOY el modo elegido PARA ESTE AGENTE — la
                    frase la publica el micro y describe lo que el código hace,
                    no lo que promete el marketing. */}
                {row.efectoReal && (
                  <p className="text-caption leading-snug text-fg-muted">{row.efectoReal}</p>
                )}

                {/* Las vallas que publica el micro: reglas que ningún modo
                    puede saltarse. Se pintan como REGLAS, no como chequeos en
                    vivo — el micro dice «regla», no «activo», justamente para
                    no simular un health-check que nadie corrió. */}
                {row.valla.length > 0 && (
                  <ul className="space-y-0.5 pt-0.5">
                    {row.valla.map((v) => (
                      <li key={v.id} className="flex items-start gap-1.5 text-caption text-fg-subtle">
                        <ShieldCheck
                          weight="duotone"
                          className="mt-0.5 h-3 w-3 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="text-fg-muted">{v.label}:</span> {v.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
