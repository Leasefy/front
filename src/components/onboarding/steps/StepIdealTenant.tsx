'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, CurrencyDollar, PawPrint, Shield, Info, CaretDown, CaretUp } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useOnboarding } from '@/lib/context/OnboardingContext'
import type { RiskLevel } from '@/lib/auth/types'

const INCOME_RATIOS = [
  { value: 2, label: '2x', description: 'Flexible', recommended: false },
  { value: 2.5, label: '2.5x', description: 'Moderado', recommended: false },
  { value: 3, label: '3x', description: 'Estándar', recommended: true },
  { value: 4, label: '4x', description: 'Exigente', recommended: false },
]

const RISK_LEVELS: { value: RiskLevel; label: string; color: string; bgColor: string; description: string }[] = [
  {
    value: 'A',
    label: 'Solo A',
    color: 'text-success',
    bgColor: 'bg-success-soft',
    description: 'Perfil crediticio excelente',
  },
  {
    value: 'B',
    label: 'A y B',
    color: 'text-[#1A40FF]',
    bgColor: 'bg-primary-soft',
    description: 'Bajo riesgo, recomendado',
  },
  {
    value: 'C',
    label: 'A, B y C',
    color: 'text-warning',
    bgColor: 'bg-warning-soft',
    description: 'Riesgo moderado',
  },
  {
    value: 'D',
    label: 'Todos',
    color: 'text-danger',
    bgColor: 'bg-danger-soft',
    description: 'Sin restricción',
  },
]

