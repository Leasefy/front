'use client'

import { motion } from 'framer-motion'
import { CreditCard, Buildings, DeviceMobile, Calendar, Check, Info, Wallet } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useOnboarding } from '@/lib/context/OnboardingContext'
import type { PaymentMethod } from '@/lib/auth/types'

const BANKS = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogota',
  'BBVA',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Banco Caja Social',
  'Scotiabank Colpatria',
  'Nequi',
  'Daviplata',
  'Otro',
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: 'bank_transfer',
    label: 'Transferencia',
    icon: Buildings,
    description: 'Bancaria directa',
  },
  {
    value: 'pse',
    label: 'PSE',
    icon: Wallet,
    description: 'Débito en línea',
  },
  {
    value: 'nequi',
    label: 'Nequi',
    icon: DeviceMobile,
    description: 'Billetera digital',
  },
  {
    value: 'daviplata',
    label: 'Daviplata',
    icon: DeviceMobile,
    description: 'Billetera digital',
  },
  {
    value: 'credit_card',
    label: 'Tarjeta',
    icon: CreditCard,
    description: 'Crédito/débito',
  },
]

const PAYMENT_DAYS = [1, 5, 10, 15, 20, 25]

export function StepPayments() {
  const { draft, updateDraft } = useOnboarding()

  const togglePaymentMethod = (method: PaymentMethod) => {
    const current = draft.acceptedPaymentMethods || []
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method]
    updateDraft({ acceptedPaymentMethods: updated })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pb-2"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-4">
          <CreditCard className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-2xl font-bold text-neutral-900">Configura tus cobros</h3>
        <p className="text-neutral-500 mt-2 max-w-md mx-auto">
          Define cómo quieres recibir los pagos de tus inquilinos.
        </p>
      </motion.div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100"
      >
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-700 font-medium">Esta sección es opcional</p>
          <p className="text-xs text-blue-600 mt-1">
            Puedes completar estos datos más adelante desde tu panel de control.
          </p>
        </div>
      </motion.div>

      {/* Bank Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          Banco para depósitos
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Buildings className="h-5 w-5 text-neutral-400" />
          </div>
          <select
            value={draft.bankName || ''}
            onChange={(e) => updateDraft({ bankName: e.target.value })}
            className={cn(
              'w-full pl-12 pr-4 py-4 text-base rounded-xl border bg-white appearance-none',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
              draft.bankName ? 'border-indigo-200 bg-indigo-50/30' : 'border-neutral-200'
            )}
          >
            <option value="">Selecciona tu banco</option>
            {BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Account Number */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          Número de cuenta
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={draft.bankAccount || ''}
          onChange={(e) => updateDraft({ bankAccount: e.target.value.replace(/\D/g, '') })}
          placeholder="Ej: 1234567890"
          className={cn(
            'w-full px-4 py-4 text-base rounded-xl border bg-white',
            'transition-all duration-200',
            'placeholder:text-neutral-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
            draft.bankAccount ? 'border-indigo-200 bg-indigo-50/30' : 'border-neutral-200'
          )}
        />
        <p className="text-xs text-neutral-400 mt-2">
          Tu información bancaria está protegida y encriptada.
        </p>
      </motion.div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-3">
          Métodos de pago que aceptas
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((method, index) => {
            const Icon = method.icon
            const isSelected = draft.acceptedPaymentMethods?.includes(method.value)

            return (
              <motion.button
                key={method.value}
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.03 }}
                onClick={() => togglePaymentMethod(method.value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                )}
              >
                {/* Selection indicator */}
                <div
                  className={cn(
                    'absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all',
                    isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-neutral-300'
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>

                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-neutral-100 text-neutral-500'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      isSelected ? 'text-indigo-700' : 'text-neutral-700'
                    )}
                  >
                    {method.label}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Preferred Payment Day */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-neutral-500" />
          <label className="text-sm font-semibold text-neutral-700">
            Día preferido de cobro
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_DAYS.map((day) => {
            const isSelected = draft.preferredPaymentDay === day

            return (
              <button
                key={day}
                type="button"
                onClick={() => updateDraft({ preferredPaymentDay: day })}
                className={cn(
                  'w-12 h-12 rounded-xl border font-semibold transition-all duration-200',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Día del mes en que prefieres recibir el pago del arriendo.
        </p>
      </motion.div>

      {/* Summary */}
      {(draft.bankName || draft.acceptedPaymentMethods?.length) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200"
        >
          <p className="text-sm font-medium text-emerald-700 mb-2">Resumen de cobros</p>
          <ul className="text-xs text-emerald-600 space-y-1">
            {draft.bankName && (
              <li>• Depósitos en {draft.bankName}</li>
            )}
            {draft.acceptedPaymentMethods && draft.acceptedPaymentMethods.length > 0 && (
              <li>
                • Aceptas:{' '}
                {draft.acceptedPaymentMethods
                  .map((m) => PAYMENT_METHODS.find((pm) => pm.value === m)?.label)
                  .join(', ')}
              </li>
            )}
            {draft.preferredPaymentDay && (
              <li>• Cobras el día {draft.preferredPaymentDay} de cada mes</li>
            )}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
