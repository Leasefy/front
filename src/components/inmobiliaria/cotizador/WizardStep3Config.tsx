'use client'
// Asegurabilidad Tier-B — visión #6 (config de la consulta).
//
// 🔴 COTIZ-PASO-3 (QA de los agentes, 19-10-2026; Nico: «construirlo de
// verdad»). Este paso se mandaba y el micro lo ignoraba. Ahora cada opción hace
// lo que dice: «Sólo las que elijo» filtra a quién se consulta (`carriers`) y
// «¿Qué priorizamos?» decide cuál se recomienda (`priority`, `ordenarPorPrioridad`
// del micro). Se quitaron «Modo de ejecución» (el agente no avanza solo con una
// aseguradora) y «Que Leasefy recomiende» (no había un perfil detrás: era lo
// mismo que «Todas»).

import { CheckSquare, Square } from '@phosphor-icons/react'
import { RadioCardGroup, RadioCard, Chip, Presence } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui'
import { useCarrierRegistry } from '@/lib/hooks/cotizador/use-carrier-registry'
import { aseguradorasQueSePuedenElegir } from '@/lib/cotizador/aseguradoras-que-se-pueden-elegir'

// ── Public value shape (parent owns it) ──────────────────────────────────────
export type CarrierMode = 'todas' | 'favoritas'
export type QuotePriority = 'rapidez' | 'costo' | 'cobertura' | 'probabilidad'

export interface WizardConfigValue {
  carrierMode: CarrierMode
  /** Códigos de las aseguradoras elegidas — sólo cuentan con `carrierMode === 'favoritas'`. */
  selectedCarriers: string[]
  priority: QuotePriority
}

export const EMPTY_WIZARD_CONFIG: WizardConfigValue = {
  carrierMode: 'todas',
  selectedCarriers: [],
  priority: 'probabilidad',
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
]

export const PRIORIDADES: QuotePriority[] = ['probabilidad', 'costo', 'cobertura', 'rapidez']

export function WizardStep3Config({ value, onChange, onNext, onBack }: WizardStep3ConfigProps) {
  const { t } = useI18n()
  // t()-with-fallback: missing keys never render raw.
  const tf = (k: string, fb: string) => {
    const r = t(k)
    return r === k ? fb : r
  }
  const K = 'inmobiliaria.ai.cotizador.nueva.config'

  const registry = useCarrierRegistry()
  const opciones = aseguradorasQueSePuedenElegir(registry.data)

  const isFavoritas = value.carrierMode === 'favoritas'
  const faltaElegir = isFavoritas && value.selectedCarriers.length === 0

  function toggleCarrier(codigo: string) {
    const next = value.selectedCarriers.includes(codigo)
      ? value.selectedCarriers.filter(n => n !== codigo)
      : [...value.selectedCarriers, codigo]
    onChange({ ...value, selectedCarriers: next })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-fg">
        {tf(`${K}.titulo`, 'Configura la consulta')}
      </h2>

      {/* ── Aseguradoras ──────────────────────────────────────────────────── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-fg">
          {tf(`${K}.aseguradoras.titulo`, '¿A qué aseguradoras consultamos?')}
        </legend>
        <RadioCardGroup
          orientation="vertical"
          value={value.carrierMode}
          onValueChange={(v) => onChange({ ...value, carrierMode: v as CarrierMode })}
        >
          {CARRIER_MODES.map(({ code, descKey }) => (
            <RadioCard
              key={code}
              value={code}
              label={tf(`${K}.aseguradoras.${code}`, code)}
              description={tf(`${K}.aseguradoras.${descKey}`, '')}
            />
          ))}
        </RadioCardGroup>

        {/* La lista de las habilitadas — sólo con «Sólo las que elijo» */}
        <Presence show={isFavoritas} className="mt-2 rounded-lg border border-border bg-surface p-3">
          {registry.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Spinner size="sm" variant="current" className="shrink-0" aria-hidden />
              {tf(`${K}.aseguradoras.cargando`, 'Cargando aseguradoras…')}
            </p>
          ) : registry.error ? (
            /* Si la lista no cargó, la persona no está eligiendo nada: se dice. */
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-fg-muted">
                {tf(`${K}.aseguradoras.errorRegistro`, 'No pudimos traer la lista de aseguradoras.')}
              </p>
              <Button variant="outline" size="sm" hideArrow onClick={() => void registry.refetch()}>
                {tf(`${K}.aseguradoras.reintentar`, 'Intentar de nuevo')}
              </Button>
            </div>
          ) : opciones.length === 0 ? (
            <p className="text-sm text-fg-muted">
              {tf(
                `${K}.aseguradoras.sinAseguradoras`,
                'Tu inmobiliaria no tiene aseguradoras habilitadas. Habilítalas en la pestaña «Aseguradoras».',
              )}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" data-testid="cotizador-aseguradoras-para-elegir">
              {opciones.map(({ codigo, nombre }) => {
                const checked = value.selectedCarriers.includes(codigo)
                return (
                  <Chip
                    key={codigo}
                    selected={checked}
                    onClick={() => toggleCarrier(codigo)}
                    icon={checked
                      ? <CheckSquare size={18} weight="duotone" aria-hidden />
                      : <Square size={18} weight="duotone" aria-hidden />}
                    className="justify-start"
                  >
                    <span className="truncate">{nombre}</span>
                  </Chip>
                )
              })}
            </div>
          )}
          <Presence show={faltaElegir && opciones.length > 0}>
            <p className="mt-2 text-caption text-warning" id="cotizador-elige-una">
              {tf(`${K}.aseguradoras.seleccionaUna`, 'Marca al menos una aseguradora.')}
            </p>
          </Presence>
        </Presence>
      </fieldset>

      {/* ── Prioridad ─────────────────────────────────────────────────────── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-fg">
          {tf(`${K}.prioridad.titulo`, '¿Qué priorizamos?')}
        </legend>
        <p className="text-xs text-fg-muted">
          {tf(`${K}.prioridad.subtitulo`, 'Decide cuál te recomendamos entre las que respalden al candidato.')}
        </p>
        {/* Tarjetas con lo que hace cada una (antes: un control segmentado
            cuyas etiquetas se partían en dos líneas y no decían qué hacían). */}
        <RadioCardGroup
          orientation="vertical"
          value={value.priority}
          onValueChange={(v) => onChange({ ...value, priority: v as QuotePriority })}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {PRIORIDADES.map(p => (
            <RadioCard
              key={p}
              value={p}
              label={tf(`${K}.prioridad.${p}`, p)}
              description={tf(`${K}.prioridad.${p}Desc`, '')}
            />
          ))}
        </RadioCardGroup>
      </fieldset>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          {tf('inmobiliaria.ai.cotizador.nueva.actions.atras', 'Atrás')}
        </Button>
        <Button
          disabled={faltaElegir}
          aria-describedby={faltaElegir ? 'cotizador-elige-una' : undefined}
          onClick={onNext}
          className="flex-1"
          size="lg"
        >
          {tf('inmobiliaria.ai.cotizador.nueva.actions.siguiente', 'Siguiente')}
        </Button>
      </div>
    </div>
  )
}
