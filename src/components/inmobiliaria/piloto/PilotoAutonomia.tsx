'use client'

/**
 * PilotoAutonomia — cuánto puede hacer cada agente sin ti.
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
 *
 * ── Honesto (auditoría del Piloto, 23-09-2026, hallazgo 11) ───────────────
 * Los modos se llaman como decidió Nico (P-1): Manual / Copiloto /
 * Automático. Qué hace cada uno se explica con las MISMAS frases que la
 * píldora del header (`flota.que.*`): antes el panel decía «Copiloto ejecuta
 * lo reversible solo y te pide permiso para lo que cuesta plata» y la píldora
 * «nada sale sin tu visto bueno», y el código no hacía ninguna de las dos
 * distinciones. Por agente, la frase la pone el micro (su tabla de verdad), y
 * los agentes cuyo modo no cambia nada lo dicen: «Todavía no actúa solo».
 * Los datos vienen de UNA petición (la flota), no de doce.
 */

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, SlidersHorizontal } from '@phosphor-icons/react'
import { SegmentedControl, Switch } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana'
import { cn } from '@/lib/utils'
import type { AgentePiloto, UsePilotoAutonomiaResult } from '@/lib/hooks/piloto/use-piloto-autonomia'
import type { AutonomiaModo } from '@/lib/api/piloto'
import {
  MODOS_DEL_PILOTO,
  fetchPilotoGobierno,
  fetchPilotoModosPropios,
  putPilotoGobierno,
  putPilotoModoPropio,
  type GobiernoItem,
  type PilotoModosPropiosResponse,
} from '@/lib/api/piloto'
import { PilotoModoPropio } from '@/components/inmobiliaria/piloto/PilotoModoPropio'
import { useAuth } from '@/lib/auth'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context'
import { ConfirmarAutomatico, pideSegundoFactor } from '@/components/inmobiliaria/piloto/ConfirmarAutomatico'

