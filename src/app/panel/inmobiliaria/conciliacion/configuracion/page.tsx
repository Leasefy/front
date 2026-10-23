'use client'

/**
 * /ai/conciliacion/configuracion — autonomy posture + AUTO-MATCH policy.
 *
 * Two blocks:
 *   1. <AutonomiaPanel> — read-only autonomy posture (mode pills + valla + T-323).
 *   2. Auto-match policy editor — per-domain (recaudo/dispersión/AP/comisión)
 *      <Switch>es + optional confidence thresholds, wired to:
 *        GET  /conciliacion/policy  (active policy, or safe all-false default)
 *        POST /conciliacion/policy  (creates a NEW version — INSERT-only)
 *
 * FAIL-SOFT: backend not deployed → GET fails → safe default (all-false) +
 * "requiere backend" notice; the screen NEVER breaks.
 *
 * T-323: enabling auto-match is an explicit HUMAN decision — toggling a switch
 * does NOT persist; the operator must click "Guardar política" and confirm in a
 * dialog, which is the policy decision that authorizes automated money movement.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { FloppyDisk } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { ROLES_QUE_CONCILIAN } from '@/lib/nav/el-auxiliar-de-cartera-no-ve-los-bancos'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import {
  useConciliacionPolicy,
  CONCILIACION_DOMAINS,
  DEFAULT_AUTO_MATCH_ENABLED,
  type ConciliacionDomain,
  type AutoMatchEnabled,
  type ConfidenceThresholds,
} from '@/lib/hooks/conciliacion/use-conciliacion-policy'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { useI18n } from '@/lib/i18n'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogSection,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

// ── Per-domain copy (string literal ES — sin keys t() nuevas) ──────────────

const DOMAIN_META: Record<
  ConciliacionDomain,
  { title: string; description: string }
> = {
  recaudo: {
    title: 'Recaudo de cánones',
    description: 'Conciliar automáticamente los pagos de arriendo de inquilinos contra las facturas.',
  },
  dispersion: {
    title: 'Giros a propietarios',
    description: 'Conciliar automáticamente los giros de canon enviados a los propietarios.',
  },
  ap: {
    title: 'Cuentas por pagar',
    description: 'Conciliar automáticamente los pagos a proveedores y servicios.',
  },
  comision: {
    title: 'Comisiones',
    description: 'Conciliar automáticamente las comisiones de administración de la inmobiliaria.',
  },
}

// ── Auto-match policy block ─────────────────────────────────────────────────

function PoliticaAutoMatch() {
  const { data, isLoading, error, refetch, savePolicy } = useConciliacionPolicy()

  // Local draft (the switches mutate this; persistence is the explicit save).
  const [draftEnabled, setDraftEnabled] = useState<AutoMatchEnabled>(DEFAULT_AUTO_MATCH_ENABLED)
  const [draftThresholds, setDraftThresholds] = useState<ConfidenceThresholds>({})

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  /** Lo que el micro dijo de un umbral (un 400 con `campos`): va debajo de SU campo. */
  const [erroresDelUmbral, setErroresDelUmbral] = useState<Partial<Record<ConciliacionDomain, string>>>({})
  const [savedOk, setSavedOk] = useState(false)

  // Hydrate the draft from the active policy whenever it (re)loads.
  useEffect(() => {
    setDraftEnabled(data.policy_json.autoMatchEnabled)
    setDraftThresholds(data.policy_json.confidenceThresholds ?? {})
  }, [data])

  const savedSnapshot = useMemo(
    () =>
      JSON.stringify({
        autoMatchEnabled: data.policy_json.autoMatchEnabled,
        confidenceThresholds: data.policy_json.confidenceThresholds ?? {},
      }),
    [data],
  )
  const draftSnapshot = JSON.stringify({
    autoMatchEnabled: draftEnabled,
    confidenceThresholds: draftThresholds,
  })
  const isDirty = savedSnapshot !== draftSnapshot

  const anyEnabled = CONCILIACION_DOMAINS.some((d) => draftEnabled[d])
  // Backend rejects an unconfigured/absent table → POST cannot persist.
  const backendUnavailable = error !== null

  const toggleDomain = useCallback((domain: ConciliacionDomain, checked: boolean) => {
    setSavedOk(false)
    setDraftEnabled((prev) => ({ ...prev, [domain]: checked }))
  }, [])

  const updateThreshold = useCallback((domain: ConciliacionDomain, raw: string) => {
    setSavedOk(false)
    setErroresDelUmbral((e) => (e[domain] ? { ...e, [domain]: undefined } : e))
    setDraftThresholds((prev) => {
      const next = { ...prev }
      if (raw.trim() === '') {
        delete next[domain]
        return next
      }
      // Operator types a percentage (0–100); the API stores a 0–1 confidence.
      const pct = Number(raw)
      if (Number.isNaN(pct)) return prev
      const clamped = Math.min(100, Math.max(0, pct))
      next[domain] = clamped / 100
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveError(null)
    setErroresDelUmbral({})
    const res = await savePolicy({
      policyJson: {
        autoMatchEnabled: draftEnabled,
        confidenceThresholds: draftThresholds,
      },
    })
    setIsSaving(false)
    if (res.ok) {
      setConfirmOpen(false)
      setSavedOk(true)
    } else if (res.error === 'not_configured' || backendUnavailable) {
      setSaveError('No se pudo guardar: la conciliación automática todavía no está disponible en tu cuenta.')
    } else {
      // Con la regla de oro: el umbral que el micro rechazó va a SU campo
      // (`policy_json.confidenceThresholds.<dominio>`); el resto, dicho para
      // la persona, al pie. Antes: «No se pudo guardar la política (403).»
      const reparto = repartirErroresDelServidor<ConciliacionDomain>(res.fallo, {
        // Por la ruta completa: `autoMatchEnabled.recaudo` también termina en
        // `recaudo` y no es el umbral.
        mapa: Object.fromEntries(
          CONCILIACION_DOMAINS.map((d) => [`policy_json.confidenceThresholds.${d}`, d]),
        ),
        campos: [],
        porDefecto: 'No se pudo guardar la política.',
        accion: 'guardar la política',
      })
      setErroresDelUmbral(reparto.porCampo)
      if (reparto.orden.length > 0) {
        // El umbral está debajo del diálogo: se cierra para que se vea.
        setConfirmOpen(false)
        document.getElementById(`umbral-${reparto.orden[0]}`)?.focus()
      }
      if (reparto.sueltos.length > 0) setSaveError(reparto.sueltos.join(' · '))
    }
  }, [savePolicy, draftEnabled, draftThresholds, backendUnavailable])

  // Threshold input value: stored 0–1 → display 0–100.
  const thresholdDisplay = (domain: ConciliacionDomain): string => {
    const v = draftThresholds[domain]
    return v === undefined ? '' : String(Math.round(v * 100))
  }

  // FAIL-SOFT: con la consulta caída, UN estado (el fallo con su reintento), no el
  // editor entero apagado con un aviso ámbar encima (revisora r25, Configuración #1).
  if (!isLoading && backendUnavailable) {
    return (
      <section
        className="space-y-3 rounded-lg border border-border bg-surface p-5"
        aria-labelledby="seccion-automatch"
        data-testid="conciliacion-automatch"
      >
        <h2 id="seccion-automatch" className="text-subtitle text-fg">
          Conciliación automática, por tipo de movimiento
        </h2>
        <div data-testid="conciliacion-automatch-backend-warning">
          <FalloDeCarga error={error} queEs="la conciliación automática" onReintentar={refetch} />
        </div>
      </section>
    )
  }

  return (
    <section
      className="rounded-lg border border-border bg-surface p-5 space-y-5"
      aria-labelledby="seccion-automatch"
      data-testid="conciliacion-automatch"
    >
      {/* Header */}
      <div className="space-y-1">
        <h2 id="seccion-automatch" className="text-subtitle text-fg">
          Conciliación automática, por tipo de movimiento
        </h2>
        {/* Revisora r25 (Configuración #2): una sola explicación. Antes eran tres
            párrafos (éste, el aviso ámbar y el del pie) que decían lo mismo. */}
        <p className="max-w-2xl text-body-sm text-fg-muted">
          Con un tipo apagado, Leasefy sólo sugiere y cada cruce pasa por la cola de revisión.
          Prenderlo autoriza a conciliar esos movimientos de plata sin que nadie los revise: nada
          cambia hasta que guardes y confirmes.
        </p>
      </div>

      {/* Estado / contexto */}
      {isLoading ? (
        <div className="h-12 rounded-lg border border-border bg-surface-muted animate-pulse" />
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
          {data.source === 'stored' && data.version_number > 0 ? (
            <>
              <Badge variant="secondary">Versión activa v{data.version_number}</Badge>
              {data.created_by && <span>Última edición: {data.created_by}</span>}
              {data.created_at && (
                <span className="tabular-nums">
                  {new Date(data.created_at).toLocaleString('es-CO')}
                </span>
              )}
            </>
          ) : (
            <Badge variant="warning">Sin reglas guardadas: todo sólo sugiere</Badge>
          )}
        </div>
      )}

      {/* Switches por dominio */}
      <div className="divide-y divide-border" data-testid="conciliacion-automatch-domains">
        {CONCILIACION_DOMAINS.map((domain) => {
          const meta = DOMAIN_META[domain]
          const on = draftEnabled[domain]
          return (
            <div
              key={domain}
              className="py-4 first:pt-0 last:pb-0 space-y-3"
              data-testid={`conciliacion-automatch-${domain}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                  <Label
                    htmlFor={`automatch-${domain}`}
                    className="text-sm font-medium text-fg cursor-pointer"
                  >
                    {meta.title}
                  </Label>
                  <p className="text-caption text-fg-muted">{meta.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="min-w-[5.5rem] text-right text-caption text-fg-muted">
                    {on ? 'Automático' : 'Sólo sugiere'}
                  </span>
                  <Switch
                    id={`automatch-${domain}`}
                    checked={on}
                    onCheckedChange={(checked) => toggleDomain(domain, checked)}
                    aria-label={`Conciliar solos los movimientos de ${meta.title}`}
                  />
                </div>
              </div>

              {/* Umbral de confianza (opcional) — solo relevante con auto-match ON */}
              <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-0">
                <Label
                  htmlFor={`umbral-${domain}`}
                  className="text-caption text-fg-muted"
                >
                  Confianza mínima (%)
                </Label>
                <Input
                  id={`umbral-${domain}`}
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  placeholder="—"
                  disabled={!on}
                  className="h-9 w-24"
                  value={thresholdDisplay(domain)}
                  onChange={(e) => updateThreshold(domain, e.target.value)}
                  aria-label={`Umbral de confianza mínimo para ${meta.title}`}
                  {...(erroresDelUmbral[domain]
                    ? { 'aria-invalid': true as const, 'aria-describedby': `umbral-${domain}-error` }
                    : {})}
                />
                <span className="text-caption text-fg-muted">opcional</span>
              </div>
              <ErrorDelCampo id={`umbral-${domain}-error`} mensaje={erroresDelUmbral[domain]} className="mt-0" />
              </div>
            </div>
          )
        })}
      </div>

      {/* T-323: prender la conciliación automática es una decisión humana explícita.
          La explicación vive arriba (una sola vez) y la confirmación, en el diálogo. */}

      {/* Confirmación de guardado */}
      {savedOk && !isDirty && (
        <p className="text-caption text-success" role="status" data-testid="conciliacion-automatch-saved">
          Política guardada. Se creó una nueva versión activa.
        </p>
      )}
      {saveError && (
        <p className="text-caption text-danger" role="alert">
          {saveError}
        </p>
      )}

      {/* CTA principal — guardar (abre confirmación) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-caption text-warning">
          {isDirty ? 'Tienes cambios sin guardar.' : ''}
        </span>
        <Button
          hideArrow
          disabled={!isDirty || isSaving || backendUnavailable}
          onClick={() => {
            setSaveError(null)
            setConfirmOpen(true)
          }}
          data-testid="conciliacion-automatch-save"
        >
          <FloppyDisk className="h-4 w-4 mr-1.5" />
          Guardar política
        </Button>
      </div>

      {/* Diálogo de confirmación (T-323 — decisión humana explícita) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        {/* Advertencia si autoriza conciliar sin revisión humana; si deja todo
            en sugerencia no hay riesgo: es una confirmación. */}
        <AlertDialogContent
          variant={anyEnabled ? 'warning' : 'confirm'}
          icon={anyEnabled ? undefined : <FloppyDisk weight="bold" />}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar la conciliación automática</AlertDialogTitle>
            <AlertDialogDescription>
              {anyEnabled
                ? 'Vas a autorizar a Leasefy a conciliar solos, sin que nadie los revise, estos tipos de movimiento:'
                : 'Vas a dejar todos los tipos de movimiento en «sólo sugiere»: Leasefy seguirá proponiendo cruces, pero no confirmará ninguno solo.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {anyEnabled && (
            <AlertDialogSection>
              <ul className="list-disc pl-5 space-y-0.5 text-sm text-fg">
                {CONCILIACION_DOMAINS.filter((d) => draftEnabled[d]).map((d) => (
                  <li key={d}>
                    {DOMAIN_META[d].title}
                    {draftThresholds[d] !== undefined && (
                      <span className="text-fg-muted">
                        {' '}
                        (umbral{' '}
                        <span className="font-mono tabular-nums">
                          {Math.round((draftThresholds[d] as number) * 100)}%
                        </span>
                        )
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </AlertDialogSection>
          )}
          <p className="text-caption text-fg-muted">
            Se creará una nueva versión de la política. Las versiones anteriores se conservan.
          </p>
          {saveError && <p className="text-sm text-danger">{saveError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open while saving; close on success in handleSave.
                e.preventDefault()
                void handleSave()
              }}
              loading={isSaving}
            >
              Confirmar y guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

function ConciliacionConfiguracion() {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useAgentAutonomia('conciliacion')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <EncabezadoDePantalla
        seccion="Agentes IA" // Ronda 30: el mismo sobretítulo que la raíz de Conciliación (antes uno distinto)
        titulo={t('inmobiliaria.ai.workspace.pages.comun.configTitle')}
        descripcion={t('inmobiliaria.ai.workspace.pages.comun.configDesc')}
      />

      <AutonomiaPanel data={data} isLoading={isLoading} error={error} onReintentar={refetch} />

      {/* Revisora r25 (Configuración #1): con el asistente caído, UN estado —el
          fallo con su reintento—, no el fallo arriba y el editor entero debajo
          con un segundo aviso. */}
      {error ? null : <PoliticaAutoMatch />}
    </div>
  )
}

export default function ConciliacionConfiguracionPage() {
  return (
    <PageGuard roles={[...ROLES_QUE_CONCILIAN]}>
      <ConciliacionConfiguracion />
    </PageGuard>
  )
}
