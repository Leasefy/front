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
  FileText,
  Search,
  Star,
  Repeat,
  Lock,
  Wallet,
  Home,
  Sparkles,
  BadgeCheck,
  MapPin,
  Heart,
  Zap,
  Quote,
  Play,
  Infinity as InfinityIcon,
} from 'lucide-react';

// Hero stats
const heroStats = [
  { value: '500+', label: 'Propiedades', sublabel: 'disponibles' },
  { value: '100%', label: 'Verificadas', sublabel: 'sin estafas' },
  { value: '1 clic', label: 'Para aplicar', sublabel: 'con tu perfil' },
];

// Steps with enhanced design
const steps = [
  {
    number: '01',
    title: 'Crea tu perfil',
    description: 'Sube tus documentos una sola vez. Verificamos tu identidad e historial en minutos.',
    icon: BadgeCheck,
    color: 'emerald',
  },
  {
    number: '02',
    title: 'Busca propiedades',
    description: 'Usa nuestra búsqueda con IA o filtra por ubicación, precio y características.',
    icon: Search,
    color: 'cyan',
  },
  {
    number: '03',
    title: 'Aplica con un clic',
    description: 'Tu perfil verificado se envía al propietario. Sin papeleo repetitivo.',
    icon: Zap,
    color: 'violet',
  },
  {
    number: '04',
    title: 'Firma y múdate',
    description: 'Contrato digital, pago del primer mes y listo. Bienvenido a tu nuevo hogar.',
    icon: Home,
    color: 'amber',
  },
];

// Features with visuals
const features = [
  {
    icon: Search,
    title: 'Búsqueda inteligente con IA',
    description: 'Describe lo que buscas en lenguaje natural: "apartamento cerca del centro, pet-friendly, con balcón". Nuestra IA entiende tu estilo de vida.',
    visual: 'search',
    gradient: 'from-cyan-500 to-teal-500',
  },
  {
    icon: Repeat,
    title: 'Arriendo Pass',
    description: 'Paga tu verificación una vez y aplica a propiedades ilimitadas por 60 días. Tu perfil verificado te acompaña en toda tu búsqueda.',
    visual: 'pass',
    gradient: 'from-emerald-500 to-green-500',
    highlight: 'Desde $39.900',
  },
  {
    icon: Shield,
    title: 'Propiedades 100% verificadas',
    description: 'Cada propiedad es verificada por nuestro equipo. Fotos reales, propietarios confirmados, precios transparentes. Cero estafas.',
    visual: 'verified',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: FileText,
    title: 'Contratos claros y digitales',
    description: 'Contratos conformes a la Ley 820/2003. Firma desde tu celular, almacenamiento seguro, descarga en PDF. Sabes exactamente qué firmas.',
    visual: 'contract',
    gradient: 'from-amber-500 to-orange-500',
  },
];

// Additional benefits
const benefits = [
  {
    icon: Clock,
    title: 'Ahorra tiempo',
    description: 'Aplica en segundos, no horas.',
    stat: '10x',
    statLabel: 'más rápido',
  },
  {
    icon: Lock,
    title: 'Datos seguros',
    description: 'Encriptación de nivel bancario.',
    stat: '256',
    statLabel: 'bit SSL',
  },
  {
    icon: Star,
    title: 'Construye historial',
    description: 'Cada pago mejora tu perfil.',
    stat: '+15%',
    statLabel: 'aprobación',
  },
  {
    icon: Wallet,
    title: 'Sin sorpresas',
    description: 'Precios 100% transparentes.',
    stat: '$0',
    statLabel: 'costos ocultos',
  },
];

// Testimonials with photos
const testimonials = [
  {
    quote: 'Encontré apartamento en Chapinero en solo 2 días. El Arriendo Pass me permitió aplicar a 5 propiedades sin volver a llenar formularios.',
    author: 'Andrés Pereira',
    role: 'Inquilino en Bogotá',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    neighborhood: 'Chapinero',
  },
  {
    quote: 'Me mudé de Medellín a Bogotá por trabajo y pude aplicar a propiedades antes de llegar. El proceso fue 100% digital.',
    author: 'Laura Sánchez',
    role: 'Reubicación laboral',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    neighborhood: 'Usaquén',
  },
  {
    quote: 'Como estudiante extranjero, pensé que sería imposible arrendar. Con mi perfil verificado, el propietario confió en mí de inmediato.',
    author: 'Carlos Mendez',
    role: 'Estudiante universitario',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&q=80',
    rating: 5,
    neighborhood: 'Teusaquillo',
  },
];

