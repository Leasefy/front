'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SectionLabel } from '@/components/ui/section-label';
import { Calculator, Check, Buildings, TrendDown, Copy, CheckCircle, Envelope, Phone, Shield, Lightning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Volume pricing tiers
const VOLUME_TIERS_BASIC = [
  { min: 1, max: 10, price: 24900, discount: 0 },
  { min: 11, max: 25, price: 19900, discount: 20 },
  { min: 26, max: 50, price: 16900, discount: 32 },
  { min: 51, max: 100, price: 14900, discount: 40 },
  { min: 101, max: 200, price: 12900, discount: 48 },
  { min: 201, max: Infinity, price: 9900, discount: 60 },
];

const VOLUME_TIERS_COMPLETE = [
  { min: 1, max: 10, price: 39900, discount: 0 },
  { min: 11, max: 25, price: 34900, discount: 13 },
  { min: 26, max: 50, price: 29900, discount: 25 },
  { min: 51, max: 100, price: 24900, discount: 38 },
  { min: 101, max: 200, price: 19900, discount: 50 },
  { min: 201, max: Infinity, price: 14900, discount: 63 },
];

type EvaluationTextT = 'basic' | 'complete';

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('COP', '$').trim();
}

function getTier(quantity: number, type: EvaluationTextT) {
  const tiers = type === 'basic' ? VOLUME_TIERS_BASIC : VOLUME_TIERS_COMPLETE;
  return tiers.find(tier => quantity >= tier.min && quantity <= tier.max) || tiers[tiers.length - 1];
}

function calculatePricing(quantity: number, type: EvaluationTextT) {
  const tier = getTier(quantity, type);
  const basePrice = type === 'basic' ? 24900 : 39900;
  const unitPrice = tier.price;
  const totalPrice = unitPrice * quantity;
  const savings = (basePrice - unitPrice) * quantity;
  const discount = tier.discount;

  return { unitPrice, totalPrice, savings, discount };
}

// Animated number component
function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 300;
    const startValue = displayValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (value - startValue) * easeOut));

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{prefix}{displayValue.toLocaleString('es-CL')}</>;
}

