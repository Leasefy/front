'use client'

import { motion } from 'framer-motion'
import { CreditCard, Buildings, DeviceMobile, Calendar, Check, Info, Wallet } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-warning-soft mb-4">
          <CreditCard className="w-8 h-8 text-warning" />
        </div>
        <h3 className="text-2xl font-bold text-fg">Configura tus cobros</h3>
        <p className="text-fg-subtle mt-2 max-w-md mx-auto">
          Define cómo quieres recibir los pagos de tus inquilinos.
        </p>
      </motion.div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-primary-soft border border-[#1A40FF]/30"
      >
        <Info className="w-5 h-5 text-[#1A40FF] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-[#1A40FF] font-medium">Esta sección es opcional</p>
          <p className="text-xs text-[#1A40FF] mt-1">
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
        <label className="block text-sm font-semibold text-fg-muted mb-2">
          Banco para depósitos
        </label>
        <Select value={draft.bankName || ''} onValueChange={(v) => updateDraft({ bankName: v })}>
          <SelectTrigger
            className={cn('relative h-12 pl-12 rounded-xl', draft.bankName && 'border-primary/30 bg-primary-soft/30')}
          >
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none">
              <Buildings className="h-5 w-5" />
            </span>
            <SelectValue placeholder="Selecciona tu banco" />
          </SelectTrigger>
          <SelectContent>
            {BANKS.map((bank) => (
              <SelectItem key={bank} value={bank}>{bank}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Account Number */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="block text-sm font-semibold text-fg-muted mb-2">
          Número de cuenta
        </label>
        <Input
          type="text"
          inputMode="numeric"
          value={draft.bankAccount || ''}
          onChange={(e) => updateDraft({ bankAccount: e.target.value.replace(/\D/g, '') })}
          placeholder="Ej: 1234567890"
          className={cn(
            'h-12 rounded-xl',
            draft.bankAccount && 'border-primary/30 bg-primary-soft/30'
          )}
        />
        <p className="text-xs text-fg-subtle mt-2">
          Tu información bancaria está protegida y encriptada.
        </p>
      </motion.div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-semibold text-fg-muted mb-3">
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
                    ? 'border-[#1A40FF]/30 bg-primary-soft'
                    : 'border-border bg-surface hover:border-border-strong'
                )}
              >
                {/* Selection indicator */}
                <div
                  className={cn(
                    'absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all',
                    isSelected ? 'border-[#1A40FF]/30 bg-[#1A40FF]' : 'border-border-strong'
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>

                <div
                  className={cn(
                    'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                    isSelected ? 'bg-[#1A40FF] text-white' : 'bg-surface-muted text-fg-subtle'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      isSelected ? 'text-[#1A40FF]' : 'text-fg-muted'
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
          <Calendar className="w-4 h-4 text-fg-subtle" />
          <label className="text-sm font-semibold text-fg-muted">
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
                    ? 'border-[#1A40FF]/30 bg-[#1A40FF] text-white'
                    : 'border-border bg-surface text-fg-muted hover:border-border-strong'
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-fg-subtle mt-2">
          Día del mes en que prefieres recibir el pago del arriendo.
        </p>
      </motion.div>

      {/* Summary */}
      {(draft.bankName || draft.acceptedPaymentMethods?.length) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-xl bg-success-soft border border-success/30"
        >
          <p className="text-sm font-medium text-success mb-2">Resumen de cobros</p>
          <ul className="text-xs text-success space-y-1">
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