// Popular neighborhoods
const neighborhoods = [
  { name: 'Chapinero', properties: 85, image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop&q=80' },
  { name: 'Usaquén', properties: 62, image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop&q=80' },
  { name: 'Laureles', properties: 48, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&q=80' },
  { name: 'El Poblado', properties: 73, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop&q=80' },
];

// Visual components for features
function SearchVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Apartamento en Chapinero...</span>
      </div>
      <div className="space-y-2">
        {['Pet-friendly', 'Balcón', 'Cerca al metro', '< $2.5M'].map((tag, i) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="inline-flex items-center gap-1 text-xs bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full px-2.5 py-1 mr-1.5"
          >
            <CheckCircle2 className="w-3 h-3" />
            {tag}
          </motion.span>
        ))}
      </div>
      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        ✨ 12 propiedades encontradas
      </div>
    </motion.div>
  );
}

function PassVisual() {
  return (
    <motion.div
      className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl p-4 text-white relative overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <BadgeCheck className="w-5 h-5" />
          <span className="text-sm font-semibold">Arriendo Pass</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <InfinityIcon className="w-3.5 h-3.5" />
            Aplicaciones ilimitadas
          </div>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Clock className="w-3.5 h-3.5" />
            Válido 60 días
          </div>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Shield className="w-3.5 h-3.5" />
            Perfil verificado
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20">
          <span className="text-2xl font-bold">$39.900</span>
          <span className="text-xs text-white/70 ml-1">COP</span>
        </div>
      </div>
    </motion.div>
  );
}

function VerifiedVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border p-4"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-10 bg-muted rounded-lg overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=112&h=80&fit=crop&q=80"
            alt="Apartment"
            width={56}
            height={40}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Apto Chapinero</p>
          <p className="text-xs text-muted-foreground">$2.200.000/mes</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {['Propietario verificado', 'Fotos reales', 'Precio confirmado'].map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400"
          >
            <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5" />
            </div>
            {item}
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Contrato Digital</p>
          <p className="text-[10px] text-muted-foreground">Ley 820/2003</p>
        </div>
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="h-1.5 bg-muted rounded w-full" />
        <div className="h-1.5 bg-muted rounded w-4/5" />
        <div className="h-1.5 bg-muted rounded w-full" />
        <div className="h-1.5 bg-muted rounded w-3/5" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-foreground">Firmado</span>
        </div>
        <span className="text-[10px] text-emerald-600 font-medium">✓ Válido legalmente</span>
      </div>
    </motion.div>
  );
}

const visuals: Record<string, () => JSX.Element> = {
  search: SearchVisual,
  pass: PassVisual,
  verified: VerifiedVisual,
  contract: ContractVisual,
};

const stepColors: Record<string, { bg: string; text: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', gradient: 'from-cyan-500 to-blue-500' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', gradient: 'from-violet-500 to-purple-500' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-500 to-orange-500' },
};

export default function InquilinosPage() {
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
              alt="Modern apartment"
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
                    Tu próximo hogar está aquí
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
                >
                  Encuentra tu hogar
                  <span className="block mt-2 text-white/90">
                    sin estrés
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  Propiedades verificadas, proceso de aplicación simple, contratos claros.
                  <span className="text-white font-medium"> Arrienda con confianza.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/propiedades">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg">
                      Ver propiedades
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                    >
                      Crear perfil gratis
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

              {/* Right - Property Card */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotateY: -10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden lg:block"
              >
                <div className="relative">
                  {/* Main Property Card - Glass effect */}
                  <div className="bg-white/10 backdrop-blur-2xl rounded-[1px] border border-white/15 overflow-hidden shadow-2xl">
                    <div className="relative h-48">
                      <Image
                        src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&q=80"
                        alt="Beautiful apartment"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Verificado
                        </span>
                      </div>
                      <button className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors border border-white/10">
                        <Heart className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-semibold text-lg">Apartamento Moderno</h3>
                          <p className="text-white/60 text-sm flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Chapinero, Bogotá
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-xl">$2.400.000</p>
                          <p className="text-white/50 text-xs">/mes</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-white/60 text-xs">
                        <span>2 hab</span>
                        <span>2 baños</span>
                        <span>75 m²</span>
                        <span>Piso 8</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Badge - Glass */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, x: -20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-2xl rounded-[1px] shadow-xl p-4 border border-white/15"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[1px] bg-white/15 flex items-center justify-center">
                        <BadgeCheck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Arriendo Pass</p>
                        <p className="text-xs text-white/60">Aplica ilimitado</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating Match - Glass */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="absolute -top-4 -right-4 bg-white/15 backdrop-blur-2xl rounded-[1px] shadow-xl p-3 text-white border border-white/20"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-semibold">95% match</span>
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

        {/* How it Works - Steps */}
        <section className="py-24 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-full px-3 py-1 mb-4">
                Proceso simple
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                De la búsqueda a las llaves
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                4 pasos simples para encontrar tu próximo hogar
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
                Todo pensado para ti
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Herramientas que hacen tu búsqueda más fácil y segura
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
                      <div className="md:w-[200px] flex-shrink-0">
                        <Visual />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Popular Neighborhoods */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Barrios populares
                </h2>
                <p className="text-muted-foreground">
                  Los lugares más buscados por inquilinos como tú
                </p>
              </div>
              <Link href="/propiedades">
                <Button variant="outline" className="gap-2">
                  Ver todos
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {neighborhoods.map((hood, i) => (
                <motion.div
                  key={hood.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer"
                >
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={hood.image}
                      alt={hood.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-lg">{hood.name}</h3>
                    <p className="text-white/70 text-sm">{hood.properties} propiedades</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-24 bg-emerald-900 dark:bg-emerald-950">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Por qué elegirnos
              </h2>
              <p className="text-emerald-200/70 max-w-xl mx-auto">
                Miles de inquilinos ya encontraron su hogar con nosotros
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
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="mb-3">
                      <span className="text-3xl font-bold text-white">{benefit.stat}</span>
                      <span className="text-xs text-emerald-300/70 ml-1">{benefit.statLabel}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-sm text-emerald-200/70">{benefit.description}</p>
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
                Inquilinos felices
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Historias reales de personas que encontraron su hogar
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
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-emerald-500/10" />

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

                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">{testimonial.neighborhood}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" />
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
                <span className="block">te está esperando</span>
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Crea tu perfil gratis y empieza a explorar propiedades verificadas hoy mismo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/propiedades">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-emerald-700 hover:bg-emerald-50 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg shadow-emerald-900/30">
                    Explorar propiedades
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 font-medium text-lg h-14 px-10 rounded-sm"
                  >
                    Ver Arriendo Pass
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/60">
                Sin compromisos · Propiedades 100% verificadas · Soporte en español
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
