'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CTASection } from '@/components/home/CTASection';
import { PricingTable } from '@/components/pricing';
import { ManagementTierCard } from '@/components/pricing/ManagementTierCard';
import { Shield, Lightning, Headphones, CheckCircle, Check, House, Briefcase, Calculator, ArrowUpRight, Buildings, Users, FileText, Sparkle, UserCheck, SealCheck, Clock, Infinity, Star, Plus, X, TrendUp, ArrowRight, CircleDashed, Circle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MANAGEMENT_TIERS } from '@/lib/data/mock-subscriptions';

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
 * Animated Score Gauge Visual - Shows risk score animation
 */
function ScoreGaugeVisual() {
  const [score, setScore] = useState(0);
  const targetScore = 87;

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setScore((prev) => {
          if (prev >= targetScore) {
            clearInterval(interval);
            return targetScore;
          }
          return prev + 2;
        });
      }, 20);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-[100px] h-[100px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-white/10"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.3s ease-out',
            }}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-heading font-bold text-white">{score}</span>
          <span className="text-[10px] text-white/60 uppercase tracking-wide">Score</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated Calculator Visual - Shows cost calculation
 */
function CalculatorVisual() {
  const [currentValue, setCurrentValue] = useState(0);
  const targetValue = 120000;

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setCurrentValue((prev) => {
          if (prev >= targetValue) {
            clearInterval(interval);
            return targetValue;
          }
          return prev + 4000;
        });
      }, 30);
      return () => clearInterval(interval);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Arriendo $2.4M</span>
        <span className="text-emerald-500 font-medium">5%</span>
      </div>
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">Tu costo:</span>
        <span className="text-[17px] font-heading font-bold text-foreground">
          ${currentValue.toLocaleString('es-CO')}
        </span>
      </div>
    </div>
  );
}

/**
 * Animated Properties Visual - Shows property management
 */
