'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Star, House, ArrowRight, Rocket, SealCheck, Buildings, Users, Confetti } from '@phosphor-icons/react'
import confetti from 'canvas-confetti'
import { cn } from '@/lib/utils'

export function OnboardingSuccess() {
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

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

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

  useEffect(() => {
    // Countdown and redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/panel')
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
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg w-full"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-neutral-200/50 border border-neutral-100 overflow-hidden">
          {/* Success animation */}
          <div className="pt-12 pb-8 px-8 text-center">
            {/* Check animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="relative inline-flex"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                >
                  <SealCheck className="w-10 h-10 text-white" strokeWidth={2} />
                </motion.div>
              </div>

              {/* Star decoration */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="absolute -top-2 -right-2"
              >
                <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
              </motion.div>
            </motion.div>

            {/* Celebration badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-sm font-medium text-indigo-700 mt-6"
            >
              <Confetti className="w-4 h-4" />
              Cuenta configurada
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold text-neutral-900 tracking-tight mt-4"
            >
              ¡Todo listo!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-neutral-500 mt-3 max-w-sm mx-auto"
            >
              Tu cuenta está configurada. Ahora puedes completar tu primera propiedad y comenzar a recibir inquilinos verificados.
            </motion.p>
          </div>

          {/* Next steps preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="px-8 py-6 bg-stone-50 border-t border-neutral-100"
          >
            <h3 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-indigo-600" />
              Próximos pasos
            </h3>
            <div className="space-y-3">
              {[
                { icon: Buildings, text: 'Completar fotos y descripción de tu propiedad', color: 'bg-indigo-100 text-indigo-600' },
                { icon: House, text: 'Publicar tu anuncio', color: 'bg-amber-100 text-amber-600' },
                { icon: Users, text: 'Recibir y evaluar candidatos', color: 'bg-emerald-100 text-emerald-600' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
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

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="px-8 py-6 space-y-3"
          >
            <Link
              href="/panel"
              className={cn(
                'flex items-center justify-center gap-2 w-full py-4 px-6 text-sm font-semibold',
                'bg-indigo-600 text-white rounded-xl',
                'hover:bg-indigo-700 transition-all',
                'shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30'
              )}
            >
              <House className="w-4 h-4" />
              Ir a mi panel
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-center text-xs text-neutral-400 pt-2">
              Redirigiendo automáticamente en <span className="font-semibold text-indigo-600">{countdown}</span> segundos...
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
