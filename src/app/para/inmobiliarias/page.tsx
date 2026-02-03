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
  Shield,
  Clock,
  Building2,
  Users,
  FileText,
  BarChart3,
  Star,
  Zap,
  Lock,
  Code,
  Palette,
  Headphones,
  Sparkles,
  TrendingUp,
  LineChart,
  Globe,
  Database,
  Layers,
  Quote,
  Play,
  ChevronRight,
  BadgeCheck,
  Rocket,
} from 'lucide-react';

// Hero stats
const heroStats = [
  { value: '50+', label: 'Inmobiliarias', sublabel: 'activas' },
  { value: '5,000+', label: 'Propiedades', sublabel: 'gestionadas' },
  { value: '99.9%', label: 'Uptime', sublabel: 'garantizado' },
];

// Features with visuals
const features = [
  {
    icon: Users,
    title: 'CRM de candidatos',
    description: 'Gestiona todos tus candidatos desde un solo panel. Historial completo, comunicaciones centralizadas y estados personalizables.',
    visual: 'crm',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    icon: BarChart3,
    title: 'Scoring con IA',
    description: 'Evalúa candidatos en segundos. Nuestro algoritmo analiza riesgo crediticio, historial laboral y referencias automáticamente.',
    visual: 'scoring',
    gradient: 'from-violet-500 to-purple-500',
    highlight: '92% precisión',
  },
  {
    icon: FileText,
    title: 'Contratos digitales',
    description: 'Plantillas conformes a Ley 820/2003. Firma electrónica avanzada, almacenamiento seguro en la nube.',
    visual: 'contracts',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Code,
    title: 'API REST completa',
    description: 'Integra con tu software existente. Sincroniza propiedades, candidatos y contratos en tiempo real con webhooks.',
    visual: 'api',
    gradient: 'from-amber-500 to-orange-500',
    highlight: 'Documentación completa',
  },
];

// Plans
const plans = [
  {
    name: 'Starter',
    price: '149.000',
    properties: '20',
    users: '3',
    features: ['CRM de candidatos', 'Publicación en portales', 'Contratos digitales', 'Scoring IA básico', 'Soporte email'],
    color: 'slate',
  },
  {
    name: 'Growth',
    price: '399.000',
    properties: '100',
    users: '10',
    popular: true,
    features: ['Todo en Starter', 'API REST básica', 'Reportes avanzados', 'Recordatorios automáticos', 'Soporte prioritario'],
    color: 'blue',
  },
  {
    name: 'Business',
    price: '899.000',
    properties: '300',
    users: '25',
    features: ['Todo en Growth', 'API REST completa', 'Webhooks tiempo real', 'Multi-sucursal', 'Gerente dedicado'],
    color: 'violet',
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    properties: 'Ilimitado',
    users: 'Ilimitado',
    features: ['Todo en Business', 'White-label completo', 'SLA garantizado 99.9%', 'Onboarding personalizado', 'Soporte 24/7'],
    isEnterprise: true,
    color: 'slate',
  },
];

// Benefits with stats
const benefits = [
  {
    icon: Clock,
    title: 'Ahorra tiempo',
    description: 'Automatiza evaluaciones, recordatorios y cobros.',
    stat: '10+',
    statLabel: 'horas/semana',
  },
  {
    icon: Zap,
    title: 'Cierra más rápido',
    description: 'De candidato a inquilino firmado.',
    stat: '48h',
    statLabel: 'promedio',
  },
  {
    icon: Shield,
    title: 'Reduce el riesgo',
    description: 'Scoring de IA con alta precisión.',
    stat: '92%',
    statLabel: 'precisión',
  },
  {
    icon: TrendingUp,
    title: 'Escala sin límites',
    description: 'Gestiona más propiedades sin más personal.',
    stat: '4x',
    statLabel: 'capacidad',
  },
];

// Testimonials with company info
const testimonials = [
  {
    quote: 'Pasamos de gestionar 50 propiedades a 200 sin aumentar el equipo. La automatización es clave.',
    author: 'Inmobiliaria Santafé',
    role: 'Bogotá, 200+ propiedades',
    image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&h=400&fit=crop&q=80',
    rating: 5,
  },
  {
    quote: 'El API nos permitió integrar con nuestro ERP existente. Migración sin fricciones en solo 2 semanas.',
    author: 'Grupo Inmobiliario Antioquia',
    role: 'Medellín, 350+ propiedades',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=400&fit=crop&q=80',
    rating: 5,
  },
  {
    quote: 'El scoring con IA redujo nuestros impagos en un 60%. El ROI fue inmediato desde el primer mes.',
    author: 'Arriendos del Valle',
    role: 'Cali, 120+ propiedades',
    image: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=400&h=400&fit=crop&q=80',
    rating: 5,
  },
];

