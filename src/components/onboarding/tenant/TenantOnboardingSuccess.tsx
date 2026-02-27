'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, MagnifyingGlass, Confetti, ArrowRight, House, Star, SealCheck } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'

interface TenantOnboardingSuccessProps {
  userName?: string
}

export function TenantOnboardingSuccess({ userName = 'inquilino' }: TenantOnboardingSuccessProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Fire confetti with Leasefy brand colors (indigo)
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      // Indigo-themed confetti (Leasefy brand)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  // Countdown and redirect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/inquilino')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Subtle background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 max-w-lg w-full"
      >
        {/* Success card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-neutral-200/50 border border-neutral-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-12 pb-8 text-center">
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 mb-6 shadow-lg shadow-indigo-500/30"
            >
              <SealCheck className="h-10 w-10 text-white" strokeWidth={2} />
            </motion.div>

            {/* Celebration badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-sm font-medium text-indigo-700 mb-4"
            >
              <Confetti className="w-4 h-4" />
              Perfil completado
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-neutral-900 tracking-tight mb-3"
            >
              ¡Bienvenido, {userName}!
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-neutral-500"
            >
              Tu perfil está listo. Ahora puedes explorar propiedades y aplicar con un solo clic.
            </motion.p>
          </div>

          {/* Features list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="px-8 py-6 bg-stone-50 border-t border-neutral-100"
          >
            <h3 className="text-sm font-semibold text-neutral-700 mb-4">Qué puedes hacer ahora:</h3>
            <div className="space-y-3">
              {[
                { icon: MagnifyingGlass, text: 'Buscar propiedades con IA', color: 'bg-indigo-100 text-indigo-600' },
                { icon: Star, text: 'Guardar favoritos para comparar', color: 'bg-amber-100 text-amber-600' },
                { icon: House, text: 'Aplicar a propiedades al instante', color: 'bg-emerald-100 text-emerald-600' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-xl',
                    item.color
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-neutral-700">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Action buttons */}
          <div className="px-8 py-6 space-y-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onClick={() => router.push('/propiedades')}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold',
                'rounded-xl bg-indigo-600 text-white',
                'hover:bg-indigo-700 transition-all duration-200',
                'shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30'
              )}
            >
              <MagnifyingGlass className="h-4 w-4" />
              Explorar propiedades
              <ArrowRight className="h-4 w-4 ml-1" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              onClick={() => router.push('/inquilino')}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium',
                'rounded-xl border border-neutral-200 bg-white text-neutral-700',
                'hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-200'
              )}
            >
              Ir a mi dashboard
            </motion.button>
          </div>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="px-8 py-4 border-t border-neutral-100 text-center"
          >
            <p className="text-sm text-neutral-400">
              Redirigiendo a tu dashboard en <span className="font-semibold text-indigo-600">{countdown}</span> segundos...
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
