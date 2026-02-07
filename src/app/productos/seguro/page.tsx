'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { CTASection } from '@/components/home/CTASection';
import { FAQSection } from '@/components/home/FAQSection';
import { CaretLeft, CaretRight, CheckCircle, Shield, Umbrella, House, Money, Scales, Clock, FileText, Phone, Warning, SealCheck, Wallet, Gavel, HandCoins, ShieldCheck, Calendar, Checks, Lightning, Drop, Wrench, WarningCircle, Calculator, XCircle, TrendDown, Users, Sparkle } from '@phosphor-icons/react';

// Testimonials data for insurance
const testimonials = [
  {
    quote: 'Mi inquilino dejó de pagar en el mes 4. Arriendo me pagó los siguientes 8 meses mientras resolvían el proceso legal. Cero estrés.',
    author: 'Patricia Vargas',
    role: 'Propietaria en Bogotá',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'El inquilino dejó el apartamento destruido. El seguro cubrió $8 millones en reparaciones. Sin ese respaldo, habría sido una pérdida total.',
    author: 'Nicolás García',
    role: 'Inversionista inmobiliario',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'El proceso de reclamación fue increíblemente simple. Reporté el impago un lunes y el miércoles ya tenía el dinero en mi cuenta.',
    author: 'Ana María Restrepo',
    role: 'Propietaria de 3 apartamentos',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Lo mejor es la tranquilidad. Sé que pase lo que pase, mi inversión está protegida. Vale cada peso de la prima mensual.',
    author: 'Roberto Jiménez',
    role: 'Propietario en Medellín',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

// Plans data
const plans = [
  {
    name: 'Básico',
    price: '2.5%',
    priceLabel: 'del canon mensual',
    coverage: '6 meses',
    features: ['Impago de arriendo (6 meses)', 'Gastos legales básicos', 'Daños hasta $5M', 'Soporte telefónico'],
  },
  {
    name: 'Plus',
    price: '3.5%',
    priceLabel: 'del canon mensual',
    coverage: '12 meses',
    popular: true,
    features: ['Impago de arriendo (12 meses)', 'Gastos legales completos', 'Daños hasta $10M', 'Servicios públicos hasta $2M', 'Abogado dedicado'],
  },
  {
    name: 'Premium',
    price: '5%',
    priceLabel: 'del canon mensual',
    coverage: '12 meses + extras',
    features: ['Todo en Plus', 'Daños hasta $20M', 'Servicios públicos hasta $5M', 'Lucro cesante (3 meses)', 'Gestor de caso personal', 'Pago en 24h'],
  },
];

export default function SeguroPage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 2) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 2 + testimonials.length) % testimonials.length);
  };

  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        {/* Hero Section */}
        <section className="relative h-[600px] overflow-hidden bg-black">
          <Image
            src="/hero-interior.jpg"
            alt="Modern apartment interior"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40 z-[1]" />

          <div className="relative z-10 h-full container-platform pt-[72px] flex items-center">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
              {/* Left Content */}
              <div className="space-y-4">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 text-xs font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Seguro de arrendamiento
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  Arrienda tranquilo,
                  <span className="block mt-2 text-white/90">nosotros cubrimos</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  Protección total contra impagos, daños y gastos legales.{' '}
                  <span className="text-white font-medium">Si tu inquilino no paga, nosotros sí.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/auth">
                    <Button size="lg" variant="white" className="w-full sm:w-auto font-semibold h-12 px-6 rounded-xl">
                      Cotizar seguro
                    </Button>
                  </Link>
                  <Link href="#coberturas">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium h-12 px-6 rounded-xl"
                    >
                      Ver coberturas
                    </Button>
                  </Link>
                </motion.div>

                {/* Hero Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-8 pt-6"
                >
                  {[
                    { value: '100%', label: 'Cobertura' },
                    { value: '12', label: 'Meses máx.' },
                    { value: '48h', label: 'Pago siniestro' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                      <p className="text-[11px] text-white/50 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right - Hero Card */}
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="hidden lg:flex lg:justify-end"
              >
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="bg-white/10 backdrop-blur-2xl rounded-xl border border-white/15 p-5 shadow-2xl w-[300px]"
                  >
                    {/* Policy Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                      <div>
                        <p className="text-white/50 text-[11px]">Póliza de Seguro</p>
                        <p className="text-white font-semibold text-[14px]">#SEG-2026-0392</p>
                      </div>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, type: "spring" }}
                        className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-medium"
                      >
                        ✓ Activa
                      </motion.span>
                    </div>

                    {/* Property Info */}
                    <div className="bg-white/[0.06] rounded-lg p-3 mb-4 border border-white/[0.06]">
                      <p className="text-[10px] text-white/40 mb-1">Inmueble asegurado</p>
                      <p className="text-[13px] font-medium text-white">Apto 502, Ed. Palma Real</p>
                      <p className="text-[11px] text-white/50">Usaquén, Bogotá</p>
                    </div>

                    {/* Coverage Summary */}
                    <div className="space-y-2.5 mb-4">
                      {[
                        { label: 'Impago de arriendo', value: '12 meses', icon: Money },
                        { label: 'Daños al inmueble', value: 'Hasta $10M', icon: House },
                        { label: 'Gastos legales', value: 'Incluido', icon: Gavel },
                      ].map((item, i) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                              <item.icon className="w-3 h-3 text-white/60" />
                            </div>
                            <span className="text-[11px] text-white/60">{item.label}</span>
                          </div>
                          <span className="text-[11px] font-medium text-white">{item.value}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Premium */}
                    <div className="pt-3 border-t border-white/[0.08]">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] text-white/50">Prima mensual</span>
                        <div className="text-right">
                          <span className="text-[18px] font-semibold text-white">$87.500</span>
                          <span className="text-[10px] text-white/40 ml-1">/mes</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -bottom-5 -left-4 bg-white rounded-xl shadow-xl p-3.5 border border-neutral-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">98% siniestros</p>
                        <p className="text-[11px] text-muted-foreground">pagados en 48h</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Problems Bento Section */}
        <section className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Sin seguro, un impago puede <span className="italic">arruinarte</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Meses sin cobrar, gastos legales, daños... los riesgos del arrendamiento son reales y costosos.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row - Image Cards with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5">
              {/* Card 1 - Default Rate */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-2.jpg"
                  alt="Interior moderno"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Impago
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    15%
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    de inquilinos dejan de pagar
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    La mora en arriendos ha crecido 40% en los últimos 3 años. No es si pasará, es cuándo.
                  </p>
                </div>
              </motion.div>

              {/* Card 2 - Legal Costs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-3.jpg"
                  alt="Espacio moderno"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Legal
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    $8M
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    costo promedio de desalojo
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Abogados, procesos, tiempos muertos. Un desalojo puede tardar 6-12 meses y costarte millones.
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - Property Damage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-5.jpg"
                  alt="Habitación moderna"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Daños
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    $5M
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    en daños por inquilino promedio
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Paredes, pisos, instalaciones... el depósito nunca alcanza para cubrir los daños reales.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Robottom Row - Illustration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Card 4 - Months Without Income Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-sand-50 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center min-h-[280px]"
              >
                <div className="flex-shrink-0 relative">
                  <div className="bg-white rounded-xl shadow-lg p-4 w-[200px] border border-neutral-100">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-neutral-100">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <TrendDown className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-foreground">Flujo de caja</p>
                        <p className="text-[10px] text-red-500 font-medium">En riesgo</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { month: 'Enero', status: 'paid', amount: '$2.5M' },
                        { month: 'Febrero', status: 'paid', amount: '$2.5M' },
                        { month: 'Marzo', status: 'unpaid', amount: '$0' },
                        { month: 'Abril', status: 'unpaid', amount: '$0' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">{item.month}</span>
                          <span className={item.status === 'paid' ? 'text-emerald-600' : 'text-red-500 font-medium'}>
                            {item.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-neutral-100 my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Pérdida acumulada:</span>
                      <span className="text-[12px] text-red-500 font-bold">-$5M</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground leading-tight mb-3">
                    {'"'}Ya van 3 meses sin pagar{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Mientras dura el proceso legal, sigues pagando administración, servicios e impuestos. Sin seguro, el hueco crece cada mes.
                  </p>
                </div>
              </motion.div>

              {/* Card 5 - Unexpected Costs Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-sand-50 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center min-h-[280px]"
              >
                <div className="flex-shrink-0 relative">
                  <div className="bg-white rounded-xl shadow-lg p-4 w-[200px] border border-neutral-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-medium text-foreground">Gastos inesperados</span>
                      <Warning className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                      {[
                        { item: 'Abogado desalojo', amount: '$3.5M' },
                        { item: 'Pintura completa', amount: '$2.2M' },
                        { item: 'Reparar pisos', amount: '$1.8M' },
                        { item: 'Deuda de servicios', amount: '$800K' },
                      ].map((expense, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] p-1.5 bg-neutral-50 rounded">
                          <span className="text-muted-foreground">{expense.item}</span>
                          <span className="text-red-500">{expense.amount}</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-neutral-100 my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Total:</span>
                      <span className="text-[14px] text-red-500 font-bold">$8.3M</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground leading-tight mb-3">
                    {'"'}El depósito no alcanza{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Un mes de depósito contra $8 millones en gastos reales. La matemática no cierra sin un seguro adecuado.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Coverages Bento Section */}
        <section id="coberturas" className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Protección <span className="italic">completa</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Cuatro coberturas diseñadas para proteger tu inversión inmobiliaria.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - Rent Default Coverage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="md:col-span-7 bg-foreground rounded-xl p-8 min-h-[360px] flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                    <Money className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-[28px] md:text-[32px] font-heading font-medium text-white leading-tight mb-3">
                    Impago de Arriendo
                  </h3>
                  <p className="text-[15px] text-white/70 leading-relaxed max-w-md">
                    Cubrimos hasta 12 meses de canon mensual si tu inquilino deja de pagar. Sin deducibles, sin letra pequeña.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-6">
                  {['Hasta 12 meses', '$0 deducible', 'Pago en 48h'].map((item, i) => (
                    <span key={i} className="text-[12px] text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Legal Coverage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
                    <Gavel className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground leading-tight mb-3">
                    Gastos Legales
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Abogados especializados en arrendamiento. Honorarios, costas y gastos de proceso de desalojo 100% cubiertos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Abogado dedicado', 'Honorarios incluidos', 'Proceso completo'].map((item, i) => (
                    <span key={i} className="text-[12px] text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Property Damage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                    <House className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground leading-tight mb-3">
                    Daños al Inmueble
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Reparamos daños causados por el inquilino más allá del desgaste normal. Pintura, pisos, instalaciones eléctricas y plomería.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Hasta $10M', 'Sin deducible', 'Reparación directa'].map((item, i) => (
                    <span key={i} className="text-[12px] text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Large Card - Utilities */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="md:col-span-7 relative rounded-xl overflow-hidden min-h-[360px] group"
              >
                <Image
                  src="/hero-4.jpg"
                  alt="Propiedad moderna"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Drop className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[28px] md:text-[32px] font-heading font-medium text-white leading-tight mb-3">
                      Servicios Públicos
                    </h3>
                    <p className="text-[15px] text-white/70 leading-relaxed max-w-md mb-6">
                      Cubrimos deudas de servicios públicos dejadas por el inquilino: agua, luz, gas e internet hasta $2M.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Agua', 'Luz', 'Gas', 'Internet'].map((item, i) => (
                        <span key={i} className="text-[12px] text-white/80 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Así de <span className="italic">simple</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Activación inmediata, gestión simple, pago rápido.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {[
                { number: '01', title: 'Contrata al firmar', description: 'Activa el seguro al momento de firmar el contrato. Cobertura inmediata sin período de carencia.', icon: FileText },
                { number: '02', title: 'Monitoreo continuo', description: 'Nuestro sistema detecta automáticamente pagos atrasados y te notifica al instante.', icon: Clock },
                { number: '03', title: 'Reporta el siniestro', description: 'Si el inquilino incumple, reporta en la app. Un gestor te contacta en menos de 24h.', icon: Phone },
                { number: '04', title: 'Recibe tu pago', description: 'Nosotros te pagamos el canon mientras gestionamos la recuperación con el inquilino.', icon: Wallet },
              ].map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-sand-50 rounded-xl p-6 min-h-[240px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider">Paso {step.number}</span>
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <step.icon className="w-5 h-5 text-foreground/60" />
                    </div>
                  </div>
                  <h3 className="text-[18px] font-heading font-medium text-foreground mb-2">{step.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20 text-center">
              <h2 className="text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em] mb-4">
                Planes de <span className="italic">seguro</span>
              </h2>
              <p className="text-[15px] text-muted-foreground max-w-xl mx-auto">
                Elige el nivel de protección que necesitas para tu propiedad.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 max-w-5xl mx-auto">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative rounded-xl p-6 flex flex-col min-h-[420px] ${
                    plan.popular
                      ? 'bg-foreground text-white lg:-mt-4 lg:mb-4'
                      : 'bg-white border border-neutral-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-foreground shadow-md">
                        <Sparkle className="w-3 h-3" />
                        Recomendado
                      </span>
                    </div>
                  )}

                  <div className="mb-6 pt-2">
                    <h3 className={`text-[20px] font-heading font-medium ${plan.popular ? 'text-white' : 'text-foreground'}`}>
                      {plan.name}
                    </h3>
                    <div className="mt-3">
                      <span className={`text-[40px] font-heading font-medium tracking-tight ${plan.popular ? 'text-white' : 'text-foreground'}`}>
                        {plan.price}
                      </span>
                      <span className={`text-[14px] ml-1 ${plan.popular ? 'text-white/60' : 'text-muted-foreground'}`}>
                        {plan.priceLabel}
                      </span>
                    </div>
                    <p className={`text-[13px] mt-1 ${plan.popular ? 'text-white/50' : 'text-muted-foreground'}`}>
                      Cobertura: {plan.coverage}
                    </p>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, fi) => (
                      <div key={fi} className="flex items-start gap-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          plan.popular ? 'bg-white/20' : 'bg-emerald-100'
                        }`}>
                          <CheckCircle className={`w-3 h-3 ${plan.popular ? 'text-white' : 'text-emerald-600'}`} />
                        </div>
                        <span className={`text-[13px] ${plan.popular ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full h-11 rounded-xl ${
                      plan.popular
                        ? 'bg-white text-foreground hover:bg-white/90 font-semibold'
                        : 'bg-foreground text-white hover:bg-foreground/90'
                    }`}
                  >
                    Cotizar plan
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-white overflow-hidden">
          <div className="container-platform py-[80px] pb-[100px]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="lg:sticky lg:top-32"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-[6px] h-[6px] rounded-full bg-primary" />
                  <span className="text-[16px] tracking-[-0.32px] leading-[21.6px] text-muted-foreground">
                    Testimonios
                  </span>
                </div>

                <h2 className="text-[40px] md:text-[58px] font-heading font-normal text-foreground tracking-[-4.176px] leading-[1.05] mb-10">
                  Propietarios protegidos
                </h2>

                <div className="flex gap-3">
                  <button
                    onClick={prevTestimonial}
                    className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-black/5 transition-colors"
                    aria-label="Anterior testimonio"
                  >
                    <CaretLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextTestimonial}
                    className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-black/5 transition-colors"
                    aria-label="Siguiente testimonio"
                  >
                    <CaretRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                <AnimatePresence mode="popLayout">
                  {[0, 1].map((offset) => {
                    const index = (currentIndex + offset) % testimonials.length;
                    const testimonial = testimonials[index];
                    return (
                      <motion.div
                        key={`${index}-${currentIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, delay: offset * 0.1 }}
                        className="bg-white rounded-xl p-8 flex flex-col"
                      >
                        <div className="mb-6">
                          <svg className="w-10 h-10 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                          </svg>
                        </div>

                        <p className="text-[24px] tracking-[-0.96px] leading-[29.28px] text-foreground mb-8 flex-grow">
                          {testimonial.quote}
                        </p>

                        <div className="flex items-center gap-4">
                          <div className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={testimonial.image}
                              alt={testimonial.author}
                              width={52}
                              height={52}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div>
                            <p className="text-[16px] font-normal text-foreground tracking-[-0.32px] leading-[21.6px]">
                              {testimonial.author}
                            </p>
                            <p className="text-[16px] text-muted-foreground tracking-[-0.32px] leading-[21.6px]">
                              {testimonial.role}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
