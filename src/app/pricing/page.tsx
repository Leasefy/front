'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CTASection } from '@/components/home/CTASection';
import { Shield, Lightning, Headphones, CheckCircle, Check, House, Briefcase, Calculator, Buildings, UserCheck, ArrowRight, Circle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AgencyTierCard, BenefitCard } from '@/components/pricing/AgencyTierCard';
import { PricingFAQSection, pricingFaqs } from '@/components/pricing/PricingFAQSection';

type UserTextT = 'owner-managed' | 'owner-diy' | 'agency' | 'evaluation';
type AgencyPlan = 'starter' | 'growth' | 'business' | 'enterprise' | null;

const PRICING_HERO_IMAGES = [
  '/pricing-hero-1.jpg', // Cozy candlelit room
  '/pricing-hero-2.jpg', // Woman meditating in apartment
  '/pricing-hero-3.jpg', // Person reading by fireplace
  '/pricing-hero-4.jpg', // Couple relaxing in bedroom
];

const HERO_IMAGE_INTERVAL = 6000;

/**
 * Public pricing page - Hybrid Model
 *
 * Three paths:
 * 1. Property owners who want full management (% fee)
 * 2. Property owners who self-manage (DIY subscription)
 * 3. Real estate agencies (business subscription)
 */
export default function PricingPage() {
  const [userTextT, setUserTextT] = useState<UserTextT>('owner-managed');
  const [exampleRent, setExampleRent] = useState(2000000);
  const [selectedAgencyPlan, setSelectedAgencyPlan] = useState<AgencyPlan>(null);
  const [activeHeroImage, setActiveHeroImage] = useState(0);

  // Auto-cycle hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHeroImage((prev) => (prev + 1) % PRICING_HERO_IMAGES.length);
    }, HERO_IMAGE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero Section - Full width like home, starts behind navbar */}
        <section className="relative h-[500px] overflow-hidden bg-black">
          {/* Background — crossfade image slideshow */}
          {PRICING_HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0"
              style={{
                opacity: i === activeHeroImage ? 1 : 0,
                transition: 'opacity 4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <img
                src={src}
                alt={`Interior ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {/* Overlays for legibility */}
          <div className="absolute inset-0 bg-black/25 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/50 z-[1]" />

          {/* Content */}
          <div className="relative z-10 flex flex-col md:flex-row h-full container-platform">
            {/* Left — headline area */}
            <div className="flex-1 flex flex-col justify-end pb-6 md:pb-10">
              <div className="max-w-xl space-y-4">
                {/* Headline */}
                <div className="space-y-2 mb-2">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em]"
                  >
                    Precios simples.
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-base md:text-lg text-white/60"
                  >
                    Administración completa o herramientas para hacerlo tú mismo.
                  </motion.p>
                </div>

                {/* Stats row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap gap-6"
                >
                  {[
                    { value: '5-6%', label: 'Administración' },
                    { value: '$0', label: 'Publicar' },
                    { value: '2,400+', label: 'Clientes' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-baseline gap-2">
                      <span className="text-[24px] font-heading font-bold text-white">{stat.value}</span>
                      <span className="text-[13px] text-white/50">{stat.label}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Right — value props panel */}
            <div className="hidden md:flex items-end justify-end pb-10 w-[340px] flex-shrink-0">
              <div className="w-full space-y-3">
                {[
                  { icon: Shield, label: 'Sin comisiones ocultas', description: 'Precios transparentes, sin letra pequeña ni cargos sorpresa.' },
                  { icon: Lightning, label: 'Cancela cuando quieras', description: 'Sin contratos de permanencia. Flexibilidad total.' },
                  { icon: CheckCircle, label: 'Todo incluido', description: 'Evaluación, contratos, cobro y soporte en un solo lugar.' },
                ].map((prop, i) => {
                  const Icon = prop.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="w-full text-left p-4 rounded-xl bg-white/15 backdrop-blur-2xl border border-white/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[13px] font-mono uppercase font-normal text-white">{prop.label}</p>
                          <p className="text-[12px] leading-relaxed mt-0.5 text-white/60">{prop.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

      {/* User Type Selector - Clear clickable cards */}
      <section className="py-12 md:py-16">
        <div className="container-platform">
          {/* Section intro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground tracking-[-0.02em]">
              ¿Qué necesitas?
            </h2>
            <p className="text-[15px] text-muted-foreground mt-2">
              Elige una opción para ver precios y detalles
            </p>
          </motion.div>

          {/* 4 equal cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Managed */}
            <motion.button
              onClick={() => setUserTextT('owner-managed')}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "group relative text-left rounded-xl overflow-hidden transition-all duration-300 cursor-pointer border-2 bg-white hover:shadow-md hover:ring-1 hover:ring-indigo-200",
                userTextT === 'owner-managed'
                  ? "border-indigo-600 shadow-lg ring-2 ring-indigo-600/10"
                  : "border-neutral-200 hover:border-indigo-300"
              )}
            >
              {userTextT === 'owner-managed' && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[220px]">
                <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-1">
                    Administración completa
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Nosotros cobramos y gestionamos todo</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[24px] font-heading font-bold text-foreground">5-6%</span>
                    <span className="text-[12px] text-muted-foreground">del arriendo</span>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Card 2: DIY */}
            <motion.button
              onClick={() => setUserTextT('owner-diy')}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={cn(
                "group relative text-left rounded-xl overflow-hidden transition-all duration-300 cursor-pointer bg-white border-2 hover:shadow-md hover:ring-1 hover:ring-indigo-200",
                userTextT === 'owner-diy'
                  ? "border-indigo-600 shadow-lg ring-2 ring-indigo-600/10"
                  : "border-neutral-200 hover:border-indigo-300"
              )}
            >
              {userTextT === 'owner-diy' && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[220px]">
                <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center">
                  <House className="w-4 h-4 text-foreground" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-1">
                    Yo administro
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Herramientas profesionales para ti</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[24px] font-heading font-bold text-foreground">$0</span>
                    <span className="text-[12px] text-muted-foreground">para empezar</span>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Card 3: Evaluation */}
            <motion.button
              onClick={() => setUserTextT('evaluation')}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className={cn(
                "group relative text-left rounded-xl overflow-hidden transition-all duration-300 cursor-pointer bg-white border-2 hover:shadow-md hover:ring-1 hover:ring-indigo-200",
                userTextT === 'evaluation'
                  ? "border-indigo-600 shadow-lg ring-2 ring-indigo-600/10"
                  : "border-neutral-200 hover:border-indigo-300"
              )}
            >
              {userTextT === 'evaluation' && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[220px]">
                <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-1">
                    Evaluar inquilino
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Crédito, identidad, antecedentes</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[12px] text-muted-foreground mr-0.5">Desde</span>
                    <span className="text-[24px] font-heading font-bold text-foreground">$24.9K</span>
                    <span className="text-[12px] text-muted-foreground">/reporte</span>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Card 4: Agency */}
            <motion.button
              onClick={() => setUserTextT('agency')}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className={cn(
                "group relative text-left rounded-xl overflow-hidden transition-all duration-300 cursor-pointer bg-white border-2 hover:shadow-md hover:ring-1 hover:ring-indigo-200",
                userTextT === 'agency'
                  ? "border-indigo-600 shadow-lg ring-2 ring-indigo-600/10"
                  : "border-neutral-200 hover:border-indigo-300"
              )}
            >
              {userTextT === 'agency' && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[220px]">
                <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-sand-700" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-sand-900 mb-1">
                    Inmobiliarias
                  </h3>
                  <p className="text-[13px] text-sand-700 mb-3">Escala tu negocio con tecnología</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[12px] text-muted-foreground mr-0.5">Desde</span>
                    <span className="text-[24px] font-heading font-bold text-foreground">$149K</span>
                    <span className="text-[12px] text-muted-foreground">/mes</span>
                  </div>
                </div>
              </div>
            </motion.button>
          </div>

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-3 mt-8"
          >
            <div className="flex -space-x-2">
              {['774909', '2379004', '1239291', '220453'].map((id, i) => (
                <img
                  key={i}
                  src={`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=100`}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border-2 border-white"
                />
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">+2,400 clientes</span> confían en nosotros
            </p>
          </motion.div>
        </div>
      </section>

      {/* Property Management Section */}
      {userTextT === 'owner-managed' && (
        <section className="pb-20">
          <div className="container-platform">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <div className="flex items-center gap-2 mb-3">
                <Circle className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-mono font-normal text-muted-foreground uppercase tracking-wide">
                  Administración completa
                </span>
              </div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                Nosotros <span className="font-medium">manejamos todo</span>
              </h2>
            </motion.div>

            {/* Interactive Rent Calculator - Compact light style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10 p-5 rounded-xl bg-neutral-50 border border-neutral-200"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                {/* Input section */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[13px] font-mono uppercase font-normal text-foreground">Calculadora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-[180px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={exampleRent ? exampleRent.toLocaleString('es-CL') : ''}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/[^\d]/g, '');
                          if (rawValue === '') {
                            setExampleRent(0);
                            return;
                          }
                          const numValue = parseInt(rawValue, 10);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setExampleRent(numValue);
                          }
                        }}
                        placeholder="2.000.000"
                        aria-label="Valor del arriendo mensual"
                        className="w-full h-10 pl-7 pr-3 bg-white text-[15px] font-medium text-foreground rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary/25 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <span className="text-[12px] text-muted-foreground">/mes</span>
                  </div>
                </div>

                {/* Results preview - compact */}
                <div className="flex gap-3">
                  <div className="px-4 py-3 rounded-lg bg-white border border-neutral-200 text-center min-w-[100px]">
                    <p className="text-[11px] text-muted-foreground mb-0.5">5%</p>
                    <p className="text-[18px] font-heading font-bold text-foreground">
                      ${(exampleRent * 0.05).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center min-w-[100px]">
                    <p className="text-[11px] text-emerald-600 mb-0.5">6%</p>
                    <p className="text-[18px] font-heading font-bold text-foreground">
                      ${(exampleRent * 0.06).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Savings indicator - compact */}
              <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-wrap items-center gap-4 text-[12px]">
                <span className="text-muted-foreground">
                  Ahorro: <span className="text-emerald-600 font-medium">${(exampleRent * 0.05).toLocaleString('es-CL')}</span>/mes
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-muted-foreground">Sin compromisos</span>
              </div>
            </motion.div>

            {/* Management Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AgencyTierCard
                name="Básica"
                price="5%"
                period="del arriendo / mes"
                noCurrencySymbol
                description="Cobro y pago de arriendos"
                features={[
                  'Cobro de arriendos (PSE, tarjeta, efectivo)',
                  'Transferencia mensual a tu cuenta',
                  'Comunicación básica con inquilino',
                  'Reporte mensual de pagos',
                  'Soporte por WhatsApp',
                ]}
                ctaLabel="Empezar ahora"
                ctaHref="/auth"
              />
              <AgencyTierCard
                name="Completa"
                price="6%"
                period="del arriendo / mes"
                noCurrencySymbol
                description="Nos encargamos de todo"
                popular
                features={[
                  'Todo lo del plan Básico',
                  'Búsqueda y selección de inquilinos (AI)',
                  'Verificación de antecedentes incluida',
                  'Contratos digitales incluidos',
                  'Coordinación de mantenimiento',
                  'Visitas de inspección semestral',
                  'Gestión de servicios públicos',
                  'Soporte prioritario 24/7',
                ]}
                ctaLabel="Empezar ahora"
                ctaHref="/auth"
              />
            </div>

          </div>
        </section>
      )}

      {/* DIY Subscription Section */}
      {userTextT === 'owner-diy' && (
        <section className="pb-20">
          <div className="container-platform">
            {/* Section Header - Premium editorial style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-3">
                <Circle className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-mono font-normal text-muted-foreground uppercase tracking-wide">
                  Suscripciones DIY
                </span>
              </div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                Planes para <span className="font-medium">propietarios</span>
              </h2>
              <p className="text-[16px] text-muted-foreground mt-4 max-w-lg leading-relaxed">
                Tú administras, nosotros te damos las <span className="text-primary font-medium">herramientas profesionales</span>.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AgencyTierCard
                name="Gratis"
                price="0"
                period="/mes"
                description="Perfecto para empezar"
                features={[
                  '1 propiedad publicada',
                  'Búsqueda básica',
                  '1 contrato digital/mes',
                ]}
                ctaLabel="Empezar gratis"
                ctaHref="/auth"
              />
              <AgencyTierCard
                name="Propietario"
                price="149.900"
                period="/mes"
                description="Tú administras, nosotros te damos las herramientas"
                popular
                features={[
                  'Hasta 10 propiedades',
                  'Contratos ilimitados',
                  'Análisis AI de candidatos',
                  'Verificación de documentos',
                  'Verificación de antecedentes',
                  'Soporte prioritario',
                  'Analíticas avanzadas',
                ]}
                ctaLabel="Seleccionar plan"
                ctaHref="/auth"
              />
              <AgencyTierCard
                name="Inversionista"
                price="299.900"
                period="/mes"
                description="Para propietarios con múltiples inmuebles"
                features={[
                  'Hasta 25 propiedades',
                  'Contratos ilimitados',
                  'Análisis AI de candidatos',
                  'Verificación de documentos',
                  'Verificación de antecedentes',
                  'Soporte prioritario',
                  'Analíticas avanzadas',
                  'Panel multi-propiedad',
                ]}
                ctaLabel="Seleccionar plan"
                ctaHref="/auth"
              />
            </div>
          </div>
        </section>
      )}

      {/* Agency Section */}
      {userTextT === 'agency' && (
        <section className="pb-20">
          <div className="container-platform">
            {/* Section Header - Premium editorial style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-3">
                <Circle className="w-4 h-4 text-amber-500" />
                <span className="text-[13px] font-mono font-normal text-muted-foreground uppercase tracking-wide">
                  Para inmobiliarias
                </span>
              </div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                Planes para <span className="font-medium">inmobiliarias</span>
              </h2>
              <p className="text-[16px] text-muted-foreground mt-4 max-w-lg leading-relaxed">
                Precios que <span className="text-amber-600 font-medium">escalan con tu negocio</span>. Paga por lo que usas.
              </p>
            </motion.div>

            {/* Pricing Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
              {/* Starter */}
              <AgencyTierCard
                name="Starter"
                price="149.000"
                period="/mes"
                description="Para inmobiliarias pequeñas"
                properties={20}
                users={3}
                features={[
                  'CRM de candidatos',
                  'Publicación en portales',
                  'Contratos digitales',
                  'Scoring de arrendatarios',
                  'Soporte por email',
                ]}
                selected={selectedAgencyPlan === 'starter'}
                onSelect={() => setSelectedAgencyPlan('starter')}
              />

              {/* Growth - Popular */}
              <AgencyTierCard
                name="Growth"
                price="399.000"
                period="/mes"
                description="Para inmobiliarias en crecimiento"
                properties={100}
                users={10}
                popular
                features={[
                  'Todo en Starter',
                  'API REST básica',
                  'Reportes avanzados',
                  'Recordatorios automáticos',
                  'Soporte prioritario',
                ]}
                selected={selectedAgencyPlan === 'growth'}
                onSelect={() => setSelectedAgencyPlan('growth')}
              />

              {/* Business */}
              <AgencyTierCard
                name="Business"
                price="899.000"
                period="/mes"
                description="Para operaciones grandes"
                properties={300}
                users={25}
                features={[
                  'Todo en Growth',
                  'API REST completa',
                  'Webhooks en tiempo real',
                  'Multi-sucursal',
                  'Gerente de cuenta dedicado',
                ]}
                selected={selectedAgencyPlan === 'business'}
                onSelect={() => setSelectedAgencyPlan('business')}
              />

              {/* Enterprise */}
              <AgencyTierCard
                name="Enterprise"
                price="Personalizado"
                description="500+ propiedades"
                properties={-1}
                users={-1}
                features={[
                  'Todo en Business',
                  'Propiedades ilimitadas',
                  'Usuarios ilimitados',
                  'White-label completo',
                  'SLA garantizado 99.9%',
                  'Onboarding personalizado',
                  'Descuentos por volumen hasta 24%',
                ]}
                isEnterprise
                selected={selectedAgencyPlan === 'enterprise'}
                onSelect={() => setSelectedAgencyPlan('enterprise')}
              />
            </div>

            {/* Add-ons section - Only show after selecting a plan */}
            <AnimatePresence>
              {selectedAgencyPlan && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground mb-12"
                >
                  <span>Propiedad extra <strong className="text-foreground">$3.000/mes</strong></span>
                  <span className="text-border">|</span>
                  <span>Usuario extra <strong className="text-foreground">$30.000/mes</strong></span>
                  <span className="text-border">|</span>
                  <span>Screening <strong className="text-foreground">$20.000/app</strong></span>
                  <span className="text-border">|</span>
                  <span>White-label <strong className="text-foreground">desde $200.000/mes</strong></span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Benefits */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <BenefitCard
                title="Migración gratuita"
                description="Te ayudamos a migrar tus propiedades y datos desde tu sistema actual sin costo adicional."
              />
              <BenefitCard
                title="Sin contratos largos"
                description="Paga mes a mes. Cancela cuando quieras. Sin penalidades ni letra pequeña."
              />
              <BenefitCard
                title="Soporte en español"
                description="Equipo local que entiende el mercado colombiano y la ley de arrendamiento."
              />
            </div>
          </div>
        </section>
      )}

      {/* Tenant Screening Section - Arriendo Pass */}
      {userTextT === 'evaluation' && (
      <section className="pb-20">
        <div className="container-platform">
          {/* Section Header - Premium editorial style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-4 h-4 text-emerald-500" />
              <span className="text-[13px] font-mono font-normal text-muted-foreground uppercase tracking-wide">
                Evaluación de inquilinos
              </span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
              Reportes de verificación <span className="font-medium">completos</span>
            </h2>
            <p className="text-[16px] text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Para propietarios, inmobiliarias, agentes o cualquiera que necesite verificar la confiabilidad de un inquilino. También útil si eres inquilino y quieres <span className="text-emerald-600 font-medium">pre-verificarte</span>.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <AgencyTierCard
              name="Evaluación Básica"
              price="24.900"
              period="COP / evaluación"
              description="Verificación rápida"
              features={[
                'Verificación de identidad',
                'Historial crediticio (DataCrédito)',
                'Score de riesgo con IA',
                'Reporte PDF descargable',
              ]}
              ctaLabel="Solicitar evaluación"
              ctaHref="/auth"
            />
            <AgencyTierCard
              name="Evaluación Completa"
              price="39.900"
              period="COP / evaluación"
              description="Análisis profundo del candidato"
              popular
              features={[
                'Todo en Básica',
                'Verificación de antecedentes judiciales',
                'Referencias laborales verificadas',
                'Verificación de ingresos',
                'Score IA avanzado con recomendación',
              ]}
              ctaLabel="Solicitar evaluación completa"
              ctaHref="/auth"
            />
            <AgencyTierCard
              name="Arriendo Pass"
              price="59.900"
              period="COP / 60 días"
              description="Para inquilinos en búsqueda activa"
              features={[
                'Todo en Evaluación Completa',
                'Aplicaciones ilimitadas por 60 días',
                'Badge "Inquilino Verificado"',
                'Prioridad con propietarios',
              ]}
              ctaLabel="Obtener Arriendo Pass"
              ctaHref="/auth"
            />
          </div>

          {/* B2B Volume Pricing Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 bg-gradient-to-br from-amber-500/10 via-card to-card rounded-2xl border border-amber-500/20 mb-16"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Buildings className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">¿Eres inmobiliaria o agente?</h3>
                  <p className="text-[13px] text-muted-foreground">
                    Precios por volumen desde <span className="font-semibold text-amber-600">$9.900/evaluación</span>. Hasta 60% de descuento.
                  </p>
                </div>
              </div>
              <Link href="mailto:ventas@leasefy.co?subject=Precios%20por%20volumen%20-%20Evaluaciones">
                <Button variant="outline" className="whitespace-nowrap rounded-xl">
                  Contactar ventas
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 md:p-10 bg-card rounded-2xl border border-border"
          >
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="text-[15px] font-semibold text-foreground">
                ¿Cómo funciona?
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { num: '1', title: 'Elige tu plan', desc: 'Básica, Pass o Premium según tu necesidad' },
                { num: '2', title: 'Completa tu perfil', desc: 'Sube documentos y autoriza verificaciones' },
                { num: '3', title: 'Recibe tu score', desc: 'En minutos tienes tu reporte verificado' },
                { num: '4', title: 'Aplica con confianza', desc: 'Propietarios ven tu perfil verificado' },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
                    <span className="text-[15px] font-bold">{step.num}</span>
                  </div>
                  <h4 className="font-semibold text-foreground text-[14px] mb-1">{step.title}</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Trust note */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-[14px] text-muted-foreground">
              <span className="font-semibold text-foreground">Resultados en minutos</span> — Verificaciones powered by DataCrédito y fuentes oficiales colombianas.
            </p>
          </motion.div>
        </div>
      </section>
      )}

      {/* Value props - Premium Bento Style */}
      <section className="py-20 bg-muted/30">
        <div className="container-platform">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-mono font-normal text-muted-foreground uppercase tracking-wide">
                Beneficios
              </span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
              Por qué elegir <span className="font-medium">Leasefy</span>
            </h2>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
            {/* Large card - Security */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-3 lg:col-span-5 rounded-xl p-6 bg-gradient-to-br from-sand-50 to-sand-100/80 border border-sand-200 hover:shadow-lg transition-all relative overflow-hidden"
            >
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sand-200/50 to-transparent rounded-bl-full" />

              <div className="flex flex-col h-full relative z-10">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-[18px] font-mono uppercase font-normal text-foreground mb-2">
                  Seguridad garantizada
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                  Verificación de identidad y antecedentes de todos los candidatos para tu tranquilidad.
                </p>
                {/* Visual */}
                <div className="mt-auto p-3 rounded-lg bg-white border border-sand-200">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 border-2 border-white">
                          ✓
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-foreground">+2,400 verificados</p>
                      <p className="text-[10px] text-muted-foreground">este mes</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Medium card - Speed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="md:col-span-3 lg:col-span-4 rounded-xl p-6 bg-white border border-neutral-200 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                <Lightning className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-[18px] font-mono uppercase font-normal text-foreground mb-2">
                Proceso rápido
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                Encuentra inquilinos calificados en días, no semanas.
              </p>
              {/* Speed visual */}
              <div className="space-y-2">
                {['Publicar', 'Evaluar', 'Contratar'].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                      i === 2 ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-muted-foreground'
                    )}>
                      {i + 1}
                    </div>
                    <span className="text-[13px] text-foreground">{step}</span>
                    {i < 2 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Small card - Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-6 lg:col-span-3 rounded-xl p-6 bg-neutral-50 border border-neutral-200 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center mb-4">
                <Headphones className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-[18px] font-mono uppercase font-normal text-foreground mb-2">
                Soporte experto
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Equipo local listo para ayudarte en cada paso.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] text-muted-foreground">Online ahora</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Structured Data: Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://leasefy.co",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Precios",
                item: "https://leasefy.co/pricing",
              },
            ],
          }),
        }}
      />

      {/* Structured Data: FAQ JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: pricingFaqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      {/* FAQ section - Accordion style matching home */}
      <PricingFAQSection />

      {/* CTA section - reusable component matching home */}
      <CTASection />
      </main>
      <Footer />
    </>
  );
}
