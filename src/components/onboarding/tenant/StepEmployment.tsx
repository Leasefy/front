'use client'

import { motion } from 'framer-motion'
import { Briefcase, Buildings, CurrencyDollar, TrendUp, GraduationCap, Clock, Users } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useTenantOnboarding } from '@/lib/context/TenantOnboardingContext'
import type { EmploymentType } from '@/lib/auth/types'

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: 'employed',
    label: 'Empleado',
    icon: Buildings,
    description: 'Trabajo con contrato laboral',
  },
  {
    value: 'self_employed',
    label: 'Independiente',
    icon: Briefcase,
    description: 'Tengo mi propio negocio',
  },
  {
    value: 'freelancer',
    label: 'Freelancer',
    icon: Users,
    description: 'Trabajo por proyectos',
  },
  {
    value: 'student',
    label: 'Estudiante',
    icon: GraduationCap,
    description: 'Estudio actualmente',
  },
  {
    value: 'retired',
    label: 'Pensionado',
    icon: Clock,
    description: 'Recibo pensión',
  },
  {
    value: 'other',
    label: 'Otro',
    icon: TrendUp,
    description: 'Otra fuente de ingresos',
  },
]

export function StepEmployment() {
  const { locale } = useI18n()
  const { draft, updateDraft, canProceed } = useTenantOnboarding()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    updateDraft({ monthlyIncome: value ? parseInt(value) : undefined })
  }

  const handleAdditionalIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    updateDraft({ additionalIncome: value ? parseInt(value) : 0 })
  }

  return (
    <div className="space-y-6">
        {/* Employment Type */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            ¿Cuál es tu tipo de empleo? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {EMPLOYMENT_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = draft.employmentType === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateDraft({ employmentType: option.value })}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-200',
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1a1a1c]'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold transition-colors',
                      isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Company Name - only show for employed */}
        {(draft.employmentType === 'employed' || draft.employmentType === 'self_employed') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label htmlFor="companyName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {draft.employmentType === 'employed' ? '¿Dónde trabajas?' : 'Nombre de tu negocio'}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Buildings className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                id="companyName"
                value={draft.companyName || ''}
                onChange={(e) => updateDraft({ companyName: e.target.value })}
                placeholder="Nombre de la empresa"
                className={cn(
                  'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
                  'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                  draft.companyName
                    ? 'border-indigo-500 focus:border-indigo-500'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
                )}
              />
            </div>
          </motion.div>
        )}

        {/* Monthly Income */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label htmlFor="monthlyIncome" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Ingreso mensual <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <CurrencyDollar className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              type="text"
              id="monthlyIncome"
              value={draft.monthlyIncome ? formatCurrency(draft.monthlyIncome).replace('COP', '').trim() : ''}
              onChange={handleIncomeChange}
              placeholder="3.000.000"
              className={cn(
                'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
                'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                draft.monthlyIncome
                  ? 'border-indigo-500 focus:border-indigo-500'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
              )}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Incluye salario, honorarios, o ingresos principales
          </p>
        </motion.div>

        {/* Additional Income */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label htmlFor="additionalIncome" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Ingresos adicionales (opcional)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <TrendUp className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              type="text"
              id="additionalIncome"
              value={draft.additionalIncome ? formatCurrency(draft.additionalIncome).replace('COP', '').trim() : ''}
              onChange={handleAdditionalIncomeChange}
              placeholder="500.000"
              className={cn(
                'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
                'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                draft.additionalIncome
                  ? 'border-indigo-500 focus:border-indigo-500'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
              )}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Arriendos, inversiones, trabajos extra, etc.
          </p>
        </motion.div>

        {/* Income summary */}
        {draft.monthlyIncome && draft.monthlyIncome > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Ingreso total mensual</span>
              <span className="text-lg font-bold text-indigo-800 dark:text-indigo-300">
                {formatCurrency((draft.monthlyIncome || 0) + (draft.additionalIncome || 0))}
              </span>
            </div>
            <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
              Con este ingreso puedes aplicar a arriendos de hasta{' '}
              <strong>
                {formatCurrency(Math.floor(((draft.monthlyIncome || 0) + (draft.additionalIncome || 0)) / 3))}
              </strong>
              /mes (regla del 30%)
            </p>
          </motion.div>
        )}

      {/* Validation hint */}
      {!canProceed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl"
        >
          Selecciona tu tipo de empleo e ingresa tu ingreso mensual para continuar
        </motion.p>
      )}
    </div>
  )
}
