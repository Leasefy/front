'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { User, Phone, SignIn, IdentificationCard } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useTenantOnboarding } from '@/lib/context/TenantOnboardingContext'
import { useAuth } from '@/lib/auth/use-auth'

export function StepTenantWelcome() {
  const { draft, updateDraft, canProceed } = useTenantOnboarding()
  const { user } = useAuth()

  // The document number is immutable once set on the backend profile —
  // changes go through Leasefy support (the backend enforces this too).
  const rutLocked = user?.profileSource === 'backend' && !!user.rut

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
        <label htmlFor="displayName" className="block text-sm font-medium text-fg-muted mb-2">
          ¿Cómo te llamas? <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <User className="h-5 w-5 text-fg-subtle" />
          </div>
          <Input
            type="text"
            id="displayName"
            value={draft.displayName || ''}
            onChange={(e) => updateDraft({ displayName: e.target.value })}
            placeholder="Tu nombre completo"
            className={cn('h-12 pl-12 rounded-xl', draft.displayName && 'border-primary/30')}
          />
        </div>
      </motion.div>

      {/* CC */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label htmlFor="rut" className="block text-sm font-medium text-fg-muted mb-2">
          Cédula de Ciudadanía
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <IdentificationCard className="h-5 w-5 text-fg-subtle" />
          </div>
          <Input
            type="text"
            id="rut"
            value={draft.rut || ''}
            onChange={(e) => updateDraft({ rut: e.target.value })}
            placeholder="Ej: 1090525663"
            disabled={rutLocked}
            className={cn('h-12 pl-12 rounded-xl', draft.rut && 'border-primary/30')}
          />
        </div>
        {rutLocked && (
          <p className="mt-2 text-xs text-fg-subtle">
            Para modificar tu número de documento, contacta al soporte de Leasefy.
          </p>
        )}
      </motion.div>

      {/* Phone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label htmlFor="phone" className="block text-sm font-medium text-fg-muted mb-2">
          Tu número de teléfono
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Phone className="h-5 w-5 text-fg-subtle" />
          </div>
          <Input
            type="tel"
            id="phone"
            value={draft.phone || ''}
            onChange={(e) => updateDraft({ phone: e.target.value })}
            placeholder="+57 300 123 4567"
            className={cn('h-12 pl-12 rounded-xl', draft.phone && 'border-primary/30')}
          />
        </div>
        <p className="mt-2 text-xs text-fg-subtle">
          Para que propietarios puedan contactarte sobre tus aplicaciones
        </p>
      </motion.div>

      {/* Validation hint */}
      {!canProceed && draft.displayName === '' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-warning bg-warning-soft px-4 py-3 rounded-xl"
        >
          Ingresa tu nombre para continuar
        </motion.p>
      )}

      {/* Already have account */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="pt-4 border-t border-border-faint"
      >
        <Link
          href="/auth/login?redirect=/inquilino"
          className="flex items-center justify-center gap-2 w-full py-3 text-sm text-fg-subtle hover:text-primary transition-colors rounded-xl hover:bg-surface-muted"
        >
          <SignIn className="w-4 h-4" />
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </motion.div>
    </div>
  )
}
