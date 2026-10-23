'use client'

// Phase 33 plan 33-04 (COTI-UI-04, XR-05)
//
// Counterfactual "ask-why" modal. Implements:
//   - D-33-01: exactly ONE active variable per request (single-active state machine)
//   - D-33-02: side-by-side delta-card columns (Original | Hipotético)
//   - D-33-03: single-shot response with skeleton + "tardando" hint @ 3s
//   - D-33-04: per-variable native controls (range / select / button-group / stepper)
//   - D-33-07: cost estimate pre-submit + actual cost post-receipt
//   - D-33-08: cap-exhausted banner (role="alert") + disabled submit
//   - D-33-12: responsive Dialog shell — full-screen sm, centered md+
//   - D-33-13: 5 differentiated error UX paths (429 / 404 / timeout / 5xx / 400)
//
// Security note (T-33-04-01): narrative_es is rendered as plain JSX text only —
// never via dangerouslySetInnerHTML. Haiku output is untrusted text.
//
// Security note (T-33-04-03): the daily cap is enforced server-side. The
// frontend disabled-submit is pre-emptive UX; a stale client that bypasses it
// still receives the 429 codepath which presents the same banner.

import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatoDeCifras, localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

void React
import { Minus, Plus } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n'
import { CarrierCard } from '@/components/inmobiliaria/cotizador/CarrierCard'
import { useAskWhy, type AskWhyResult, type AskWhyError, type AskWhyVariable, type AskWhyNewValue } from '@/lib/hooks/cotizador/use-ask-why'
import { useAskWhyUsage } from '@/lib/hooks/cotizador/use-ask-why-usage'
import { useAuth } from '@/lib/auth'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import { AnimatedNumber, CrossFade, MotionIndicator } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { TIPOS_DE_INMUEBLE_DEL_COTIZADOR, tipoDeInmuebleEnPalabras, tipoQueViaja } from '@/lib/cotizador/tipo-de-inmueble'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Re-declared per plan: WizardStep2Propiedad does NOT export TIPO_OPTIONS;
// import would couple a leaf component to a page-level wizard. Values match
// the wizard exactly — verified by reading WizardStep2Propiedad.tsx.
// 🔴 COTIZ-5 (19-10-2026): «Local u oficina» en una sola opción (`local`).
const TIPO_OPTIONS = TIPOS_DE_INMUEBLE_DEL_COTIZADOR
type TipoInmueble = (typeof TIPO_OPTIONS)[number]

// Minimal DANE-major city list. The wizard's ciudad input is a free-text
// field (WizardStep1Candidato.tsx); the counterfactual modal constrains
// operators to a known set for the hypothetical so the engine prompt stays
// deterministic. Operators can still re-quote from scratch for arbitrary
// cities.
const CIUDAD_OPTIONS = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
  'Bucaramanga', 'Pereira', 'Manizales', 'Ibagué', 'Cúcuta',
] as const

const SNAP_STEP_COP = 50_000
const DEFAULT_DAILY_CAP = 50

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveVariable = AskWhyVariable | null