export function StepIdealTenant() {
  const { locale } = useI18n()
  const { draft, updateDraft } = useOnboarding()
  const [showRiskInfo, setShowRiskInfo] = useState(false)

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pb-2"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-surface-muted mb-4">
          <Users className="w-8 h-8 text-fg-muted" />
        </div>
        <h3 className="text-2xl font-bold text-fg">Tu inquilino ideal</h3>
        <p className="text-fg-subtle mt-2 max-w-md mx-auto">
          Define las características que buscas. Esto nos ayuda a filtrar candidatos por ti.
        </p>
      </motion.div>

      {/* Income Ratio */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <CurrencyDollar className="w-4 h-4 text-fg-subtle" />
          <label className="text-sm font-semibold text-fg-muted">
            Ratio de ingresos mínimo
          </label>
        </div>
        <p className="text-xs text-fg-subtle mb-4">
          El inquilino debe ganar al menos X veces el valor del arriendo mensual.
        </p>

        <div className="grid grid-cols-4 gap-2">
          {INCOME_RATIOS.map((ratio) => {
            const isSelected = draft.minIncomeRatio === ratio.value

            return (
              <button
                key={ratio.value}
                type="button"
                onClick={() => updateDraft({ minIncomeRatio: ratio.value })}
                className={cn(
                  'relative p-4 rounded-xl border transition-all duration-200 text-center',
                  isSelected
                    ? 'border-[#1A40FF]/30 bg-primary-soft shadow-[#1A40FF]/10'
                    : 'border-border bg-surface hover:border-border-strong'
                )}
              >
                {ratio.recommended && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[#1A40FF] bg-primary-soft px-2 py-0.5 rounded-full">
                    Recomendado
                  </span>
                )}
                <p
                  className={cn(
                    'text-xl font-bold',
                    isSelected ? 'text-[#1A40FF]' : 'text-fg-muted'
                  )}
                >
                  {ratio.label}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{ratio.description}</p>
              </button>
            )
          })}
        </div>

        {/* Example calculation */}
        {draft.minIncomeRatio && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-3 rounded-md bg-surface-muted border border-border-faint"
          >
            <p className="text-xs text-fg-muted">
              Si tu arriendo es <span className="font-semibold">$2.000.000</span>, el inquilino debe ganar mínimo{' '}
              <span className="font-semibold text-[#1A40FF]">
                ${new Intl.NumberFormat(locale === 'es' ? 'es-CL' : 'en-US').format(2000000 * draft.minIncomeRatio)}
              </span>{' '}
              mensuales.
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Accept Pets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <PawPrint className="w-4 h-4 text-fg-subtle" />
          <label className="text-sm font-semibold text-fg-muted">Mascotas</label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateDraft({ acceptPets: true })}
            className={cn(
              'p-4 rounded-xl border transition-all duration-200 text-center',
              draft.acceptPets === true
                ? 'border-success/30 bg-success-soft shadow-success/10'
                : 'border-border bg-surface hover:border-border-strong'
            )}
          >
            <span className="text-2xl block mb-1">🐕</span>
            <p
              className={cn(
                'font-semibold text-sm',
                draft.acceptPets === true ? 'text-success' : 'text-fg-muted'
              )}
            >
              Sí acepto
            </p>
            <p className="text-xs text-fg-subtle mt-0.5">Con depósito adicional</p>
          </button>

          <button
            type="button"
            onClick={() => updateDraft({ acceptPets: false })}
            className={cn(
              'p-4 rounded-xl border transition-all duration-200 text-center',
              draft.acceptPets === false
                ? 'border-fg-subtle bg-surface-muted'
                : 'border-border bg-surface hover:border-border-strong'
            )}
          >
            <span className="text-2xl block mb-1">🚫</span>
            <p
              className={cn(
                'font-semibold text-sm',
                draft.acceptPets === false ? 'text-fg-muted' : 'text-fg-muted'
              )}
            >
              No acepto
            </p>
            <p className="text-xs text-fg-subtle mt-0.5">Sin excepciones</p>
          </button>
        </div>
      </motion.div>

      {/* Risk Level */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-fg-subtle" />
            <label className="text-sm font-semibold text-fg-muted">
              Nivel de riesgo aceptable
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowRiskInfo(!showRiskInfo)}
            className="text-xs text-[#1A40FF] hover:text-[#1A40FF] flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5" />
            {showRiskInfo ? 'Ocultar' : '¿Cómo funciona?'}
            {showRiskInfo ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Risk info panel */}
        {showRiskInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 rounded-xl bg-primary-soft border border-[#1A40FF]/30"
          >
            <p className="text-sm text-[#1A40FF] mb-2 font-medium">
              Niveles de riesgo PLan:
            </p>
            <ul className="text-xs text-[#1A40FF] space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-success-soft text-success flex items-center justify-center text-[10px] font-bold">A</span>
                Excelente historial crediticio, sin moras
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-primary-soft text-[#1A40FF] flex items-center justify-center text-[10px] font-bold">B</span>
                Buen historial, moras menores resueltas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-warning-soft text-warning flex items-center justify-center text-[10px] font-bold">C</span>
                Historial con algunas moras activas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-danger-soft text-danger flex items-center justify-center text-[10px] font-bold">D</span>
                Historial con moras significativas
              </li>
            </ul>
          </motion.div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RISK_LEVELS.map((level) => {
            const isSelected = draft.minRiskLevel === level.value

            return (
              <button
                key={level.value}
                type="button"
                onClick={() => updateDraft({ minRiskLevel: level.value })}
                className={cn(
                  'relative p-3 rounded-xl border transition-all duration-200 text-center',
                  isSelected
                    ? 'border-[#1A40FF]/30 bg-primary-soft shadow-[#1A40FF]/10'
                    : 'border-border bg-surface hover:border-border-strong'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-md mx-auto mb-2 flex items-center justify-center font-bold text-sm',
                    level.bgColor,
                    level.color
                  )}
                >
                  {level.value}
                </div>
                <p
                  className={cn(
                    'font-semibold text-xs',
                    isSelected ? 'text-[#1A40FF]' : 'text-fg-muted'
                  )}
                >
                  {level.label}
                </p>
              </button>
            )
          })}
        </div>

        {draft.minRiskLevel && (
          <p className="text-xs text-fg-subtle mt-3">
            {RISK_LEVELS.find((l) => l.value === draft.minRiskLevel)?.description}
          </p>
        )}
      </motion.div>
    </div>
  )
}
