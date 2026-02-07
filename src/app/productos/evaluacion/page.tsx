'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { FAQSection } from '@/components/home/FAQSection';
import { CTASection } from '@/components/home/CTASection';
import { Button } from '@/components/ui/button';
import { CaretLeft, CaretRight, CheckCircle, Shield, Clock, Users, Lightning, Lock, CreditCard, Briefcase, Scales, UserCheck, Checks, Fingerprint, FileText, TrendUp, Check } from '@phosphor-icons/react';

// Testimonials data
const testimonials = [
  {
    quote: 'El score me dio la tranquilidad que necesitaba. Sabía exactamente el nivel de riesgo antes de firmar el contrato. Increíble herramienta.',
    author: 'Carolina Mendoza',
    role: 'Propietaria en Bogotá',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Antes evaluaba candidatos "a ojo". Ahora tengo datos reales: historial crediticio, verificación de empleo, todo. Mis arriendos son más seguros.',
    author: 'Roberto García',
    role: 'Propietario de 3 apartamentos',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'En menos de 24 horas tenía el reporte completo. Pude comparar 5 candidatos con datos objetivos y elegir el mejor.',
    author: 'Ana Lucía Restrepo',
    role: 'Inversionista inmobiliaria',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'El PDF profesional me permitió mostrarle al propietario por qué era un buen candidato. Firmamos al día siguiente.',
    author: 'Diego Fernández',
    role: 'Inquilino verificado',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

export default function EvaluacionPage() {
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
      <main className="overflow-hidden bg-white">
        {/* Hero Section */}
        <section className="relative h-[600px] bg-black">
          <Image
            src="/hero-5.jpg"
            alt="Interior moderno"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40 z-[1]" />

          <div className="relative z-10 container-platform pt-[72px] h-full flex items-center">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
              {/* Left Content */}
              <div className="space-y-4">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 text-xs font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15"
                >
                  <Lightning className="w-3.5 h-3.5" />
                  Evaluación con inteligencia artificial
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  Conoce a tu inquilino
                  <span className="block mt-2 text-white/90">
                    antes de <span className="italic">firmar</span>
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  Verificación crediticia, laboral y de antecedentes integrada.
                  <span className="text-white font-medium"> Score predictivo con 92% de precisión.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/auth">
                    <Button size="lg" variant="white" className="w-full sm:w-auto font-semibold h-12 px-6 rounded-xl">
                      Evaluar inquilino
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

                {/* Hero Stats - No separator */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-8 pt-6"
                >
                  {[
                    { value: '$24.900', label: 'Por evaluación' },
                    { value: '<24h', label: 'Tiempo de respuesta' },
                    { value: '92%', label: 'Precisión predictiva' },
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
                    {/* Header with profile */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10"
                    >
                      <Image
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&h=320&fit=crop&crop=face&q=80"
                        alt="Candidato"
                        width={44}
                        height={44}
                        className="rounded-xl object-cover ring-2 ring-white/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-[14px]">Nicolás Andrés R.</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <p className="text-white/50 text-[11px]">Evaluación completada</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Score display */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-3"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white/50 text-[11px]">Score Leasefy</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Bajo riesgo
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-[36px] font-bold text-white tracking-tight">847</p>
                        <span className="text-white/40 text-sm">/1000</span>
                      </div>
                      <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '84.7%' }}
                          transition={{ delay: 0.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                        />
                      </div>
                    </motion.div>

                    {/* Mini metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Crédito', value: '92', color: 'text-emerald-400' },
                        { label: 'Empleo', value: '88', color: 'text-blue-400' },
                        { label: 'Referencias', value: '85', color: 'text-violet-400' },
                        { label: 'Judicial', value: '100', color: 'text-amber-400' },
                      ].map((item, i) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                          className="bg-white/10 backdrop-blur-sm rounded-lg p-2.5 border border-white/10"
                        >
                          <p className="text-[9px] text-white/40 uppercase tracking-wide mb-1">{item.label}</p>
                          <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                        </motion.div>
                      ))}
                    </div>
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
                        <Shield className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">Sin antecedentes</p>
                        <p className="text-[11px] text-muted-foreground">Registraduría · Policía</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-white border-b border-border">
          <div className="container-platform py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '50K+', label: 'Evaluaciones realizadas' },
                { value: '92%', label: 'Precisión predictiva' },
                { value: '-70%', label: 'Reducción de impagos' },
                { value: '<24h', label: 'Tiempo de respuesta' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-[40px] md:text-[52px] font-heading font-normal tracking-[-3px] text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-[14px] text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What We Evaluate - Problems Style Bento */}
        <section className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            {/* 3-column header */}
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Análisis <span className="italic">360°</span> del candidato
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Cuatro pilares de verificación para una imagen completa. Datos reales, no corazonadas.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row - Image Cards with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5">
              {/* Card 1 - Credit Score */}
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
                  <span className="inline-flex items-center gap-2 text-[11px] font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-3 py-1.5 border border-white/15">
                    <CreditCard className="w-3 h-3" />
                    Historial Crediticio
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    712
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    Score DataCrédito promedio
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Consultamos en tiempo real el historial de los últimos 5 años
                  </p>
                </div>
              </motion.div>

              {/* Card 2 - Employment */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-2.jpg"
                  alt="Espacio de trabajo"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="inline-flex items-center gap-2 text-[11px] font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-3 py-1.5 border border-white/15">
                    <Briefcase className="w-3 h-3" />
                    Estabilidad Laboral
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    3.5 años
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    antigüedad promedio verificada
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Confirmamos empleo activo, tipo de contrato e ingresos
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - Background */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-3.jpg"
                  alt="Verificación"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="inline-flex items-center gap-2 text-[11px] font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-3 py-1.5 border border-white/15">
                    <Scales className="w-3 h-3" />
                    Antecedentes
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    100%
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    verificación judicial completa
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Consulta en Policía, Procuraduría y Contraloría
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Robottom Row - Illustration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Card 4 - Identity Widget */}
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
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-100">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Fingerprint className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-foreground">Identidad</p>
                        <p className="text-[10px] text-emerald-600">✓ Verificada</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Cédula</span>
                        <span className="text-[10px] text-foreground font-medium">1.020.XXX.XXX</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Registraduría</span>
                        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Válida
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Biometría</span>
                        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Match
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground leading-tight mb-3">
                    Verificación de Identidad
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Confirmamos que el candidato es quien dice ser. Consulta biométrica con la Registraduría Nacional.
                  </p>
                </div>
              </motion.div>

              {/* Card 5 - References Widget */}
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
                      <span className="text-[11px] font-medium text-foreground">Referencias verificadas</span>
                      <span className="text-[10px] text-emerald-600 font-medium">3/3</span>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { name: 'Arrendador anterior', rating: 5, comment: 'Excelente inquilino' },
                        { name: 'Empleador', rating: 5, comment: 'Empleado responsable' },
                        { name: 'Referencia personal', rating: 4, comment: 'Muy recomendado' },
                      ].map((ref, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-600 flex-shrink-0">
                            {ref.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium text-foreground truncate">{ref.name}</p>
                            <div className="flex gap-0.5">
                              {[...Array(ref.rating)].map((_, j) => (
                                <svg key={j} className="w-2.5 h-2.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                              ))}
                            </div>
                          </div>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground leading-tight mb-3">
                    Referencias Verificadas
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Contactamos y verificamos cada referencia. Arrendador anterior, empleador y personal. Sin inventos.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it Works - Solutions Style Bento */}
        <section id="como-funciona" className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            {/* 3-column header */}
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  De invitación a reporte en <span className="italic">24 horas</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Cuatro pasos simples. Tú invitas, el candidato autoriza, nuestra IA analiza.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Step 1 - Large Dark */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="md:col-span-7 bg-foreground rounded-xl p-8 min-h-[360px] flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
                <div className="relative z-10">
                  <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-4 block">Paso 01</span>
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-[28px] md:text-[32px] font-heading font-medium text-white leading-tight mb-3">
                    Invita al candidato
                  </h3>
                  <p className="text-[15px] text-white/70 leading-relaxed max-w-md">
                    Genera un link único o ingresa el email. El candidato recibe la invitación automáticamente con seguimiento.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-6">
                  {['Link único', 'Email automático', 'WhatsApp', 'Seguimiento'].map((item, i) => (
                    <span key={i} className="text-[12px] text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Step 2 - Small Light */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <span className="text-[11px] font-medium text-foreground/30 uppercase tracking-wider mb-4 block">Paso 02</span>
                  <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center mb-6">
                    <FileText className="w-6 h-6 text-sand-700" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground leading-tight mb-3">
                    Completa el formulario
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    El candidato llena sus datos y autoriza la consulta según la ley Habeas Data.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Datos personales', 'Info laboral', 'Referencias', 'Autorización'].map((item, i) => (
                    <span key={i} className="text-[12px] text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Step 3 - Small Light */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <span className="text-[11px] font-medium text-foreground/30 uppercase tracking-wider mb-4 block">Paso 03</span>
                  <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center mb-6">
                    <Lightning className="w-6 h-6 text-sand-700" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-heading font-medium text-foreground leading-tight mb-3">
                    Análisis automático
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Nuestra IA cruza información de múltiples fuentes en tiempo real y genera el score.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['DataCrédito', 'Registraduría', 'Policía', 'Score IA'].map((item, i) => (
                    <span key={i} className="text-[12px] text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Step 4 - Large with Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="md:col-span-7 relative rounded-xl overflow-hidden min-h-[360px] group"
              >
                <Image
                  src="/hero-6.jpg"
                  alt="Reporte de evaluación"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-white/50 uppercase tracking-wider mb-4 block">Paso 04</span>
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <TrendUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[28px] md:text-[32px] font-heading font-medium text-white leading-tight mb-3">
                      Recibe el reporte
                    </h3>
                    <p className="text-[15px] text-white/70 leading-relaxed max-w-md mb-6">
                      Score, semáforo de riesgo y recomendación clara. PDF profesional listo para presentar al propietario.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Score 0-1000', 'Semáforo de riesgo', 'PDF descargable'].map((item, i) => (
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

        {/* Pricing Section */}
        <section className="bg-white py-24 lg:py-32">
          <div className="container-platform">
            {/* 3-column header */}
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Precios <span className="italic">transparentes</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Paga por evaluación, sin suscripciones obligatorias. El candidato puede pagar si lo prefieres.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {/* Evaluación Básica */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-6 flex flex-col border border-neutral-200 hover:shadow-lg transition-shadow"
              >
                <div className="mb-5">
                  <h3 className="text-[15px] font-medium text-foreground">Evaluación Básica</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">Verificación rápida</p>
                </div>
                <div className="mb-6">
                  <span className="text-[2rem] font-light text-foreground tracking-[-0.02em]">$24.900</span>
                  <span className="text-muted-foreground text-[12px] ml-1">COP</span>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {['Verificación de identidad', 'Historial crediticio (DataCrédito)', 'Score de riesgo con IA', 'Reporte PDF descargable'].map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-foreground/40 flex-shrink-0 mt-0.5" />
                      <span className="text-[13px] text-muted-foreground">{feature}</span>
                    </li>
                  ))}
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
                transition={{ delay: 0.2 }}
                className="relative bg-foreground text-background rounded-xl p-6 flex flex-col"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
                    Más completo
                  </span>
                </div>
                <div className="mb-5">
                  <h3 className="text-[15px] font-medium">Evaluación Completa</h3>
                  <p className="text-[12px] text-background/60 mt-1">Análisis profundo</p>
                </div>
                <div className="mb-6">
                  <span className="text-[2rem] font-light tracking-[-0.02em]">$39.900</span>
                  <span className="text-background/60 text-[12px] ml-1">COP</span>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {['Todo en Básica', 'Verificación de antecedentes judiciales', 'Referencias laborales verificadas', 'Verificación de ingresos', 'Score IA avanzado con recomendación'].map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-background/40 flex-shrink-0 mt-0.5" />
                      <span className="text-[13px] text-background/70">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth">
                  <Button className="w-full bg-background text-foreground hover:bg-background/90 rounded-xl">
                    Solicitar evaluación completa
                  </Button>
                </Link>
              </motion.div>

              {/* Arriendo Pass */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-6 flex flex-col border border-neutral-200 hover:shadow-lg transition-shadow"
              >
                <div className="mb-5">
                  <h3 className="text-[15px] font-medium text-foreground">Arriendo Pass</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">Para inquilinos en búsqueda activa</p>
                </div>
                <div className="mb-6">
                  <span className="text-[2rem] font-light text-foreground tracking-[-0.02em]">$59.900</span>
                  <span className="text-muted-foreground text-[12px] ml-1">COP / 60 días</span>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-foreground/40 flex-shrink-0 mt-0.5" />
                    <span className="text-[13px] text-muted-foreground">Todo en Evaluación Completa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-[13px] text-foreground font-medium">Aplicaciones ilimitadas por 60 días</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-foreground/40 flex-shrink-0 mt-0.5" />
                    <span className="text-[13px] text-foreground font-medium">Badge &quot;Inquilino Verificado&quot;</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-foreground/40 flex-shrink-0 mt-0.5" />
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

            {/* B2B Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-10 p-6 bg-muted/50 rounded-xl max-w-5xl mx-auto border border-neutral-200"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-foreground" />
                    <h3 className="text-[15px] font-medium text-foreground">¿Eres inmobiliaria o agente?</h3>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    Precios por volumen desde <span className="font-medium text-foreground">$9.900/evaluación</span>. Hasta 60% de descuento.
                  </p>
                </div>
                <a href="mailto:ventas@leasefy.co?subject=Precios%20por%20volumen%20-%20Evaluaciones">
                  <Button variant="outline" className="whitespace-nowrap rounded-xl">
                    Contactar ventas
                  </Button>
                </a>
              </div>
            </motion.div>
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

                <h2 className="text-[40px] md:text-[52px] font-heading font-normal text-foreground tracking-[-3px] leading-[1.05] mb-10">
                  Propietarios que evalúan <span className="italic">con confianza</span>
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
                        className="bg-muted rounded-xl p-8 flex flex-col"
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

        {/* FAQ Section */}
        <FAQSection />

        {/* CTA Section */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