function PropertiesVisual() {
  return (
    <div className="space-y-2">
      {[
        { name: 'Apartamento Chapinero', price: '$2.8M', status: 'Arrendado' },
        { name: 'Casa Usaquén', price: '$4.5M', status: 'Disponible' },
        { name: 'Estudio Centro', price: '$1.2M', status: 'En proceso' },
      ].map((property, i) => (
        <motion.div
          key={property.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
          className="flex items-center gap-3 p-2 rounded-lg bg-white/60 border border-border/50"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center">
            <Buildings className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-foreground truncate">{property.name}</p>
            <p className="text-[10px] text-muted-foreground">{property.price}/mes</p>
          </div>
          <span className={cn(
            'text-[9px] font-medium px-2 py-0.5 rounded-full',
            property.status === 'Arrendado' && 'bg-emerald-100 text-emerald-700',
            property.status === 'Disponible' && 'bg-primary/10 text-primary',
            property.status === 'En proceso' && 'bg-amber-100 text-amber-700'
          )}>
            {property.status}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

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
                          <p className="text-[13px] font-semibold text-white">{prop.label}</p>
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

      {/* User TextT Selector - Bento Grid Style */}
      <section className="py-12">
        <div className="container-platform">
          {/* Bento grid layout - no section header, straight to content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            {/* Card 1: Managed - Large with real image + glass widgets */}
            <motion.button
              onClick={() => setUserTextT('owner-managed')}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group relative lg:col-span-5 lg:row-span-2 text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              {/* Background image - NO dark overlay */}
              <div className="absolute inset-0">
                <img
                  src="/homeowner-reading.jpg"
                  alt="Propietaria leyendo en casa"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="relative z-10 flex flex-col h-full p-6 min-h-[320px]">
                {/* Small glass widget at top left */}
                <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2.5 self-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[13px] font-medium text-white">Tú descansas, nosotros cobramos</span>
                </div>
              </div>
            </motion.button>

            {/* Card 2: DIY - White with border */}
            <motion.button
              onClick={() => setUserTextT('owner-diy')}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={cn(
                "group relative lg:col-span-4 text-left rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg",
                "bg-white border",
                userTextT === 'owner-diy' ? "border-foreground" : "border-neutral-200 hover:border-neutral-300"
              )}
            >
              {userTextT === 'owner-diy' && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-7 h-7 bg-foreground text-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[180px]">
                <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center mb-auto">
                  <House className="w-4 h-4 text-foreground" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-heading font-semibold text-foreground mb-1">
                    Yo administro
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Herramientas profesionales</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-heading font-bold text-foreground">$0</span>
                    <span className="text-[12px] text-muted-foreground">para empezar</span>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Card 3: Agency - Sand color */}
            <motion.button
              onClick={() => setUserTextT('agency')}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="group relative lg:col-span-3 text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              {/* Solid sand background */}
              <div className="absolute inset-0 bg-sand-100" />

              {userTextT === 'agency' && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-7 h-7 bg-white text-sand-700 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[180px]">
                <div className="w-9 h-9 rounded-lg bg-sand-200/50 flex items-center justify-center mb-auto">
                  <Briefcase className="w-4 h-4 text-sand-700" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-heading font-semibold text-sand-900 mb-1">
                    Inmobiliarias
                  </h3>
                  <p className="text-[13px] text-sand-700 mb-3">Escala tu negocio</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-heading font-bold text-sand-900">$149K</span>
                    <span className="text-[12px] text-sand-600">/mes</span>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Card 4: Evaluation - Clean stroke style */}
            <motion.button
              onClick={() => setUserTextT('evaluation')}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className={cn(
                "group relative lg:col-span-4 text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg",
                "bg-white border",
                userTextT === 'evaluation' ? "border-foreground" : "border-neutral-200 hover:border-neutral-300"
              )}
            >
              {userTextT === 'evaluation' && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-6 h-6 bg-foreground text-white rounded-full flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[180px]">
                <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center mb-auto">
                  <UserCheck className="w-4 h-4 text-foreground" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-heading font-semibold text-foreground mb-1">
                    Evaluar inquilino
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Crédito, identidad, antecedentes</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-heading font-bold text-foreground">$24.9K</span>
                    <span className="text-[12px] text-muted-foreground">/reporte</span>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Card 5: Social proof card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-3 rounded-2xl p-5 bg-neutral-50 flex flex-col justify-center"
            >
              <div className="flex -space-x-2 mb-3">
                {['774909', '2379004', '1239291', '220453'].map((id, i) => (
                  <img
                    key={i}
                    src={`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=100`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border-2 border-white"
                  />
                ))}
              </div>
              <p className="text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">+2,400 clientes</span> confían en nosotros para administrar sus propiedades
              </p>
            </motion.div>
          </div>
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
                <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
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
                    <span className="text-[13px] font-medium text-foreground">Calculadora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-[180px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={exampleRent ? exampleRent.toLocaleString('es-CO') : ''}
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
                      ${(exampleRent * 0.05).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center min-w-[100px]">
                    <p className="text-[11px] text-emerald-600 mb-0.5">6%</p>
                    <p className="text-[18px] font-heading font-bold text-foreground">
                      ${(exampleRent * 0.06).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Savings indicator - compact */}
              <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-wrap items-center gap-4 text-[12px]">
                <span className="text-muted-foreground">
                  Ahorro: <span className="text-emerald-600 font-medium">${(exampleRent * 0.05).toLocaleString('es-CO')}</span>/mes
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-muted-foreground">Sin compromisos</span>
              </div>
            </motion.div>

            {/* Management Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MANAGEMENT_TIERS.map((tier) => (
                <ManagementTierCard
                  key={tier.id}
                  tier={tier}
                  exampleRent={exampleRent}
                />
              ))}
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
                <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
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

            <PricingTable showComparison />
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
                <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-br from-primary/5 via-card to-card rounded-2xl border border-primary/10 p-6 mb-12"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-[17px] font-semibold text-foreground">
                        Servicios adicionales
                      </h3>
                    </div>
                    <span className="text-[12px] text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-full">
                      Plan: {selectedAgencyPlan.charAt(0).toUpperCase() + selectedAgencyPlan.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AddOnItem
                      icon={<Users className="w-4 h-4" />}
                      name="Usuario extra"
                      price="$30.000/usuario/mes"
                    />
                    <AddOnItem
                      icon={<Buildings className="w-4 h-4" />}
                      name="Propiedad extra"
                      price="$3.000/propiedad/mes"
                    />
                    <AddOnItem
                      icon={<FileText className="w-4 h-4" />}
                      name="Screening de arrendatario"
                      price="$20.000/aplicación"
                    />
                    <AddOnItem
                      icon={<Sparkle className="w-4 h-4" />}
                      name="White-label"
                      price="Desde $200.000/mes"
                    />
                  </div>
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
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
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
                <h3 className="text-[18px] font-heading font-semibold text-foreground mb-2">
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
              <h3 className="text-[18px] font-heading font-semibold text-foreground mb-2">
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
              <h3 className="text-[18px] font-heading font-semibold text-foreground mb-2">
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

      {/* Tenant Screening Section - Arriendo Pass */}
      {userTextT === 'evaluation' && (
      <section className="py-20">
        <div className="container-platform">
          {/* Section Header - Premium editorial style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-4 h-4 text-emerald-500" />
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
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
            {/* Evaluación Básica */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group bg-card p-6 flex flex-col rounded-2xl border border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              <div className="mb-5">
                <h3 className="text-[17px] font-semibold text-foreground">Evaluación Básica</h3>
                <p className="text-[13px] text-muted-foreground mt-1">Verificación rápida</p>
              </div>
              <div className="mb-6">
                <span className="text-[32px] font-heading font-bold text-foreground">$24.900</span>
                <span className="text-muted-foreground text-[13px] ml-1">COP / evaluación</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-muted-foreground">Verificación de identidad</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-muted-foreground">Historial crediticio (DataCrédito)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-muted-foreground">Score de riesgo con IA</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-muted-foreground">Reporte PDF descargable</span>
                </li>
              </ul>
              <Link href="/auth">
                <Button variant="outline" className="w-full rounded-xl">
                  Solicitar evaluación
                </Button>
              </Link>
            </motion.div>

            {/* Evaluación Completa - Popular */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="relative bg-primary text-primary-foreground p-6 flex flex-col rounded-2xl shadow-xl shadow-primary/20"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-400 text-amber-950 text-[11px] font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <Star className="w-3 h-3" />
                  Más completo
                </span>
              </div>
              <div className="mb-5">
                <h3 className="text-[17px] font-semibold">Evaluación Completa</h3>
                <p className="text-[13px] text-primary-foreground/70 mt-1">Análisis profundo del candidato</p>
              </div>
              <div className="mb-6">
                <span className="text-[32px] font-heading font-bold">$39.900</span>
                <span className="text-primary-foreground/70 text-[13px] ml-1">COP / evaluación</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-primary-foreground/60 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-primary-foreground/80">Todo en Básica</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-primary-foreground/60 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-primary-foreground/80">Verificación de antecedentes judiciales</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-primary-foreground/60 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-primary-foreground/80">Referencias laborales verificadas</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-primary-foreground/60 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-primary-foreground/80">Verificación de ingresos</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] font-semibold">Score IA avanzado con recomendación</span>
                </li>
              </ul>
              <Link href="/auth">
                <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-xl shadow-lg">
                  Solicitar evaluación completa
                </Button>
              </Link>
            </motion.div>

            {/* Arriendo Pass */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="group bg-card p-6 flex flex-col rounded-2xl border border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              <div className="mb-5">
                <h3 className="text-[17px] font-semibold text-foreground">Arriendo Pass</h3>
                <p className="text-[13px] text-muted-foreground mt-1">Para inquilinos en búsqueda activa</p>
              </div>
              <div className="mb-6">
                <span className="text-[32px] font-heading font-bold text-foreground">$59.900</span>
                <span className="text-muted-foreground text-[13px] ml-1">COP / 60 días</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-muted-foreground">Todo en Evaluación Completa</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Infinity className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-foreground font-semibold">Aplicaciones ilimitadas por 60 días</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <SealCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-foreground font-semibold">Badge &ldquo;Inquilino Verificado&rdquo;</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Lightning className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[13px] text-muted-foreground">Prioridad con propietarios</span>
                </li>
              </ul>
              <Link href="/auth">
                <Button variant="outline" className="w-full rounded-xl">
                  Obtener Arriendo Pass
                </Button>
              </Link>
            </motion.div>
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

      {/* FAQ section - Accordion style matching home */}
      <PricingFAQSection />

      {/* CTA section - reusable component matching home */}
      <CTASection />
      </main>
      <Footer />
    </>
  );
}

/**
 * User type selector card - Bento style for smaller cards
 */
function UserTextTCardBento({
  icon,
  label,
  description,
  price,
  priceLabel,
  selected,
  onClick,
  delay = 0,
  accentColor = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  price: string;
  priceLabel: string;
  selected: boolean;
  onClick: () => void;
  delay?: number;
  accentColor?: 'primary' | 'emerald' | 'amber';
}) {
  const colorClasses = {
    primary: {
      icon: selected ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary',
      badge: 'bg-primary text-white',
    },
    emerald: {
      icon: selected ? 'bg-white/10 text-white' : 'bg-emerald-500/10 text-emerald-600',
      badge: 'bg-emerald-500 text-white',
    },
    amber: {
      icon: selected ? 'bg-white/10 text-white' : 'bg-amber-500/10 text-amber-600',
      badge: 'bg-amber-500 text-white',
    },
  };

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'group relative flex flex-col p-5 text-left rounded-2xl transition-all duration-300',
        selected
          ? 'bg-indigo-950 text-white shadow-xl shadow-primary/20'
          : 'bg-white hover:shadow-lg'
      )}
      style={{ border: selected ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)' }}
    >
      {/* Selection badge */}
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 bg-white text-indigo-950 rounded-full flex items-center justify-center">
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
        </div>
      )}

      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center mb-4',
        colorClasses[accentColor].icon
      )}>
        {icon}
      </div>

      {/* Text */}
      <h3 className={cn(
        'text-[15px] font-heading font-semibold leading-tight mb-1.5',
        selected ? 'text-white' : 'text-foreground'
      )}>
        {label}
      </h3>
      <p className={cn(
        'text-[12px] leading-relaxed mb-4',
        selected ? 'text-white/70' : 'text-muted-foreground'
      )}>
        {description}
      </p>

      {/* Price */}
      <div className="mt-auto flex items-baseline gap-1">
        <span className={cn(
          'text-[20px] font-heading font-bold',
          selected ? 'text-white' : 'text-foreground'
        )}>
          {price}
        </span>
        <span className={cn(
          'text-[11px]',
          selected ? 'text-white/60' : 'text-muted-foreground'
        )}>
          {priceLabel}
        </span>
      </div>
    </motion.button>
  );
}

/**
 * Benefit card for agency section - Premium style
 */
function BenefitCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow"
    >
      <h4 className="text-[15px] font-semibold text-foreground">{title}</h4>
      <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}


/**
 * Pricing FAQ Section - Accordion style matching home
 */
const pricingFaqs = [
  {
    question: "¿Cuál es la diferencia entre administración y suscripción?",
    answer: "La administración es para propietarios que quieren desentenderse: nosotros cobramos el arriendo, gestionamos la comunicación y coordinamos mantenimientos. La suscripción es para quienes quieren herramientas pero prefieren administrar directamente.",
  },
  {
    question: "¿Cómo funciona el cobro del porcentaje?",
    answer: "Cobramos el arriendo al inquilino (PSE, tarjeta, efectivo) y te transferimos el monto menos nuestro porcentaje. Todo automático, sin que tengas que hacer nada.",
  },
  {
    question: "¿Puedo cambiar de plan en cualquier momento?",
    answer: "Sí, puedes actualizar o cambiar tu plan cuando quieras. Los cambios se aplican inmediatamente y ajustamos la facturación de forma proporcional.",
  },
  {
    question: "¿Qué incluye la póliza de arriendo?",
    answer: "La póliza cubre entre 12 y 24 meses de arriendo en caso de impago, dependiendo del plan que elijas (Básica: 12 meses, Premium: 24 meses). También incluye cobertura por daños a la propiedad, servicios públicos y reparaciones de emergencia. Es opcional y tiene un costo desde 2% del arriendo mensual.",
  },
  {
    question: "¿Cómo funciona el Arriendo Pass para inquilinos?",
    answer: "El Arriendo Pass te permite verificar tu perfil una sola vez y aplicar a todas las propiedades que quieras durante 60 días (o 90 con Premium). Pagas una única vez, completas tu verificación, y los propietarios ven tu score sin costo adicional. Es la forma más económica de buscar arriendo si planeas aplicar a varias propiedades.",
  },
  {
    question: "¿Por qué los inquilinos pagan la evaluación?",
    answer: "Este modelo beneficia a todos: los propietarios reciben candidatos pre-verificados sin costo, y los inquilinos serios demuestran compromiso real. Además, con el Arriendo Pass tu reporte es portable — lo pagas una vez y aplicas a muchas propiedades, ahorrando tiempo y dinero vs. pagar evaluación en cada inmobiliaria.",
  },
];

function PricingFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-muted overflow-hidden">
      <div className="container-platform py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left - Header */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32 self-start"
          >
            {/* Label with icon */}
            <div className="flex items-center gap-2 mb-4">
              <Circle className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                FAQ
              </span>
            </div>

            {/* Main heading */}
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em] mb-8">
              Preguntas frecuentes
            </h2>

            {/* Helper text */}
            <p className="text-[17px] text-muted-foreground leading-relaxed mb-6 max-w-[340px]">
              ¿Tienes más preguntas? Nuestro equipo está feliz de ayudar.
            </p>

            {/* CTA Button */}
            <a
              href="mailto:info@leasefy.co"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-foreground text-background text-[14px] font-medium hover:bg-foreground/90 transition-colors"
            >
              Contáctanos
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </motion.div>

          {/* Right - FAQ Accordion */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {pricingFaqs.map((faq, index) => (
              <div
                key={index}
                className="border-b border-border/60 last:border-0"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between py-6 text-left group"
                >
                  {/* Question text */}
                  <span className="text-[17px] md:text-[19px] font-heading font-medium text-foreground leading-snug pr-6">
                    {faq.question}
                  </span>
                  <span className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    openIndex === index
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    {openIndex === index ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </span>
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      {/* Answer text */}
                      <p className="text-[15px] md:text-[16px] text-muted-foreground leading-relaxed pb-6 pr-12">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/**
 * Agency tier pricing card - Premium style with motion
 */
function AgencyTierCard({
  name,
  price,
  period,
  description,
  properties,
  users,
  features,
  popular,
  isEnterprise,
  selected,
  onSelect,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  properties: number;
  users: number;
  features: string[];
  popular?: boolean;
  isEnterprise?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-2xl border bg-card p-6 flex flex-col transition-all duration-300',
        selected
          ? 'border-primary ring-2 ring-primary/20 shadow-xl shadow-primary/10'
          : popular
            ? 'border-primary/50 shadow-lg shadow-primary/5'
            : 'border-border hover:border-primary/30 hover:shadow-lg'
      )}
    >
      {popular && !selected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-primary/25">
            Más popular
          </span>
        </div>
      )}

      {selected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-[11px] font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-primary/25">
            <Check className="w-3 h-3" />
            Seleccionado
          </span>
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-[17px] font-semibold text-foreground">{name}</h3>
        <p className="text-[13px] text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="mb-5">
        {isEnterprise ? (
          <span className="text-[28px] font-heading font-bold text-foreground">{price}</span>
        ) : (
          <>
            <span className="text-[32px] font-heading font-bold text-foreground">${price}</span>
            <span className="text-muted-foreground text-[13px] ml-1">{period}</span>
          </>
        )}
      </div>

      {/* Limits */}
      {!isEnterprise && (
        <div className="flex gap-4 mb-5 pb-5 border-b border-border">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg">
            <Buildings className="w-4 h-4 text-primary" />
            <span className="text-[13px] text-foreground font-semibold">{properties}</span>
            <span className="text-[11px] text-muted-foreground">propiedades</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-[13px] text-foreground font-semibold">{users}</span>
            <span className="text-[11px] text-muted-foreground">usuarios</span>
          </div>
        </div>
      )}

      {/* Features */}
      <ul className="space-y-3 flex-1 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-[13px] text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isEnterprise ? (
        <a href="mailto:ventas@leasefy.co">
          <Button
            variant={selected ? 'default' : 'outline'}
            className="w-full rounded-xl"
            onClick={onSelect}
          >
            {selected ? 'Contactar ventas' : 'Solicitar cotización'}
          </Button>
        </a>
      ) : (
        <Button
          variant={selected ? 'default' : popular ? 'default' : 'outline'}
          className="w-full rounded-xl"
          onClick={onSelect}
        >
          {selected ? 'Continuar' : 'Seleccionar plan'}
        </Button>
      )}
    </motion.div>
  );
}

/**
 * Add-on item for agency section - Premium style
 */
function AddOnItem({
  icon,
  name,
  price,
}: {
  icon: React.ReactNode;
  name: string;
  price: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-foreground">{name}</p>
        <p className="text-[12px] text-muted-foreground">{price}</p>
      </div>
    </div>
  );
}
