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
  CreditCard,
  FileSignature,
  Megaphone,
  UserCheck,
  Star,
  TrendingUp,
  Zap,
  Lock,
  Play,
  Quote,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';

// Hero stats
const heroStats = [
  { value: '$0', label: 'Costo de evaluación', sublabel: 'para ti' },
  { value: '48h', label: 'Tiempo promedio', sublabel: 'para encontrar inquilino' },
  { value: '4.9', label: 'Satisfacción', sublabel: 'de propietarios' },
];

// Detailed features with visual mockups
const detailedFeatures = [
  {
    icon: UserCheck,
    title: 'Evaluación de inquilinos',
    pricing: {
      highlight: 'GRATIS',
      detail: 'para propietarios',
      subtext: 'El solicitante paga la evaluación (desde $24.900)',
    },
    description:
      'Identifica inquilinos calificados con verificación de antecedentes, historial crediticio y referencias laborales. Nuestro scoring con IA te da decisiones en minutos.',
    visual: 'screening',
    benefits: [
      'Verificación de identidad',
      'Historial crediticio',
      'Referencias laborales',
      'Score de riesgo con IA',
    ],
    accentColor: 'emerald',
  },
  {
    icon: CreditCard,
    title: 'Cobro de arriendos',
    pricing: {
      highlight: '$3.900',
      detail: 'por transacción',
      subtext: 'PSE, tarjeta o efectivo — inquilino elige',
    },
    description:
      'Automatiza el cobro mensual. Recibimos el pago del inquilino y te transferimos automáticamente. Historial de pagos, recordatorios y reportes incluidos.',
    visual: 'payments',
    benefits: [
      'PSE, tarjeta y efectivo',
      'Transferencia automática',
      'Recordatorios de pago',
      'Historial completo',
    ],
    accentColor: 'blue',
  },
  {
    icon: Megaphone,
    title: 'Publicación en portales',
    pricing: {
      highlight: 'GRATIS',
      detail: 'para propietarios',
      subtext: 'FincaRaíz, Metrocuadrado, Properati y más',
    },
    description:
      'Crea tu anuncio una vez y lo publicamos en los principales portales de Colombia. Recibe candidatos directamente en tu panel sin pagar comisiones.',
    visual: 'marketing',
    benefits: [
      'Un clic, todos los portales',
      'Fotos optimizadas con IA',
      'Candidatos centralizados',
      'Sin comisiones ocultas',
    ],
    accentColor: 'violet',
  },
  {
    icon: FileSignature,
    title: 'Contratos digitales',
    pricing: {
      highlight: 'Incluido',
      detail: 'en todos los planes',
      subtext: 'Firma electrónica con validez legal (Ley 527/1999)',
    },
    description:
      'Genera contratos de arrendamiento conformes a la Ley 820 de 2003. Firma electrónica para ambas partes, almacenamiento seguro y descarga en PDF.',
    visual: 'contracts',
    benefits: [
      'Plantillas legales',
      'Firma electrónica',
      'Almacenamiento seguro',
      'Descarga PDF',
    ],
    accentColor: 'amber',
  },
];

const additionalFeatures = [
  {
    icon: Shield,
    title: 'Póliza de arriendo',
    description: 'Protección contra impago de 12-24 meses. Cobertura de daños y servicios.',
    highlight: 'Desde 2%',
    gradient: 'from-rose-500 to-orange-500',
  },
  {
    icon: TrendingUp,
    title: 'Valoración de mercado',
    description: 'Análisis comparativo con IA para fijar el precio óptimo de tu propiedad.',
    highlight: 'GRATIS',
    gradient: 'from-cyan-500 to-blue-500',
  },
];

const benefits = [
  {
    icon: Clock,
    title: 'Ahorra tiempo',
    description: 'Publica, evalúa y firma en minutos. Todo desde tu celular.',
    stat: '10h',
    statLabel: 'ahorradas/mes',
  },
  {
    icon: CreditCard,
    title: 'Cobra sin esfuerzo',
    description: 'Recordatorios automáticos y transferencias puntuales.',
    stat: '98%',
    statLabel: 'pagos a tiempo',
  },
  {
    icon: Zap,
    title: 'Arrienda más rápido',
    description: 'Candidatos pre-aprobados listos para firmar.',
    stat: '48h',
    statLabel: 'promedio',
  },
  {
    icon: Lock,
    title: 'Reduce el riesgo',
    description: 'Inquilinos verificados con score de confianza.',
    stat: '92%',
    statLabel: 'tasa éxito',
  },
];

const testimonials = [
  {
    quote: 'Antes me demoraba semanas buscando inquilino. Ahora en 3 días ya tenía candidatos verificados y listos para firmar.',
    author: 'Carolina Mendoza',
    role: 'Propietaria en Bogotá',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    properties: 2,
  },
  {
    quote: 'El cobro automático me cambió la vida. Ya no tengo que estar pendiente cada mes ni perseguir a nadie.',
    author: 'Roberto García',
    role: 'Propietario de 3 apartamentos',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    properties: 3,
  },
  {
    quote: 'La evaluación con IA me dio total confianza. El score de riesgo es increíblemente preciso.',
    author: 'Ana Lucía Restrepo',
    role: 'Inversionista inmobiliaria',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    properties: 5,
  },
];

