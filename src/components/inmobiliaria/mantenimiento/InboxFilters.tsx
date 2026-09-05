'use client'

/**
 * InboxFilters.tsx — Phase 7 plan 07-03 (DASH-02)
 *
 * Controlled, stateless filter panel for the prioritized inbox. Owns NO state:
 * `value` in, `onChange(next)` out (parent holds the InboxFilters). Renders all 14
 * filter groups required by DASH-02:
 *   multi-select chips: severidad · categoría · estado · responsable
 *   tri-state select:   SLA (vencido/no-vencido/todos → slaBreached boolean|undefined)
 *                       aprobación (requiere/no-requiere/todos)
 *   toggle chips:       fotos · reabierto · retención
 *   text inputs:        proveedor · propietario · inmueble · zona
 *   number inputs:      costo (min / max)
 *
 * All labels via i18n keys declared by 07-02 (canonical C7-03 tree). Enum options
 * are derived from the domain `as const` tuples (07-01) and labeled via t(...).
 */

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SEVERITIES,
  CATEGORIES,
  MAINTENANCE_STATES,
} from '@/lib/types/mantenimiento'
import type {
  InboxFilters as InboxFiltersType,
  Severity,
  Category,
  MaintenanceTicketState,
  ProbableResponsible,
} from '@/lib/types/mantenimiento'
import { EMPTY_FILTERS } from './inbox-filter'

const RESPONSABLES: readonly ProbableResponsible[] = [
  'propietario',
  'inquilino',
  'copropiedad',
  'constructor',
  'proveedor_anterior',
  'aseguradora',
  'no_determinado',
] as const

interface InboxFiltersProps {
  value: InboxFiltersType
  onChange: (next: InboxFiltersType) => void
}

function chipClasses(active: boolean): string {
  return active
    ? 'bg-primary text-primary-fg border-primary'
    : 'bg-surface text-fg-muted border-border hover:border-primary'
}

function toggleInArray<T>(arr: T[] | undefined, item: T): T[] {
  const current = arr ?? []
  return current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
}

/** El rail de filtros es denso: se conserva la altura compacta sobre el skin del DS. */
// `md:text-xs` es necesario: el adapter trae `text-base md:text-sm` y sin el breakpoint
// propio tailwind-merge deja ganar al `md:` del adapter de 768px para arriba.
const INPUT_CLASSES = 'h-9 px-3 text-xs md:text-xs'

