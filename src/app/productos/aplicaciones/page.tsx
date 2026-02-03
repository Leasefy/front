'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Users,
  Clock,
  Zap,
  Shield,
  Smartphone,
  Send,
  ClipboardList,
  BadgeCheck,
  Star,
  MessageSquare,
  Bell,
  Filter,
  UserCheck,
} from 'lucide-react';

// Hero stats
const heroStats = [
  { value: '< 5 min', label: 'Para aplicar', sublabel: 'proceso completo' },
  { value: '∞', label: 'Aplicaciones', sublabel: 'con Arriendo Pass' },
  { value: '24h', label: 'Respuesta', sublabel: 'de propietarios' },
];

// Features
const features = [
  {
    icon: ClipboardList,
    title: 'Formulario inteligente',
    description: 'Formulario adaptativo que solo pregunta lo necesario. Pre-llenado con datos guardados, validación en tiempo real.',
    gradient: 'from-rose-500 to-pink-500',
  },
  {
    icon: BadgeCheck,
    title: 'Arriendo Pass integrado',
    description: 'Una sola verificación, aplicaciones ilimitadas. Tu perfil verificado viaja contigo a cada propiedad.',
    gradient: 'from-emerald-500 to-teal-500',
    highlight: 'Desde $39.900',
  },
  {
    icon: Bell,
    title: 'Notificaciones en tiempo real',
    description: 'Recibe alertas instantáneas cuando el propietario ve tu aplicación, solicita info o toma una decisión.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MessageSquare,
    title: 'Chat integrado',
    description: 'Comunícate directamente con propietarios y agentes. Agenda visitas, resuelve dudas, negocia términos.',
    gradient: 'from-violet-500 to-purple-500',
  },
];

// For landlords
const landlordFeatures = [
  {
    icon: Filter,
    title: 'Filtros avanzados',
    description: 'Filtra candidatos por score, ingresos, ocupación, mascotas y más. Encuentra al inquilino ideal.',
  },
  {
    icon: UserCheck,
    title: 'Comparación lado a lado',
    description: 'Compara hasta 5 candidatos simultáneamente. Toma decisiones informadas.',
  },
  {
    icon: Star,
    title: 'Rankings automáticos',
    description: 'Nuestro algoritmo ordena candidatos por compatibilidad con tu propiedad.',
  },
  {
    icon: Shield,
    title: 'Verificación incluida',
    description: 'Todos los candidatos vienen pre-verificados. Sin sorpresas.',
  },
];

// Process steps
const steps = [
  {
    number: '01',
    title: 'Encuentra una propiedad',
    description: 'Navega propiedades verificadas. Filtra por ubicación, precio y características.',
    color: 'rose',
  },
  {
    number: '02',
    title: 'Aplica con un clic',
    description: 'Si tienes Arriendo Pass, tu perfil verificado se envía automáticamente.',
    color: 'emerald',
  },
  {
    number: '03',
    title: 'Propietario revisa',
    description: 'El propietario ve tu aplicación con score y verificaciones completas.',
    color: 'blue',
  },
  {
    number: '04',
    title: 'Conecta y cierra',
    description: 'Coordina visita, negocia términos y firma contrato. Todo en la plataforma.',
    color: 'violet',
  },
];

const stepColors: Record<string, { bg: string; text: string; gradient: string }> = {
  rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', gradient: 'from-rose-500 to-pink-500' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-500 to-cyan-500' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', gradient: 'from-violet-500 to-purple-500' },
};

// Application visual
function ApplicationVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-3xl shadow-2xl border border-border overflow-hidden max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">Aplicación para</p>
            <p className="text-white font-semibold">Apto 301 - Chapinero</p>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-white text-xs font-medium flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" />
            Verificado
          </span>
        </div>
      </div>

      {/* Applicant info */}
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Image
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=face&q=80"
            alt="Applicant"
            width={64}
            height={64}
            className="rounded-full"
          />
          <div>
            <h3 className="font-semibold text-foreground">María López</h3>
            <p className="text-sm text-muted-foreground">Diseñadora UX · 32 años</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                Score: 87
              </span>
              <span className="text-xs text-muted-foreground">Bajo riesgo</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Ingresos', value: '$8.5M' },
            { label: 'Antigüedad', value: '4 años' },
            { label: 'Mascotas', value: 'No' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 bg-muted/50 rounded-xl">
              <p className="text-sm font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Verifications */}
        <div className="space-y-2 mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verificaciones</p>
          {['Identidad verificada', 'Crédito consultado', 'Empleo verificado', 'Referencias OK'].map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {item}
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white">
            Aceptar
          </Button>
          <Button variant="outline" className="flex-1">
            Contactar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function AplicacionesPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <>
      <Navbar />
      <main className="pt-16 overflow-hidden">
        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Background */}
          <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
            <Image
              src="/hero-2.jpg"
              alt="Modern apartment interior"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40" />
          </motion.div>

          <motion.div
            className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20"
            style={{ opacity: heroOpacity }}
          >
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left Content */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-white/80 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Sistema de aplicaciones
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
                >
                  Aplica una vez,
                  <span className="block mt-2 text-white/90">
                    arrienda donde quieras
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  Tu perfil verificado te acompaña. Aplica a propiedades ilimitadas con un solo clic.
                  <span className="text-white font-medium"> Sin volver a llenar formularios.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/propiedades">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg">
                      Buscar propiedades
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                    >
                      Ver Arriendo Pass
                    </Button>
                  </Link>
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex items-center gap-8 pt-8 border-t border-white/10"
                >
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="text-center sm:text-left">
                      <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-white/60 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right - Application Visual */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden lg:block"
              >
                <ApplicationVisual />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Process Steps */}
        <section className="py-24 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 rounded-full px-3 py-1 mb-4">
                Para inquilinos
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                De la búsqueda a las llaves
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Proceso simple y transparente para encontrar tu próximo hogar
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => {
                const colors = stepColors[step.color];
                return (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="relative"
                  >
                    {i < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-border via-border to-transparent" />
                    )}

                    <div className="relative bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow">
                      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                        {i + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2 mt-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features for tenants */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Herramientas para inquilinos
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Todo lo que necesitas para encontrar y aplicar a tu próximo hogar
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative bg-card rounded-2xl border border-border p-8 hover:shadow-xl transition-all duration-300"
                  >
                    <div className={`absolute top-0 left-8 right-8 h-1 bg-gradient-to-r ${feature.gradient} rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">{feature.title}</h3>
                        {feature.highlight && (
                          <span className={`text-sm font-semibold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                            {feature.highlight}
                          </span>
                        )}
                        <p className="text-muted-foreground mt-2">{feature.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features for landlords */}
        <section className="py-24 bg-rose-900 dark:bg-rose-950">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-200 bg-white/10 rounded-full px-3 py-1 mb-4">
                Para propietarios
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Recibe aplicaciones de calidad
              </h2>
              <p className="text-rose-200/70 max-w-xl mx-auto">
                Candidatos pre-verificados, organizados y fáciles de comparar
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {landlordFeatures.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-rose-200/70">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Tu próximo hogar
                <span className="block">está a un clic</span>
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Crea tu perfil, obtén tu Arriendo Pass y empieza a aplicar a propiedades verificadas hoy mismo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/propiedades">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-rose-700 hover:bg-rose-50 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg">
                    Explorar propiedades
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/60">
                Perfil gratis · Arriendo Pass desde $39.900 · Aplicaciones ilimitadas
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
