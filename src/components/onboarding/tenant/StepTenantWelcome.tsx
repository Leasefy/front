'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { User, Phone, SignIn } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useTenantOnboarding } from '@/lib/context/TenantOnboardingContext'

export function StepTenantWelcome() {
  const { draft, updateDraft, canProceed } = useTenantOnboarding()

  // Set WhatsApp as default contact preference
  useEffect(() => {
    if (!draft.preferredContact) {
      updateDraft({ preferredContact: 'whatsapp' })
    }
  }, [draft.preferredContact, updateDraft])

  return (
    <div className="space-y-6">
      {/* Name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          ¿Cómo te llamas? <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <User className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="text"
            id="displayName"
            value={draft.displayName || ''}
            onChange={(e) => updateDraft({ displayName: e.target.value })}
            placeholder="Tu nombre completo"
            className={cn(
              'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
              'text-neutral-900 dark:text-white placeholder:text-neutral-400',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
              draft.displayName
                ? 'border-indigo-500 focus:border-indigo-500'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
            )}
          />
        </div>
      </motion.div>

      {/* Phone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Tu número de teléfono
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Phone className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="tel"
            id="phone"
            value={draft.phone || ''}
            onChange={(e) => updateDraft({ phone: e.target.value })}
            placeholder="+57 300 123 4567"
            className={cn(
              'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
              'text-neutral-900 dark:text-white placeholder:text-neutral-400',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
              draft.phone
                ? 'border-indigo-500 focus:border-indigo-500'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
            )}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Para que propietarios puedan contactarte sobre tus aplicaciones
        </p>
      </motion.div>

      {/* Validation hint */}
      {!canProceed && draft.displayName === '' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl"
        >
          Ingresa tu nombre para continuar
        </motion.p>
      )}

      {/* Already have account */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="pt-4 border-t border-neutral-100 dark:border-neutral-800"
      >
        <Link
          href="/auth/login?redirect=/inquilino"
          className="flex items-center justify-center gap-2 w-full py-3 text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary transition-colors rounded-xl hover:bg-neutral-50 dark:hover:bg-white/[0.03]"
        >
          <SignIn className="w-4 h-4" />
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </motion.div>
    </div>
  )
}
