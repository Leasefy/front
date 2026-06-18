'use client'
// Asegurabilidad Tier-B — visión #6 (config de la consulta)
// New wizard step BEFORE review: carrier selection mode + priority + run mode.
// Pure UI state — value is owned by the parent and supplied via props/onChange.
// Backend tolerantly ignores unknown POST fields (carriers[]/priority/mode).

import { CheckSquare, Square, SpinnerGap } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/ui'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { useCarrierRegistry } from '@/lib/hooks/cotizador/use-carrier-registry'

// ── Public value shape (parent owns it) ──────────────────────────────────────
export type CarrierMode = 'todas' | 'favoritas' | 'recomendar'
export type QuotePriority = 'rapidez' | 'costo' | 'cobertura' | 'probabilidad'
export type RunMode = 'automatico' | 'revision'

export interface WizardConfigValue {
  carrierMode: CarrierMode
  /** Selected carrier names — only meaningful when carrierMode === 'favoritas'. */
  selectedCarriers: string[]
  priority: QuotePriority
  runMode: RunMode
}

export const EMPTY_WIZARD_CONFIG: WizardConfigValue = {
  carrierMode: 'recomendar',
  selectedCarriers: [],
  priority: 'probabilidad',
  runMode: 'automatico',
}

interface WizardStep3ConfigProps {
  value: WizardConfigValue
  onChange: (value: WizardConfigValue) => void
  onNext: () => void
  onBack: () => void
}

const CARRIER_MODES: { code: CarrierMode; descKey: string }[] = [
  { code: 'todas', descKey: 'todasDesc' },
  { code: 'favoritas', descKey: 'favoritasDesc' },
  { code: 'recomendar', descKey: 'recomendarDesc' },
]

const PRIORITIES: QuotePriority[] = ['rapidez', 'costo', 'cobertura', 'probabilidad']
const RUN_MODES: { code: RunMode; descKey: string }[] = [
  { code: 'automatico', descKey: 'automaticoDesc' },
  { code: 'revision', descKey: 'revisionDesc' },
]

export function WizardStep3Config({ value, onChange, onNext, onBack }: WizardStep3ConfigProps) {
  const { t } = useI18n()
  // t()-with-fallback: missing keys never render raw.
  const tf = (k: string, fb: string) => {
    const r = t(k)
    return r === k ? fb : r
  }
  const K = 'inmobiliaria.ai.cotizador.nueva.config'

  const registry = useCarrierRegistry()
  // Build the favoritas selectable list from the global registry (enabled carriers).
  const carrierOptions = (registry.data?.global ?? [])
    .filter(c => c.enabled)
    .map(c => c.name)

  const isFavoritas = value.carrierMode === 'favoritas'
  // Block proceeding only if "favoritas" is chosen but nothing is selected.
  const canProceed = !isFavoritas || value.selectedCarriers.length > 0

  function setCarrierMode(mode: CarrierMode) {
    onChange({ ...value, carrierMode: mode })
  }

  function toggleCarrier(name: string) {
    const next = value.selectedCarriers.includes(name)
      ? value.selectedCarriers.filter(n => n !== name)
      : [...value.selectedCarriers, name]
    onChange({ ...value, selectedCarriers: next })
  }

  function setPriority(p: QuotePriority) {
    onChange({ ...value, priority: p })
  }

  function setRunMode(m: RunMode) {
    onChange({ ...value, runMode: m })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-foreground">
        {tf(`${K}.titulo`, 'Configura la consulta')}
      </h2>

      {/* ── Aseguradoras ──────────────────────────────────────────────────── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {tf(`${K}.aseguradoras.titulo`, '¿A qué aseguradoras consultamos?')}
        </legend>
        <div className="space-y-2">
          {CARRIER_MODES.map(({ code, descKey }) => {
            const isActive = value.carrierMode === code
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setCarrierMode(code)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <span className="block text-sm font-medium text-foreground">
                  {tf(`${K}.aseguradoras.${code}`, code)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {tf(`${K}.aseguradoras.${descKey}`, '')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Multi-select carrier list — only when "favoritas" is chosen */}
        {isFavoritas && (
          <div className="mt-2 rounded-xl border border-border bg-card p-3">
            {registry.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <SpinnerGap size={16} weight="fill" className="animate-spin" aria-hidden />
                {tf(`${K}.aseguradoras.cargando`, 'Cargando aseguradoras…')}
              </p>
            ) : carrierOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tf(`${K}.aseguradoras.sinAseguradoras`, 'No hay aseguradoras disponibles. Usaremos las que Leasefy recomiende.')}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {carrierOptions.map(name => {
                  const checked = value.selectedCarriers.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleCarrier(name)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        checked
                          ? 'border-primary/40 bg-primary/5 text-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare size={18} weight="duotone" className="shrink-0 text-primary" aria-hidden />
                      ) : (
                        <Square size={18} weight="duotone" className="shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="truncate">{name}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {isFavoritas && carrierOptions.length > 0 && value.selectedCarriers.length === 0 && (
              <p className="mt-2 text-xs text-warning">
                {tf(`${K}.aseguradoras.seleccionaUna`, 'Selecciona al menos una aseguradora.')}
              </p>
            )}
          </div>
        )}
      </fieldset>

      {/* ── Prioridad ─────────────────────────────────────────────────────── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {tf(`${K}.prioridad.titulo`, '¿Qué priorizamos?')}
        </legend>
        {/* Selector excluyente (UI-DS-CONTRACT §3) */}
        <SegmentedControl<QuotePriority>
          fullWidth
          aria-label={tf(`${K}.prioridad.titulo`, '¿Qué priorizamos?')}
          value={value.priority}
          onChange={setPriority}
          options={PRIORITIES.map(p => ({
            value: p,
            label: tf(`${K}.prioridad.${p}`, p),
          }))}
        />
      </fieldset>

      {/* ── Modo ──────────────────────────────────────────────────────────── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {tf(`${K}.modo.titulo`, 'Modo de ejecución')}
        </legend>
        <div className="space-y-2">
          {RUN_MODES.map(({ code, descKey }) => {
            const isActive = value.runMode === code
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setRunMode(code)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <span className="block text-sm font-medium text-foreground">
                  {tf(`${K}.modo.${code}`, code)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {tf(`${K}.modo.${descKey}`, '')}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          {tf('inmobiliaria.ai.cotizador.nueva.actions.atras', 'Atrás')}
        </Button>
        <Button disabled={!canProceed} onClick={onNext} className="flex-1" size="lg">
          {tf('inmobiliaria.ai.cotizador.nueva.actions.siguiente', 'Siguiente')}
        </Button>
      </div>
    </div>
  )
}