// Integration logos
const integrations = [
  { name: 'Fincaraíz', logo: '/logos/fincaraiz.svg' },
  { name: 'Metrocuadrado', logo: '/logos/metrocuadrado.svg' },
  { name: 'Ciencuadras', logo: '/logos/ciencuadras.svg' },
];

// Visual components for features
function CRMVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground">Candidatos activos</span>
        <span className="text-xs text-muted-foreground">Hoy</span>
      </div>
      {['María López', 'Carlos Ruiz', 'Ana García'].map((name, i) => (
        <motion.div
          key={name}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
            {name.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-[10px] text-muted-foreground">Apto 301 - Chapinero</p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : i === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
            {i === 0 ? 'Pendiente' : i === 1 ? 'Aprobado' : 'En revisión'}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function ScoringVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border p-4"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Score de riesgo</p>
          <p className="text-[10px] text-muted-foreground">Análisis completado</p>
        </div>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-3">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: '85%' }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">85</span>
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
          Bajo riesgo
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-border space-y-1.5">
        {['Historial crediticio', 'Estabilidad laboral', 'Referencias'].map((item, i) => (
          <div key={item} className="flex items-center gap-2 text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-muted-foreground">{item}</span>
            <span className="ml-auto text-foreground font-medium">{90 - i * 5}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ContractsVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border p-4"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Contrato #2024-0847</p>
          <p className="text-[10px] text-muted-foreground">Creado hace 2 min</p>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Inquilino</span>
          <span className="text-foreground">María López</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Propiedad</span>
          <span className="text-foreground">Apto 301, Ed. Torre Norte</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Canon</span>
          <span className="text-foreground">$2.500.000/mes</span>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white dark:ring-card">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white dark:ring-card">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">2/2 firmado</span>
      </div>
    </motion.div>
  );
}

function APIVisual() {
  return (
    <motion.div
      className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-4 font-mono text-xs"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="ml-2 text-slate-400 text-[10px]">api.arriendofacil.co</span>
      </div>
      <div className="space-y-1">
        <p className="text-slate-400">
          <span className="text-emerald-400">GET</span> /v1/candidates
        </p>
        <p className="text-slate-500">{'// Response'}</p>
        <p className="text-amber-400">{'{'}</p>
        <p className="text-slate-300 pl-2">&quot;data&quot;: [</p>
        <p className="text-slate-300 pl-4">{'{ "id": 1, "score": 85 }'}</p>
        <p className="text-slate-300 pl-2">],</p>
        <p className="text-slate-300 pl-2">&quot;total&quot;: <span className="text-cyan-400">247</span></p>
        <p className="text-amber-400">{'}'}</p>
      </div>
    </motion.div>
  );
}

const visuals: Record<string, () => JSX.Element> = {
  crm: CRMVisual,
  scoring: ScoringVisual,
  contracts: ContractsVisual,
  api: APIVisual,
};

export default function InmobiliariasPage() {
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
              src="/hero-7.jpg"
              alt="Modern apartment interior"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/45" />
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
                    <Building2 className="w-3.5 h-3.5" />
                    Para inmobiliarias profesionales
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
                >
                  Escala tu operación
                  <span className="block mt-2 text-white/90">
                    con tecnología
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  CRM de candidatos, evaluación con IA, contratos digitales y API completa.
                  <span className="text-white font-medium"> Gestiona más propiedades con menos esfuerzo.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/auth">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg">
                      Empezar prueba gratis
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <a href="mailto:ventas@arriendofacil.co">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Ver demo
                    </Button>
                  </a>
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

              {/* Right - Dashboard Preview */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotateY: -10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden lg:block"
              >
                <div className="relative">
                  {/* Main Dashboard Card */}
                  <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-2xl p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-white font-semibold">Panel de control</h3>
                        <p className="text-slate-400 text-sm">Inmobiliaria Santafé</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-slate-400">En vivo</span>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'Propiedades', value: '127', change: '+12%' },
                        { label: 'Candidatos', value: '43', change: '+8%' },
                        { label: 'Contratos', value: '12', change: '+25%' },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-white/5 rounded-xl p-3">
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-slate-400">{stat.label}</p>
                            <span className="text-[10px] text-emerald-400">{stat.change}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recent Activity */}
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Actividad reciente</p>
                      {[
                        { action: 'Nuevo candidato', detail: 'Carlos Ruiz para Apto 301', time: '2 min' },
                        { action: 'Contrato firmado', detail: 'María López - Ed. Torre Norte', time: '15 min' },
                        { action: 'Scoring completado', detail: 'Score: 85 - Bajo riesgo', time: '1 hora' },
                      ].map((item, i) => (
                        <motion.div
                          key={item.action}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="flex items-center gap-3 bg-white/5 rounded-lg p-3"
                        >
                          <div className={`w-8 h-8 rounded-lg ${i === 0 ? 'bg-blue-500/20' : i === 1 ? 'bg-emerald-500/20' : 'bg-violet-500/20'} flex items-center justify-center`}>
                            {i === 0 ? <Users className="w-4 h-4 text-blue-400" /> : i === 1 ? <FileText className="w-4 h-4 text-emerald-400" /> : <BarChart3 className="w-4 h-4 text-violet-400" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-white">{item.action}</p>
                            <p className="text-xs text-slate-400">{item.detail}</p>
                          </div>
                          <span className="text-xs text-slate-500">{item.time}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Floating Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, x: -20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="absolute -bottom-6 -left-6 bg-white dark:bg-card rounded-2xl shadow-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <Rocket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">14 días gratis</p>
                        <p className="text-xs text-muted-foreground">Sin tarjeta de crédito</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating Stat */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="absolute -top-4 -right-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-xl p-3 text-white"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-semibold">+40% eficiencia</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2"
            >
              <motion.div className="w-1.5 h-1.5 rounded-full bg-white" />
            </motion.div>
          </motion.div>
        </section>

        {/* Trust Bar */}
        <section className="py-12 bg-muted/30 border-y border-border">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <p className="text-sm text-muted-foreground">Integraciones disponibles con los principales portales</p>
              <div className="flex items-center gap-12 opacity-60">
                {['Fincaraíz', 'Metrocuadrado', 'Ciencuadras', 'Properati'].map((name) => (
                  <span key={name} className="text-lg font-semibold text-muted-foreground">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full px-3 py-1 mb-4">
                Herramientas profesionales
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Todo lo que tu equipo necesita
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Plataforma completa para gestionar propiedades de forma eficiente
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                const Visual = visuals[feature.visual];
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative bg-card rounded-3xl border border-border p-8 hover:shadow-xl transition-all duration-300"
                  >
                    {/* Gradient accent */}
                    <div className={`absolute top-0 left-8 right-8 h-1 bg-gradient-to-r ${feature.gradient} rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground mb-1">
                              {feature.title}
                            </h3>
                            {feature.highlight && (
                              <span className={`text-sm font-semibold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                                {feature.highlight}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      <div className="md:w-[220px] flex-shrink-0">
                        <Visual />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Building2, title: 'Multi-propiedad', desc: 'Gestiona cientos desde un panel' },
                { icon: Palette, title: 'White-label', desc: 'Tu marca, nuestra tecnología' },
                { icon: Globe, title: 'Multi-sucursal', desc: 'Organiza por ubicación' },
                { icon: Layers, title: 'Reportes', desc: 'Analytics en tiempo real' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border border-border p-5 text-center hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Planes que escalan contigo
              </h2>
              <p className="text-muted-foreground">
                Paga por lo que usas. Sin contratos largos. Cancela cuando quieras.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative bg-card border rounded-2xl p-6 ${
                    plan.popular ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
                  } hover:shadow-xl transition-all duration-300`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-medium px-4 py-1 rounded-full">
                      Más popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-4 mb-6">
                    {plan.isEnterprise ? (
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-muted-foreground text-sm">/mes</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-4 mb-6 pb-6 border-b border-border">
                    <div className="text-center flex-1">
                      <p className="text-lg font-semibold text-foreground">{plan.properties}</p>
                      <p className="text-xs text-muted-foreground">propiedades</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-lg font-semibold text-foreground">{plan.users}</p>
                      <p className="text-xs text-muted-foreground">usuarios</p>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.isEnterprise ? 'Contactar ventas' : 'Empezar gratis'}
                  </Button>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/pricing">
                <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                  Ver comparación completa de planes
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-24 bg-slate-900 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Resultados reales
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Inmobiliarias que usan nuestra plataforma ven resultados desde el primer mes
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="mb-3">
                      <span className="text-3xl font-bold text-white">{benefit.stat}</span>
                      <span className="text-xs text-slate-400 ml-1">{benefit.statLabel}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-sm text-slate-400">{benefit.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Inmobiliarias que confían en nosotros
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Historias de éxito de nuestros clientes
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, i) => (
                <motion.div
                  key={testimonial.author}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative bg-card rounded-2xl border border-border p-6 hover:shadow-xl transition-all duration-300"
                >
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-blue-500/10" />

                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-foreground mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>

                  <div className="flex items-center gap-4">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      width={48}
                      height={48}
                      className="rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                ¿Listo para escalar
                <span className="block">tu inmobiliaria?</span>
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Prueba gratis por 14 días. Sin tarjeta de crédito. Configuración en 5 minutos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg shadow-slate-950/30">
                    Empezar prueba gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <a href="mailto:ventas@arriendofacil.co">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 font-medium text-lg h-14 px-10 rounded-sm"
                  >
                    Hablar con ventas
                  </Button>
                </a>
              </div>
              <p className="text-sm text-slate-500">
                Soporte local · Migración asistida · Sin contratos largos
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
