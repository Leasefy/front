'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { LandingFooterV2 } from '@/components/landing-v2/LandingFooterV2';
import { CTASection } from '@/components/home/CTASection';
import { Shield, Lightning, Headphones, CheckCircle, Check, House, Briefcase, Calculator, Buildings, UserCheck, ArrowRight, Circle } from '@phosphor-icons/react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  Appear,
  AnimatedNumber,
  CrossFade,
  Pressable,
  Stagger,
  StaggerItem,
  cssEase,
  motionScale,
  motionSpring,
  motionTransition,
} from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { AgencyTierCard, BenefitCard } from '@/components/pricing/AgencyTierCard';
import { usePlanesDelPropietario } from '@/lib/planes/use-planes-del-propietario';
import { PricingDetailSheet, type PlanDetail } from '@/components/pricing/PricingDetailSheet';
import { PricingFAQSection, pricingFaqs } from '@/components/pricing/PricingFAQSection';

type UserTextT = 'owner-managed' | 'owner-diy' | 'agency' | 'evaluation';
type AgencyPlan = 'starter' | 'pro' | 'flex' | 'enterprise' | null;

const PRICING_HERO_IMAGES = [
  '/pricing-hero-1.jpg', // Cozy candlelit room
  '/pricing-hero-2.jpg', // Woman meditating in apartment
  '/pricing-hero-3.jpg', // Person reading by fireplace
  '/pricing-hero-4.jpg', // Couple relaxing in bedroom
];

const HERO_IMAGE_INTERVAL = 6000;

