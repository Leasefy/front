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
import { FloppyDisk, Warning } from '@phosphor-icons/react'

import { Spinner } from '@/components/ui'
import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
    title: 'Dispersión a propietarios',
    description: 'Conciliar automáticamente los giros de canon enviados a los propietarios.',
  },
  ap: {
    title: 'Cuentas por pagar (AP)',
    description: 'Conciliar automáticamente los pagos a proveedores y servicios.',
  },
  comision: {
    title: 'Comisiones',
    description: 'Conciliar automáticamente las comisiones de administración de la inmobiliaria.',
  },
}

// ── Auto-match policy block ─────────────────────────────────────────────────

function PoliticaAutoMatch() {
  const { data, isLoading, error, savePolicy } = useConciliacionPolicy()

  // Local draft (the switches mutate this; persistence is the explicit save).
  const [draftEnabled, setDraftEnabled] = useState<AutoMatchEnabled>(DEFAULT_AUTO_MATCH_ENABLED)
  const [draftThresholds, setDraftThresholds] = useState<ConfidenceThresholds>({})

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
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
    } else {
      setSaveError(
        res.error === 'not_configured' || backendUnavailable
          ? 'No se pudo guardar: esta función requiere el backend de conciliación desplegado.'
          : `No se pudo guardar la política${res.error ? ` (${res.error})` : ''}.`,
      )
    }
  }, [savePolicy, draftEnabled, draftThresholds, backendUnavailable])

  // Threshold input value: stored 0–1 → display 0–100.
  const thresholdDisplay = (domain: ConciliacionDomain): string => {
    const v = draftThresholds[domain]
    return v === undefined ? '' : String(Math.round(v * 100))
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-5 space-y-5"
      aria-labelledby="seccion-automatch"
      data-testid="conciliacion-automatch"
    >
      {/* Header */}
      <div className="space-y-1">
        <h2 id="seccion-automatch" className="text-base font-semibold text-fg">
          Auto-match por dominio
        </h2>
        <p className="text-sm text-fg-muted max-w-2xl">
          Activá la conciliación automática solo donde quieras que el sistema confirme coincidencias
          sin intervención humana. Mientras un dominio esté apagado, el sistema solo SUGIERE
          (modo sombra) y toda coincidencia pasa por la cola de revisión.
        </p>
      </div>

      {/* Estado / contexto */}
      {isLoading ? (
        <div className="h-12 rounded-lg border border-border bg-surface-muted animate-pulse" />
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
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
            <Badge variant="warning">Sin política activa — modo sugerencia (sombra)</Badge>
          )}
        </div>
      )}

      {/* Aviso fail-soft: backend no disponible */}
      {backendUnavailable && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft text-warning p-3 flex items-start gap-2"
          role="status"
          data-testid="conciliacion-automatch-backend-warning"
        >
          <Warning weight="fill" className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="text-xs">
            No se pudo leer la política de conciliación: esta función requiere el backend desplegado.
            Se muestra el estado seguro por defecto (todo apagado, modo sombra) y no es posible
            guardar cambios todavía.
          </p>
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
                  <p className="text-xs text-fg-muted">{meta.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-fg-muted w-14 text-right">
                    {on ? 'Automático' : 'Sugerencia'}
                  </span>
                  <Switch
                    id={`automatch-${domain}`}
                    checked={on}
                    onCheckedChange={(checked) => toggleDomain(domain, checked)}
                    aria-label={`Activar auto-match para ${meta.title}`}
                  />
                </div>
              </div>

              {/* Umbral de confianza (opcional) — solo relevante con auto-match ON */}
              <div className="flex items-center gap-2 pl-0">
                <Label
                  htmlFor={`umbral-${domain}`}
                  className="text-xs text-fg-muted"
                >
                  Umbral de confianza mínimo (%)
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
                />
                <span className="text-xs text-fg-muted">opcional</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* T-323 callout */}
      <div className="rounded-lg border border-warning/30 bg-warning-soft text-warning p-3">
        <p className="text-xs">
          Activar el auto-match es una decisión humana explícita: autoriza al sistema a confirmar
          movimientos de dinero sin revisión. Los cambios no se aplican hasta que hagas clic en
          &quot;Guardar política&quot; y confirmes.
        </p>
      </div>

      {/* Confirmación de guardado */}
      {savedOk && !isDirty && (
        <p className="text-xs text-success" role="status" data-testid="conciliacion-automatch-saved">
          Política guardada. Se creó una nueva versión activa.
        </p>
      )}
      {saveError && (
        <p className="text-xs text-danger" role="alert">
          {saveError}
        </p>
      )}

      {/* CTA principal — guardar (abre confirmación) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-warning">
          {isDirty ? 'Tenés cambios sin guardar.' : ''}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar política de auto-match</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {anyEnabled
                    ? 'Vas a autorizar al sistema a conciliar automáticamente (sin revisión humana) los siguientes dominios:'
                    : 'Vas a dejar TODOS los dominios en modo sugerencia (sombra). El sistema seguirá proponiendo coincidencias, pero ninguna se confirmará automáticamente.'}
                </p>
                {anyEnabled && (
                  <ul className="list-disc pl-5 space-y-0.5 text-fg">
                    {CONCILIACION_DOMAINS.filter((d) => draftEnabled[d]).map((d) => (
                      <li key={d}>
                        {DOMAIN_META[d].title}
                        {draftThresholds[d] !== undefined && (
                          <span className="text-fg-muted">
                            {' '}
                            (umbral {Math.round((draftThresholds[d] as number) * 100)}%)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-fg-muted">
                  Se creará una nueva versión de la política. Las versiones anteriores se conservan.
                </p>
                {saveError && (
                  <span className="block text-danger text-sm">{saveError}</span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open while saving; close on success in handleSave.
                e.preventDefault()
                void handleSave()
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <Spinner size="sm" variant="current" className="mr-1.5" />
              ) : (
                <FloppyDisk className="h-4 w-4 mr-1.5" />
              )}
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
  const { data, isLoading, error } = useAgentAutonomia('conciliacion')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{t('inmobiliaria.ai.workspace.pages.comun.configTitle')}</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.comun.configDesc')}
        </p>
      </header>

      <AutonomiaPanel data={data} isLoading={isLoading} error={error} />

      <PoliticaAutoMatch />
    </div>
  )
}

export default function ConciliacionConfiguracionPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionConfiguracion />
    </PageGuard>
  )
}
