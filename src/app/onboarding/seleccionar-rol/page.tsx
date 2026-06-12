'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { House, Buildings, SpinnerGap, Storefront } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/use-auth'

type RoleChoice = 'tenant' | 'landlord' | 'inmobiliaria' | null

export default function SeleccionarRolPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [selected, setSelected] = useState<RoleChoice>(null)
  const [isLoading, setIsLoading] = useState(false)

  // If user already completed onboarding, redirect to their dashboard
  if (user?.onboardingCompleted) {
    router.replace(user.role === 'landlord' ? '/panel' : user.role === 'agency' ? '/panel/inmobiliaria' : '/inquilino')
    return null
  }

  const handleContinue = () => {
    if (!selected) return
    setIsLoading(true)

    if (selected === 'landlord') {
      router.push('/onboarding/propietario')
    } else if (selected === 'inmobiliaria') {
      router.push('/onboarding/inmobiliaria')
    } else {
      router.push('/onboarding/inquilino')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            {user?.name ? `Hola, ${user.name.split(' ')[0]}` : 'Bienvenido a Leasefy'}
          </h1>
          <p className="text-muted-foreground">
            Selecciona tu perfil para personalizar tu experiencia
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {/* Tenant card */}
          <button
            type="button"
            onClick={() => setSelected('tenant')}
            className={cn(
              'relative flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200',
              selected === 'tenant'
                ? 'border-foreground bg-muted'
                : 'border-border hover:border-foreground/30 bg-card'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0',
              selected === 'tenant' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            )}>
              <House className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Inquilino</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">Busco un lugar para vivir</p>
            </div>
            {selected === 'tenant' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-foreground flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </button>

          {/* Landlord card */}
          <button
            type="button"
            onClick={() => setSelected('landlord')}
            className={cn(
              'relative flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200',
              selected === 'landlord'
                ? 'border-foreground bg-muted'
                : 'border-border hover:border-foreground/30 bg-card'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0',
              selected === 'landlord' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            )}>
              <Buildings className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Propietario</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">Quiero arrendar mi propiedad</p>
            </div>
            {selected === 'landlord' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-foreground flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </button>

          {/* Inmobiliaria card */}
          <button
            type="button"
            onClick={() => setSelected('inmobiliaria')}
            className={cn(
              'relative flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200',
              selected === 'inmobiliaria'
                ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-border hover:border-foreground/30 bg-card'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0',
              selected === 'inmobiliaria' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'
            )}>
              <Storefront className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Soy una inmobiliaria</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">Gestiona propiedades de múltiples propietarios con tu equipo</p>
            </div>
            {selected === 'inmobiliaria' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </button>
        </div>

        {/* Continue button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || isLoading}
          className={cn(
            'w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all',
            selected && !isLoading
              ? selected === 'inmobiliaria'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-foreground text-background hover:bg-foreground/90'
              : 'bg-muted text-muted-foreground/60 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <SpinnerGap className="w-5 h-5 animate-spin" />
          ) : (
            'Continuar'
          )}
        </button>
      </div>
    </div>
  )
}
