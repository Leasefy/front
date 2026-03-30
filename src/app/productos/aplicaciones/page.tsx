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
import { CaretLeft, CaretRight, CheckCircle, FileText, Users, Clock, Lightning, Shield, DeviceMobile, PaperPlaneTilt, ClipboardText, SealCheck, Star, Chat, Bell, Funnel, UserCheck, Checks, Sparkle, House, Heart, Eye, Buildings, MapPin, Calendar, TrendUp, FileX, Warning, XCircle, ArrowsClockwise, MagnifyingGlass, ThumbsDown } from '@phosphor-icons/react';

// Testimonials data for applications
const testimonials = [
  {
    quote: 'Apliqué a 5 propiedades en una tarde. Con Arriendo Pass no tuve que llenar nada, solo un clic. En 2 días ya tenía respuestas.',
    author: 'Juliana Pérez',
    role: 'Inquilina en Bogotá',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'El sistema de verificación es excelente. Mi score de 89 me abrió puertas que antes estaban cerradas. Los propietarios confían más.',
    author: 'Andrés Martínez',
    role: 'Profesional independiente',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Como extranjera, siempre me pedían mil documentos. Con el perfil verificado de Arriendo apliqué igual que cualquier colombiano.',
    author: 'María Santos',
    role: 'Expat en Medellín',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Recibo aplicaciones organizadas, con toda la info que necesito. Puedo comparar candidatos en segundos y tomar mejores decisiones.',
    author: 'Roberto Gómez',
    role: 'Propietario en Cali',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

export default function AplicacionesPage() {
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
            src="/hero-2.jpg"
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
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase font-normal text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15"
                >
                  <ClipboardText className="w-3.5 h-3.5" />
                  Sistema de aplicaciones
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  Aplica una vez,
                  <span className="block mt-2 text-white/90">arrienda donde quieras</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  Tu perfil verificado te acompaña. Aplica a propiedades ilimitadas con un solo clic.{' '}
                  <span className="text-white font-medium">Sin volver a llenar formularios.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/propiedades">
                    <Button size="lg" variant="white" className="w-full sm:w-auto font-mono uppercase font-normal h-12 px-6 rounded-xl">
                      Buscar propiedades
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium h-12 px-6 rounded-xl"
                    >
                      Ver Arriendo Pass
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
                    { value: '< 5min', label: 'Para aplicar' },
                    { value: '∞', label: 'Aplicaciones' },
                    { value: '24h', label: 'Respuesta' },
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
                    {/* Application Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                      <div>
                        <p className="text-white/50 text-[11px]">Aplicación para</p>
                        <p className="text-white font-semibold text-[14px]">Apto 301 - Chapinero</p>
                      </div>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, type: "spring" }}
                        className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-medium"
                      >
                        ✓ Verificado
                      </motion.span>
                    </div>

                    {/* Applicant Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                          <span className="text-[13px] font-medium text-white/70">ML</span>
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1, type: "spring" }}
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                        >
                          <Checks className="w-3 h-3 text-white" />
                        </motion.div>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-[14px]">María López</p>
                        <p className="text-white/50 text-[11px]">Diseñadora UX · 32 años</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            Score: 87
                          </span>
                          <span className="text-[10px] text-white/40">Bajo riesgo</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'Ingresos', value: '$8.5M' },
                        { label: 'Antigüedad', value: '4 años' },
                        { label: 'Mascotas', value: 'No' },
                      ].map((stat, i) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="text-center p-2 bg-white/[0.06] border border-white/[0.06] rounded-lg"
                        >
                          <p className="text-[12px] font-semibold text-white">{stat.value}</p>
                          <p className="text-[9px] text-white/40">{stat.label}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Verifications */}
                    <div className="space-y-1.5 pt-3 border-t border-white/[0.08]">
                      {['Identidad verificada', 'Empleo confirmado', 'Referencias OK'].map((item, i) => (
                        <motion.div
                          key={item}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                          className="flex items-center gap-2 text-[11px] text-white/70"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          {item}
                        </motion.div>
                      ))}
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
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Lightning className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">Arriendo Pass</p>
                        <p className="text-[11px] text-muted-foreground">Aplicaciones ilimitadas</p>
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
                  Aplicar a un arriendo no debería ser un <span className="italic">trabajo</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Formularios repetitivos, documentos perdidos, semanas sin respuesta. El proceso tradicional está roto.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row - Image Cards with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5">
              {/* Card 1 - Rejection Rate */}
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
                    Rechazo
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    68%
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    de aplicaciones son rechazadas
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Por falta de documentación o información incompleta. No por el perfil del aplicante.
                  </p>
                </div>
              </motion.div>

              {/* Card 2 - Time Wasted */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-5.jpg"
                  alt="Espacio moderno"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-mono font-normal text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Tiempo
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    4.5h
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    promedio llenando formularios
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Cada aplicación pide los mismos datos. Nombre, cédula, ingresos... una y otra vez.
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - No Response */}
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
                    Silencio
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    52%
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    nunca reciben respuesta
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Aplicaste, esperaste... y nada. Sin saber si te rechazaron o te olvidaron.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Robottom Row - Illustration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Card 4 - Repetitive Forms Widget */}
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
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <ArrowsClockwise className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-foreground">Formulario #7</p>
                        <p className="text-[10px] text-amber-600 font-medium">Otra vez los mismos datos</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {['Nombre completo', 'Número de cédula', 'Ingresos mensuales', 'Empleo actual'].map((field, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">{field}</span>
                          <div className="w-16 h-2 bg-neutral-100 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    7
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    {'"'}Llena tus datos de nuevo{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Cada propiedad, cada inmobiliaria, cada propietario pide lo mismo. Tu tiempo vale más que repetir información.
                  </p>
                </div>
              </motion.div>

              {/* Card 5 - Lost in Limbo Widget */}
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
                      <span className="text-[11px] font-medium text-foreground">Mis Aplicaciones</span>
                      <MagnifyingGlass className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: 'Apto Chapinero', status: '???', color: 'neutral' },
                        { name: 'Casa Usaquén', status: 'Sin respuesta', color: 'amber' },
                        { name: 'Apto Poblado', status: '14 días...', color: 'red' },
                        { name: 'Loft Laureles', status: '???', color: 'neutral' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] p-1.5 bg-neutral-50 rounded">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className={`${item.color === 'amber' ? 'text-amber-600' : item.color === 'red' ? 'text-red-500' : 'text-neutral-400'}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    {'"'}¿Recibieron mi aplicación?{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Sin tracking, sin notificaciones, sin saber qué pasó. Esperar en el limbo es frustrante y poco profesional.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Solutions Bento Section */}
        <section className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Aplica <span className="italic">inteligente</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Un perfil verificado, aplicaciones ilimitadas, respuestas garantizadas.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - Arriendo Pass */}
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
                    <Lightning className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-white leading-tight mb-3">
                    Arriendo Pass
                  </h3>
                  <p className="text-[15px] text-white/70 leading-relaxed max-w-md">
                    Tu perfil verificado una vez, válido para siempre. Aplica a cualquier propiedad con un solo clic.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-6">
                  {['Aplicaciones ilimitadas', '1 clic para aplicar', 'Score pre-calculado'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Verification */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
                    <SealCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    Verificación Completa
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Identidad, empleo, ingresos y referencias verificadas una sola vez. Los propietarios confían en tu perfil.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Identidad', 'Empleo', 'Ingresos', 'Referencias'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Tracking */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    Tracking en Tiempo Real
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Sabe exactamente el estado de cada aplicación. Notificaciones cuando el propietario la ve, responde o decide.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Enviada', 'Vista', 'En revisión', 'Decidido'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Large Card - Communication */}
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
                    <Chat className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-white leading-tight mb-3">
                      Chat Directo
                    </h3>
                    <p className="text-[15px] text-white/70 leading-relaxed max-w-md mb-6">
                      Comunícate directamente con propietarios. Agenda visitas, resuelve dudas, todo desde la plataforma.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Mensajes instantáneos', 'Agendar visitas', 'Compartir docs'].map((item, i) => (
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

        {/* Application Methods Section */}
        <section className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Elige cómo <span className="italic">aplicar</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Tres formas de presentar tu aplicación, cada una adaptada a tu situación.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
              {/* Standard Application */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-2xl border border-border bg-card p-6 flex flex-col transition-all duration-300 hover:border-indigo-600/30 hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <ClipboardText className="w-5 h-5 text-foreground/70" />
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[12px] font-medium text-foreground">5-8 min</span>
                  </div>
                </div>
                <div className="mb-5">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground">Aplicación Estándar</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Formulario completo para tu primera aplicación. Ideal si es tu primera vez.
                  </p>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {['Formulario guiado paso a paso', 'Verificación de documentos', 'Score de arrendatario'].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-[13px] text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full rounded-xl">
                  Comenzar aplicación
                </Button>
              </motion.div>

              {/* Arriendo Pass - Featured */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-2xl border border-indigo-600/50 bg-card p-6 flex flex-col transition-all duration-300"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white uppercase tracking-wide font-mono text-[11px] font-semibold px-4 py-1.5 rounded-full inline-flex items-center gap-1.5">
                    <Sparkle className="w-3 h-3" />
                    Recomendado
                  </span>
                </div>

                <div className="flex items-start justify-between mb-5 pt-2">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Lightning className="w-5 h-5 text-foreground/70" />
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[12px] font-medium text-foreground">{'< 1 min'}</span>
                  </div>
                </div>
                <div className="mb-5">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground">Con Arriendo Pass</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Tu perfil verificado te permite aplicar a cualquier propiedad con un solo clic.
                  </p>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {['Un clic para aplicar', 'Perfil pre-verificado', 'Aplicaciones ilimitadas'].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-[13px] text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full rounded-xl">
                  Obtener Arriendo Pass
                </Button>
              </motion.div>

              {/* Group Application */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-2xl border border-border bg-card p-6 flex flex-col transition-all duration-300 hover:border-indigo-600/30 hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-foreground/70" />
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[12px] font-medium text-foreground">8-10 min</span>
                  </div>
                </div>
                <div className="mb-5">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground">Aplicación Grupal</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Para roommates, parejas o familias que aplican juntos a una propiedad.
                  </p>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {['Múltiples aplicantes', 'Score combinado', 'Documentos compartidos'].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-[13px] text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full rounded-xl">
                  Aplicar en grupo
                </Button>
              </motion.div>
            </div>

            {/* Additional Options Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {[
                { icon: Buildings, label: 'Aplicación Corporativa', desc: 'Para empresas' },
                { icon: Heart, label: 'Renovación', desc: 'Extiende tu arriendo' },
                { icon: Eye, label: 'Pre-aplicación', desc: 'Muestra interés' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:shadow-md hover:border-neutral-300 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-mono uppercase font-normal text-foreground">{item.label}</p>
                    <p className="text-[12px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <CaretRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* For Landlords Section */}
        <section className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Para <span className="italic">propietarios</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Recibe aplicaciones organizadas, compara candidatos y toma mejores decisiones.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - Candidates Dashboard Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="md:col-span-8 bg-white rounded-xl p-6 min-h-[480px] border border-neutral-200 overflow-hidden"
              >
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-heading font-medium text-foreground">Panel de Candidatos</h3>
                      <p className="text-[12px] text-muted-foreground">Apto 301 · Chapinero</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-lg text-[12px] text-muted-foreground">
                      <Funnel className="w-3.5 h-3.5" />
                      Filtros
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-lg text-[12px] text-muted-foreground">
                      <TrendUp className="w-3.5 h-3.5" />
                      Ordenar
                    </div>
                  </div>
                </div>

                {/* Candidates List */}
                <div className="space-y-3">
                  {[
                    { name: 'María López', role: 'Diseñadora UX', score: 92, income: '$8.5M', status: 'recommended', verified: true, image: 'ML' },
                    { name: 'Juan Pérez', role: 'Ingeniero Software', score: 87, income: '$7.2M', status: 'verified', verified: true, image: 'JP' },
                    { name: 'Ana García', role: 'Médica', score: 85, income: '$9.0M', status: 'verified', verified: true, image: 'AG' },
                    { name: 'Nicolás Ruiz', role: 'Contador', score: 78, income: '$5.8M', status: 'pending', verified: false, image: 'CR' },
                  ].map((candidate, i) => (
                    <motion.div
                      key={candidate.name}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                        candidate.status === 'recommended'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-medium text-[14px] ${
                          candidate.status === 'recommended' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-foreground'
                        }`}>
                          {candidate.image}
                        </div>
                        {candidate.verified && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Checks className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[14px] font-medium text-foreground truncate">{candidate.name}</p>
                          {candidate.status === 'recommended' && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                              Recomendado
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground">{candidate.role}</p>
                      </div>

                      {/* Score */}
                      <div className="text-center px-4">
                        <div className={`text-[24px] font-heading font-medium ${
                          candidate.score >= 85 ? 'text-emerald-600' : candidate.score >= 75 ? 'text-amber-600' : 'text-neutral-500'
                        }`}>
                          {candidate.score}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Score</p>
                      </div>

                      {/* Income */}
                      <div className="text-center px-4 hidden sm:block">
                        <div className="text-[14px] font-medium text-foreground">{candidate.income}</div>
                        <p className="text-[10px] text-muted-foreground">Ingresos</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button className="w-9 h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button className="w-9 h-9 rounded-lg bg-foreground hover:bg-foreground/90 flex items-center justify-center transition-colors">
                          <Chat className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Robottom Bar */}
                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <p className="text-[12px] text-muted-foreground">4 candidatos · 3 verificados</p>
                  <div className="flex items-center gap-2 text-[12px] text-foreground font-medium">
                    <SealCheck className="w-4 h-4 text-emerald-500" />
                    Todos pre-verificados con Arriendo Pass
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Stacked Stats */}
              <div className="md:col-span-4 flex flex-col gap-4 lg:gap-5">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-foreground rounded-xl p-6 flex-1 flex flex-col justify-center relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full" />
                  <p className="text-[56px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    87%
                  </p>
                  <p className="text-[15px] font-medium text-white mb-1">Tasa de respuesta</p>
                  <p className="text-[13px] text-white/50">Propietarios responden en 24h</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl p-6 border border-neutral-200 flex-1 flex flex-col justify-center"
                >
                  <p className="text-[56px] font-heading font-light text-foreground leading-none tracking-tight mb-2">
                    3.2x
                  </p>
                  <p className="text-[15px] font-medium text-foreground mb-1">Más candidatos</p>
                  <p className="text-[13px] text-muted-foreground">Que métodos tradicionales</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="bg-sand-50 rounded-xl p-6 flex-1 flex flex-col justify-center"
                >
                  <p className="text-[56px] font-heading font-light text-foreground leading-none tracking-tight mb-2">
                    100%
                  </p>
                  <p className="text-[15px] font-medium text-foreground mb-1">Pre-verificados</p>
                  <p className="text-[13px] text-muted-foreground">Todos con Arriendo Pass</p>
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
                  Inquilinos que aplican diferente
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
