'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SectionLabel } from '@/components/ui/section-label';
import { Calculator, Check, Buildings, TrendDown, Envelope, Phone, Shield, Lightning, Infinity as InfinityIcon, CheckCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Plan-based evaluation pricing
const PLAN_PRICING = {
  starter: { name: 'Starter', monthlyFee: 0, evalCost: 42000, evalLimit: 'Sin límite (pago por uso)', color: 'bg-muted' },
  pro: { name: 'Pro', monthlyFee: 149000, evalCost: 21000, evalLimit: 'Hasta 30/mes', color: 'bg-[#1A40FF]' },
  flex: { name: 'Flex', monthlyFee: null, evalCost: 0, evalLimit: 'Ilimitadas', color: 'bg-gradient-to-r from-[#B7791F] to-[#B7791F]' },
};

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('COP', '$').trim();
}

// Animated number component
function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const duration = 300;
    const startValue = prevValueRef.current;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (value - startValue) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = value;
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{prefix}{displayValue.toLocaleString('es-CO')}</>;
}

export default function EmpresasCalculadoraPage() {
  const [quantity, setQuantity] = useState(25);

  // Calculate costs per plan
  const starterTotal = quantity * PLAN_PRICING.starter.evalCost;
  const proTotal = PLAN_PRICING.pro.monthlyFee + (Math.min(quantity, 30) * PLAN_PRICING.pro.evalCost);
  const proExcess = quantity > 30 ? (quantity - 30) * PLAN_PRICING.pro.evalCost : 0;
  const proTotalWithExcess = proTotal + proExcess;
  // Flex: 1% of managed rent — shown separately, evals are free
  const flexEvalCost = 0;

  const starterSavingsVsPro = starterTotal - proTotalWithExcess;
  const bestPlan = quantity <= 5 ? 'starter' : quantity <= 30 ? 'pro' : 'flex';

  const sliderPercentage = (quantity / 100) * 100;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative bg-foreground text-background overflow-hidden">
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
                  Comparador de planes
                </span>
              </div>

              <h1 className="text-[40px] md:text-[56px] font-heading font-normal leading-[1.05] tracking-[-0.03em]">
                Evaluaciones
                <span className="block text-white/40">por plan</span>
              </h1>

              <p className="text-[17px] text-white/50 mt-4 leading-relaxed">
                Compara cuánto pagas por evaluaciones AI según tu plan. Encuentra el plan ideal para tu volumen de operación.
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
                <div className="bg-card rounded-sm overflow-hidden border border-border">
                  <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-[16px] font-heading font-medium text-foreground">
                      ¿Cuántas evaluaciones al mes?
                    </h2>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Quantity Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Evaluaciones / mes
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                          className="w-16 h-9 px-2 text-center text-[14px] font-bold bg-muted/50 rounded-sm border border-border focus:outline-none focus:ring-2 focus:ring-foreground/10"
                        />
                      </div>

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
                          max="100"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value))}
                          className="absolute inset-x-0 w-full h-12 opacity-0 cursor-pointer"
                        />
                        <motion.div
                          className="absolute w-5 h-5 bg-foreground rounded-full cursor-pointer flex items-center justify-center"
                          style={{ left: `calc(${sliderPercentage}% - 10px)` }}
                          initial={false}
                          animate={{ left: `calc(${sliderPercentage}% - 10px)` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </motion.div>
                      </div>

                      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                        <span>1</span>
                        <span>25</span>
                        <span>50</span>
                        <span>100+</span>
                      </div>
                    </div>

                    {/* Plan comparison table */}
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-4 block">
                        Costo por plan
                      </label>
                      <div className="rounded-sm overflow-hidden border border-border">
                        {/* Starter */}
                        <div className={cn(
                          'flex items-center justify-between px-4 py-3 transition-all duration-200',
                          bestPlan === 'starter' ? 'bg-foreground text-background' : 'bg-card'
                        )}>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[13px] font-medium", bestPlan === 'starter' ? 'text-background' : 'text-foreground')}>
                              Starter (Gratis)
                            </span>
                            {bestPlan === 'starter' && (
                              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded-sm uppercase">Mejor opción</motion.span>
                            )}
                          </div>
                          <span className={cn("text-[13px] font-semibold tabular-nums", bestPlan === 'starter' ? 'text-background' : 'text-foreground')}>
                            {formatCOP(starterTotal)}
                          </span>
                        </div>

                        {/* Pro */}
                        <div className={cn(
                          'flex items-center justify-between px-4 py-3 transition-all duration-200',
                          bestPlan === 'pro' ? 'bg-foreground text-background' : 'bg-muted/20'
                        )}>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[13px] font-medium", bestPlan === 'pro' ? 'text-background' : 'text-foreground')}>
                              Pro ($149.000/mes)
                            </span>
                            {bestPlan === 'pro' && (
                              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded-sm uppercase">Mejor opción</motion.span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[13px] font-semibold tabular-nums", bestPlan === 'pro' ? 'text-background' : 'text-foreground')}>
                              {formatCOP(proTotalWithExcess)}
                            </span>
                            {starterSavingsVsPro > 0 && (
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm", bestPlan === 'pro' ? 'bg-[#2C7A53]/20 text-[#2C7A53]' : 'bg-[#E8F3EC] text-[#2C7A53]')}>
                                -{Math.round((starterSavingsVsPro / starterTotal) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Flex */}
                        <div className={cn(
                          'flex items-center justify-between px-4 py-3 transition-all duration-200',
                          bestPlan === 'flex' ? 'bg-foreground text-background' : 'bg-card'
                        )}>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[13px] font-medium", bestPlan === 'flex' ? 'text-background' : 'text-foreground')}>
                              Flex (1% canon)
                            </span>
                            {bestPlan === 'flex' && (
                              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded-sm uppercase">Mejor opción</motion.span>
                            )}
                          </div>
                          <span className={cn("text-[13px] font-semibold", bestPlan === 'flex' ? 'text-[#2C7A53]' : 'text-[#2C7A53]')}>
                            $0 por eval
                          </span>
                        </div>
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
                {/* Recommendation Card */}
                <div className="relative bg-foreground text-background rounded-sm overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/[0.05] to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

                  <div className="relative p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Recomendación</p>
                        <h2 className="text-[20px] font-heading font-medium">
                          {bestPlan === 'starter' && 'Plan Starter'}
                          {bestPlan === 'pro' && 'Plan Pro'}
                          {bestPlan === 'flex' && 'Plan Flex'}
                        </h2>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5 bg-[#2C7A53] text-white text-[11px] font-bold px-3 py-1.5 rounded-sm"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Mejor para ti
                      </motion.div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Evaluaciones</p>
                        <p className="text-[14px] font-medium">{quantity} eval/mes</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Precio por eval</p>
                        <p className="text-[14px] font-medium tabular-nums">
                          {bestPlan === 'starter' && formatCOP(42000)}
                          {bestPlan === 'pro' && formatCOP(21000)}
                          {bestPlan === 'flex' && 'Gratis'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Suscripción</p>
                        <p className="text-[14px] font-medium tabular-nums">
                          {bestPlan === 'starter' && 'Gratis'}
                          {bestPlan === 'pro' && formatCOP(149000) + '/mes'}
                          {bestPlan === 'flex' && '1% del canon'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Ahorro vs Starter</p>
                        <p className="text-[14px] font-medium text-[#2C7A53] tabular-nums">
                          {bestPlan === 'starter' && '—'}
                          {bestPlan === 'pro' && formatCOP(starterSavingsVsPro)}
                          {bestPlan === 'flex' && formatCOP(starterTotal)}
                        </p>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-6 mb-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Costo total evaluaciones</p>
                          <p className="text-[40px] font-heading font-light tracking-tight leading-none tabular-nums">
                            {bestPlan === 'flex' ? (
                              <span className="text-[#2C7A53]">$0</span>
                            ) : (
                              <>$<AnimatedNumber value={bestPlan === 'starter' ? starterTotal : proTotalWithExcess} /></>
                            )}
                          </p>
                        </div>
                        <p className="text-[12px] text-white/40 mb-2">COP/mes</p>
                      </div>
                    </div>

                    {/* CTA */}
                    {bestPlan === 'flex' ? (
                      <a href="mailto:ventas@leasefy.co?subject=Plan%20Flex%20-%20Consulta">
                        <Button className="w-full h-12 rounded-sm bg-white text-neutral-900 hover:bg-white/90 text-[14px] font-medium">
                          Contactar ventas
                        </Button>
                      </a>
                    ) : (
                      <Link href="/auth">
                        <Button className="w-full h-12 rounded-sm bg-white text-neutral-900 hover:bg-white/90 text-[14px] font-medium">
                          {bestPlan === 'starter' ? 'Empezar gratis' : 'Empezar con Pro'}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Features comparison */}
                <div className="bg-card rounded-sm p-6 border border-border">
                  <h3 className="text-[14px] font-medium text-foreground mb-5">Comparación de evaluaciones por plan</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { feature: 'Verificación de identidad', starter: true, pro: true },
                      { feature: 'Historial crediticio (DataCrédito)', starter: true, pro: true },
                      { feature: 'Score de riesgo con IA', starter: true, pro: true },
                      { feature: 'Reporte PDF descargable', starter: true, pro: true },
                      { feature: 'Antecedentes judiciales', starter: false, pro: true },
                      { feature: 'Referencias laborales verificadas', starter: false, pro: true },
                      { feature: 'Verificación de ingresos', starter: false, pro: true },
                      { feature: 'Matching inteligente', starter: false, pro: true },
                    ].map((item, i) => (
                      <motion.div
                        key={item.feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-2 p-2 rounded-sm bg-muted/30"
                      >
                        <Check className={cn(
                          "w-3.5 h-3.5 flex-shrink-0",
                          item.pro ? 'text-[#2C7A53]' : 'text-muted-foreground/40'
                        )} />
                        <span className="text-[12px] text-foreground/80">{item.feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Enterprise Banner */}
                {quantity >= 50 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-muted/50 rounded-sm p-6 overflow-hidden border border-border"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-sm bg-foreground/5 flex items-center justify-center flex-shrink-0">
                        <Buildings className="w-5 h-5 text-foreground/60" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-medium text-foreground">Plan Flex recomendado</h3>
                          <span className="text-[9px] font-bold bg-foreground text-background px-1.5 py-0.5 rounded-sm uppercase">
                            Recomendado
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                          Con {quantity}+ evaluaciones al mes, el plan Flex te da evaluaciones ilimitadas y gratuitas, más acceso a los 19 agentes AI. Solo pagas 1% del canon administrado.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <a href="mailto:ventas@leasefy.co?subject=Plan%20Flex%20-%20Evaluaciones">
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
              </motion.div>
            </div>
          </div>
        </section>

        {/* Cost Comparison Table */}
        <section className="py-16 lg:py-20 bg-background">
          <div className="container-platform">
            <div className="mb-12">
              <SectionLabel>Referencia</SectionLabel>
              <h2 className="text-[32px] md:text-[40px] font-heading font-normal text-foreground tracking-[-0.02em]">
                Costo por volumen de evaluaciones
              </h2>
              <p className="text-[15px] text-muted-foreground mt-2">
                Cuánto pagarías en total según tu plan y volumen mensual
              </p>
            </div>

            {/* Volume comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-3 pr-4">Evaluaciones/mes</th>
                    <th className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Starter (Gratis)</th>
                    <th className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                      <span className="flex items-center gap-1.5">Pro ($149K/mes) <span className="bg-[#1A40FF] text-white uppercase tracking-wide font-mono text-[8px] px-1.5 py-0.5 rounded-full">Popular</span></span>
                    </th>
                    <th className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-3 pl-4">
                      <span className="flex items-center gap-1.5">Flex (1% canon) <span className="bg-gradient-to-r from-[#B7791F] to-[#B7791F] text-white text-[8px] px-1.5 py-0.5 rounded-full">Todo incluido</span></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[5, 10, 15, 20, 30, 50, 75, 100].map((qty) => {
                    const sTotal = qty * 42000;
                    const pEvals = Math.min(qty, 30) * 21000;
                    const pExcess = qty > 30 ? (qty - 30) * 21000 : 0;
                    const pTotal = 149000 + pEvals + pExcess;
                    const cheapest = Math.min(sTotal, pTotal);
                    const isCheapestStarter = sTotal <= pTotal;

                    return (
                      <tr key={qty} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="text-[13px] font-semibold text-foreground py-3 pr-4 tabular-nums">{qty}</td>
                        <td className={cn(
                          "text-[13px] py-3 px-4 tabular-nums",
                          isCheapestStarter && qty < 50 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                        )}>
                          {formatCOP(sTotal)}
                        </td>
                        <td className={cn(
                          "text-[13px] py-3 px-4 tabular-nums",
                          !isCheapestStarter && qty < 50 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                        )}>
                          {formatCOP(pTotal)}
                          {qty > 30 && <span className="text-[10px] text-[#B7791F] ml-1">({qty - 30} extra)</span>}
                        </td>
                        <td className={cn(
                          "text-[13px] py-3 pl-4",
                          qty >= 50 ? 'font-semibold text-[#2C7A53]' : 'text-[#2C7A53]'
                        )}>
                          $0 por eval
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[12px] text-muted-foreground mt-4">
              * Plan Flex: las evaluaciones son gratuitas e ilimitadas. El costo del plan es 1% del canon total administrado.
              Ej: 100 unidades x $2M canon = $2.000.000 COP/mes.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