/** La lista única de modos (ver `MODOS_DEL_PILOTO`). */
const MODOS: readonly AutonomiaModo[] = MODOS_DEL_PILOTO

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
  // T-0076: `error` se descartaba acá — un fallo real (un 429 del gateway,
  // por ejemplo) se leía IGUAL que «ningún agente reporta autonomía todavía»
  // (`rows.length === 0` con `error: null`), un estado vacío honesto que no
  // es lo que pasó. Ahora un fallo real se dice como tal, con retry.
  const { rows, totalRoster, isLoading, error, busyAgente, setModo, refetch } = autonomia
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
  // Ola E: los procesos con perilla propia (se cargan con el gobierno, al abrir).
  const [modosPropios, setModosPropios] = useState<PilotoModosPropiosResponse | null>(null)
  const [modoPropioBusy, setModoPropioBusy] = useState<string | null>(null)
  useEffect(() => {
    if (!abierto || !agency?.id) return
    const controller = new AbortController()
    void fetchPilotoGobierno(agency.id, controller.signal).then((r) => {
      if (controller.signal.aborted || !r.ok || !r.data) return
      setGobierno(new Map(r.data.agentes.map((a) => [a.agente, a])))
    })
    // Ola E (03-10-2026): los procesos con perilla PROPIA (hoy, el alias de la
    // conciliación). Un micro viejo no los tiene: la lista queda vacía.
    void fetchPilotoModosPropios(agency.id, controller.signal).then((r) => {
      if (controller.signal.aborted || !r.ok || !r.data) return
      setModosPropios(r.data)
    })
    return () => controller.abort()
  }, [abierto, agency?.id])

  // ── La perilla PROPIA de un proceso (ola E, Nico C2-IA Q5) ──────────────
  const cambiarModoPropio = async (
    procesoId: string,
    modo: AutonomiaModo,
  ): Promise<{ ok: boolean; fallo?: unknown }> => {
    if (!agency?.id || !modosPropios) return { ok: false }
    const previa = modosPropios
    setModoPropioBusy(procesoId)
    setModosPropios({
      ...modosPropios,
      procesos: modosPropios.procesos.map((p) => (p.id === procesoId ? { ...p, modo } : p)),
    })
    const res = await putPilotoModoPropio(agency.id, procesoId, modo)
    setModoPropioBusy(null)
    if (res.ok && res.data) {
      const guardado = res.data
      setModosPropios((cur) =>
        cur ? { ...cur, procesos: cur.procesos.map((p) => (p.id === procesoId ? guardado : p)) } : cur,
      )
      toast.success(`«${guardado.nombre}» quedó en ${t(`inmobiliaria.piloto.autonomia.modo.${modo}`).toLowerCase()}.`)
      return { ok: true }
    }
    setModosPropios(previa)
    // PI-23: si pide el código, lo pide el diálogo (no un aviso rojo).
    if (!pideSegundoFactor(res.fallo)) {
      toast.error(
        mensajeParaLaPersona(res.fallo, {
          porDefecto: 'No se pudo cambiar el modo de este proceso.',
          accion: 'cambiar el modo de este proceso',
        }),
      )
    }
    return { ok: false, fallo: res.fallo }
  }

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
      // Lo que pasó, con la regla de oro (antes: «No se pudo cambiar el modo:
      // 403», con el texto del modo y el status crudo).
      toast.error(
        mensajeParaLaPersona(res.fallo, {
          porDefecto: habilitado ? 'No se pudo encender el agente.' : 'No se pudo apagar el agente.',
          accion: habilitado ? 'encender el agente' : 'apagar el agente',
        }),
      )
    }
  }

  // Sólo cuentan los que DE VERDAD actúan solos: modo Automático, el modo los
  // gobierna y corren. Un cotizador «en Automático» no hace nada distinto.
  const autonomos = useMemo(
    () => rows.filter((r) => r.modo === 'autonomo' && r.gobierna && r.corre).length,
    [rows],
  )

  const aplicarModo = async (
    agente: (typeof rows)[number]['agente'],
    modo: AutonomiaModo,
  ): Promise<{ ok: boolean; fallo?: unknown }> => {
    const res = await setModo(agente, modo)
    if (res.ok) {
      toast.success(
        t('inmobiliaria.piloto.autonomia.toastOk', {
          agente: workspaceVocab(t, 'agente', agente),
          modo: t(`inmobiliaria.piloto.autonomia.modo.${modo}`).toLowerCase(),
        }),
      )
    } else if (!pideSegundoFactor(res.fallo)) {
      toast.error(
        mensajeParaLaPersona(res.fallo, { porDefecto: 'No se pudo cambiar el modo.', accion: 'cambiar el modo' }),
      )
    }
    return res
  }

  /**
   * 🔴 PI-23 (04-10-2026): subir a Automático se confirma diciendo qué va a
   * pasar y queda a nombre de quien lo hace (el código del segundo factor si
   * el micro lo pide). Bajar a Copiloto o a Manual es directo: frenar siempre
   * es fácil.
   */
  const [pidiendoAutomatico, setPidiendoAutomatico] = useState<
    | { tipo: 'agente'; agente: (typeof rows)[number]['agente']; etiqueta: string }
    | { tipo: 'propio'; procesoId: string; nombre: string }
    | null
  >(null)
  const flota = usePilotoFlotaCompartida()

  const cambiar = async (agente: (typeof rows)[number]['agente'], modo: AutonomiaModo) => {
    if (modo === 'autonomo') {
      setPidiendoAutomatico({ tipo: 'agente', agente, etiqueta: workspaceVocab(t, 'agente', agente) })
      return
    }
    await aplicarModo(agente, modo)
  }

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" hideArrow>
          <SlidersHorizontal weight="duotone" className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('inmobiliaria.piloto.autonomia.titulo')}
          {!isLoading && rows.length > 0 && (
            <span
              className="ml-1.5 font-mono text-caption tabular-nums text-fg-muted"
              // «11/12» no dice qué cuenta. Un lector de pantalla leía
              // «Autonomía 11 12».
              title={t('inmobiliaria.piloto.autonomia.contadorTitulo', {
                n: String(autonomos),
                total: String(totalRoster),
              })}
              aria-label={t('inmobiliaria.piloto.autonomia.contadorTitulo', {
                n: String(autonomos),
                total: String(totalRoster),
              })}
            >
              {autonomos}/{totalRoster}
            </span>
          )}
        </Button>
      </SheetTrigger>

      {/* Cabecera arriba y fija; lo demás lo reparte el `SheetContent` a un
          cuerpo con scroll. */}
      <SheetContent side="right" size="md">
        <SheetHeader
          title={t('inmobiliaria.piloto.autonomia.titulo')}
          description={t('inmobiliaria.piloto.autonomia.hint')}
        />

        {/* Qué significa cada modo — sin esto, los tres botones son adivinanza */}
        <dl className="space-y-2 rounded-lg border border-border bg-surface-muted p-3">
          {MODOS.map((modo) => (
            <div key={modo} className="text-caption">
              <dt className="font-medium text-fg">
                {t(`inmobiliaria.piloto.autonomia.modo.${modo}`)}
              </dt>
              <dd className="text-fg-muted">{t(`inmobiliaria.piloto.flota.que.${modo}`)}</dd>
            </div>
          ))}
        </dl>

        {/* Honestidad: si algún agente no reportó, se dice — su modo no se sabe.
            Con `error` ya se dice de otra forma más abajo (FalloDeCarga); las
            dos juntas —«12 no reportaron» y «no pudimos cargar»— dirían lo
            mismo dos veces. */}
        {mudos > 0 && !isLoading && !error && (
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

          {/* Un fallo real primero: «vacía» es una respuesta correcta con
              cero agentes, no lo que pasó cuando la petición ni siquiera
              volvió (T-0076: antes esto se mostraba idéntico a un 404). */}
          {!isLoading && Boolean(error) && rows.length === 0 && (
            <FalloDeCarga
              error={error}
              queEs="la autonomía de los agentes"
              onReintentar={refetch}
              enmarcado={false}
            />
          )}

          {!isLoading && !error && rows.length === 0 && (
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
                : !row.corre
                  ? t('inmobiliaria.piloto.gobierno.apagadoServidor')
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
                      'flex items-center gap-2 text-body-sm font-medium',
                      noDisponible ? 'text-fg-muted' : 'text-fg',
                    )}
                  >
                    {etiqueta}
                    {!row.gobierna && (
                      <span
                        className="rounded-full bg-surface-muted px-2 py-0.5 text-caption font-normal text-fg-muted"
                        data-testid={`piloto-autonomia-no-actua-${row.agente}`}
                      >
                        {t('inmobiliaria.piloto.autonomia.noActuaSolo')}
                      </span>
                    )}
                  </p>
                  {(gob || noDisponible || estadoTexto) && (
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

                {/* Ola E: los procesos de este agente con perilla PROPIA (no
                    los mueve el modo de arriba). */}
                {(modosPropios?.procesos ?? [])
                  .filter((p) => p.agente === row.agente)
                  .map((p) => (
                    <PilotoModoPropio
                      key={p.id}
                      proceso={p}
                      puedeEditar={isAdmin && modosPropios?.puedeEditar === true}
                      guardable={modosPropios?.guardable ?? null}
                      porQueNo={modosPropios?.porQueNo ?? null}
                      ocupado={modoPropioBusy === p.id}
                      onCambiar={(modo) =>
                        modo === 'autonomo'
                          ? setPidiendoAutomatico({ tipo: 'propio', procesoId: p.id, nombre: p.nombre })
                          : void cambiarModoPropio(p.id, modo)
                      }
                    />
                  ))}
              </div>
            )
          })}
        </div>
      </SheetContent>

      <ConfirmarAutomatico
        abierto={pidiendoAutomatico !== null}
        quien={
          pidiendoAutomatico?.tipo === 'propio'
            ? `«${pidiendoAutomatico.nombre}»`
            : (pidiendoAutomatico?.etiqueta ?? 'este agente')
        }
        // Mientras la flota carga no se avisa «apagado»: sólo con el dato.
        pilotoActivo={flota.data?.activo !== false}
        onConfirmar={async () => {
          const p = pidiendoAutomatico
          if (!p) return { ok: false }
          return p.tipo === 'agente' ? aplicarModo(p.agente, 'autonomo') : cambiarModoPropio(p.procesoId, 'autonomo')
        }}
        onCerrar={() => setPidiendoAutomatico(null)}
      />
    </Sheet>
  )
}