export interface CounterfactualModalProps {
  open: boolean
  onClose: () => void
  quoteId: string
  /** COTIZ-8: con aseguradoras reales, abrir el asistente con el dato ya cambiado. */
  onRecotizarConElCambio?: (variable: string, valor: string) => void
  originalCarriers: CarrierState[]
  originalInputs: {
    canonCop: number
    ciudad: string
    tipo: string
    codeudores: number
  }
  /** Called when the wrapper returns 404 (quote stale). The parent shows a toast and closes. */
  onQuote404: () => void
  /**
   * COTIZ-17 (19-10-2026, «Solicitar codeudor»): abrir con una variable ya
   * elegida (p. ej. 1 codeudor) para ver el efecto sin buscarla.
   */
  empezarCon?: { variable: 'codeudores'; valor: number } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampCanon(original: number): { min: number; max: number } {
  const min = Math.round((original * 0.75) / SNAP_STEP_COP) * SNAP_STEP_COP
  const max = Math.round((original * 1.25) / SNAP_STEP_COP) * SNAP_STEP_COP
  return { min, max }
}

function formatCop(v: number): string {
  return formatoDeCifras(localeDeLasCifras(), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(v)
}

function formatBogotaResetTime(resetsAtIso: string): string {
  if (!resetsAtIso) return '00:00'
  const d = new Date(resetsAtIso)
  if (Number.isNaN(d.getTime())) return '00:00'
  // Colombia does NOT observe DST — America/Bogota is always UTC-5.
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CounterfactualModal(props: CounterfactualModalProps): React.JSX.Element {
  const { open, onClose, quoteId, originalCarriers, originalInputs, onQuote404 } = props
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const { mutate, isLoading, error: hookError, reset } = useAskWhy(agencyId)
  const { data: usage, mutate: refreshUsage } = useAskWhyUsage(open ? agencyId : null)

  const [activeVariable, setActiveVariable] = useState<ActiveVariable>(null)
  const [draftValues, setDraftValues] = useState({
    canon: originalInputs.canonCop,
    ciudad: originalInputs.ciudad,
    tipo: originalInputs.tipo,
    codeudores: originalInputs.codeudores,
  })
  const [result, setResult] = useState<AskWhyResult | null>(null)
  const [localError, setLocalError] = useState<AskWhyError | null>(null)
  const [tardando, setTardando] = useState(false)

  // Local mirror of the hook's error so mocked hooks (in tests) and prop-only
  // consumers both observe the post-rejection error state.
  const error: AskWhyError | null = hookError ?? localError
  const tardandoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPayloadRef = useRef<{ variable: AskWhyVariable; new_value: AskWhyNewValue[AskWhyVariable] } | null>(null)
  const autoRetriedRef = useRef(false)

  const { min: canonMin, max: canonMax } = useMemo(
    () => clampCanon(originalInputs.canonCop),
    [originalInputs.canonCop],
  )

  // ---- Loading "tardando" timer ---------------------------------------------
  useEffect(() => {
    if (isLoading) {
      setTardando(false)
      tardandoTimer.current = setTimeout(() => setTardando(true), 3_000)
    } else {
      if (tardandoTimer.current) clearTimeout(tardandoTimer.current)
      setTardando(false)
    }
    return () => {
      if (tardandoTimer.current) clearTimeout(tardandoTimer.current)
    }
  }, [isLoading])

  // ---- Auto-retry once on 'online' event after 5xx/network (D-33-13) -------
  useEffect(() => {
    if (!error) return
    if (error.code !== 500 && error.code !== 'network') return
    if (autoRetriedRef.current) return
    if (!lastPayloadRef.current) return

    const handler = () => {
      if (autoRetriedRef.current) return
      autoRetriedRef.current = true
      void handleSubmit()
    }
    window.addEventListener('online', handler, { once: true })
    return () => window.removeEventListener('online', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  // ---- Single-active state machine ------------------------------------------
  const activate = (variable: AskWhyVariable, value: number | string) => {
    setActiveVariable(variable)
    setResult(null)
    setLocalError(null)
    reset()
    setDraftValues({
      canon: variable === 'canon' ? (value as number) : originalInputs.canonCop,
      ciudad: variable === 'ciudad' ? (value as string) : originalInputs.ciudad,
      tipo: variable === 'tipo' ? (value as string) : originalInputs.tipo,
      codeudores: variable === 'codeudores' ? (value as number) : originalInputs.codeudores,
    })
  }

  // COTIZ-17: «Solicitar codeudor» abre el modal con 1 codeudor ya elegido.
  const empezarConVariable = props.empezarCon?.variable ?? null
  const empezarConValor = props.empezarCon?.valor ?? null
  useEffect(() => {
    if (open && empezarConVariable !== null && empezarConValor !== null) activate(empezarConVariable, empezarConValor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empezarConVariable, empezarConValor])

  const isReadonly = (v: AskWhyVariable): boolean =>
    activeVariable !== null && activeVariable !== v

  // ---- Submit ---------------------------------------------------------------
  const capExhausted =
    usage !== null && usage.used_today >= usage.daily_cap

  const canSubmit = activeVariable !== null && !isLoading && !capExhausted

  async function handleSubmit() {
    if (!activeVariable) return
    if (capExhausted) return

    const new_value: AskWhyNewValue[AskWhyVariable] =
      activeVariable === 'canon' ? draftValues.canon
        : activeVariable === 'ciudad' ? draftValues.ciudad
        : activeVariable === 'tipo' ? draftValues.tipo
        : draftValues.codeudores

    lastPayloadRef.current = { variable: activeVariable, new_value }

    try {
      const res: AskWhyResult = await mutate({
        quote_id: quoteId,
        variable: activeVariable,
        new_value,
      })
      setResult(res)
      refreshUsage()
    } catch (caught) {
      const e = caught as AskWhyError
      setLocalError(e)
      if (e?.code === 404) {
        onQuote404()
      }
      // 429 / timeout / 500 / network / 400 → handled inline via `error` state.
    }
  }

  // ---- Footer text ----------------------------------------------------------
  // 🔴 COTIZ-9 (19-10-2026): «Te quedan» son las que QUEDAN (antes pintaba las
  // usadas: «Te quedan 0 de 50» sin haber usado ninguna).
  const capCount = usage?.daily_cap ?? DEFAULT_DAILY_CAP
  const usedCount = usage ? Math.max(0, capCount - usage.used_today) : '?'
  const resetTimeBogota = usage ? formatBogotaResetTime(usage.resets_at) : '00:00'

  let footerText: string
  if (isLoading) {
    footerText = t('inmobiliaria.ai.cotizador.askWhy.calculating')
  } else {
    // COTIZ-8: ya no usa la IA ni cuesta: sólo cuántas quedan hoy.
    footerText = t('inmobiliaria.ai.cotizador.askWhy.remaining', { n: usedCount, m: capCount })
  }
  // COTIZ-8: con aseguradoras reales, el mismo cambio en una cotización nueva.
  const recotizarConElCambio = () => {
    const p = lastPayloadRef.current
    if (!p || !props.onRecotizarConElCambio) return
    props.onRecotizarConElCambio(p.variable, p.variable === 'tipo' ? tipoQueViaja(String(p.new_value)) : String(p.new_value))
  }

  // ---- Render ---------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      {/* QA 19-10-2026 (Nico: «ese modal se ve súper pequeño»): las clases de
          posición de antes (`top-1/2`, `my-12`, `translate`) peleaban con el
          centrado de Cadence (`inset-0 m-auto`) y el panel quedaba a media
          pantalla con casi todo escondido. El tamaño es el de la casa. */}
      <DialogContent size="xl">
        {/* Antes esto era un `<h2>` suelto dentro del cuerpo: título más grande
            que el del resto de los modales, sin filete, sin ✕ y —lo peor— sin
            `DialogTitle`, o sea un diálogo sin nombre accesible. */}
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.ai.cotizador.askWhy.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5" data-testid="cf-modal-body">

          {/* Cap-exhausted banner OR 429 inline banner */}
          {(capExhausted || (error && error.code === 429)) && (
            <div
              role="alert"
              aria-live="assertive"
              data-testid="cf-cap-banner"
              className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-700 dark:text-warning-100"
            >
              {t('inmobiliaria.ai.cotizador.askWhy.capExhausted.body', {
                cap: error && error.code === 429 ? error.cap : capCount,
                time:
                  error && error.code === 429
                    ? formatBogotaResetTime(error.resets_at)
                    : resetTimeBogota,
              })}
            </div>
          )}

          {/* Variable controls */}
          <section className="space-y-4">
            {/* Canon slider (native range input — simpler than Radix for happy-dom tests) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('inmobiliaria.ai.cotizador.askWhy.variableLabels.canon')}
                <span className="ml-2 font-mono text-caption text-muted-foreground">
                  {formatCop(draftValues.canon)}
                </span>
              </label>
              <input
                data-testid="cf-canon-input"
                type="range"
                min={canonMin}
                max={canonMax}
                step={SNAP_STEP_COP}
                value={draftValues.canon}
                aria-disabled={isReadonly('canon') ? 'true' : 'false'}
                disabled={isReadonly('canon') || capExhausted}
                onChange={e => activate('canon', Number(e.currentTarget.value))}
                className="w-full"
                data-cf-control="canon"
                data-cf-slider="true"
              />
              <div
                data-testid="cf-canon-slider"
                className="text-caption text-muted-foreground font-mono flex justify-between"
              >
                <span>{formatCop(canonMin)}</span>
                <span>{formatCop(canonMax)}</span>
              </div>
            </div>

            {/* Ciudad select */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('inmobiliaria.ai.cotizador.askWhy.variableLabels.ciudad')}
              </label>
              <select
                data-testid="cf-ciudad-select"
                value={draftValues.ciudad}
                aria-disabled={isReadonly('ciudad') ? 'true' : 'false'}
                disabled={isReadonly('ciudad') || capExhausted}
                onChange={e => activate('ciudad', e.currentTarget.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                {!CIUDAD_OPTIONS.includes(originalInputs.ciudad as (typeof CIUDAD_OPTIONS)[number]) && (
                  <option value={originalInputs.ciudad}>{originalInputs.ciudad}</option>
                )}
                {CIUDAD_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Tipo button group */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('inmobiliaria.ai.cotizador.askWhy.variableLabels.tipo')}
              </label>
              <div
                role="group"
                data-testid="cf-tipo-group"
                aria-label={t('inmobiliaria.ai.cotizador.askWhy.variableLabels.tipo')}
                className="grid grid-cols-3 gap-2"
              >
                {TIPO_OPTIONS.map(tipo => {
                  const isActive = draftValues.tipo === tipo
                  const ro = isReadonly('tipo') || capExhausted
                  return (
                    <button
                      key={tipo}
                      type="button"
                      data-testid={`cf-tipo-btn-${tipo}`}
                      aria-pressed={isActive}
                      aria-disabled={ro ? 'true' : 'false'}
                      disabled={ro}
                      onClick={() => activate('tipo', tipo)}
                      className={[
                        'relative isolate rounded-lg border px-2 py-1.5 text-caption font-medium transition-colors',
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-border bg-card text-foreground hover:bg-muted',
                        ro ? 'pointer-events-none opacity-50' : '',
                      ].join(' ')}
                    >
                      {/* El fondo y el anillo del tipo elegido se deslizan al
                          nuevo (`MotionIndicator`). */}
                      {isActive && (
                        <MotionIndicator
                          layoutId="contrafactual-tipo"
                          className="inset-0 -z-10 rounded-lg bg-primary/10 ring-1 ring-primary"
                        />
                      )}
                      {tipoDeInmuebleEnPalabras(tipo)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Codeudores stepper */}
            <div data-testid="cf-codeudores-stepper">
              <label className="block text-sm font-medium mb-1">
                {t('inmobiliaria.ai.cotizador.askWhy.variableLabels.codeudores')}
              </label>
              <div className="flex items-center gap-3">
                {(() => {
                  const minC = Math.max(0, originalInputs.codeudores - 1)
                  const maxC = originalInputs.codeudores + 1
                  const ro = isReadonly('codeudores') || capExhausted
                  return (
                    <>
                      <button
                        type="button"
                        aria-label="Disminuir codeudores"
                        aria-disabled={ro || draftValues.codeudores <= minC ? 'true' : 'false'}
                        disabled={ro || draftValues.codeudores <= minC}
                        onClick={() => activate('codeudores', draftValues.codeudores - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="min-w-[2rem] text-center text-base font-medium font-mono tabular-nums">
                        <AnimatedNumber value={draftValues.codeudores} format={(n) => String(Math.round(n))} />
                      </span>
                      <button
                        type="button"
                        aria-label="Aumentar codeudores"
                        aria-disabled={ro || draftValues.codeudores >= maxC ? 'true' : 'false'}
                        disabled={ro || draftValues.codeudores >= maxC}
                        onClick={() => activate('codeudores', draftValues.codeudores + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={16} />
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          </section>

          {/* Delta cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Original */}
            <div className="space-y-2 opacity-60">
              <h3 className="text-caption font-mono uppercase tracking-wide text-muted-foreground">
                {t('inmobiliaria.ai.cotizador.askWhy.originalColumn')}
              </h3>
              {originalCarriers.map((c, i) => (
                <div key={`o-${c.carrier}-${i}`} data-testid="carrier-card-original">
                  <CarrierCard carrier={c} />
                </div>
              ))}
            </div>
            {/* Hypothetical */}
            <div className="space-y-2">
              <h3 className="text-caption font-mono uppercase tracking-wide text-foreground">
                {t('inmobiliaria.ai.cotizador.askWhy.hypotheticalColumn')}
              </h3>
              {/* Esperando → consultando → el resultado hipotético: cada
                  estado entra con su fundido (`popLayout`: monta ya). */}
              <CrossFade
                mode="popLayout"
                swapKey={isLoading ? 'consultando' : result ? 'resultado' : !error ? 'esperando' : 'fallo'}
                className="space-y-2"
              >
              {isLoading && (
                // Esqueleto con la forma de la tarjeta de la aseguradora
                // (antes una rueda): el resultado entra donde estaba.
                <div className="space-y-2" aria-busy="true">
                  {originalCarriers.slice(0, 2).map((c, i) => (
                    <div key={`s-${c.carrier}-${i}`} className="h-20 rounded-lg bg-muted animate-pulse" />
                  ))}
                  {originalCarriers.length === 0 && <div className="h-20 rounded-lg bg-muted animate-pulse" />}
                  {tardando && (
                    <p className="text-caption text-muted-foreground">
                      {t('inmobiliaria.ai.cotizador.askWhy.tardando')}
                    </p>
                  )}
                </div>
              )}
              {!isLoading && !result && !error && (
                <p className="text-caption text-muted-foreground">
                  {t('inmobiliaria.ai.cotizador.askWhy.noResultPlaceholder')}
                </p>
              )}
              {result?.hypothetical_carriers.map((c, i) => (
                <div key={`h-${c.carrier}-${i}`} data-testid="carrier-card-hypothetical">
                  <CarrierCard carrier={c} />
                </div>
              ))}
              </CrossFade>
            </div>
          </section>

          {/* Narrative pane */}
          <section>
            <CrossFade
              mode="popLayout"
              swapKey={isLoading ? 'cargando' : result ? 'narrativa' : 'nada'}
            >
            {isLoading && (
              <div className="space-y-2" data-testid="narrative-skeleton">
                <div className="h-4 w-full rounded bg-muted animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            )}
            {result && !isLoading && (
              <p
                data-testid="cf-narrative"
                className="text-sm text-foreground leading-relaxed"
              >
                {result.narrative_es}
              </p>
            )}
            {result && !isLoading && result.modo === 'recotizar' && props.onRecotizarConElCambio && (
              <Button size="sm" variant="outline" onClick={recotizarConElCambio} className="mt-3" data-testid="cf-recotizar">
                {t('inmobiliaria.ai.cotizador.askWhy.recotizar') === 'inmobiliaria.ai.cotizador.askWhy.recotizar'
                  ? 'Re-cotizar con este cambio'
                  : t('inmobiliaria.ai.cotizador.askWhy.recotizar')}
              </Button>
            )}
            </CrossFade>

            {/* Error UX (D-33-13) */}
            {error && error.code === 'timeout' && (
              <div className="mt-2 space-y-2">
                <p role="alert" className="text-sm text-danger">
                  {/* La frase del hook, ya en español y por el traductor (02-10-2026). */}
                  {error.mensaje || t('inmobiliaria.ai.cotizador.askWhy.errorGeneric')}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="cf-retry"
                  aria-label={t('inmobiliaria.ai.cotizador.askWhy.retryButton')}
                  onClick={() => { void handleSubmit() }}
                >
                  {t('inmobiliaria.ai.cotizador.askWhy.retryButton')}
                </Button>
              </div>
            )}
            {error && (error.code === 500 || error.code === 'network') && (
              <div className="mt-2 space-y-2">
                <p role="alert" className="text-sm text-danger">
                  {/* 5xx: «de nuestro lado» + referencia; la red: la conexión. */}
                  {error.mensaje || t('inmobiliaria.ai.cotizador.askWhy.errorGeneric')}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="cf-retry"
                  aria-label={t('inmobiliaria.ai.cotizador.askWhy.retryButton')}
                  onClick={() => { void handleSubmit() }}
                >
                  {t('inmobiliaria.ai.cotizador.askWhy.retryButton')}
                </Button>
              </div>
            )}
            {error && error.code === 400 && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {/* Lo que el micro dijo que está mal, en español; nunca su `error` en inglés. */}
                {error.mensaje || t('inmobiliaria.ai.cotizador.askWhy.error400Prefix') + error.message}
              </p>
            )}
          </section>

          {/* Footer + Submit */}
          <footer className="space-y-2 border-t border-border pt-3">
            <p data-testid="cf-footer" className="text-caption text-muted-foreground">
              {footerText}
            </p>
            <div
              title={
                capExhausted
                  ? t('inmobiliaria.ai.cotizador.askWhy.capExhausted.tooltip')
                  : undefined
              }
            >
              {/* El botón de la casa (antes uno pintado a mano); sigue con
                  `aria-disabled` y no `disabled` para que el `title` del tope
                  se vea al pasar el mouse. */}
              <Button
                type="button"
                data-testid="cf-submit"
                aria-disabled={!canSubmit ? 'true' : 'false'}
                tabIndex={!canSubmit ? -1 : 0}
                onClick={() => {
                  if (!canSubmit) return
                  void handleSubmit()
                }}
                className={!canSubmit ? 'w-full cursor-not-allowed opacity-50' : 'w-full'}
              >
                {t('inmobiliaria.ai.cotizador.askWhy.submitButton')}
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}