export function InboxFilters({ value, onChange }: InboxFiltersProps) {
  const { t } = useI18n()
  const set = (patch: Partial<InboxFiltersType>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-5" data-testid="inbox-filters">
      <h2 className="text-sm font-semibold text-fg">
        {t('inmobiliaria.ai.mantenimiento.filters.title')}
      </h2>

      {/* Severidad */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.mantenimiento.filters.severidad')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((s: Severity) => (
            <button
              key={s}
              type="button"
              aria-pressed={value.severidad?.includes(s) ?? false}
              onClick={() => set({ severidad: toggleInArray(value.severidad, s) })}
              className={
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                chipClasses(value.severidad?.includes(s) ?? false)
              }
            >
              {t(`inmobiliaria.ai.mantenimiento.enums.severidad.${s}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Categoría */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.mantenimiento.filters.categoria')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c: Category) => (
            <button
              key={c}
              type="button"
              aria-pressed={value.categoria?.includes(c) ?? false}
              onClick={() => set({ categoria: toggleInArray(value.categoria, c) })}
              className={
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                chipClasses(value.categoria?.includes(c) ?? false)
              }
            >
              {t(`inmobiliaria.ai.mantenimiento.enums.categoria.${c}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Estado */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.mantenimiento.filters.estado')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {MAINTENANCE_STATES.map((e: MaintenanceTicketState) => (
            <button
              key={e}
              type="button"
              aria-pressed={value.estado?.includes(e) ?? false}
              onClick={() => set({ estado: toggleInArray(value.estado, e) })}
              className={
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                chipClasses(value.estado?.includes(e) ?? false)
              }
            >
              {t(`inmobiliaria.ai.mantenimiento.enums.estado.${e}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Responsable */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.mantenimiento.filters.responsable')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {RESPONSABLES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={value.responsable?.includes(r) ?? false}
              onClick={() => set({ responsable: toggleInArray(value.responsable, r) })}
              className={
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                chipClasses(value.responsable?.includes(r) ?? false)
              }
            >
              {t(`inmobiliaria.ai.mantenimiento.enums.responsable.${r}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* SLA + Aprobación — toggle chips (C7-03 declares no per-option labels;
          modeled as boolean toggles over the boolean InboxFilters fields). */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.mantenimiento.filters.sla')} ·{' '}
          {t('inmobiliaria.ai.mantenimiento.filters.aprobacion')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {/* SLA vencido → slaBreached:true ↔ undefined */}
          <button
            type="button"
            aria-pressed={value.slaBreached === true}
            onClick={() => set({ slaBreached: value.slaBreached === true ? undefined : true })}
            className={
              'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
              chipClasses(value.slaBreached === true)
            }
          >
            {t('inmobiliaria.ai.mantenimiento.filters.sla')}
          </button>
          {/* Requiere aprobación → requiereAprobacion:true ↔ undefined */}
          <button
            type="button"
            aria-pressed={value.requiereAprobacion === true}
            onClick={() =>
              set({ requiereAprobacion: value.requiereAprobacion === true ? undefined : true })
            }
            className={
              'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
              chipClasses(value.requiereAprobacion === true)
            }
          >
            {t('inmobiliaria.ai.mantenimiento.card.requiereAprobacion')}
          </button>
        </div>
      </fieldset>

      {/* Toggle flags: fotos · reabierto · retención */}
      <fieldset>
        <legend className="sr-only">
          {t('inmobiliaria.ai.mantenimiento.filters.fotos')}
        </legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={value.hasPhotos === true}
            onClick={() => set({ hasPhotos: value.hasPhotos === true ? undefined : true })}
            className={
              'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
              chipClasses(value.hasPhotos === true)
            }
          >
            {t('inmobiliaria.ai.mantenimiento.filters.fotos')}
          </button>
          <button
            type="button"
            aria-pressed={value.reabierto === true}
            onClick={() => set({ reabierto: value.reabierto === true ? undefined : true })}
            className={
              'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
              chipClasses(value.reabierto === true)
            }
          >
            {t('inmobiliaria.ai.mantenimiento.filters.reabierto')}
          </button>
          <button
            type="button"
            aria-pressed={value.retencionRiesgo === true}
            onClick={() => set({ retencionRiesgo: value.retencionRiesgo === true ? undefined : true })}
            className={
              'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
              chipClasses(value.retencionRiesgo === true)
            }
          >
            {t('inmobiliaria.ai.mantenimiento.filters.retencion')}
          </button>
        </div>
      </fieldset>

      {/* Text filters: proveedor · propietario · inmueble · zona */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-fg-muted mb-1">
          {t('inmobiliaria.ai.mantenimiento.filters.proveedor')}
        </legend>
        <Input
          type="text"
          aria-label={t('inmobiliaria.ai.mantenimiento.filters.proveedor')}
          placeholder={t('inmobiliaria.ai.mantenimiento.filters.proveedor')}
          className={INPUT_CLASSES}
          value={value.proveedor ?? ''}
          onChange={(e) => set({ proveedor: e.target.value || undefined })}
        />
        <Input
          type="text"
          aria-label={t('inmobiliaria.ai.mantenimiento.filters.propietario')}
          placeholder={t('inmobiliaria.ai.mantenimiento.filters.propietario')}
          className={INPUT_CLASSES}
          value={value.propietario ?? ''}
          onChange={(e) => set({ propietario: e.target.value || undefined })}
        />
        <Input
          type="text"
          aria-label={t('inmobiliaria.ai.mantenimiento.filters.inmueble')}
          placeholder={t('inmobiliaria.ai.mantenimiento.filters.inmueble')}
          className={INPUT_CLASSES}
          value={value.inmueble ?? ''}
          onChange={(e) => set({ inmueble: e.target.value || undefined })}
        />
        <Input
          type="text"
          aria-label={t('inmobiliaria.ai.mantenimiento.filters.zona')}
          placeholder={t('inmobiliaria.ai.mantenimiento.filters.zona')}
          className={INPUT_CLASSES}
          value={value.zona ?? ''}
          onChange={(e) => set({ zona: e.target.value || undefined })}
        />
      </fieldset>

      {/* Costo range: min / max */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.mantenimiento.filters.costo')}
        </legend>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            aria-label={`${t('inmobiliaria.ai.mantenimiento.filters.costo')} min`}
            placeholder="min"
            className={INPUT_CLASSES}
            value={value.costoMinCop ?? ''}
            onChange={(e) =>
              set({ costoMinCop: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
          <Input
            type="number"
            min={0}
            aria-label={`${t('inmobiliaria.ai.mantenimiento.filters.costo')} max`}
            placeholder="max"
            className={INPUT_CLASSES}
            value={value.costoMaxCop ?? ''}
            onChange={(e) =>
              set({ costoMaxCop: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </div>
      </fieldset>

      {/* Clear */}
      <Button
        type="button"
        variant="link"
        onClick={() => onChange(EMPTY_FILTERS)}
        className="h-auto p-0 text-xs font-medium text-primary"
      >
        {t('inmobiliaria.ai.mantenimiento.filters.limpiar')}
      </Button>
    </div>
  )
}
