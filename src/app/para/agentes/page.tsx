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
  DollarSign,
  Users,
  FileText,
  Share2,
  Star,
  Zap,
  TrendingUp,
  Smartphone,
  Sparkles,
  Link as LinkIcon,
  Send,
  BadgeCheck,
  MessageSquare,
  Quote,
  Copy,
  ExternalLink,
  Bell,
  Percent,
  Award,
  Target,
} from 'lucide-react';

// Hero stats
const heroStats = [
  { value: '$0', label: 'Suscripción', sublabel: 'siempre gratis' },
  { value: '2 min', label: 'Para empezar', sublabel: 'genera tu link' },
  { value: '24h', label: 'Resultados', sublabel: 'garantizado' },
];

// How it works steps
const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta gratis',
    description: 'Sin costo de suscripción. Sin tarjeta de crédito. Empieza en 2 minutos.',
    icon: BadgeCheck,
    color: 'amber',
  },
  {
    number: '02',
    title: 'Genera tu link único',
    description: 'Cada propiedad tiene un link personalizado. Cópialo y compártelo.',
    icon: LinkIcon,
    color: 'orange',
  },
  {
    number: '03',
    title: 'Candidatos se evalúan',
    description: 'Ellos llenan sus datos y pagan la evaluación. Tú no haces nada.',
    icon: Users,
    color: 'rose',
  },
  {
    number: '04',
    title: 'Cierra el negocio',
    description: 'Presenta el reporte al propietario, firma contrato y cobra tu comisión.',
    icon: Target,
    color: 'emerald',
  },
];

// Features with visuals
const features = [
  {
    icon: Share2,
    title: 'Link de evaluación',
    description: 'Genera un link único para cada propiedad. Compártelo por WhatsApp, email o redes. Los candidatos llenan todo, tú recibes el reporte.',
    visual: 'link',
    gradient: 'from-amber-500 to-orange-500',
    highlight: '2 min',
  },
  {
    icon: Users,
    title: 'Evaluación completa',
    description: 'Crédito, antecedentes, referencias laborales y score de riesgo. Todo en un solo reporte profesional que impresiona a tus clientes.',
    visual: 'evaluation',
    gradient: 'from-orange-500 to-rose-500',
    highlight: 'GRATIS para ti',
  },
  {
    icon: FileText,
    title: 'Contratos digitales',
    description: 'Plantillas conformes a Ley 820/2003. Personaliza con tus datos, envía a firmar digitalmente. Todo legal y seguro.',
    visual: 'contract',
    gradient: 'from-rose-500 to-pink-500',
    highlight: 'Incluido',
  },
  {
    icon: Smartphone,
    title: 'Todo desde tu celular',
    description: 'Gestiona candidatos, propiedades y contratos desde tu celular. Notificaciones en tiempo real cuando alguien aplica.',
    visual: 'mobile',
    gradient: 'from-violet-500 to-purple-500',
    highlight: 'iOS/Android',
  },
];

// Benefits with stats
const benefits = [
  {
    icon: Clock,
    title: 'Cierra más rápido',
    description: 'Evaluación en minutos, no en días.',
    stat: '10x',
    statLabel: 'más rápido',
  },
  {
    icon: DollarSign,
    title: 'Gana más',
    description: 'Más tiempo para cerrar, más comisiones.',
    stat: '+40%',
    statLabel: 'ingresos',
  },
  {
    icon: Shield,
    title: 'Reduce riesgos',
    description: 'Inquilinos verificados, propietarios felices.',
    stat: '92%',
    statLabel: 'precisión',
  },
  {
    icon: Award,
    title: 'Destaca',
    description: 'Tecnología que otros agentes no tienen.',
    stat: '#1',
    statLabel: 'diferenciación',
  },
];

