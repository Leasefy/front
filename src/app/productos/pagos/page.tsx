'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { FAQSection } from '@/components/home/FAQSection';
import { CTASection } from '@/components/home/CTASection';
import { Button } from '@/components/ui/button';
import { CaretLeft, CaretRight, CheckCircle, Shield, CreditCard, Calendar, TrendUp, Wallet, DeviceMobile, Lightning, CurrencyCircleDollar, PaperPlaneTilt, Bank, BellRinging, ChartBar, Clock, FileText, WarningCircle, Receipt, ChartBarHorizontal, ArrowRight } from '@phosphor-icons/react';

// Testimonials data for payments
const testimonials = [
  {
    quote: 'Antes perseguía al inquilino cada mes. Ahora el dinero llega puntual a mi cuenta sin que yo haga nada. El cobro automático me devolvió mi tranquilidad.',
    author: 'Carolina Mendoza',
    role: 'Propietaria de 2 apartamentos',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Los recordatorios automáticos por WhatsApp funcionan increíble. Mis inquilinos pagan sin que yo les tenga que escribir. Ya no hay excusas ni retrasos.',
    author: 'Roberto García',
    role: 'Propietario en Medellín',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'El reporte mensual es oro. Veo exactamente cuánto recibí, de quién, y cuándo. Mi contador está feliz y yo tengo todo organizado.',
    author: 'Ana Lucía Restrepo',
    role: 'Inversionista inmobiliaria',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Que el inquilino pueda pagar con Nequi o PSE me abrió a más candidatos. El dinero me llega en 24 horas. Sin comisiones ocultas.',
    author: 'Diego Fernández',
    role: 'Propietario en Bogotá',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

export default function PagosPage() {
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
            src="/hero-4.jpg"
            alt="Modern home interior"
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
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase font-normal text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15"
                >
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  Cobro automático de arriendos
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  Recibe tu arriendo
                  <span className="block mt-2 text-white/90">sin perseguir a nadie</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  Cobro automático, recordatorios inteligentes y múltiples métodos de pago.{' '}
                  <span className="text-white font-medium">Tu dinero en tu cuenta en 24 horas.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/auth">
                    <Button size="lg" variant="white" className="w-full sm:w-auto font-mono uppercase font-normal h-12 px-6 rounded-xl">
                      Activar cobro automático
                    </Button>
                  </Link>
                  <Link href="#como-funciona">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium h-12 px-6 rounded-xl"
                    >
                      Ver cómo funciona
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
                    { value: '0%', label: 'Comisión' },
                    { value: '24h', label: 'A tu cuenta' },
                    { value: '95%', label: 'Pagos puntuales' },
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
                    {/* Balance section */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white/50 text-[11px]">Balance disponible</span>
                        <Wallet className="w-4 h-4 text-white/40" />
                      </div>
                      <p className="text-[28px] font-bold text-white tracking-tight">$34.200.000</p>
                      <div className="flex items-center gap-2 mt-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-[11px] font-medium text-foreground">
                          <PaperPlaneTilt className="w-3 h-3" />
                          Retirar
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-xl text-[11px] font-medium text-white/70">
                          <ChartBar className="w-3 h-3" />
                          Reporte
                        </button>
                      </div>
                    </motion.div>

                    {/* Recent transactions */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-white/30 uppercase tracking-wider block px-1">
                        Últimos pagos
                      </span>
                      {[
                        { initials: 'ML', name: 'María López', amount: '+$2.5M', time: 'Hoy' },
                        { initials: 'CG', name: 'Nicolás Gómez', amount: '+$1.8M', time: 'Ayer' },
                      ].map((tx, i) => (
                        <motion.div
                          key={tx.name}
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="flex items-center gap-3 bg-white/[0.06] rounded-lg p-2.5 border border-white/[0.06]"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-white/60">{tx.initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-white/80 truncate">{tx.name}</p>
                            <p className="text-[10px] text-white/40">{tx.time}</p>
                          </div>
                          <span className="text-[13px] font-medium text-emerald-400">{tx.amount}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Next payment */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-[11px] text-white/40">Próximo: <span className="text-white/70 font-medium">5 Feb</span></span>
                      </div>
                      <span className="text-[13px] font-medium text-white/70">$2.5M</span>
                    </motion.div>
                  </motion.div>

                  {/* Floating notification */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -bottom-5 -left-4 bg-white rounded-xl shadow-xl p-3.5 border border-neutral-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">3 pagos hoy</p>
                        <p className="text-[11px] text-muted-foreground">$6.8M recibidos</p>
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
                  Cobrar arriendo no debería ser <span className="italic">tan difícil</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Perseguir inquilinos, excusas, retrasos, desorden contable. El proceso tradicional de cobro está roto.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row - Image Cards with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5">
              {/* Card 1 - Perseguir */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-interior.jpg"
                  alt="Interior moderno"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-mono font-normal text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Perseguir
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    8h
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    mensuales cobrando arriendo
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Llamadas, mensajes, excusas. Un ritual agotador que se repite cada mes
                  </p>
                </div>
              </motion.div>

              {/* Card 2 - Retrasos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-2.jpg"
                  alt="Espacio moderno"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-mono font-normal text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Retrasos
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    67%
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    inquilinos pagan tarde
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    {'"'}Ya te consigno mañana{'"'} es la frase más repetida en los arriendos tradicionales
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - Desorden */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-3.jpg"
                  alt="Habitación moderna"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-mono font-normal text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Desorden
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    0
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    registro de pagos organizado
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Sin sistema, la contabilidad es un desastre de extractos y WhatsApps
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Robottom Row - Illustration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Card 4 - Manual Payment Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-sand-50 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center min-h-[280px]"
              >
                {/* Widget Illustration */}
                <div className="flex-shrink-0 relative">
                  <div className="bg-white rounded-xl shadow-lg p-4 w-[200px] border border-neutral-100">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-neutral-100">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <BellRinging className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-foreground">Recordatorio #47</p>
                        <p className="text-[10px] text-muted-foreground">Hoy 9:30 AM</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-amber-50 rounded-lg p-2">
                        <p className="text-[10px] text-amber-700">
                          {'"'}Hola Nicolás, recuerda que el arriendo de este mes está pendiente...{'"'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Enviado hace 3 días</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    47
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    {'"'}Ya te escribo mañana{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Mensajes manuales que nadie lee. Excusas que se repiten cada mes. Un ciclo agotador que consume tu tiempo y energía.
                  </p>
                </div>
              </motion.div>

              {/* Card 5 - No Receipt Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-sand-50 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center min-h-[280px]"
              >
                {/* Widget Illustration */}
                <div className="flex-shrink-0 relative">
                  <div className="bg-white rounded-xl shadow-lg p-4 w-[220px] border border-neutral-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-medium text-foreground">Control de pagos</span>
                      <WarningCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="space-y-2">
                      {[
                        { month: 'Enero', status: 'Consignación Bancol...', unclear: true },
                        { month: 'Febrero', status: 'WhatsApp dice que pagó', unclear: true },
                        { month: 'Marzo', status: '???', unclear: true },
                        { month: 'Abril', status: 'Nequi ¿cuánto?', unclear: true },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{item.month}</span>
                          <span className="text-red-500/70 text-[10px] truncate max-w-[100px]">{item.status}</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-neutral-100 my-3" />
                    <div className="flex items-center gap-2 text-[10px] text-red-500">
                      <Receipt className="w-3 h-3" />
                      <span>Sin recibos formales</span>
                    </div>
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    {'"'}¿Ya me pagó este mes?{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Sin un sistema centralizado, cada mes es un detective work revisando extractos, WhatsApps y notas. Un caos contable.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Solutions Bento Section */}
        <section id="como-funciona" className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Cobra tu arriendo <span className="italic">sin esfuerzo</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Configura una vez, recibe cada mes. Cobro automático, recordatorios inteligentes y reportes detallados.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - Cobro Automático */}
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
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-white leading-tight mb-3">
                    Cobro Automático
                  </h3>
                  <p className="text-[15px] text-white/70 leading-relaxed max-w-md">
                    Configura la fecha de cobro y el monto. Nosotros nos encargamos del resto. Tu inquilino paga, tú recibes.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-6">
                  {['Débito automático', 'PSE y tarjeta', 'Nequi y Daviplata'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Recordatorios */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
                    <BellRinging className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    Recordatorios Inteligentes
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    WhatsApp, email y SMS automáticos. Tu inquilino recibe recordatorios amigables sin que tú escribas nada.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['3 días antes', '1 día antes', 'Día de pago'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Recibos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Receipt className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    Recibos Automáticos
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Cada pago genera un recibo digital. Tu inquilino lo recibe automáticamente, tú tienes todo documentado.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['PDF descargable', 'Envío automático', 'Historial completo'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Large Card - Transferencia */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="md:col-span-7 relative rounded-xl overflow-hidden min-h-[360px] group"
              >
                <Image
                  src="/hero-5.jpg"
                  alt="Propiedad moderna"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Bank className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-white leading-tight mb-3">
                      Tu Dinero en 24 Horas
                    </h3>
                    <p className="text-[15px] text-white/70 leading-relaxed max-w-md mb-6">
                      Cuando tu inquilino paga, el dinero está en tu cuenta bancaria al día siguiente. Sin intermediarios, sin comisiones.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['0% comisión', 'Todos los bancos', 'Transferencia automática'].map((item, i) => (
                        <span key={i} className="text-[12px] font-mono uppercase font-normal text-white/80 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
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

        {/* Payment Methods Section */}
        <section className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Tu inquilino elige <span className="italic">cómo pagar</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Aceptamos todos los métodos de pago populares en Colombia. Más opciones = menos excusas.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {[
                { icon: CreditCard, name: 'Tarjeta débito/crédito', description: 'Visa, Mastercard, Amex', popular: true },
                { icon: Bank, name: 'PSE', description: 'Todos los bancos de Colombia', popular: false },
                { icon: DeviceMobile, name: 'Nequi / Daviplata', description: 'Billeteras digitales', popular: false },
                { icon: CurrencyCircleDollar, name: 'Efectivo', description: 'Efecty, Baloto, SuRed', popular: false },
              ].map((method, i) => {
                const Icon = method.icon;
                return (
                  <motion.div
                    key={method.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative bg-sand-50 rounded-xl p-6 min-h-[200px] flex flex-col"
                  >
                    {method.popular && (
                      <span className="absolute -top-2.5 left-4 px-3 py-1 text-[10px] font-mono font-normal uppercase tracking-wider bg-foreground text-white rounded-full">
                        Más usado
                      </span>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
                      <Icon className="w-6 h-6 text-foreground/70" />
                    </div>
                    <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-1">{method.name}</h3>
                    <p className="text-[13px] text-muted-foreground">{method.description}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-12 flex items-center justify-center gap-8 flex-wrap"
            >
              {[
                { icon: Shield, label: 'Certificación PCI-DSS' },
                { icon: CheckCircle, label: 'Regulado por SFC Colombia' },
                { icon: Lightning, label: 'Soporte 24/7' },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <badge.icon className="w-4 h-4" />
                  <span className="text-[13px]">{badge.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Dashboard Preview Section - Visual Bento */}
        <section className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Todo en un solo <span className="italic">dashboard</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Visualiza ingresos, pagos pendientes y reportes. Tu contador te lo agradecerá.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - Main Dashboard Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="md:col-span-8 bg-foreground rounded-xl p-6 min-h-[420px] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Panel de Pagos</p>
                    <h3 className="text-[20px] font-heading font-medium text-white">Resumen del mes</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white/50 bg-white/10 px-3 py-1.5 rounded-full">Enero 2026</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
                  <div className="bg-white/[0.08] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Recibido</p>
                    <p className="text-[28px] font-bold text-white tracking-tight">$12.5M</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendUp className="w-3 h-3 text-emerald-400" />
                      <span className="text-[11px] text-emerald-400">+12%</span>
                    </div>
                  </div>
                  <div className="bg-white/[0.08] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Pendiente</p>
                    <p className="text-[28px] font-bold text-white tracking-tight">$2.5M</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-[11px] text-amber-400">1 pago</span>
                    </div>
                  </div>
                  <div className="bg-white/[0.08] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Propiedades</p>
                    <p className="text-[28px] font-bold text-white tracking-tight">4</p>
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3 text-white/40" />
                      <span className="text-[11px] text-white/40">Activas</span>
                    </div>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06] relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[12px] text-white/60 font-medium">Ingresos últimos 6 meses</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-white/40">Recibido</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <span className="text-[10px] text-white/40">Esperado</span>
                      </div>
                    </div>
                  </div>
                  {/* Bar Chart */}
                  <div className="flex items-end gap-2 h-28">
                    {[
                      { month: 'Ago', received: 65, expected: 80 },
                      { month: 'Sep', received: 80, expected: 80 },
                      { month: 'Oct', received: 75, expected: 85 },
                      { month: 'Nov', received: 90, expected: 90 },
                      { month: 'Dic', received: 85, expected: 95 },
                      { month: 'Ene', received: 100, expected: 100 },
                    ].map((bar, i) => (
                      <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex gap-0.5 items-end h-20">
                          <motion.div
                            className="flex-1 bg-white/10 rounded-t"
                            initial={{ height: 0 }}
                            whileInView={{ height: `${bar.expected}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                          />
                          <motion.div
                            className="flex-1 bg-emerald-400 rounded-t"
                            initial={{ height: 0 }}
                            whileInView={{ height: `${bar.received}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 + i * 0.05, duration: 0.5 }}
                          />
                        </div>
                        <span className="text-[9px] text-white/30">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Stacked Cards */}
              <div className="md:col-span-4 flex flex-col gap-4 lg:gap-5">
                {/* Recent Transactions Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl p-5 border border-neutral-200 flex-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[14px] font-medium text-foreground">Últimos pagos</h4>
                    <span className="text-[11px] text-muted-foreground">Ver todos →</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: 'María López', property: 'Apto 301', amount: '+$2.5M', status: 'success', time: 'Hoy' },
                      { name: 'Nicolás Ruiz', property: 'Apto 502', amount: '+$1.8M', status: 'success', time: 'Ayer' },
                      { name: 'Ana García', property: 'Casa 12', amount: '$3.2M', status: 'pending', time: '5 Feb' },
                    ].map((tx, i) => (
                      <motion.div
                        key={tx.name}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${tx.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {tx.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate">{tx.name}</p>
                          <p className="text-[10px] text-muted-foreground">{tx.property} · {tx.time}</p>
                        </div>
                        <span className={`text-[12px] font-semibold ${tx.status === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {tx.amount}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Quick Actions Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="bg-sand-50 rounded-xl p-5"
                >
                  <h4 className="text-[14px] font-medium text-foreground mb-4">Acciones rápidas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: FileText, label: 'Reporte PDF', color: 'bg-primary/10 text-primary' },
                      { icon: PaperPlaneTilt, label: 'Recordatorio', color: 'bg-emerald-50 text-emerald-600' },
                      { icon: ChartBar, label: 'Estadísticas', color: 'bg-amber-50 text-amber-600' },
                      { icon: Receipt, label: 'Recibos', color: 'bg-sand-200 text-sand-700' },
                    ].map((action, i) => (
                      <motion.button
                        key={action.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="flex items-center gap-2 p-3 bg-white rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors text-left"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${action.color}`}>
                          <action.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-medium text-foreground">{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
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
                  Propietarios que ya cobran automático
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
