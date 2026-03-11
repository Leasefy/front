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
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    description: 'Perfil crediticio excelente',
  },
  {
    value: 'B',
    label: 'A y B',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Bajo riesgo, recomendado',
  },
  {
    value: 'C',
    label: 'A, B y C',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: 'Riesgo moderado',
  },
  {
    value: 'D',
    label: 'Todos',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 mb-4">
          <Users className="w-8 h-8 text-violet-600" />
        </div>
        <h3 className="text-2xl font-bold text-neutral-900">Tu inquilino ideal</h3>
        <p className="text-neutral-500 mt-2 max-w-md mx-auto">
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
          <CurrencyDollar className="w-4 h-4 text-neutral-500" />
          <label className="text-sm font-semibold text-neutral-700">
            Ratio de ingresos mínimo
          </label>
        </div>
        <p className="text-xs text-neutral-500 mb-4">
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
                    ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-500/10'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                )}
              >
                {ratio.recommended && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Recomendado
                  </span>
                )}
                <p
                  className={cn(
                    'text-xl font-bold',
                    isSelected ? 'text-indigo-600' : 'text-neutral-700'
                  )}
                >
                  {ratio.label}
                </p>
                <p className="text-xs text-neutral-400 mt-1">{ratio.description}</p>
              </button>
            )
          })}
        </div>

        {/* Example calculation */}
        {draft.minIncomeRatio && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100"
          >
            <p className="text-xs text-neutral-600">
              Si tu arriendo es <span className="font-semibold">$2.000.000</span>, el inquilino debe ganar mínimo{' '}
              <span className="font-semibold text-indigo-600">
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
          <PawPrint className="w-4 h-4 text-neutral-500" />
          <label className="text-sm font-semibold text-neutral-700">Mascotas</label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateDraft({ acceptPets: true })}
            className={cn(
              'p-4 rounded-xl border transition-all duration-200 text-center',
              draft.acceptPets === true
                ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            )}
          >
            <span className="text-2xl block mb-1">🐕</span>
            <p
              className={cn(
                'font-semibold text-sm',
                draft.acceptPets === true ? 'text-emerald-700' : 'text-neutral-700'
              )}
            >
              Sí acepto
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">Con depósito adicional</p>
          </button>

          <button
            type="button"
            onClick={() => updateDraft({ acceptPets: false })}
            className={cn(
              'p-4 rounded-xl border transition-all duration-200 text-center',
              draft.acceptPets === false
                ? 'border-neutral-500 bg-neutral-50 shadow-md'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            )}
          >
            <span className="text-2xl block mb-1">🚫</span>
            <p
              className={cn(
                'font-semibold text-sm',
                draft.acceptPets === false ? 'text-neutral-700' : 'text-neutral-700'
              )}
            >
              No acepto
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">Sin excepciones</p>
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
            <Shield className="w-4 h-4 text-neutral-500" />
            <label className="text-sm font-semibold text-neutral-700">
              Nivel de riesgo aceptable
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowRiskInfo(!showRiskInfo)}
            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
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
            className="mb-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100"
          >
            <p className="text-sm text-indigo-700 mb-2 font-medium">
              Niveles de riesgo PLan:
            </p>
            <ul className="text-xs text-indigo-600 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">A</span>
                Excelente historial crediticio, sin moras
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">B</span>
                Buen historial, moras menores resueltas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">C</span>
                Historial con algunas moras activas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-bold">D</span>
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
                    ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-500/10'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center font-bold text-sm',
                    level.bgColor,
                    level.color
                  )}
                >
                  {level.value}
                </div>
                <p
                  className={cn(
                    'font-semibold text-xs',
                    isSelected ? 'text-indigo-700' : 'text-neutral-700'
                  )}
                >
                  {level.label}
                </p>
              </button>
            )
          })}
        </div>

        {draft.minRiskLevel && (
          <p className="text-xs text-neutral-500 mt-3">
            {RISK_LEVELS.find((l) => l.value === draft.minRiskLevel)?.description}
          </p>
        )}
      </motion.div>
    </div>
  )
}
