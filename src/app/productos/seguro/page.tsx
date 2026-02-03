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
  Umbrella,
  Home,
  Banknote,
  Scale,
  Clock,
  FileText,
  Phone,
  AlertTriangle,
  BadgeCheck,
  Wallet,
  Gavel,
  HandCoins,
  ShieldCheck,
} from 'lucide-react';

// Hero stats
const heroStats = [
  { value: '100%', label: 'Cobertura', sublabel: 'de canon mensual' },
  { value: '12', label: 'Meses', sublabel: 'de protección' },
  { value: '48h', label: 'Pago', sublabel: 'de siniestro' },
];

// Coverage items
const coverages = [
  {
    icon: Banknote,
    title: 'Impago de arriendo',
    description: 'Cubrimos hasta 12 meses de canon si tu inquilino deja de pagar. Sin deducibles, sin letra pequeña.',
    highlight: 'Hasta 12 meses',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Gavel,
    title: 'Gastos legales',
    description: 'Abogados especializados en arrendamiento. Cubrimos honorarios, costas y gastos de proceso de desalojo.',
    highlight: 'Incluido',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Home,
    title: 'Daños al inmueble',
    description: 'Reparamos daños causados por el inquilino más allá del desgaste normal. Pintura, pisos, instalaciones.',
    highlight: 'Hasta $10M',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: HandCoins,
    title: 'Servicios públicos',
    description: 'Cubrimos deudas de servicios públicos dejadas por el inquilino: agua, luz, gas, internet.',
    highlight: 'Hasta $2M',
    gradient: 'from-blue-500 to-cyan-500',
  },
];

// Plans
const plans = [
  {
    name: 'Básico',
    price: '2.5%',
    priceLabel: 'del canon mensual',
    coverage: '6 meses',
    features: ['Impago de arriendo (6 meses)', 'Gastos legales básicos', 'Daños hasta $5M', 'Soporte telefónico'],
    color: 'slate',
  },
  {
    name: 'Plus',
    price: '3.5%',
    priceLabel: 'del canon mensual',
    coverage: '12 meses',
    popular: true,
    features: ['Impago de arriendo (12 meses)', 'Gastos legales completos', 'Daños hasta $10M', 'Servicios públicos hasta $2M', 'Abogado dedicado'],
    color: 'amber',
  },
  {
    name: 'Premium',
    price: '5%',
    priceLabel: 'del canon mensual',
    coverage: '12 meses + extras',
    features: ['Todo en Plus', 'Daños hasta $20M', 'Servicios públicos hasta $5M', 'Lucro cesante (3 meses)', 'Gestor de caso personal', 'Pago en 24h'],
    color: 'violet',
  },
];

// How it works
const howItWorks = [
  {
    number: '01',
    title: 'Contrata al firmar',
    description: 'Activa el seguro al momento de firmar el contrato. Cobertura inmediata sin período de carencia.',
  },
  {
    number: '02',
    title: 'Monitoreo continuo',
    description: 'Nuestro sistema detecta automáticamente pagos atrasados y te notifica al instante.',
  },
  {
    number: '03',
    title: 'Reporta el siniestro',
    description: 'Si el inquilino incumple, reporta en la app. Un gestor te contacta en menos de 24h.',
  },
  {
    number: '04',
    title: 'Recibe tu pago',
    description: 'Nosotros te pagamos el canon mientras gestionamos la recuperación con el inquilino.',
  },
];

// Trust indicators
const trustIndicators = [
  { value: '98%', label: 'Siniestros pagados' },
  { value: '< 48h', label: 'Tiempo de respuesta' },
  { value: '$2.5B', label: 'Pagados a propietarios' },
  { value: '15K+', label: 'Propiedades aseguradas' },
];

export default function SeguroPage() {
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
              src="/hero-interior.jpg"
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
                    <Shield className="w-3.5 h-3.5" />
                    Seguro de arrendamiento
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
                >
                  Arrienda tranquilo,
                  <span className="block mt-2 text-white/90">
                    nosotros cubrimos
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  Protección total contra impagos, daños y gastos legales.
                  <span className="text-white font-medium"> Si tu inquilino no paga, nosotros sí.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/auth">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg">
                      Cotizar seguro
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="#coberturas">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                    >
                      Ver coberturas
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

              {/* Right - Shield Visual */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden lg:flex items-center justify-center"
              >
                <div className="relative">
                  {/* Main shield */}
                  <motion.div
                    className="w-64 h-72 bg-gradient-to-br from-amber-400 to-orange-500 rounded-t-full rounded-b-[40%] flex items-center justify-center shadow-2xl"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <div className="w-56 h-64 bg-gradient-to-br from-amber-300 to-orange-400 rounded-t-full rounded-b-[40%] flex items-center justify-center">
                      <div className="text-center text-white">
                        <ShieldCheck className="w-20 h-20 mx-auto mb-4" />
                        <p className="text-2xl font-bold">100%</p>
                        <p className="text-sm opacity-80">Protegido</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating cards */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, x: -30 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="absolute -bottom-6 -left-16 bg-white dark:bg-card rounded-2xl shadow-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                        <Banknote className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Impago cubierto</p>
                        <p className="text-xs text-muted-foreground">12 meses</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20, x: 30 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 1 }}
                    className="absolute -top-4 -right-12 bg-white dark:bg-card rounded-2xl shadow-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                        <Gavel className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Legal incluido</p>
                        <p className="text-xs text-muted-foreground">Abogados expertos</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Trust indicators */}
        <section className="py-12 bg-muted/30 border-y border-border">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {trustIndicators.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl font-bold text-foreground">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Coverages */}
        <section id="coberturas" className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-full px-3 py-1 mb-4">
                Coberturas
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Protección completa
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Todo lo que puede salir mal, cubierto
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {coverages.map((coverage, i) => {
                const Icon = coverage.icon;
                return (
                  <motion.div
                    key={coverage.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative bg-card rounded-2xl border border-border p-8 hover:shadow-xl transition-all duration-300"
                  >
                    <div className={`absolute top-0 left-8 right-8 h-1 bg-gradient-to-r ${coverage.gradient} rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${coverage.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-foreground">{coverage.title}</h3>
                          <span className={`text-xs font-semibold bg-gradient-to-r ${coverage.gradient} bg-clip-text text-transparent`}>
                            {coverage.highlight}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{coverage.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                ¿Cómo funciona?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Activación inmediata, gestión simple
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {howItWorks.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative"
                >
                  {i < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-amber-300 via-amber-200 to-transparent dark:from-amber-800 dark:via-amber-900" />
                  )}

                  <div className="relative bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow">
                    <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                      {i + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 mt-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-background">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Planes de seguro
              </h2>
              <p className="text-muted-foreground">
                Elige el nivel de protección que necesitas
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative bg-card border rounded-2xl p-8 ${
                    plan.popular ? 'border-amber-500 ring-2 ring-amber-500/20 scale-105' : 'border-border'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium px-4 py-1 rounded-full">
                      Recomendado
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm"> {plan.priceLabel}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Cobertura: {plan.coverage}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Cotizar
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                No arriesgues tu patrimonio,
                <span className="block">protégelo</span>
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Cotiza tu seguro en 2 minutos y arrienda con la tranquilidad de estar cubierto.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-amber-700 hover:bg-amber-50 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg">
                    Cotizar mi seguro
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/60">
                Cotización gratis · Sin compromisos · Activación inmediata
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