export default function EmpresasCalculadoraPage() {
  const [quantity, setQuantity] = useState(25);
  const [evaluationTextT, setEvaluationTextT] = useState<EvaluationTextT>('complete');
  const [copied, setCopied] = useState(false);

  const pricing = calculatePricing(quantity, evaluationTextT);
  const tiers = evaluationTextT === 'basic' ? VOLUME_TIERS_BASIC : VOLUME_TIERS_COMPLETE;

  const handleCopyQuote = () => {
    const quote = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COTIZACIÓN ARRIENDO FÁCIL
Evaluaciones por Volumen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tipo: Evaluación ${evaluationTextT === 'basic' ? 'Básica' : 'Completa'}
Cantidad: ${quantity} evaluaciones/mes

PRECIO UNITARIO: ${formatCOP(pricing.unitPrice)}
TOTAL MENSUAL: ${formatCOP(pricing.totalPrice)}

${pricing.discount > 0 ? `✓ Descuento aplicado: ${pricing.discount}%\n✓ Ahorro mensual: ${formatCOP(pricing.savings)}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contacto: ventas@leasefy.co
Tel: +57 300 123 4567
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    navigator.clipboard.writeText(quote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const sliderPercentage = (quantity / 300) * 100;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative bg-foreground text-background overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.02]">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative container-platform py-20 pt-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-10 h-10 rounded-sm bg-white/10 flex items-center justify-center"
                >
                  <Calculator className="w-5 h-5" />
                </motion.div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-medium">
                  Herramienta de ventas
                </span>
              </div>

              <h1 className="text-[40px] md:text-[56px] font-heading font-normal leading-[1.05] tracking-[-0.03em]">
                Calculadora
                <span className="block text-white/40">Empresarial</span>
              </h1>

              <p className="text-[17px] text-white/50 mt-4 leading-relaxed">
                Genera cotizaciones instantáneas con precios por volumen para inmobiliarias y agentes.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-16 lg:py-20 bg-muted/30">
          <div className="container-platform">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left - Calculator Config */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="lg:col-span-5"
              >
                <div className="bg-white rounded-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                  {/* Card Header */}
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <h2 className="text-[16px] font-heading font-medium text-foreground">
                      Configura tu cotización
                    </h2>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Evaluation TextT */}
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-4 block">
                        Tipo de evaluación
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'basic', name: 'Básica', price: 9900, icon: Shield },
                          { id: 'complete', name: 'Completa', price: 14900, icon: Lightning },
                        ].map((type) => {
                          const isActive = evaluationTextT === type.id;
                          const Icon = type.icon;
                          return (
                            <motion.button
                              key={type.id}
                              onClick={() => setEvaluationTextT(type.id as EvaluationTextT)}
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                'relative p-4 text-left rounded-sm transition-all duration-200 overflow-hidden',
                                isActive
                                  ? 'bg-foreground text-background'
                                  : 'bg-muted/50 hover:bg-muted'
                              )}
                              style={{ border: isActive ? 'none' : '1px solid rgba(0,0,0,0.06)' }}
                            >
                              <div className="relative">
                                <div className={cn(
                                  "w-8 h-8 rounded-sm flex items-center justify-center mb-3 transition-colors",
                                  isActive ? 'bg-white/10' : 'bg-foreground/5'
                                )}>
                                  <Icon className={cn("w-4 h-4", isActive ? 'text-white' : 'text-foreground/60')} />
                                </div>
                                <span className="text-[14px] font-medium block mb-0.5">{type.name}</span>
                                <span className={cn(
                                  "text-[11px]",
                                  isActive ? 'text-white/50' : 'text-muted-foreground'
                                )}>
                                  Desde {formatCOP(type.price)}/eval
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quantity Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Evaluaciones / mes
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                          className="w-16 h-9 px-2 text-center text-[14px] font-bold bg-muted/50 rounded-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                        />
                      </div>

                      {/* Custom Slider */}
                      <div className="relative h-12 flex items-center">
                        <div className="absolute inset-x-0 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-foreground rounded-full"
                            style={{ width: `${sliderPercentage}%` }}
                            initial={false}
                            animate={{ width: `${sliderPercentage}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                          />
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="300"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value))}
                          className="absolute inset-x-0 w-full h-12 opacity-0 cursor-pointer"
                        />
                        <motion.div
                          className="absolute w-5 h-5 bg-foreground rounded-full shadow-lg cursor-pointer flex items-center justify-center"
                          style={{ left: `calc(${sliderPercentage}% - 10px)` }}
                          initial={false}
                          animate={{ left: `calc(${sliderPercentage}% - 10px)` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </motion.div>
                      </div>

                      {/* Quantity Labels */}
                      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                        <span>1</span>
                        <span>100</span>
                        <span>200</span>
                        <span>300+</span>
                      </div>
                    </div>

                    {/* Volume Tiers Table */}
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-4 block">
                        Tabla de descuentos
                      </label>
                      <div className="rounded-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                        {tiers.map((tier, i) => {
                          const isActive = quantity >= tier.min && quantity <= tier.max;
                          return (
                            <motion.div
                              key={i}
                              className={cn(
                                'flex items-center justify-between px-4 py-3 transition-all duration-200',
                                isActive
                                  ? 'bg-foreground text-background'
                                  : i % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[13px] font-medium tabular-nums",
                                  isActive ? 'text-background' : 'text-foreground'
                                )}>
                                  {tier.max === Infinity ? `${tier.min}+` : `${tier.min}-${tier.max}`}
                                </span>
                                {isActive && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded-sm uppercase"
                                  >
                                    Actual
                                  </motion.span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "text-[13px] font-semibold tabular-nums",
                                  isActive ? 'text-background' : 'text-foreground'
                                )}>
                                  {formatCOP(tier.price)}
                                </span>
                                {tier.discount > 0 && (
                                  <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
                                    isActive
                                      ? 'bg-emerald-400/20 text-emerald-300'
                                      : 'bg-emerald-50 text-emerald-600'
                                  )}>
                                    -{tier.discount}%
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right - Results */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-7 space-y-6"
              >
                {/* Main Quote Card */}
                <div className="relative bg-foreground text-background rounded-sm overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/[0.05] to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

                  <div className="relative p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Cotización</p>
                        <h2 className="text-[20px] font-heading font-medium">Resumen</h2>
                      </div>
                      <AnimatePresence mode="wait">
                        {pricing.discount > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1.5 bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-sm"
                          >
                            <TrendDown className="w-3 h-3" />
                            {pricing.discount}% OFF
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Tipo</p>
                        <p className="text-[14px] font-medium">{evaluationTextT === 'basic' ? 'Básica' : 'Completa'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Cantidad</p>
                        <p className="text-[14px] font-medium">{quantity} eval/mes</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Precio unitario</p>
                        <p className="text-[14px] font-medium tabular-nums">{formatCOP(pricing.unitPrice)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Ahorro</p>
                        <p className="text-[14px] font-medium text-emerald-400 tabular-nums">
                          {pricing.savings > 0 ? formatCOP(pricing.savings) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-6 mb-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Total mensual</p>
                          <p className="text-[40px] font-heading font-light tracking-tight leading-none tabular-nums">
                            $<AnimatedNumber value={pricing.totalPrice} />
                          </p>
                        </div>
                        <p className="text-[12px] text-white/40 mb-2">COP</p>
                      </div>
                    </div>

                    {/* Savings Banner */}
                    <AnimatePresence>
                      {pricing.savings > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6"
                        >
                          <div className="bg-emerald-500/15 rounded-sm p-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-[12px] font-medium text-emerald-300">
                                Ahorro mensual de {formatCOP(pricing.savings)}
                              </p>
                              <p className="text-[10px] text-emerald-400/60">
                                {formatCOP(pricing.savings * 12)} al año
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* CTA Button */}
                    <motion.button
                      onClick={handleCopyQuote}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "w-full h-12 rounded-sm font-medium text-[14px] flex items-center justify-center gap-2 transition-all duration-200",
                        copied
                          ? "bg-emerald-500 text-white"
                          : "bg-white text-foreground hover:bg-white/90"
                      )}
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.span
                            key="copied"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            ¡Cotización copiada!
                          </motion.span>
                        ) : (
                          <motion.span
                            key="copy"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copiar cotización
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>

                {/* Features Card */}
                <div className="bg-white rounded-sm p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={cn(
                      "w-8 h-8 rounded-sm flex items-center justify-center",
                      evaluationTextT === 'basic' ? 'bg-muted' : 'bg-foreground'
                    )}>
                      {evaluationTextT === 'basic' ? (
                        <Shield className="w-4 h-4 text-foreground/60" />
                      ) : (
                        <Lightning className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium text-foreground">
                        Evaluación {evaluationTextT === 'basic' ? 'Básica' : 'Completa'}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">Incluido en cada evaluación</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(evaluationTextT === 'basic' ? [
                      'Verificación de identidad',
                      'Historial crediticio (DataCrédito)',
                      'Score de riesgo con IA',
                      'Reporte PDF descargable',
                    ] : [
                      'Todo en Evaluación Básica',
                      'Antecedentes judiciales',
                      'Referencias laborales verificadas',
                      'Verificación de ingresos',
                      'Score IA avanzado',
                    ]).map((feature, i) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-2 p-2 rounded-sm bg-muted/30"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-[12px] text-foreground/80">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Enterprise Banner */}
                <AnimatePresence>
                  {quantity >= 100 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="relative bg-muted/50 rounded-sm p-6 overflow-hidden"
                      style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-sm bg-foreground/5 flex items-center justify-center flex-shrink-0">
                          <Buildings className="w-5 h-5 text-foreground/60" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[15px] font-medium text-foreground">
                              Plan Enterprise
                            </h3>
                            <span className="text-[9px] font-bold bg-foreground text-background px-1.5 py-0.5 rounded-sm uppercase">
                              Recomendado
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                            Para 100+ evaluaciones, creamos un plan personalizado con mejores precios, facturación consolidada y gerente de cuenta dedicado.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <a href="mailto:ventas@leasefy.co?subject=Plan%20Enterprise%20-%20Evaluaciones">
                              <Button size="sm" className="h-8 rounded-sm gap-1.5 text-[12px]">
                                <Envelope className="w-3 h-3" />
                                ventas@leasefy.co
                              </Button>
                            </a>
                            <a href="tel:+573001234567">
                              <Button size="sm" variant="outline" className="h-8 rounded-sm gap-1.5 text-[12px]">
                                <Phone className="w-3 h-3" />
                                +57 300 123 4567
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Quick Reference Cards */}
        <section className="py-16 lg:py-20 bg-white">
          <div className="container-platform">
            <div className="mb-12">
              <SectionLabel>Referencia</SectionLabel>
              <h2 className="text-[32px] md:text-[40px] font-heading font-normal text-foreground tracking-[-0.02em]">
                Tabla de precios completa
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { type: 'basic', name: 'Evaluación Básica', tiers: VOLUME_TIERS_BASIC, icon: Shield, dark: false },
                { type: 'complete', name: 'Evaluación Completa', tiers: VOLUME_TIERS_COMPLETE, icon: Lightning, dark: true },
              ].map((plan) => {
                const Icon = plan.icon;
                return (
                  <motion.div
                    key={plan.type}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={cn(
                      "rounded-sm overflow-hidden",
                      plan.dark ? 'bg-foreground text-background' : 'bg-white'
                    )}
                    style={{ border: plan.dark ? 'none' : '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <div className={cn(
                      "px-6 py-4 flex items-center gap-3",
                      plan.dark ? '' : 'bg-muted/30'
                    )}
                    style={{ borderBottom: plan.dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-sm flex items-center justify-center",
                        plan.dark ? 'bg-white/10' : 'bg-foreground/5'
                      )}>
                        <Icon className={cn("w-4 h-4", plan.dark ? 'text-white' : 'text-foreground/60')} />
                      </div>
                      <span className="text-[14px] font-medium">{plan.name}</span>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-2">
                        {plan.tiers.map((tier, i) => (
                          <div
                            key={i}
                            className={cn(
                              "p-3 rounded-sm text-center",
                              plan.dark ? 'bg-white/5' : 'bg-muted/30'
                            )}
                          >
                            <p className={cn(
                              "text-[10px] mb-1",
                              plan.dark ? 'text-white/40' : 'text-muted-foreground'
                            )}>
                              {tier.max === Infinity ? `${tier.min}+` : `${tier.min}-${tier.max}`}
                            </p>
                            <p className={cn(
                              "text-[13px] font-bold tabular-nums",
                              plan.dark ? 'text-white' : 'text-foreground'
                            )}>
                              {formatCOP(tier.price)}
                            </p>
                            {tier.discount > 0 && (
                              <p className={cn(
                                "text-[9px] font-semibold mt-0.5",
                                plan.dark ? 'text-emerald-400' : 'text-emerald-600'
                              )}>
                                -{tier.discount}%
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
