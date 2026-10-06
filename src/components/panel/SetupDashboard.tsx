'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { AnimatedNumber, Appear, motionDuration, motionEase } from '@leasefy/cadence'
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
      {/* Llega después de cargar los inmuebles del inicio: entra UNA vez, con
          4 px (carga → contenido). Sin las ocho entradas escalonadas a mano
          (hasta 0,8 s) que tenía cada bloque. */}
      <Appear distance="xs" className="max-w-5xl mx-auto px-6 py-8">
        {/* Header with dismiss */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-soft rounded-full text-xs font-semibold text-primary mb-3">
                <Sparkle className="w-3.5 h-3.5" />
                Configurando tu cuenta
              </div>
              <h1 className="text-2xl font-semibold text-plan-primary">
                {greeting}, {firstName}!
              </h1>
              <p className="mt-1 text-plan-secondary">
                Estás a {totalTasks - completedCount} pasos de recibir tu primer inquilino
              </p>
            </div>

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="p-2 text-fg-subtle hover:text-fg-muted hover:bg-surface-muted rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Progress Section */}
        <section className="mb-8">
          <div className="bg-card border border-plan-border rounded-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-plan-primary">Progreso de configuración</h2>
                <span className="text-2xl font-bold text-primary">
                  <AnimatedNumber value={progressPercentage} from={0} format={(n) => String(Math.round(n))} />%
                </span>
              </div>

              {/* Progress bar — se revela desde 0 con `transform` (no `width`). */}
              <div className="h-3 bg-surface-muted rounded-full overflow-hidden mb-6">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: `${progressPercentage - 100}%` }}
                  transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
                  className="h-full w-full bg-primary-soft dark:bg-[#1A40FF]/12 rounded-full"
                />
              </div>

              {/* Tasks grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {tasks.map((task, index) => {
                  const Icon = task.icon
                  const isNext = !task.completed && tasks.slice(0, index).every((t) => t.completed)

                  return (
                    <div key={task.id}>
                      {task.completed ? (
                        <div className="p-4 rounded-lg bg-success-soft border border-success/20">
                          <div className="w-10 h-10 rounded-md bg-success flex items-center justify-center mb-3">
                            <Check className="w-5 h-5 text-white" strokeWidth={3} />
                          </div>
                          <p className="text-sm font-medium text-success">{task.title}</p>
                          <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-success mt-1">Completado</p>
                        </div>
                      ) : isNext ? (
                        <Link
                          href={task.href}
                          className="block p-4 rounded-lg bg-primary-soft border-2 border-primary/30 hover:border-primary/30 hover: transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-sm font-semibold text-primary">{task.title}</p>
                          <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                            Continuar
                            <ArrowRight className="w-3 h-3" />
                          </p>
                        </Link>
                      ) : (
                        <div className="p-4 rounded-lg bg-surface-muted border border-border opacity-60">
                          <div className="w-10 h-10 rounded-md bg-surface-muted flex items-center justify-center mb-3">
                            <Circle className="w-5 h-5 text-fg-subtle" />
                          </div>
                          <p className="text-sm font-medium text-fg-muted">{task.title}</p>
                          <p className="text-xs text-fg-subtle mt-0.5">Pendiente</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Draft Card */}
          <section className="lg:col-span-2">
            <div className="bg-card border border-plan-border rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">Tu propiedad en borrador</h2>
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-fg-muted bg-surface-muted px-2 py-1 rounded-full">
                  Borrador
                </span>
              </div>

              <div className="p-5">
                <div className="flex gap-5">
                  {/* Placeholder image */}
                  <div className="relative w-32 h-32 rounded-md overflow-hidden flex-shrink-0 bg-surface-muted border-2 border-dashed border-border-strong flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-fg-subtle mx-auto mb-1" />
                      <span className="text-xs text-fg-subtle">Sin fotos</span>
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
                      <span className="inline-flex items-center gap-1 text-xs text-fg-muted bg-surface-muted px-2 py-1 rounded-full">
                        <Camera className="w-3 h-3" />
                        Agregar fotos
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-fg-muted bg-surface-muted px-2 py-1 rounded-full">
                        <FileText className="w-3 h-3" />
                        Descripción
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-fg-muted bg-surface-muted px-2 py-1 rounded-full">
                        <Buildings className="w-3 h-3" />
                        Amenidades
                      </span>
                    </div>

                    <Link
                      href="/publicar?from=panel"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:opacity-90 transition-colors"
                    >
                      Completar propiedad
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Resources Section */}
          <section>
            <div className="bg-card border border-plan-border rounded-md overflow-hidden">
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
                      <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center flex-shrink-0 group-hover:bg-primary-soft transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-plan-primary group-hover:text-primary transition-colors">
                          {resource.title}
                        </p>
                        <p className="text-xs text-plan-muted">{resource.description}</p>
                      </div>
                      <CaretRight className="w-4 h-4 text-plan-muted group-hover:text-primary transition-colors" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Quick tips */}
        <section className="mt-6">
          <div className="bg-primary-soft dark:bg-[#1A40FF]/12 rounded-md p-6 text-primary">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center flex-shrink-0">
                <Sparkle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Consejo rápido</h3>
                <p className="text-primary mt-1 text-sm">
                  Los anuncios con al menos 10 fotos de buena calidad reciben 3x más solicitudes.
                  Asegúrate de incluir fotos de todas las habitaciones, baños, cocina y áreas comunes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </Appear>
    </div>
  )
}
