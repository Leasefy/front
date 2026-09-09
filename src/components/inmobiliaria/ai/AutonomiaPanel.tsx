'use client'

/**
 * AutonomiaPanel — F6 of the Agent Workspace initiative (AGENT-WORKSPACE-SPEC §1.4).
 *
 * La postura de autonomía de un agente: el modo activo, la nota, la valla
 * (límites que publica el micro) y el aviso T-323 cuando decide sobre
 * personas.
 *
 * ── El modo: un chip o un control, nunca un control que no hace nada ────────
 * Hasta el 2026-09-08 pintaba TRES píldoras (Sombra / Copiloto / Autónomo)
 * con la activa resaltada. Parecían botones y no lo eran: la persona hacía
 * clic y nada pasaba. Ahora hay dos formas, y la decide quien monta el panel:
 *
 *   · Sin `onCambiarModo` (o sin permiso): UN chip con el modo activo y una
 *     frase que dice dónde se cambia (el cajón «Autonomía» del Piloto, en el
 *     encabezado). Nada que parezca clickeable.
 *   · Con `onCambiarModo` y `puedeCambiar`: TRES tarjetas, una por modo, con
 *     su nombre y qué implica. Subir de autonomía pide confirmación en un
 *     `AlertDialog`; bajar es un clic, como en la píldora del encabezado. El
 *     resultado se avisa por el toast de la casa.
 *
 * ── El rediseño del 2026-09-08 ──────────────────────────────────────────────
 * Nico, sobre la configuración de Matching: «esta UX está horrible y la UI
 * TAMBIÉN». Lo que había:
 *   · un control segmentado con emojis (🌑 🤝 🚀) que daban aire de borrador;
 *   · el modo elegido explicado DOS veces en gris chico, una debajo de la otra
 *     («Solo observa y sugiere en silencio» y, en un recuadro, la frase larga
 *     del micro), sin decir cuál era cuál;
 *   · «Límites del agente» con una sola fila donde la etiqueta quedaba pegada
 *     a la izquierda y su valor —una frase entera— al borde derecho de la
 *     pantalla, a mil píxeles de distancia. `justify-between` sirve para
 *     «Máximo: $0», no para una oración.
 * Ahora: una tarjeta por modo con lo que implica cada uno (así la pantalla
 * enseña las tres posturas en vez de esconder dos), un bloque titulado para lo
 * que el micro dice que cambia HOY, y los límites en dos columnas donde el
 * valor largo baja de renglón en vez de irse al horizonte.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Scales, CheckCircle } from '@phosphor-icons/react'

import type { AgentAutonomiaResponse, AutonomiaModo } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/components/ui/toast'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── Vocabulary ──────────────────────────────────────────────────────────────

const NS = 'inmobiliaria.ai.workspace.autonomia'

/** Los tres modos, de menos a más autonomía. Label + hint bajo `${NS}.modo.*`. */
const MODOS: AutonomiaModo[] = ['sombra', 'copiloto', 'autonomo']

/** Orden de autonomía: subir pide confirmación, bajar no. */
const NIVEL: Record<AutonomiaModo, number> = { sombra: 0, copiloto: 1, autonomo: 2 }

const PILOTO_HREF = '/panel/inmobiliaria/piloto'

// ── Component ───────────────────────────────────────────────────────────────

export interface AutonomiaPanelProps {
  data: AgentAutonomiaResponse | null
  isLoading?: boolean
  /** El error entero o su mensaje; `FalloDeCarga` decide qué decir. */
  error?: unknown
  onReintentar?: () => void | Promise<unknown>
  /**
   * La escritura real (PUT del modo). Sólo con esto el modo se vuelve un
   * control; sin esto se muestra como chip. Devuelve el error para el toast.
   */
  onCambiarModo?: (modo: AutonomiaModo) => Promise<{ ok: boolean; error?: string }>
  /** Si la persona puede cambiarlo (administrador). Sin permiso: chip. */
  puedeCambiar?: boolean
  /** Hay un cambio en vuelo: el control se deshabilita. */
  busy?: boolean
}

