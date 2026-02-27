'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Check, Circle, House, Camera, FileText, PaperPlaneTilt, ArrowRight, BookOpen, TrendUp, Shield, Sparkle, CaretRight, Buildings, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting'

interface SetupTask {
  id: string
  title: string
  description: string
  completed: boolean
  href: string
  icon: React.ElementType
  priority: 'required' | 'recommended' | 'optional'
}

interface SetupDashboardProps {
  onDismiss?: () => void
}

export function SetupDashboard({ onDismiss }: SetupDashboardProps) {
  const { user } = useAuth()
  const { greeting } = useTimeGreeting()
  const firstName = user?.name?.split(' ')[0] || 'Propietario'

  // Mock setup tasks - in real app, these would come from backend
  const [tasks] = useState<SetupTask[]>([
    {
      id: 'account',
      title: 'Crear cuenta',
      description: 'Registro completado',
      completed: true,
      href: '#',
      icon: Check,
      priority: 'required',
    },
    {
      id: 'property-basic',
      title: 'Datos básicos de propiedad',
      description: 'Tipo, ubicación y precio',
      completed: true,
      href: '/publicar?from=panel',
      icon: House,
      priority: 'required',
    },
    {
      id: 'property-photos',
      title: 'Agregar fotos',
      description: 'Mínimo 5 fotos de tu inmueble',
      completed: false,
      href: '/publicar?from=panel&step=5',
      icon: Camera,
      priority: 'required',
    },
    {
      id: 'property-description',
      title: 'Completar descripción',
      description: 'Título y descripción atractivos',
      completed: false,
      href: '/publicar?from=panel&step=7',
      icon: FileText,
      priority: 'required',
    },
    {
      id: 'publish',
      title: 'Publicar anuncio',
      description: 'Hacerlo visible para inquilinos',
      completed: false,
      href: '/publicar?from=panel&step=9',
      icon: PaperPlaneTilt,
      priority: 'required',
    },
  ])

  const completedCount = tasks.filter((t) => t.completed).length
  const totalTasks = tasks.length
  const progressPercentage = Math.round((completedCount / totalTasks) * 100)

  const resources = [
    {
      icon: BookOpen,
      title: 'Cómo crear un anuncio que destaque',
      description: 'Tips para fotos y descripciones',
      href: '/ayuda/crear-anuncio',
    },
    {
      icon: TrendUp,
      title: 'Precios de mercado en tu zona',
      description: 'Analiza la competencia',
      href: '/ayuda/precios-mercado',
    },
    {
      icon: Shield,
      title: 'Cómo funciona la evaluación',
      description: 'Entiende los niveles de riesgo',
      href: '/ayuda/evaluacion-inquilinos',
    },
  ]

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header with dismiss */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 rounded-full text-xs font-semibold text-indigo-700 mb-3"
              >
                <Sparkle className="w-3.5 h-3.5" />
                Configurando tu cuenta
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-semibold text-plan-primary"
              >
                {greeting}, {firstName}!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-1 text-plan-secondary"
              >
                Estás a {totalTasks - completedCount} pasos de recibir tu primer inquilino
              </motion.p>
            </div>

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Progress Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="bg-card border border-plan-border rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-plan-primary">Progreso de configuración</h2>
                <span className="text-2xl font-bold text-indigo-600">{progressPercentage}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-neutral-100 rounded-full overflow-hidden mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                />
              </div>

              {/* Tasks grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {tasks.map((task, index) => {
                  const Icon = task.icon
                  const isNext = !task.completed && tasks.slice(0, index).every((t) => t.completed)

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      {task.completed ? (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center mb-3">
                            <Check className="w-5 h-5 text-white" strokeWidth={3} />
                          </div>
                          <p className="text-sm font-medium text-emerald-700">{task.title}</p>
                          <p className="text-xs text-emerald-600 mt-0.5">Completado</p>
                        </div>
                      ) : isNext ? (
                        <Link
                          href={task.href}
                          className="block p-4 rounded-xl bg-indigo-50 border-2 border-indigo-300 hover:border-indigo-400 hover:shadow-md transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-sm font-semibold text-indigo-700">{task.title}</p>
                          <p className="text-xs text-indigo-600 mt-0.5 flex items-center gap-1">
                            Continuar
                            <ArrowRight className="w-3 h-3" />
                          </p>
                        </Link>
                      ) : (
                        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 opacity-60">
                          <div className="w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center mb-3">
                            <Circle className="w-5 h-5 text-neutral-400" />
                          </div>
                          <p className="text-sm font-medium text-neutral-500">{task.title}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">Pendiente</p>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Draft Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="bg-card border border-plan-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">Tu propiedad en borrador</h2>
                <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                  Borrador
                </span>
              </div>

              <div className="p-5">
                <div className="flex gap-5">
                  {/* Placeholder image */}
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-neutral-300 mx-auto mb-1" />
                      <span className="text-xs text-neutral-400">Sin fotos</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-plan-primary">
                      Apartamento en Bogotá
                    </h3>
                    <p className="text-plan-secondary text-sm mt-1">
                      $2.500.000/mes
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                        <Camera className="w-3 h-3" />
                        Agregar fotos
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                        <FileText className="w-3 h-3" />
                        Descripción
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                        <Buildings className="w-3 h-3" />
                        Amenidades
                      </span>
                    </div>

                    <Link
                      href="/publicar?from=panel"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Completar propiedad
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Resources Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="bg-card border border-plan-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">Recursos para ti</h2>
              </div>

              <div className="divide-y divide-plan-border">
                {resources.map((resource, index) => {
                  const Icon = resource.icon
                  return (
                    <Link
                      key={resource.title}
                      href={resource.href}
                      className="flex items-center gap-4 p-4 hover:bg-muted transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                        <Icon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-plan-primary group-hover:text-indigo-600 transition-colors">
                          {resource.title}
                        </p>
                        <p className="text-xs text-plan-muted">{resource.description}</p>
                      </div>
                      <CaretRight className="w-4 h-4 text-plan-muted group-hover:text-indigo-600 transition-colors" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </motion.section>
        </div>

        {/* Quick tips */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Consejo rápido</h3>
                <p className="text-indigo-100 mt-1 text-sm">
                  Los anuncios con al menos 10 fotos de buena calidad reciben 3x más solicitudes.
                  Asegúrate de incluir fotos de todas las habitaciones, baños, cocina y áreas comunes.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
