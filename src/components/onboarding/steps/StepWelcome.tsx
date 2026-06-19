'use client'

import { motion } from 'framer-motion'
import { User, Phone, Envelope, ChatCircle, UserCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useOnboarding } from '@/lib/context/OnboardingContext'
import type { PreferredContact } from '@/lib/auth/types'

const CONTACT_OPTIONS: { value: PreferredContact; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: ChatCircle,
    description: 'Respuesta rápida',
  },
  {
    value: 'email',
    label: 'Correo',
    icon: Envelope,
    description: 'Formal y documentado',
  },
  {
    value: 'phone',
    label: 'Llamada',
    icon: Phone,
    description: 'Comunicación directa',
  },
]

export function StepWelcome() {
  const { draft, updateDraft } = useOnboarding()

  return (
    <div className="space-y-8">
      {/* Welcome message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pb-2"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#EEF1FF] mb-4">
          <UserCircle className="w-8 h-8 text-[#1A40FF]" />
        </div>
        <h3 className="text-2xl font-bold text-neutral-900">
          ¡Hola! Cuéntanos sobre ti
        </h3>
        <p className="text-neutral-500 mt-2 max-w-md mx-auto">
          Esta información nos ayuda a personalizar tu experiencia y comunicarnos contigo efectivamente.
        </p>
      </motion.div>

      {/* Name input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          ¿Cómo te llamamos? *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="text"
            value={draft.displayName || ''}
            onChange={(e) => updateDraft({ displayName: e.target.value })}
            placeholder="Tu nombre"
            className={cn(
              'w-full pl-12 pr-4 py-4 text-base rounded-xl border bg-white',
              'transition-all duration-200',
              'placeholder:text-neutral-400',
              'focus:outline-none focus:ring-2 focus:ring-[#1A40FF]/20 focus:border-[#1A40FF]/30',
              draft.displayName ? 'border-[#1A40FF]/30 bg-[#EEF1FF]/30' : 'border-neutral-200'
            )}
          />
        </div>
      </motion.div>

      {/* Phone input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          Teléfono de contacto
          <span className="font-normal text-neutral-400 ml-1">(opcional)</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Phone className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="tel"
            value={draft.phone || ''}
            onChange={(e) => updateDraft({ phone: e.target.value })}
            placeholder="300 123 4567"
            className={cn(
              'w-full pl-12 pr-4 py-4 text-base rounded-xl border bg-white',
              'transition-all duration-200',
              'placeholder:text-neutral-400',
              'focus:outline-none focus:ring-2 focus:ring-[#1A40FF]/20 focus:border-[#1A40FF]/30',
              draft.phone ? 'border-[#1A40FF]/30 bg-[#EEF1FF]/30' : 'border-neutral-200'
            )}
          />
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Lo usaremos solo para notificaciones importantes sobre tus propiedades.
        </p>
      </motion.div>

      {/* Preferred contact method */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-3">
          ¿Cómo prefieres que te contactemos?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {CONTACT_OPTIONS.map((option, index) => {
            const Icon = option.icon
            const isSelected = draft.preferredContact === option.value

            return (
              <motion.button
                key={option.value}
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                onClick={() => updateDraft({ preferredContact: option.value })}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200',
                  isSelected
                    ? 'border-[#1A40FF]/30 bg-[#EEF1FF]'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-md flex items-center justify-center transition-colors',
                    isSelected ? 'bg-[#1A40FF] text-white uppercase tracking-wide font-mono' : 'bg-neutral-100 text-neutral-500'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isSelected ? 'text-[#1A40FF]' : 'text-neutral-700'
                    )}
                  >
                    {option.label}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{option.description}</p>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="contact-selection"
                    className="absolute -top-1 -right-1 w-5 h-5 bg-[#1A40FF] rounded-full flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