export function AutonomiaPanel({
  data,
  isLoading,
  error,
  onReintentar,
  onCambiarModo,
  puedeCambiar = false,
  busy = false,
}: AutonomiaPanelProps) {
  const { t } = useI18n()
  const [porConfirmar, setPorConfirmar] = useState<AutonomiaModo | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando" data-testid="autonomia-panel-loading">
        <div className="h-12 rounded-lg border border-border bg-surface-muted/40 animate-pulse" aria-hidden="true" />
        <div className="h-32 rounded-lg border border-border bg-surface-muted/40 animate-pulse" aria-hidden="true" />
        <span className="sr-only">Cargando…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="autonomia-panel-error">
        <FalloDeCarga
          error={error}
          queEs="la configuración de autonomía"
          onReintentar={onReintentar}
        />
      </div>
    )
  }

  if (!data) {
    // 404 / notAvailable — el vacío de la casa, NOT an error banner.
    return (
      <div
        className="rounded-lg border border-border bg-surface overflow-hidden"
        data-testid="autonomia-panel-empty"
      >
        <SinDatos
          queSon="límites"
          icono={Scales}
          titulo={t(`${NS}.emptyTitle`)}
          descripcion={t(`${NS}.emptyBody`)}
        />
      </div>
    )
  }

  // Visible hint of the ACTIVE mode (the title= tooltips are invisible on
  // touch). Unknown modo → key echo → render nothing (never the raw key).
  const activeHintKey = `${NS}.modo.${data.modo}Hint`
  const activeHint = t(activeHintKey)
  const hintDe = (modo: AutonomiaModo) => {
    const k = `${NS}.modo.${modo}Hint`
    const v = t(k)
    return v === k ? '' : v
  }

  const editable = Boolean(onCambiarModo) && puedeCambiar
  const opciones = MODOS.filter((m) => data.modosDisponibles.includes(m)).map((m) => ({
    value: m,
    label: t(`${NS}.modo.${m}`),
    hint: hintDe(m),
  }))

  const aplicar = async (modo: AutonomiaModo) => {
    if (!onCambiarModo) return
    const res = await onCambiarModo(modo)
    if (res.ok) {
      toast.success(`${t(`${NS}.modo.${modo}`)}: ${hintDe(modo) || t(`${NS}.grupoAria`)}`)
    } else {
      toast.error(t(`${NS}.error`, { error: res.error ?? 'error' }))
    }
  }

  const elegir = (modo: AutonomiaModo) => {
    if (modo === data.modo) return
    // Subir de autonomía es lo único que hace que el agente actúe con menos
    // freno: se confirma. Bajar es un clic, siempre.
    if (NIVEL[modo] > NIVEL[data.modo]) {
      setPorConfirmar(modo)
      return
    }
    void aplicar(modo)
  }

  return (
    <div className="space-y-6" data-testid="autonomia-panel">
      {editable ? (
        // Una tarjeta por modo. Sigue siendo un grupo de radio (rol y teclado
        // incluidos): lo que cambia es que cada opción dice qué implica, en vez
        // de esconder esa frase detrás de la que esté elegida.
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-fg">{t(`${NS}.modoTitle`)}</h2>
          <div
            role="radiogroup"
            aria-label={t(`${NS}.grupoAria`)}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {opciones.map(({ value, label, hint }) => {
              const activo = value === data.modo
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  disabled={busy}
                  onClick={() => elegir(value)}
                  data-testid={`autonomia-modo-${value}`}
                  className={`rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${
                    activo
                      ? 'border-primary bg-primary-soft/50 ring-1 ring-primary/30'
                      : 'border-border bg-surface hover:border-border-strong hover:bg-surface-muted/40'
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-semibold ${activo ? 'text-primary' : 'text-fg'}`}>
                      {label}
                    </span>
                    {activo && (
                      <CheckCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        weight="fill"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  {hint && <span className="mt-1.5 block text-xs leading-relaxed text-fg-muted">{hint}</span>}
                  {activo && (
                    <span className="mt-2 block text-[11px] font-medium uppercase tracking-wide text-primary">
                      {t(`${NS}.modoActivo`)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ) : (
        // Un solo chip: el modo activo. No parece botón porque no lo es.
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid={`autonomia-modo-${data.modo}`}
            aria-current="true"
            title={activeHint !== activeHintKey ? activeHint : undefined}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/30"
          >
            {t(`${NS}.modo.${data.modo}`)}
          </span>
          <p className="text-xs text-fg-muted" data-testid="autonomia-donde-se-cambia">
            {puedeCambiar ? (
              <>
                El modo se cambia desde el{' '}
                <Link href={PILOTO_HREF} className="text-primary underline-offset-4 hover:underline">
                  Piloto
                </Link>
                , en «Autonomía» del encabezado.
              </>
            ) : (
              <>Solo un administrador puede cambiar el modo, desde el Piloto.</>
            )}
          </p>
        </div>
      )}

      {/* La frase del modo activo, visible (los tooltips no existen al tocar).
          Con las tarjetas ya está dicha en la que está elegida: acá sólo hace
          falta cuando el modo es un chip de lectura. */}
      {!editable && activeHint !== activeHintKey && (
        <p className="text-xs text-fg-muted" data-testid="autonomia-modo-hint">
          {activeHint}
        </p>
      )}

      {/* Qué cambia HOY con este modo para ESTE agente: lo dice el micro,
          que es quien gobierna la ejecución. Sin esta línea la pantalla
          insinuaba que el modo era decorativo. Con título, porque suelta y en
          gris chico se confundía con la frase del modo. */}
      {data.efectoReal && (
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="autonomia-efecto-real">
          <h2 className="text-sm font-semibold text-fg">{t(`${NS}.efectoTitle`)}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{data.efectoReal}</p>
        </section>
      )}

      {/* Nota de sólo lectura del agente */}
      {data.nota && (
        <section className="rounded-lg bg-surface-muted/40 p-4" data-testid="autonomia-nota">
          <h2 className="text-sm font-semibold text-fg">{t(`${NS}.notaTitle`)}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{data.nota}</p>
        </section>
      )}

      {/* T-323 callout */}
      {data.t323 && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-xs text-warning"
          data-testid="autonomia-t323"
        >
          {t(`${NS}.t323`)}
        </div>
      )}

      {/* Valla (guardrails).
          Dos columnas, no `justify-between`: el micro publica tanto «Monto
          máximo: $0» como frases enteras («toda acción queda registrada, con
          quién la hizo y cuándo»), y empujando el valor al borde derecho la
          frase quedaba a media pantalla de su etiqueta. Acá el valor arranca
          en su columna y baja de renglón cuando no cabe. */}
      <section className="rounded-lg border border-border bg-surface p-4" data-testid="autonomia-valla">
        <h2 className="text-sm font-semibold text-fg">{t(`${NS}.vallaTitle`)}</h2>
        {data.valla.length === 0 ? (
          <p className="mt-1.5 text-xs text-fg-muted">{t(`${NS}.vallaEmpty`)}</p>
        ) : (
          <dl className="mt-2 divide-y divide-border">
            {data.valla.map((regla) => (
              <div
                key={regla.id}
                className="grid gap-x-6 gap-y-1 py-3 first:pt-1 last:pb-0 sm:grid-cols-[minmax(0,15rem)_1fr]"
                data-testid={`autonomia-valla-${regla.id}`}
              >
                <dt className="flex items-start gap-2 text-xs text-fg-muted">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      regla.estado === 'activo' ? 'bg-success' : 'bg-fg-subtle'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{regla.label}</span>
                </dt>
                {/* Sin `tabular-nums`: el micro publica tanto «$0 (apagado)» como
                    frases enteras, y la cifra tabular ensancha también la COMA
                    —es un separador numérico—, así que «registrada, con quién»
                    se leía «registrada ,  con quién». */}
                <dd className="text-xs font-medium leading-relaxed text-fg">{regla.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Confirmación para subir de autonomía — AlertDialog del DS, nunca
          window.confirm. El pie es «Cancelar · Confirmar», como todos. */}
      <AlertDialog
        open={porConfirmar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setPorConfirmar(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {porConfirmar
                ? `¿Pasar a ${t(`${NS}.modo.${porConfirmar}`)}?`
                : t(`${NS}.grupoAria`)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {porConfirmar ? hintDe(porConfirmar) : ''}
              {porConfirmar === 'autonomo'
                ? ' El agente va a actuar sin pedirte permiso dentro de los límites de abajo.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="autonomia-confirmar"
              onClick={() => {
                const modo = porConfirmar
                setPorConfirmar(null)
                if (modo) void aplicar(modo)
              }}
            >
              {porConfirmar ? `Sí, pasar a ${t(`${NS}.modo.${porConfirmar}`)}` : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