const AGENCY_PLAN_DETAILS: Record<NonNullable<AgencyPlan>, PlanDetail> = {
  starter: {
    name: 'Starter',
    price: '0',
    period: 'Gratis',
    description: 'Para empezar sin compromiso',
    pitch: 'Comienza a usar Leasefy sin costo. Paga solo por las evaluaciones AI que necesites a $42.000 COP por consulta. Ideal para inmobiliarias que quieren probar la plataforma antes de comprometerse.',
    highlights: ['Gratis para siempre', 'Scoring básico con IA', 'Pago por uso'],
    featureGroups: [
      {
        category: 'Evaluaciones AI',
        items: [
          { name: 'Scoring básico con IA', description: 'Evaluación automática del perfil de cada candidato con score de riesgo. Se cobra $42.000 COP por cada consulta.' },
        ],
      },
      {
        category: 'Gestión básica',
        items: [
          { name: 'CRM de candidatos', description: 'Gestiona tus prospectos en un pipeline visual con estados y seguimiento.' },
          { name: 'Publicación en portales', description: 'Publica tus propiedades en los principales portales inmobiliarios.' },
        ],
      },
      {
        category: 'Soporte',
        items: [
          { name: 'Soporte por email', description: 'Asistencia técnica y operativa por correo electrónico en horario laboral.' },
        ],
      },
    ],
    addons: [],
    limits: { properties: 10, users: 2 },
  },
  pro: {
    name: 'Pro',
    price: '149.000',
    period: '/mes',
    description: 'Para inmobiliarias en crecimiento',
    pitch: 'Todo lo que necesitas para escalar tu operación. Evaluaciones AI con 50% de descuento, scoring avanzado, matching inteligente y reportes completos. Hasta 30 evaluaciones al mes incluidas con tarifa preferencial.',
    highlights: ['100 propiedades', '10 usuarios', '50% descuento en evaluaciones'],
    featureGroups: [
      {
        category: 'Evaluaciones AI',
        items: [
          { name: 'Evaluaciones con 50% descuento', description: 'Cada evaluación AI a $21.000 COP en lugar de $42.000. Hasta 30 evaluaciones/mes.' },
          { name: 'Scoring + Matching + Reportes', description: 'Scoring avanzado, matching inteligente de candidatos con propiedades, y reportes PDF completos.' },
        ],
      },
      {
        category: 'CRM & Gestión',
        items: [
          { name: 'CRM de candidatos', description: 'Pipeline visual completo con estados, notas, filtros y seguimiento automático.' },
          { name: 'Contratos digitales', description: 'Genera y firma contratos de arrendamiento con validez legal, 100% digital.' },
          { name: 'Reportes avanzados', description: 'Dashboards con métricas clave: ocupación, tiempos de arriendo, rentabilidad por propiedad.' },
        ],
      },
      {
        category: 'Soporte',
        items: [
          { name: 'Soporte prioritario', description: 'Atención preferencial con tiempos de respuesta cortos por email y chat.' },
        ],
      },
    ],
    addons: [
      { label: 'Propiedad extra', price: '$3.000/mes', description: 'Añade propiedades adicionales más allá del límite incluido.' },
      { label: 'Usuario extra', price: '$30.000/mes', description: 'Invita más miembros de tu equipo con acceso completo.' },
    ],
    limits: { properties: 100, users: 10 },
  },
  flex: {
    name: 'Flex',
    price: '1%',
    period: 'del canon administrado',
    description: 'Todo incluido, sin límites',
    pitch: 'El plan definitivo para inmobiliarias que quieren acceso completo a toda la plataforma. Evaluaciones ilimitadas y gratuitas, los 19 agentes AI, sin límites en propiedades ni usuarios. Pagas un porcentaje justo del canon que administras.',
    highlights: ['Evaluaciones ilimitadas gratis', '19 agentes AI', 'Sin límites'],
    featureGroups: [
      {
        category: 'Evaluaciones AI',
        items: [
          { name: 'Evaluaciones ilimitadas y gratuitas', description: 'Sin costo por evaluación. Evalúa todos los candidatos que necesites sin preocuparte por el volumen.' },
          { name: 'Los 19 agentes AI completos', description: 'Scoring, matching, cobranza, contratos, desembolsos, pipeline, mantenimiento, renovaciones, comunicaciones, documentos, analíticas, pricing dinámico y más.' },
        ],
      },
      {
        category: 'Plataforma completa',
        items: [
          { name: 'Propiedades y usuarios ilimitados', description: 'Sin restricciones. Crece sin pensar en límites del plan.' },
          { name: 'API REST completa + Webhooks', description: 'Integra con tu ERP, CRM o cualquier sistema externo con nuestra API completa y webhooks en tiempo real.' },
          { name: 'Multi-sucursal', description: 'Gestiona múltiples oficinas o equipos con permisos independientes y reportes consolidados.' },
        ],
      },
      {
        category: 'Soporte dedicado',
        items: [
          { name: 'Soporte prioritario dedicado', description: 'Gerente de cuenta asignado y atención prioritaria por todos los canales.' },
          { name: 'Onboarding personalizado', description: 'Sesiones dedicadas de capacitación para asegurar una adopción exitosa de toda tu operación.' },
        ],
      },
    ],
    addons: [],
    limits: { properties: 'ilimitadas', users: 'ilimitados' },
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Personalizado',
    description: 'Infraestructura dedicada',
    pitch: 'Solución a medida para las inmobiliarias más grandes del mercado. Infraestructura dedicada, SLA garantizado, white-label completo y onboarding personalizado para tu equipo. Hablemos de lo que necesitas.',
    highlights: ['White-label completo', 'SLA 99.9%', 'Infraestructura dedicada'],
    featureGroups: [
      {
        category: 'Todo en Flex, más',
        items: [
          { name: 'White-label completo', description: 'Plataforma completamente personalizada con tu marca, dominio, colores y experiencia de usuario a medida.' },
          { name: 'Infraestructura dedicada', description: 'Servidores y bases de datos exclusivos para tu operación con máximo rendimiento.' },
        ],
      },
      {
        category: 'Garantías & Soporte',
        items: [
          { name: 'SLA garantizado 99.9%', description: 'Acuerdo de nivel de servicio con disponibilidad garantizada y compensación por incumplimiento.' },
          { name: 'Onboarding personalizado', description: 'Sesiones dedicadas de capacitación y configuración con tu equipo para asegurar una adopción exitosa.' },
        ],
      },
    ],
    addons: [],
    limits: { properties: 'ilimitadas', users: 'ilimitados' },
  },
};

/**
 * Flex plan interactive calculator
 */
