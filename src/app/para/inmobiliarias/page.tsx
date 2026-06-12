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
import { CaretLeft, CaretRight, CheckCircle, Users, FileText, Code, TrendUp, Buildings, Building, Clock, Lightning, Warning, XCircle, Shield, Cpu, PencilLine, ArrowRight } from '@phosphor-icons/react';

// Testimonials data
const testimonials = [
  {
    quote: 'Pasamos de gestionar 50 propiedades a 200 sin aumentar el equipo. La automatización del scoring y los contratos digitales son un game-changer.',
    author: 'Inmobiliaria Santafé',
    role: 'Bogotá, 200+ propiedades',
    image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&h=400&fit=crop&q=80',
  },
  {
    quote: 'El API nos permitió integrar con nuestro ERP existente. La migración fue sin fricciones, en solo 2 semanas teníamos todo funcionando.',
    author: 'Grupo Inmobiliario Antioquia',
    role: 'Medellín, 350+ propiedades',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=400&fit=crop&q=80',
  },
  {
    quote: 'El scoring con IA redujo nuestros impagos en un 60%. El ROI fue inmediato desde el primer mes de implementación.',
    author: 'Arriendos del Valle',
    role: 'Cali, 120+ propiedades',
    image: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=400&h=400&fit=crop&q=80',
  },
  {
    quote: 'La plataforma white-label nos permitió ofrecer a nuestros clientes una experiencia completamente personalizada con nuestra marca.',
    author: 'Propiedades Premium',
    role: 'Barranquilla, 85+ propiedades',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop&q=80',
  },
];