const trustedBy = [
  { name: 'DataCrédito', logo: '📊' },
  { name: 'TransUnion', logo: '🔒' },
  { name: 'Certicámara', logo: '✓' },
];

// Visual mockup components
function ScreeningVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-2xl shadow-emerald-500/10 border border-emerald-100 dark:border-emerald-900/30 p-5 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Image
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=face&q=80"
            alt="Candidate"
            width={48}
            height={48}
            className="rounded-full object-cover ring-2 ring-emerald-500 ring-offset-2"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">María López</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" />
            Verificada
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Score de confianza</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">92</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: '92%' }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {['Identidad', 'Crédito', 'Empleo', 'Referencias'].map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg px-2.5 py-1.5"
          >
            <CheckCircle2 className="w-3 h-3" />
            {item}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function PaymentsVisual() {
  const payments = [
    { month: 'Ene', status: 'paid', amount: '$2.400.000' },
    { month: 'Feb', status: 'paid', amount: '$2.400.000' },
    { month: 'Mar', status: 'pending', amount: '$2.400.000' },
  ];

  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-2xl shadow-blue-500/10 border border-blue-100 dark:border-blue-900/30 p-5 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Marzo 2026
          </span>
          <p className="text-lg font-bold text-foreground">$7.200.000</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-emerald-600 font-medium">+2 pagados</span>
          <p className="text-xs text-muted-foreground">este trimestre</p>
        </div>
      </div>
      <div className="space-y-2">
        {payments.map((payment, i) => (
          <motion.div
            key={payment.month}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-8">{payment.month}</span>
              <span
                className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                  payment.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}
              >
                {payment.status === 'paid' ? 'Pagado' : 'Pendiente'}
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">{payment.amount}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function MarketingVisual() {
  const portals = ['FincaRaíz', 'Metrocuadrado', 'Properati', 'Ciencuadras'];

  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-2xl shadow-violet-500/10 border border-violet-100 dark:border-violet-900/30 p-5 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-20 h-14 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=160&h=112&fit=crop&q=80"
            alt="Apartment"
            width={80}
            height={56}
            className="object-cover rounded-lg"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Apto Chapinero</p>
          <p className="text-xs text-muted-foreground">2 hab · 65m² · $2.4M</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Publicado en:</p>
        <div className="flex flex-wrap gap-1.5">
          {portals.map((portal, i) => (
            <motion.span
              key={portal}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="text-[10px] bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-700 dark:text-violet-400 rounded-full px-2.5 py-1 font-medium"
            >
              {portal} ✓
            </motion.span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border-2 border-white dark:border-card" />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">12 candidatos</span>
        </div>
        <span className="text-xs font-semibold text-emerald-600">3 pre-aprobados</span>
      </div>
    </motion.div>
  );
}

function ContractsVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-2xl shadow-amber-500/10 border border-amber-100 dark:border-amber-900/30 p-5 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <FileSignature className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Contrato de Arrendamiento</p>
          <p className="text-[10px] text-muted-foreground">Ley 820 de 2003</p>
        </div>
      </div>
      <div className="border border-border rounded-xl p-3 space-y-2 bg-muted/30">
        <div className="h-2 bg-muted rounded w-3/4" />
        <div className="h-2 bg-muted rounded w-full" />
        <div className="h-2 bg-muted rounded w-5/6" />
        <div className="h-2 bg-muted rounded w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Propietario</span>
        </motion.div>
        <motion.div
          className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"
          initial={{ opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Inquilino</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

const visuals: Record<string, () => JSX.Element> = {
  screening: ScreeningVisual,
  payments: PaymentsVisual,
  marketing: MarketingVisual,
  contracts: ContractsVisual,
};

const accentColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    gradient: 'from-emerald-500 to-teal-500',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    gradient: 'from-blue-500 to-cyan-500',
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    gradient: 'from-violet-500 to-purple-500',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    gradient: 'from-amber-500 to-orange-500',
  },
};

export default function PropietariosPage() {
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
        {/* Hero Section - Premium Design */}
        <section ref={heroRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Background Image with Parallax */}
          <motion.div
            className="absolute inset-0 z-0"
            style={{ y: heroY }}
          >
            <Image
              src="/hero-interior.jpg"
              alt="Modern apartment interior"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Dark overlays for legibility - like home page */}
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
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15">
                    <Sparkles className="w-3.5 h-3.5" />
                    Plataforma #1 para propietarios en Colombia
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
                >
                  Arrienda tu propiedad
                  <span className="block mt-2 text-white/90">
                    sin comisiones
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  Evaluación de inquilinos gratis, publicación en portales gratis, cobro automatizado.
                  <span className="text-white font-medium"> Tú mantienes el control.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/auth">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg">
                      Comenzar gratis
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                  >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Ver cómo funciona
                  </Button>
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex items-center gap-8 pt-8 border-t border-white/10"
                >
                  {heroStats.map((stat, i) => (
                    <div key={stat.label} className="text-center sm:text-left">
                      <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-white/60 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right - Hero Card */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotateY: -10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden lg:block"
              >
                <div className="relative">
                  {/* Main Card - Glass effect */}
                  <div className="bg-white/10 backdrop-blur-2xl rounded-[1px] border border-white/15 p-6 shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <Image
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face&q=80"
                        alt="Happy landlord"
                        width={56}
                        height={56}
                        className="rounded-[1px] object-cover ring-2 ring-white/20"
                      />
                      <div>
                        <p className="text-white font-semibold">Juan Carlos M.</p>
                        <p className="text-white/60 text-sm">Propietario verificado</p>
                      </div>
                      <BadgeCheck className="w-6 h-6 text-white ml-auto" />
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-[1px] p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/60 text-sm">Ingresos este mes</span>
                          <span className="text-white/80 text-xs font-medium">+12%</span>
                        </div>
                        <p className="text-3xl font-bold text-white">$4.800.000</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/10 backdrop-blur-sm rounded-[1px] p-3 text-center border border-white/10">
                          <p className="text-2xl font-bold text-white">2</p>
                          <p className="text-[10px] text-white/60">Propiedades</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-[1px] p-3 text-center border border-white/10">
                          <p className="text-2xl font-bold text-white">100%</p>
                          <p className="text-[10px] text-white/60">Ocupación</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating notification */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, x: -20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="absolute -bottom-6 -left-6 bg-white dark:bg-card rounded-2xl shadow-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Pago recibido</p>
                        <p className="text-xs text-muted-foreground">$2.400.000 · Hace 2min</p>
                      </div>
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
        <section className="py-6 bg-muted/50 border-y border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              <p className="text-sm text-muted-foreground">Verificaciones powered by:</p>
              {trustedBy.map((partner) => (
                <div key={partner.name} className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xl">{partner.logo}</span>
                  <span className="text-sm font-medium">{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section with Visual Mockups */}
        <section className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
                Herramientas completas
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Todo lo que necesitas para arrendar
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Herramientas profesionales sin costo oculto. El inquilino paga la evaluación, tú no pagas nada.
              </p>
            </motion.div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {detailedFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const Visual = visuals[feature.visual];
                const colors = accentColors[feature.accentColor];

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="group relative bg-card rounded-3xl border border-border p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
                  >
                    {/* Gradient accent line */}
                    <div className={`absolute top-0 left-8 right-8 h-1 bg-gradient-to-r ${colors.gradient} rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex flex-col xl:flex-row gap-8">
                      {/* Content */}
                      <div className="flex-1 space-y-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-7 h-7 ${colors.text}`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-foreground mb-1">
                              {feature.title}
                            </h3>
                            <div className="flex items-baseline gap-2">
                              <span className={`text-2xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
                                {feature.pricing.highlight}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {feature.pricing.detail}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>

                        <p className="text-xs text-muted-foreground/70 italic">
                          {feature.pricing.subtext}
                        </p>

                        <ul className="grid grid-cols-2 gap-3">
                          {feature.benefits.map((benefit) => (
                            <li
                              key={benefit}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <CheckCircle2 className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Visual */}
                      <div className="xl:w-[260px] flex-shrink-0">
                        <Visual />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Additional Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              {additionalFeatures.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                          <span className={`text-sm font-bold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                            {feature.highlight}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-foreground dark:bg-card">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-background dark:text-foreground mb-4">
                Simplifica tu vida de propietario
              </h2>
              <p className="text-background/70 dark:text-muted-foreground max-w-xl mx-auto">
                Menos trabajo, más tranquilidad, mejores resultados
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
                    className="group text-center p-6 rounded-2xl bg-background/5 dark:bg-muted/50 hover:bg-background/10 dark:hover:bg-muted transition-colors"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="mb-3">
                      <span className="text-3xl font-bold text-background dark:text-foreground">{benefit.stat}</span>
                      <span className="text-xs text-background/50 dark:text-muted-foreground ml-1">{benefit.statLabel}</span>
                    </div>
                    <h3 className="font-semibold text-background dark:text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-background/60 dark:text-muted-foreground">{benefit.description}</p>
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
                Propietarios que confían en nosotros
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Más de 500 propietarios ya están ahorrando tiempo y dinero
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
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" />

                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
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
                    <span className="text-xs text-muted-foreground">{testimonial.properties} propiedades</span>
                    <BadgeCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-24 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Empieza a arrendar
                <span className="block">sin complicaciones hoy</span>
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Crea tu cuenta gratis y publica tu primera propiedad en menos de 5 minutos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg shadow-indigo-900/30">
                    Crear cuenta gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 font-medium text-lg h-14 px-10 rounded-sm"
                  >
                    Ver precios
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/60">
                Sin tarjeta de crédito · Configura en 5 minutos · Cancela cuando quieras
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
