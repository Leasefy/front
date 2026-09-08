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
 *   · Con `onCambiarModo` y `puedeCambiar`: el `SegmentedControl` del DS
 *     —el mismo del Piloto— con los modos disponibles. Subir de autonomía pide
 *     confirmación en un `AlertDialog`; bajar es un clic, como en la píldora
 *     del encabezado. El resultado se avisa por el toast de la casa.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Scales } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/cadence'

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

/** Emoji per mode; label + hint text live under `${NS}.modo.*`. */
const MODO_EMOJI: Record<AutonomiaModo, string> = {
  sombra: '🌑',
  copiloto: '🤝',
  autonomo: '🚀',
}

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
    label: `${MODO_EMOJI[m]} ${t(`${NS}.modo.${m}`)}`,
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
    <div className="space-y-4" data-testid="autonomia-panel">
      {editable ? (
        <div className="space-y-2">
          <SegmentedControl<AutonomiaModo>
            options={opciones}
            value={data.modo}
            onChange={elegir}
            disabled={busy}
            size="sm"
            aria-label={t(`${NS}.grupoAria`)}
          />
        </div>
      ) : (
        // Un solo chip: el modo activo. No parece botón porque no lo es.
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid={`autonomia-modo-${data.modo}`}
            aria-current="true"
            title={activeHint !== activeHintKey ? activeHint : undefined}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/30"
          >
            <span aria-hidden="true">{MODO_EMOJI[data.modo]}</span>
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

      {/* Active-mode hint, visible (tooltips don't exist on touch) */}
      {activeHint !== activeHintKey && (
        <p className="text-xs text-fg-muted" data-testid="autonomia-modo-hint">
          {activeHint}
        </p>
      )}

      {/* Read-only nota */}
      {data.nota && (
        <p className="text-xs text-fg-muted rounded-lg bg-surface-muted/40 px-3 py-2" data-testid="autonomia-nota">
          {data.nota}
        </p>
      )}

      {/* T-323 callout */}
      {data.t323 && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning"
          data-testid="autonomia-t323"
        >
          {t(`${NS}.t323`)}
        </div>
      )}

      {/* Valla (guardrails) */}
      <section className="rounded-lg border border-border bg-surface p-4 space-y-2" data-testid="autonomia-valla">
        <h2 className="text-sm font-semibold text-fg">{t(`${NS}.vallaTitle`)}</h2>
        {data.valla.length === 0 ? (
          <p className="text-xs text-fg-muted">{t(`${NS}.vallaEmpty`)}</p>
        ) : (
          <dl className="divide-y divide-border">
            {data.valla.map((regla) => (
              <div
                key={regla.id}
                className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                data-testid={`autonomia-valla-${regla.id}`}
              >
                <dt className="flex items-center gap-2 text-xs text-fg-muted min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      regla.estado === 'activo' ? 'bg-success' : 'bg-fg-subtle'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{regla.label}</span>
                </dt>
                <dd className="text-xs font-medium text-fg tabular-nums shrink-0">
                  {regla.value}
                </dd>
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