// Testimonials with photos
const testimonials = [
  {
    quote: 'Mis clientes propietarios me piden específicamente que use esta plataforma. Les da confianza ver un reporte profesional.',
    author: 'Juliana Rodríguez',
    role: 'Agente independiente',
    location: 'Bogotá',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    deals: '15 arriendos/mes',
  },
  {
    quote: 'Antes me tomaba una semana evaluar candidatos. Ahora lo hago en el mismo día de la visita. Mis comisiones se duplicaron.',
    author: 'Carlos Martínez',
    role: 'Agente inmobiliario',
    location: 'Medellín',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    deals: '12 arriendos/mes',
  },
  {
    quote: 'El link de evaluación es brillante. Lo mando por WhatsApp y los candidatos hacen todo solos. Yo solo reviso el reporte.',
    author: 'María Fernanda López',
    role: 'Corredora de finca raíz',
    location: 'Cali',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    deals: '8 arriendos/mes',
  },
];

// Visual components
function LinkVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <LinkIcon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-foreground">Apto 301 - Chapinero</span>
      </div>
      <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
        <span className="text-xs text-muted-foreground truncate flex-1">arriendofacil.co/evaluar/abc123</span>
        <button className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        {['WhatsApp', 'Email', 'Copiar'].map((action, i) => (
          <motion.button
            key={action}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
              i === 0 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {action}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function EvaluationVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border p-4"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Image
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face&q=80"
          alt="Candidate"
          width={40}
          height={40}
          className="rounded-full"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Carlos Ruiz</p>
          <p className="text-[10px] text-muted-foreground">Evaluado hace 2h</p>
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
          Score: 87
        </span>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Historial crediticio', score: 90, color: 'emerald' },
          { label: 'Estabilidad laboral', score: 85, color: 'emerald' },
          { label: 'Referencias', score: 88, color: 'emerald' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="text-foreground font-medium">{item.score}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: `${item.score}%` }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ContractVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border p-4"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Contrato de arrendamiento</p>
          <p className="text-[10px] text-muted-foreground">Ley 820/2003</p>
        </div>
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="h-1.5 bg-muted rounded w-full" />
        <div className="h-1.5 bg-muted rounded w-4/5" />
        <div className="h-1.5 bg-muted rounded w-full" />
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-muted-foreground">Propietario</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center animate-pulse">
            <Clock className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-muted-foreground">Inquilino</span>
        </div>
      </div>
    </motion.div>
  );
}

function MobileVisual() {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="bg-slate-900 rounded-[2rem] p-2 shadow-2xl w-[140px] mx-auto">
        <div className="bg-white dark:bg-card rounded-[1.5rem] overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3">
            <p className="text-white text-[10px] font-medium">Hola, Juliana</p>
            <p className="text-white/80 text-[8px]">3 candidatos nuevos</p>
          </div>
          <div className="p-2 space-y-1.5">
            {['María López', 'Carlos Ruiz', 'Ana García'].map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: -5 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/50"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-[8px] font-bold">
                  {name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-medium text-foreground">{name}</p>
                  <p className="text-[6px] text-muted-foreground">Score: {85 + i * 2}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      {/* Floating notification */}
      <motion.div
        initial={{ opacity: 0, y: 10, x: 10 }}
        whileInView={{ opacity: 1, y: 0, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-2 shadow-lg"
      >
        <Bell className="w-3.5 h-3.5" />
      </motion.div>
    </motion.div>
  );
}

const visuals: Record<string, () => JSX.Element> = {
  link: LinkVisual,
  evaluation: EvaluationVisual,
  contract: ContractVisual,
  mobile: MobileVisual,
};

const stepColors: Record<string, { bg: string; text: string; gradient: string }> = {
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-500 to-orange-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', gradient: 'from-orange-500 to-rose-500' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', gradient: 'from-rose-500 to-pink-500' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
};

export default function AgentesPage() {
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
              src="/hero-6.jpg"
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
                    <Sparkles className="w-3.5 h-3.5" />
                    100% gratis para agentes
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
                >
                  Cierra más arriendos
                  <span className="block mt-2 text-white/90">
                    más rápido
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  Genera un link, compártelo con tus candidatos, recibe evaluaciones profesionales.
                  <span className="text-white font-medium"> Impresiona a tus clientes propietarios.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/auth">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg">
                      Crear cuenta gratis
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="#como-funciona">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                    >
                      Ver cómo funciona
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

              {/* Right - Phone Preview */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotateY: -10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden lg:block"
              >
                <div className="relative">
                  {/* Main Phone */}
                  <div className="bg-slate-900 rounded-[3rem] p-3 shadow-2xl max-w-[280px] mx-auto">
                    <div className="bg-white dark:bg-card rounded-[2.5rem] overflow-hidden">
                      {/* Status bar */}
                      <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-6 py-8">
                        <p className="text-white text-lg font-semibold">Hola, Juliana 👋</p>
                        <p className="text-white/80 text-sm">3 candidatos nuevos hoy</p>
                      </div>

                      {/* Quick stats */}
                      <div className="flex gap-3 px-4 py-4 -mt-4">
                        {[
                          { label: 'Activos', value: '8' },
                          { label: 'Evaluados', value: '12' },
                          { label: 'Cerrados', value: '5' },
                        ].map((stat) => (
                          <div key={stat.label} className="flex-1 bg-white dark:bg-card rounded-xl p-3 shadow-md border border-border text-center">
                            <p className="text-lg font-bold text-foreground">{stat.value}</p>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Recent candidates */}
                      <div className="px-4 pb-6 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground">Candidatos recientes</p>
                        {[
                          { name: 'María López', score: 87, status: 'Aprobado', statusColor: 'emerald' },
                          { name: 'Carlos Ruiz', score: 82, status: 'En revisión', statusColor: 'amber' },
                        ].map((candidate, i) => (
                          <motion.div
                            key={candidate.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + i * 0.1 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold">
                              {candidate.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                              <p className="text-xs text-muted-foreground">Score: {candidate.score}</p>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                              candidate.statusColor === 'emerald'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {candidate.status}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Floating notification */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="absolute -bottom-4 -left-8 bg-white dark:bg-card rounded-2xl shadow-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Nuevo candidato</p>
                        <p className="text-xs text-muted-foreground">Ana García aplicó</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="absolute -top-4 -right-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-xl p-3 text-white"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-semibold">+40% cierres</span>
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

        {/* How it Works */}
        <section id="como-funciona" className="py-24 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-full px-3 py-1 mb-4">
                Así de fácil
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                4 pasos para cerrar más
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Sin papeleo, sin complicaciones, sin costos de suscripción
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => {
                const Icon = step.icon;
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
                    {/* Connector line */}
                    {i < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-border via-border to-transparent" />
                    )}

                    <div className="relative bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow">
                      {/* Step number badge */}
                      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                        {i + 1}
                      </div>

                      <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-4`}>
                        <Icon className={`w-7 h-7 ${colors.text}`} />
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Herramientas que te hacen destacar
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Todo lo que necesitas para impresionar a tus clientes propietarios
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
                            <span className={`text-sm font-semibold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                              {feature.highlight}
                            </span>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      <div className="md:w-[180px] flex-shrink-0">
                        <Visual />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-24 bg-amber-900 dark:bg-amber-950">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Por qué los mejores agentes nos eligen
              </h2>
              <p className="text-amber-200/70 max-w-xl mx-auto">
                Resultados reales de agentes que usan nuestra plataforma
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
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="mb-3">
                      <span className="text-3xl font-bold text-white">{benefit.stat}</span>
                      <span className="text-xs text-amber-300/70 ml-1">{benefit.statLabel}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-sm text-amber-200/70">{benefit.description}</p>
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
                Agentes que ya están cerrando más
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Historias reales de agentes como tú
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
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-amber-500/10" />

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
                      className="rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{testimonial.location}</span>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{testimonial.deals}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Empieza a cerrar más
                <span className="block">arriendos hoy</span>
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Cuenta 100% gratis. Sin suscripción. Sin tarjeta de crédito. Empieza en 2 minutos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-amber-700 hover:bg-amber-50 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg shadow-amber-900/30">
                    Crear cuenta gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="#como-funciona">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 font-medium text-lg h-14 px-10 rounded-sm"
                  >
                    Ver cómo funciona
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/60">
                Sin costos ocultos · Evaluaciones pagas por candidatos · Soporte en español
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