function FlexCalculator() {
  const [units, setUnits] = useState(100);
  const [avgRent, setAvgRent] = useState(2000000);

  const monthlyFee = Math.round(units * avgRent * 0.01);
  const sliderPercentage = Math.min(((units - 10) / (500 - 10)) * 100, 100);

  return (
    <Appear inView distance="md" duration="slow" className="mb-12 rounded-[20px] overflow-hidden border border-border">
      <div className="relative bg-foreground text-background px-6 py-5">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-warning via-warning to-danger" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-medium text-white">Calculadora Flex</h3>
            <p className="text-[12px] text-white/50">Estima tu costo mensual con el plan Flex</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                  Unidades administradas
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={units}
                  onChange={(e) => setUnits(Math.max(10, Math.min(1000, parseInt(e.target.value) || 10)))}
                  className="w-16 h-8 px-2 text-center text-[14px] font-bold font-mono tabular-nums bg-muted/50 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
              </div>
              <div className="relative h-10 flex items-center">
                {/* El relleno crece con `scaleX` (no `width`) y el resorte ágil del sistema. */}
                <div className="absolute inset-x-0 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full w-full origin-left bg-foreground rounded-full"
                    style={{ scaleX: sliderPercentage / 100 }}
                    initial={false}
                    animate={{ scaleX: sliderPercentage / 100 }}
                    transition={motionSpring.snappy}
                  />
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={units}
                  onChange={(e) => setUnits(parseInt(e.target.value))}
                  className="absolute inset-x-0 w-full h-10 opacity-0 cursor-pointer"
                />
                {/* La perilla viaja con `translateX` (no `left`): una franja del
                    ancho del riel se corre ese porcentaje de SU ancho y lleva la
                    perilla en su borde. No recibe clics: los toma el `range`. */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 flex items-center"
                  style={{ x: `${sliderPercentage}%` }}
                  initial={false}
                  animate={{ x: `${sliderPercentage}%` }}
                  transition={motionSpring.snappy}
                >
                  <span className="-ml-2 block w-4 h-4 bg-foreground rounded-full" />
                </motion.div>
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>10</span>
                <span>100</span>
                <span>250</span>
                <span>500+</span>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Canon promedio (COP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={avgRent ? avgRent.toLocaleString('es-CO') : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^\d]/g, '');
                    if (rawValue === '') { setAvgRent(0); return; }
                    const numValue = parseInt(rawValue, 10);
                    if (!isNaN(numValue) && numValue >= 0) setAvgRent(numValue);
                  }}
                  className="w-full h-10 pl-7 pr-3 bg-muted/30 text-[15px] font-medium font-mono tabular-nums text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-[border-color,box-shadow] duration-fast ease-standard"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="bg-muted/30 rounded-[18px] p-5 border border-border">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Costo mensual estimado</p>
              {/* La cifra cuenta desde la anterior al mover el control (`AnimatedNumber`). */}
              <p className="text-[36px] font-mono font-bold text-foreground tracking-tight leading-none tabular-nums">
                <AnimatedNumber value={monthlyFee} format={(n) => `$${Math.round(n).toLocaleString('es-CO')}`} />
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">COP/mes</p>
              <div className="mt-4 pt-4 space-y-2 border-t border-border">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{units} unidades x ${avgRent.toLocaleString('es-CO')} canon</span>
                  <span className="text-foreground font-medium font-mono tabular-nums">= ${(units * avgRent).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">1% del canon administrado</span>
                  <span className="text-foreground font-semibold font-mono tabular-nums">${monthlyFee.toLocaleString('es-CO')}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-3 leading-relaxed">
                Ej: {units} unidades x ${(avgRent / 1000000).toFixed(1)}M canon = ${(monthlyFee / 1000000).toFixed(1)}M COP/mes. Evaluaciones ilimitadas incluidas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Appear>
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
/**
 * La cifra del plan del propietario, sin el «$» (lo pone la tarjeta). El precio
 * lo dice el back (QA 23-09: acá decía 149.900 y el back cobra 149.000);
 * mientras no llega, «—».
 */
/**
 * El visto de la tarjeta elegida en «¿Qué necesitas?»: llega con el resorte de
 * rebote leve y se va acelerando al elegir otra (antes aparecía y desaparecía
 * de golpe).
 */
function VistoDeLaElegida({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="visto"
          initial={{ scale: motionScale.pop, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0, transition: motionTransition.exit }}
          transition={motionSpring.bouncy}
          className="absolute top-3 right-3 z-10"
        >
          <div className="w-7 h-7 bg-primary text-primary-fg uppercase tracking-wide font-mono rounded-full flex items-center justify-center">
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function cifraDelPlan(valor: number | null): string {
  return valor === null ? '—' : valor.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

export default function PricingPage() {
  const { planDe } = usePlanesDelPropietario();
  const [userTextT, setUserTextT] = useState<UserTextT>('owner-managed');
  const [exampleRent, setExampleRent] = useState(2000000);
  const [selectedAgencyPlan, setSelectedAgencyPlan] = useState<AgencyPlan>(null);
  const [detailPlan, setDetailPlan] = useState<AgencyPlan>(null);
  const [activeHeroImage, setActiveHeroImage] = useState(0);
  // El carrusel del héroe sólo corre mientras se ve: fuera de pantalla (o con
  // la pestaña al fondo) no hay por qué seguir cambiando fotos.
  const heroRef = useRef<HTMLElement>(null);
  const heroEnVista = useInView(heroRef);

  // Auto-cycle hero images
  useEffect(() => {
    if (!heroEnVista) return;
    const interval = setInterval(() => {
      setActiveHeroImage((prev) => (prev + 1) % PRICING_HERO_IMAGES.length);
    }, HERO_IMAGE_INTERVAL);
    return () => clearInterval(interval);
  }, [heroEnVista]);

  return (
    <LandingChrome>
      <main className="min-h-screen bg-background">
        {/* Hero Section - Full width like home, starts behind navbar */}
        <section ref={heroRef} className="relative h-[500px] overflow-hidden bg-black">
          {/* Background — crossfade image slideshow */}
          {PRICING_HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0"
              style={{
                opacity: i === activeHeroImage ? 1 : 0,
                // Fundido lento a propósito (fondo ambiental), con la curva estándar.
                transition: `opacity 4s ${cssEase('standard')}`,
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
                  <h1
                    className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em]"
                  >
                    Precios simples.
                  </h1>
                  <p
                    className="text-base md:text-lg text-white/60"
                  >
                    Administración completa o herramientas para hacerlo tú mismo.
                  </p>
                </div>

                {/* Stats row */}
                <div
                  className="flex flex-wrap gap-6"
                >
                  {[
                    { value: '5-6%', label: 'Administración' },
                    { value: '$0', label: 'Publicar' },
                    { value: '2,400+', label: 'Clientes' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-baseline gap-2">
                      <span className="text-[24px] font-mono font-bold tabular-nums text-white">{stat.value}</span>
                      <span className="text-[13px] text-white/50">{stat.label}</span>
                    </div>
                  ))}
                </div>
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
                    <div
                      key={i}
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
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

      {/* User Type Selector - Clear clickable cards */}
      <section className="py-12 md:py-16">
        <div className="container-platform">
          {/* Section intro. Sin entrada propia: en escritorio queda ARRIBA del
              pliegue (debajo de un héroe de 500 px) y tiene que llegar visible
              desde el HTML del servidor (DESIGN.md §8b). */}
          <div className="text-center mb-8">
            <h2 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground tracking-[-0.02em]">
              ¿Qué necesitas?
            </h2>
            <p className="text-[15px] text-muted-foreground mt-2">
              Elige una opción para ver precios y detalles
            </p>
          </div>

          {/* 4 equal cards grid: visibles desde el servidor (arriba del pliegue);
              cada una sube 2 px al pasar y se hunde al presionar (`Pressable`). */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Managed */}
            <div key="owner-managed" className="h-full">
            <Pressable
              as="button"
              onClick={() => setUserTextT('owner-managed')}
              className={cn(
                "group relative h-full w-full text-left rounded-[20px] overflow-hidden transition-[border-color,box-shadow] duration-slow ease-standard cursor-pointer border-2 bg-surface hover:ring-1 hover:ring-primary",
                userTextT === 'owner-managed'
                  ? "border-primary/30 ring-2 ring-primary/10"
                  : "border-border-faint hover:border-primary/30"
              )}
            >
              <VistoDeLaElegida visible={userTextT === 'owner-managed'} />

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[220px]">
                <div className="w-9 h-9 rounded-md bg-surface-muted border border-border-faint flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-1">
                    Administración completa
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Nosotros cobramos y gestionamos todo</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[24px] font-mono font-bold tabular-nums text-foreground">5-6%</span>
                    <span className="text-[12px] text-muted-foreground">del arriendo</span>
                  </div>
                </div>
              </div>
            </Pressable>
            </div>

            {/* Card 2: DIY */}
            <div key="owner-diy" className="h-full">
            <Pressable
              as="button"
              onClick={() => setUserTextT('owner-diy')}
              className={cn(
                "group relative h-full w-full text-left rounded-[20px] overflow-hidden transition-[border-color,box-shadow] duration-slow ease-standard cursor-pointer bg-surface border-2 hover:ring-1 hover:ring-primary",
                userTextT === 'owner-diy'
                  ? "border-primary/30 ring-2 ring-primary/10"
                  : "border-border-faint hover:border-primary/30"
              )}
            >
              <VistoDeLaElegida visible={userTextT === 'owner-diy'} />

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[220px]">
                <div className="w-9 h-9 rounded-md bg-surface-muted border border-border-faint flex items-center justify-center">
                  <House className="w-4 h-4 text-foreground" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-1">
                    Yo administro
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Herramientas profesionales para ti</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[24px] font-mono font-bold tabular-nums text-foreground">$0</span>
                    <span className="text-[12px] text-muted-foreground">para empezar</span>
                  </div>
                </div>
              </div>
            </Pressable>
            </div>

            {/* Card 3: Evaluation */}
            <div key="evaluation" className="h-full">
            <Pressable
              as="button"
              onClick={() => setUserTextT('evaluation')}
              className={cn(
                "group relative h-full w-full text-left rounded-[20px] overflow-hidden transition-[border-color,box-shadow] duration-slow ease-standard cursor-pointer bg-surface border-2 hover:ring-1 hover:ring-primary",
                userTextT === 'evaluation'
                  ? "border-primary/30 ring-2 ring-primary/10"
                  : "border-border-faint hover:border-primary/30"
              )}
            >
              <VistoDeLaElegida visible={userTextT === 'evaluation'} />

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[220px]">
                <div className="w-9 h-9 rounded-md bg-surface-muted border border-border-faint flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-success" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-1">
                    Evaluar inquilino
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-3">Crédito, identidad, antecedentes</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[12px] text-muted-foreground mr-0.5">Desde</span>
                    <span className="text-[24px] font-mono font-bold tabular-nums text-foreground">$24.9K</span>
                    <span className="text-[12px] text-muted-foreground">/eval</span>
                  </div>
                </div>
              </div>
            </Pressable>
            </div>

            {/* Card 4: Agency */}
            <div key="agency" className="h-full">
            <Pressable
              as="button"
              onClick={() => setUserTextT('agency')}
              className={cn(
                "group relative h-full w-full text-left rounded-[20px] overflow-hidden transition-[border-color,box-shadow] duration-slow ease-standard cursor-pointer bg-surface border-2 hover:ring-1 hover:ring-primary",
                userTextT === 'agency'
                  ? "border-primary/30 ring-2 ring-primary/10"
                  : "border-border-faint hover:border-primary/30"
              )}
            >
              <VistoDeLaElegida visible={userTextT === 'agency'} />

              <div className="relative z-10 flex flex-col h-full p-5 min-h-[220px]">
                <div className="w-9 h-9 rounded-md bg-surface-muted border border-border-faint flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-sand-700" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-sand-900 mb-1">
                    Inmobiliarias
                  </h3>
                  <p className="text-[13px] text-sand-700 mb-3">Escala tu negocio con tecnología</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[24px] font-mono font-bold tabular-nums text-foreground">$0</span>
                    <span className="text-[12px] text-muted-foreground">para empezar</span>
                  </div>
                </div>
              </div>
            </Pressable>
            </div>
          </div>

          {/* Social proof strip */}
          <Appear inView direction="none" duration="slow" delay={0.32}
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
          </Appear>
        </div>
      </section>

      {/*
        Lo que se ve según la tarjeta elegida: la sección vieja sale y la
        nueva entra (`CrossFade`). Antes cada sección cambiaba de golpe y sólo
        su título se animaba.
      */}
      <CrossFade swapKey={userTextT}>
      {/* Property Management Section */}
      {userTextT === 'owner-managed' && (
        <section className="pb-20">
          <div className="container-platform">
            {/* Section Header */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-3">
                <Circle className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-mono font-normal text-muted-foreground uppercase tracking-wide">
                  Administración completa
                </span>
              </div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                Nosotros <span className="font-medium">manejamos todo</span>
              </h2>
            </div>

            {/* Interactive Rent Calculator - Compact light style */}
            <Appear inView distance="md" duration="slow"
              className="mb-10 p-5 rounded-[20px] bg-surface-muted border border-border-faint"
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
                        className="w-full h-10 pl-7 pr-3 bg-surface text-[15px] font-medium font-mono tabular-nums text-foreground rounded-md border border-border-faint focus:outline-none focus:ring-1 focus:ring-primary/25 focus:border-primary/50 transition-[border-color,box-shadow] duration-fast ease-standard placeholder:text-fg-placeholder"
                      />
                    </div>
                    <span className="text-[12px] text-muted-foreground">/mes</span>
                  </div>
                </div>

                {/* Results preview - compact */}
                <div className="flex gap-3">
                  <div className="px-4 py-3 rounded-md bg-surface border border-border-faint text-center min-w-[100px]">
                    <p className="text-[11px] font-mono tabular-nums text-muted-foreground mb-0.5">5%</p>
                    <p className="text-[18px] font-mono font-bold tabular-nums text-foreground">
                      ${(exampleRent * 0.05).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div className="px-4 py-3 rounded-md bg-success-soft border border-success/30 text-center min-w-[100px]">
                    <p className="text-[11px] font-mono tabular-nums text-success mb-0.5">6%</p>
                    <p className="text-[18px] font-mono font-bold tabular-nums text-foreground">
                      ${(exampleRent * 0.06).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Savings indicator - compact */}
              <div className="mt-4 pt-3 border-t border-border-faint flex flex-wrap items-center gap-4 text-[12px]">
                <span className="text-muted-foreground">
                  Ahorro: <span className="text-success font-medium font-mono tabular-nums">${(exampleRent * 0.05).toLocaleString('es-CL')}</span>/mes
                </span>
                <span className="text-fg-subtle">•</span>
                <span className="text-muted-foreground">Sin compromisos</span>
              </div>
            </Appear>

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
            <div className="mb-12">
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
            </div>

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
                price={cifraDelPlan(planDe('pro').price.monthly)}
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
                price={cifraDelPlan(planDe('flex').price.monthly)}
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
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-3">
                <Circle className="w-4 h-4 text-warning" />
                <span className="text-[13px] font-mono font-normal text-muted-foreground uppercase tracking-wide">
                  Para inmobiliarias
                </span>
              </div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                Planes para <span className="font-medium">inmobiliarias</span>
              </h2>
              <p className="text-[16px] text-muted-foreground mt-4 max-w-lg leading-relaxed">
                Precios que <span className="text-warning font-medium">escalan con tu negocio</span>. Empieza gratis, crece sin límites.
              </p>
            </div>

            {/* Pricing Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
              {/* Starter - Gratis */}
              <AgencyTierCard
                name="Starter"
                price="0"
                period="Gratis"
                description="Para empezar sin compromiso"
                properties={10}
                users={2}
                features={[
                  'Scoring básico con IA',
                  '$42.000 COP por evaluación AI',
                  'CRM de candidatos',
                  'Publicación en portales',
                  'Soporte por email',
                ]}
                ctaLabel="Empezar gratis"
                ctaHref="/auth"
                selected={selectedAgencyPlan === 'starter'}
                onSelect={() => setSelectedAgencyPlan('starter')}
                onViewDetails={() => setDetailPlan('starter')}
              />

              {/* Pro - Más popular */}
              <AgencyTierCard
                name="Pro"
                price="149.000"
                period="/mes"
                description="Para inmobiliarias en crecimiento"
                properties={100}
                users={10}
                popular
                features={[
                  'Evaluaciones AI al 50% → $21.000',
                  'Hasta 30 evaluaciones/mes',
                  'Scoring + Matching + Reportes',
                  'Contratos digitales',
                  'Reportes avanzados',
                  'Soporte prioritario',
                ]}
                addons={[
                  { label: 'Propiedad extra', price: '$3.000/mes' },
                  { label: 'Usuario extra', price: '$30.000/mes' },
                ]}
                ctaLabel="Empezar con Pro"
                selected={selectedAgencyPlan === 'pro'}
                onSelect={() => setSelectedAgencyPlan('pro')}
                onViewDetails={() => setDetailPlan('pro')}
              />

              {/* Flex - Todo incluido */}
              <AgencyTierCard
                name="Flex"
                price="1%"
                period="del canon administrado"
                noCurrencySymbol
                description="Todo incluido, sin límites"
                features={[
                  'Evaluaciones ilimitadas y gratis',
                  'Los 19 agentes AI completos',
                  'Propiedades y usuarios ilimitados',
                  'API REST + Webhooks',
                  'Multi-sucursal',
                  'Soporte prioritario dedicado',
                ]}
                ctaLabel="Contactar ventas"
                selected={selectedAgencyPlan === 'flex'}
                onSelect={() => setSelectedAgencyPlan('flex')}
                onViewDetails={() => setDetailPlan('flex')}
              />

              {/* Enterprise */}
              <AgencyTierCard
                name="Enterprise"
                price="Personalizado"
                description="Infraestructura dedicada"
                isEnterprise
                features={[
                  'Todo en Flex',
                  'White-label completo',
                  'Infraestructura dedicada',
                  'SLA garantizado 99.9%',
                  'Onboarding personalizado',
                ]}
                ctaLabel="Contactar"
                selected={selectedAgencyPlan === 'enterprise'}
                onSelect={() => setSelectedAgencyPlan('enterprise')}
                onViewDetails={() => setDetailPlan('enterprise')}
              />
            </div>

            {/* Flex Calculator */}
            <FlexCalculator />

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

          <PricingDetailSheet
            plan={detailPlan ? AGENCY_PLAN_DETAILS[detailPlan] : null}
            open={detailPlan !== null}
            onClose={() => setDetailPlan(null)}
            onSelect={() => {
              if (detailPlan) setSelectedAgencyPlan(detailPlan);
            }}
            isEnterprise={detailPlan === 'enterprise'}
          />
        </section>
      )}

      {/* Tenant Screening Section - Arriendo Pass */}
      {userTextT === 'evaluation' && (
      <section className="pb-20">
        <div className="container-platform">
          {/* Section Header - Premium editorial style */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-4 h-4 text-success" />
              <span className="text-[13px] font-mono font-normal text-muted-foreground uppercase tracking-wide">
                Evaluación de inquilinos
              </span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
              Reportes de verificación <span className="font-medium">completos</span>
            </h2>
            <p className="text-[16px] text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Para propietarios, inmobiliarias, agentes o cualquiera que necesite verificar la confiabilidad de un inquilino. También útil si eres inquilino y quieres <span className="text-success font-medium">pre-verificarte</span>.
            </p>
          </div>

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

          {/* B2B Plan-based Pricing Banner */}
          <Appear inView distance="md" duration="slow"
            className="p-6 bg-gradient-to-br from-warning/10 via-card to-card rounded-[20px] border border-warning/30 mb-16"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-warning/10 flex items-center justify-center">
                  <Buildings className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">¿Eres inmobiliaria o agente?</h3>
                  <p className="text-[13px] text-muted-foreground">
                    Con el plan Pro pagas solo <span className="font-semibold font-mono tabular-nums text-warning">$21.000/evaluación</span> (50% off). Con Flex son <span className="font-semibold text-warning">ilimitadas y gratis</span>.
                  </p>
                </div>
              </div>
              <Link href="/pricing">
                <Button variant="outline" className="whitespace-nowrap" onClick={() => { /* Will scroll to agency section */ }}>
                  Ver planes para inmobiliarias
                </Button>
              </Link>
            </div>
          </Appear>

          {/* How it works */}
          <Appear inView distance="md" duration="slow"
            className="p-8 md:p-10 bg-card rounded-[20px] border border-border"
          >
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="text-[15px] font-semibold text-foreground">
                ¿Cómo funciona?
              </h3>
            </div>
            <Stagger inView className="grid grid-cols-1 md:grid-cols-4 gap-8" layout={false} distance="md">
              {[
                { num: '1', title: 'Elige tu plan', desc: 'Básica, Pass o Premium según tu necesidad' },
                { num: '2', title: 'Completa tu perfil', desc: 'Sube documentos y autoriza verificaciones' },
                { num: '3', title: 'Recibe tu score', desc: 'En minutos tienes tu reporte verificado' },
                { num: '4', title: 'Aplica con confianza', desc: 'Propietarios ven tu perfil verificado' },
              ].map((step) => (
                <StaggerItem
                  key={step.num}
                  className="text-center"
                >
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-md flex items-center justify-center mx-auto mb-4 shadow-primary/25">
                    <span className="text-[15px] font-bold font-mono tabular-nums">{step.num}</span>
                  </div>
                  <h4 className="font-semibold text-foreground text-[14px] mb-1">{step.title}</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </Appear>

          {/* Trust note */}
          <Appear inView direction="none" duration="slow"
            className="mt-8 text-center"
          >
            <p className="text-[14px] text-muted-foreground">
              <span className="font-semibold text-foreground">Resultados en minutos</span> — Verificaciones powered by DataCrédito y fuentes oficiales colombianas.
            </p>
          </Appear>
        </div>
      </section>
      )}
      </CrossFade>

      {/* Value props - Premium Bento Style */}
      <section className="py-20 bg-muted/30">
        <div className="container-platform">
          <Appear inView distance="md" duration="slow"
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
          </Appear>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
            {/* Large card - Security */}
            <Appear inView distance="md" duration="slow"
              className="md:col-span-3 lg:col-span-5 rounded-[20px] p-6 bg-gradient-to-br from-sand-50 to-sand-100/80 border border-sand-200 relative overflow-hidden"
            >
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sand-200/50 to-transparent rounded-bl-full" />

              <div className="flex flex-col h-full relative z-10">
                <div className="w-10 h-10 rounded-md bg-success-soft flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <h3 className="text-[18px] font-mono uppercase font-normal text-foreground mb-2">
                  Seguridad garantizada
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                  Verificación de identidad y antecedentes de todos los candidatos para tu tranquilidad.
                </p>
                {/* Visual */}
                <div className="mt-auto p-3 rounded-md bg-white border border-sand-200">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-success-soft flex items-center justify-center text-[10px] font-bold text-success border-2 border-white">
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
            </Appear>

            {/* Medium card - Speed */}
            <Appear inView distance="md" duration="slow" delay={0.1}
              className="md:col-span-3 lg:col-span-4 rounded-[20px] p-6 bg-surface border border-border-faint"
            >
              <div className="w-10 h-10 rounded-md bg-warning-soft flex items-center justify-center mb-4">
                <Lightning className="w-5 h-5 text-warning" />
              </div>
              <h3 className="text-[18px] font-mono uppercase font-normal text-foreground mb-2">
                Proceso rápido
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                Encuentra inquilinos calificados en días, no semanas.
              </p>
              {/* Speed visual */}
              <Stagger inView className="space-y-2" layout={false} direction="right" distance="md" delay={0.1}>
                {['Publicar', 'Evaluar', 'Contratar'].map((step, i) => (
                  <StaggerItem
                    key={step}
                    className="flex items-center gap-3"
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                      i === 2 ? 'bg-success text-white' : 'bg-surface-muted text-muted-foreground'
                    )}>
                      {i + 1}
                    </div>
                    <span className="text-[13px] text-foreground">{step}</span>
                    {i < 2 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                  </StaggerItem>
                ))}
              </Stagger>
            </Appear>

            {/* Small card - Support */}
            <Appear inView distance="md" duration="slow" delay={0.2}
              className="md:col-span-6 lg:col-span-3 rounded-[20px] p-6 bg-surface-muted border border-border-faint"
            >
              <div className="w-10 h-10 rounded-md bg-surface flex items-center justify-center mb-4">
                <Headphones className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-[18px] font-mono uppercase font-normal text-foreground mb-2">
                Soporte experto
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Equipo local listo para ayudarte en cada paso.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[12px] text-muted-foreground">Online ahora</span>
              </div>
            </Appear>
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
      <LandingFooterV2 />
    </LandingChrome>
  );
}