export default function InmobiliariasPage() {
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
            src="/hero-7.jpg"
            alt="Modern office building"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40 z-[1]" />

          <div className="relative z-10 h-full container-platform pt-[72px] pb-16 flex items-center">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
              {/* Left Content */}
              <div className="space-y-4">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase font-normal text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15"
                >
                  <Building className="w-3.5 h-3.5" />
                  Solución empresarial para inmobiliarias
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  Escala tu operación
                  <span className="block mt-2 text-white/90">con <span className="italic">tecnología</span></span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  CRM de candidatos, scoring con IA, contratos digitales y API completa.
                  <span className="text-white font-medium"> Todo integrado.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/auth">
                    <Button size="lg" variant="white" className="w-full sm:w-auto font-mono uppercase font-normal h-12 px-6 rounded-xl">
                      Empezar prueba gratis
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-mono uppercase font-normal h-12 px-6 rounded-xl"
                    >
                      Ver planes
                    </Button>
                  </Link>
                </motion.div>

                {/* Hero Stats - No separator line */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-8 pt-6"
                >
                  {[
                    { value: '92%', label: 'Precisión IA' },
                    { value: '500+', label: 'Inmobiliarias' },
                    { value: '10x', label: 'Más rápido' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                      <p className="text-[11px] text-white/50 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right - Hero Widget (Glass style, aligned to right) */}
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
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="flex items-center gap-3 mb-5"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                        <Building className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">Inmobiliaria Bogotá</p>
                        <p className="text-white/60 text-xs">Plan Flex</p>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, type: "spring", stiffness: 400 }}
                      >
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </motion.div>
                    </motion.div>

                    <div className="space-y-3">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/60 text-xs">Candidatos este mes</span>
                          <span className="text-emerald-400 text-xs font-medium">+28%</span>
                        </div>
                        <p className="text-2xl font-bold text-white">347</p>
                      </motion.div>

                      <div className="grid grid-cols-3 gap-2">
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, duration: 0.4 }}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10"
                        >
                          <p className="text-lg font-bold text-white">45</p>
                          <p className="text-[9px] text-white/60">Propiedades</p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.75, duration: 0.4 }}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10"
                        >
                          <p className="text-lg font-bold text-white">12</p>
                          <p className="text-[9px] text-white/60">Agentes</p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8, duration: 0.4 }}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10"
                        >
                          <p className="text-lg font-bold text-white">89%</p>
                          <p className="text-[9px] text-white/60">Ocupación</p>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating notification */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-xl p-3 border border-border"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                        <Lightning className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Scoring completado</p>
                        <p className="text-[10px] text-muted-foreground">Score: 87/100 · Bajo riesgo</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Problems Bento Section */}
        <section className="bg-background py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            {/* Section Title - 3 column grid */}
            <div className="grid md:grid-cols-12 gap-8 mb-14 lg:mb-20">
              <div className="md:col-span-7">
                <h2 className="text-[clamp(2.25rem,5vw,3.5rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Escalar una inmobiliaria no debería ser tan <span className="italic">complicado</span>
                </h2>
              </div>
              <div className="md:col-span-5 flex items-end">
                <p className="text-muted-foreground text-base leading-relaxed">
                  Procesos manuales, evaluaciones lentas y errores humanos limitan tu crecimiento. Es hora de automatizar.
                </p>
              </div>
            </div>

            {/* Problems Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Image Card 1 - Procesos manuales */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="md:col-span-4 relative rounded-xl overflow-hidden h-[320px] group"
              >
                <Image
                  src="/hero-interior.jpg"
                  alt="Manual processes"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/60 text-xs font-medium">Problema #1</span>
                  </div>
                  <h3 className="text-white text-xl font-mono uppercase font-normal mb-1">Procesos manuales</h3>
                  <p className="text-white/70 text-sm">Excel, WhatsApp, papeles. Tu equipo pierde horas en tareas repetitivas.</p>
                </div>
              </motion.div>

              {/* Image Card 2 - Evaluaciones lentas */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="md:col-span-4 relative rounded-xl overflow-hidden h-[320px] group"
              >
                <Image
                  src="/hero-2.jpg"
                  alt="Slow evaluations"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/60 text-xs font-medium">Problema #2</span>
                  </div>
                  <h3 className="text-white text-xl font-mono uppercase font-normal mb-1">Evaluaciones lentas</h3>
                  <p className="text-white/70 text-sm">Días para evaluar un candidato. Los buenos inquilinos se van con la competencia.</p>
                </div>
              </motion.div>

              {/* Image Card 3 - Impagos frecuentes */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="md:col-span-4 relative rounded-xl overflow-hidden h-[320px] group"
              >
                <Image
                  src="/hero-3.jpg"
                  alt="Payment defaults"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Warning className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/60 text-xs font-medium">Problema #3</span>
                  </div>
                  <h3 className="text-white text-xl font-mono uppercase font-normal mb-1">Impagos frecuentes</h3>
                  <p className="text-white/70 text-sm">Sin scoring predictivo, los impagos afectan tu rentabilidad.</p>
                </div>
              </motion.div>

              {/* Illustration Card 1 - Sin integración */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="md:col-span-6 bg-muted rounded-xl p-8 h-[280px] flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4">
                    <XCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
                  </div>
                  <h3 className="text-foreground text-xl font-mono uppercase font-normal mb-2">Sin integración</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Tu ERP, CRM y sistemas de contabilidad no se hablan entre sí. Doble digitación y errores constantes.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {['bg-red-400', 'bg-orange-400', 'bg-amber-400'].map((color, i) => (
                      <div key={i} className={`w-6 h-6 rounded-full ${color} border-2 border-white flex items-center justify-center`}>
                        <span className="text-[8px] text-white font-bold">!</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">3 sistemas desconectados</span>
                </div>
              </motion.div>

              {/* Illustration Card 2 - Escalabilidad limitada */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="md:col-span-6 bg-muted rounded-xl p-8 h-[280px] flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
                    <TrendUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-foreground text-xl font-mono uppercase font-normal mb-2">Escalabilidad limitada</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Cada 50 propiedades nuevas, necesitas contratar más personal. Tu operación no escala eficientemente.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-foreground">50</span>
                    <span className="text-xs text-muted-foreground">propiedades<br/>por persona</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-emerald-600">200+</span>
                    <span className="text-xs text-muted-foreground">con<br/>automatización</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Solutions Bento Section */}
        <section className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            {/* Section Title - 3 column grid */}
            <div className="grid md:grid-cols-12 gap-8 mb-14 lg:mb-20">
              <div className="md:col-span-7">
                <h2 className="text-[clamp(2.25rem,5vw,3.5rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Todo lo que necesitas para <span className="italic">escalar</span>
                </h2>
              </div>
              <div className="md:col-span-5 flex items-end">
                <p className="text-muted-foreground text-base leading-relaxed">
                  Plataforma completa para gestionar candidatos, automatizar evaluaciones e integrar con tu operación.
                </p>
              </div>
            </div>

            {/* Solutions Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - CRM de Candidatos */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="md:col-span-7 bg-foreground rounded-xl p-6 relative overflow-hidden"
              >
                <div className="flex gap-6">
                  {/* Left: Content */}
                  <div className="flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white text-xl font-mono uppercase font-normal mb-2">CRM de Candidatos</h3>
                    <p className="text-white/70 text-sm leading-relaxed mb-4">
                      Gestiona todos tus candidatos desde un solo panel con historial completo.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Pipeline', 'Historial', 'Chat', 'Reportes'].map((feature) => (
                        <span key={feature} className="px-2.5 py-1 bg-white/10 rounded-full text-white/80 text-xs font-mono uppercase font-normal">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Right: Visual - Mini CRM Dashboard */}
                  <div className="hidden sm:block w-[200px] flex-shrink-0">
                    <div className="bg-white/10 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/50">Candidatos</span>
                        <span className="text-emerald-400">+12%</span>
                      </div>
                      <div className="text-xl font-bold text-white">247</div>
                      <div className="space-y-1.5 pt-2 border-t border-white/10">
                        {[
                          { name: 'María L.', status: 'Aprobado', color: 'bg-emerald-400' },
                          { name: 'Nicolás R.', status: 'En revisión', color: 'bg-amber-400' },
                          { name: 'Ana M.', status: 'Nuevo', color: 'bg-blue-400' },
                        ].map((item) => (
                          <div key={item.name} className="flex items-center gap-2 text-[9px]">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                            <span className="text-white/70 flex-1">{item.name}</span>
                            <span className="text-white/40">{item.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Small Card - Scoring con IA */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="md:col-span-5 bg-card rounded-xl p-6 border border-border"
              >
                <div className="flex gap-4">
                  {/* Left: Content */}
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mb-4">
                      <Cpu className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className="text-foreground text-xl font-mono uppercase font-normal mb-2">Scoring con IA</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      Evalúa candidatos en segundos con 92% de precisión.
                    </p>
                  </div>
                  {/* Right: Visual - Score Gauge */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-[100px]">
                    <div className="relative">
                      <svg viewBox="0 0 100 60" className="w-[90px] h-[54px]">
                        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
                        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="url(#gaugeGradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray="126" strokeDashoffset="16" />
                        <defs>
                          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                        <span className="text-xl font-bold text-foreground">87</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium mt-1">Bajo riesgo</span>
                  </div>
                </div>
              </motion.div>

              {/* Small Card - Multi-Propiedad */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="md:col-span-5 bg-card rounded-xl p-6 border border-border"
              >
                <div className="flex gap-4">
                  {/* Left: Content */}
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
                      <Buildings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-foreground text-xl font-mono uppercase font-normal mb-2">Multi-Propiedad</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      Gestiona cientos de propiedades por sucursal.
                    </p>
                  </div>
                  {/* Right: Visual - Property Grid */}
                  <div className="hidden sm:block w-[100px]">
                    <div className="grid grid-cols-3 gap-1">
                      {[92, 88, 96, 75, 90, 85, 78, 94, 82].map((occ, i) => (
                        <div key={i} className="aspect-square rounded bg-muted p-1 flex flex-col justify-end">
                          <div
                            className={`w-full rounded-sm ${occ > 85 ? 'bg-emerald-400' : occ > 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ height: `${occ * 0.6}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <span className="text-[10px] text-muted-foreground">91%</span>
                      <span className="text-[9px] text-muted-foreground/70">ocupación</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Large Card - API REST */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="md:col-span-7 bg-slate-900 rounded-xl p-6 relative overflow-hidden"
              >
                <div className="flex gap-6">
                  {/* Left: Content */}
                  <div className="flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <Code className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white text-xl font-mono uppercase font-normal mb-2">API REST Completa</h3>
                    <p className="text-white/70 text-sm leading-relaxed mb-4">
                      Integra con tu ERP existente. Webhooks en tiempo real.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['REST API', 'Webhooks', 'SDK', 'Sandbox'].map((feature) => (
                        <span key={feature} className="px-2.5 py-1 bg-white/10 rounded-full text-white/80 text-xs font-mono">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Right: Visual - Code Terminal */}
                  <div className="hidden sm:block w-[180px] flex-shrink-0">
                    <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-700">
                        <div className="w-2 h-2 rounded-full bg-red-400/80" />
                        <div className="w-2 h-2 rounded-full bg-amber-400/80" />
                        <div className="w-2 h-2 rounded-full bg-emerald-400/80" />
                        <span className="text-[8px] text-slate-500 ml-1.5 font-mono">terminal</span>
                      </div>
                      <div className="p-2.5 font-mono text-[9px] leading-relaxed">
                        <div><span className="text-emerald-400">GET</span> <span className="text-slate-400">/candidates</span></div>
                        <div className="text-slate-500 mt-1">{"{"}</div>
                        <div className="text-slate-400 pl-2">&quot;id&quot;: <span className="text-cyan-400">1247</span>,</div>
                        <div className="text-slate-400 pl-2">&quot;score&quot;: <span className="text-emerald-400">87</span>,</div>
                        <div className="text-slate-400 pl-2">&quot;risk&quot;: <span className="text-green-400">&quot;low&quot;</span></div>
                        <div className="text-slate-500">{"}"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Additional row - Contratos Digitales & Seguro */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="md:col-span-6 bg-card rounded-xl p-6 border border-border"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-foreground text-lg font-mono uppercase font-normal mb-2">Contratos Digitales</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Firma electrónica con validez legal. Genera contratos desde plantillas.
                    </p>
                  </div>
                  {/* Visual - Document preview */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-[80px]">
                    <div className="w-14 h-18 bg-muted rounded border border-border relative">
                      <div className="absolute top-2 left-2 right-2 space-y-1">
                        <div className="h-1 bg-border rounded w-full" />
                        <div className="h-1 bg-border rounded w-3/4" />
                        <div className="h-1 bg-border rounded w-full" />
                        <div className="h-1 bg-border rounded w-1/2" />
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1.5">Firmado</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="md:col-span-6 bg-card rounded-xl p-6 border border-border"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
                      <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-foreground text-lg font-mono uppercase font-normal mb-2">Seguro de Arriendo</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Protección completa contra impagos. Cobertura desde el primer día.
                    </p>
                  </div>
                  {/* Visual - Shield with checkmark */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-[80px]">
                    <div className="relative">
                      <Shield className="w-12 h-12 text-amber-200 fill-amber-100" />
                      <CheckCircle className="w-5 h-5 text-amber-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1.5">100% cubierto</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-background overflow-hidden">
          <div className="container-platform py-[80px] pb-[100px]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="lg:sticky lg:top-32"
              >
                <h2 className="text-[40px] md:text-[52px] font-heading font-light text-foreground tracking-[-0.03em] leading-[1.05] mb-10">
                  Inmobiliarias que <span className="italic">confían</span> en nosotros
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
                          <svg className="w-10 h-10 text-muted-foreground/50" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                          </svg>
                        </div>

                        <p className="text-[20px] tracking-[-0.5px] leading-[1.4] text-foreground mb-8 flex-grow">
                          {testimonial.quote}
                        </p>

                        <div className="flex items-center gap-4">
                          <div className="w-[48px] h-[48px] rounded-xl overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={testimonial.image}
                              alt={testimonial.author}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div>
                            <p className="text-[15px] font-medium text-foreground">
                              {testimonial.author}
                            </p>
                            <p className="text-[13px] text-muted-foreground">
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
