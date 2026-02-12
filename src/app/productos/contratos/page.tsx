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
import { CaretLeft, CaretRight, CheckCircle, Shield, FileText, PenNib, Scales, Lock, Download, PaperPlaneTilt, ClockCounterClockwise, Eye, DeviceMobile, Cloud, Lightning, SealCheck, Users, Calendar, House, Buildings, Clock, Warning, FileX, Gavel } from '@phosphor-icons/react';

// Testimonials data for contracts
const testimonials = [
  {
    quote: 'Firmamos el contrato en 10 minutos, cada uno desde su casa. Sin impresoras, sin notaría, sin perder tiempo. Es el futuro del arrendamiento.',
    author: 'Carolina Mendoza',
    role: 'Propietaria en Bogotá',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Las plantillas están perfectas. Solo llené los datos y ya tenía un contrato legal completo. Mi abogado quedó impresionado con la calidad.',
    author: 'Roberto García',
    role: 'Propietario de 5 apartamentos',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Tuve un problema con un inquilino y el contrato resistió todo el proceso legal. Las cláusulas estaban perfectamente redactadas según la Ley 820.',
    author: 'Ana Lucía Restrepo',
    role: 'Inversionista inmobiliaria',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'El historial de cambios y la trazabilidad me dan total tranquilidad. Sé exactamente quién firmó, cuándo y desde dónde.',
    author: 'Diego Fernández',
    role: 'Propietario en Medellín',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

export default function ContratosPage() {
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
            src="/hero-3.jpg"
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
                  <FileText className="w-3.5 h-3.5" />
                  Contratos digitales con validez legal
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  Contratos legales,
                  <span className="block mt-2 text-white/90">firma digital</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  Plantillas verificadas por abogados, firma electrónica válida y almacenamiento seguro.{' '}
                  <span className="text-white font-medium">De borrador a firmado en minutos.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/auth">
                    <Button size="lg" variant="white" className="w-full sm:w-auto font-mono uppercase font-normal h-12 px-6 rounded-xl">
                      Crear contrato gratis
                    </Button>
                  </Link>
                  <Link href="#plantillas">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium h-12 px-6 rounded-xl"
                    >
                      Ver plantillas
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
                    { value: '100%', label: 'Legal' },
                    { value: '< 5min', label: 'Para firmar' },
                    { value: '10 años', label: 'Almacenamiento' },
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
                    {/* Contract Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                      <div>
                        <p className="text-white/50 text-[11px]">Contrato de Arrendamiento</p>
                        <p className="text-white font-semibold text-[14px]">#2026-0847</p>
                      </div>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, type: "spring" }}
                        className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-medium"
                      >
                        ✓ Firmado
                      </motion.span>
                    </div>

                    {/* Property Info */}
                    <div className="bg-white/[0.06] rounded-lg p-3 mb-4 border border-white/[0.06]">
                      <p className="text-[10px] text-white/40 mb-1">Inmueble</p>
                      <p className="text-[13px] font-medium text-white">Apto 301, Ed. Torre Norte</p>
                      <p className="text-[11px] text-white/50">Chapinero, Bogotá</p>
                    </div>

                    {/* Signers */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { role: 'Propietario', name: 'Juan R.', initials: 'JR' },
                        { role: 'Inquilino', name: 'María L.', initials: 'ML' },
                      ].map((signer, i) => (
                        <motion.div
                          key={signer.role}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="text-center"
                        >
                          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-1.5">
                            <span className="text-[11px] font-medium text-white/70">{signer.initials}</span>
                          </div>
                          <p className="text-[10px] text-white/40">{signer.role}</p>
                          <div className="flex items-center justify-center gap-1 text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-[9px]">Firmado</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Terms */}
                    <div className="space-y-2 pt-3 border-t border-white/[0.08]">
                      {[
                        { label: 'Canon mensual', value: '$2.500.000' },
                        { label: 'Vigencia', value: '12 meses' },
                        { label: 'Inicio', value: '1 Feb 2026' },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between text-[12px]">
                          <span className="text-white/50">{item.label}</span>
                          <span className="font-medium text-white">{item.value}</span>
                        </div>
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
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Scales className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">Ley 820/2003</p>
                        <p className="text-[11px] text-muted-foreground">100% conforme</p>
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
                  Un contrato mal hecho puede costarte <span className="italic">millones</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Cláusulas faltantes, firmas inválidas, documentos perdidos. Los errores en contratos son la causa #1 de disputas.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row - Image Cards with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5">
              {/* Card 1 - Legal Disputes */}
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
                    Disputas
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    73%
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    de disputas por contratos incompletos
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Cláusulas faltantes o mal redactadas son la causa principal de conflictos legales
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
                  src="/hero-2.jpg"
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
                    3 días
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    promedio firmando contratos tradicionales
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Coordinar agendas, ir a notaría, esperar firmas... un proceso del siglo pasado
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - Lost Documents */}
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
                  <span className="text-[11px] font-mono font-normal text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Pérdida
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    45%
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    pierden contratos físicos
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Papel que se moja, se pierde o se daña cuando más lo necesitas
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Robottom Row - Illustration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Card 4 - Invalid Signature Widget */}
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
                        <FileX className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-foreground">Contrato #847</p>
                        <p className="text-[10px] text-red-500 font-medium">Firma inválida</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Propietario</span>
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> OK
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Inquilino</span>
                        <span className="text-red-500 flex items-center gap-1">
                          <Warning className="w-3 h-3" /> Error
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Testigo</span>
                        <span className="text-neutral-300">— — —</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    !
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-3">
                    {'"'}La firma no es válida{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Un contrato sin firma electrónica certificada puede ser impugnado en cualquier momento. Tu seguridad legal depende de ello.
                  </p>
                </div>
              </motion.div>

              {/* Card 5 - Legal Process Widget */}
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
                      <span className="text-[11px] font-medium text-foreground">Proceso Legal</span>
                      <Gavel className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                      {[
                        { step: 'Demanda', time: '2 meses', done: true },
                        { step: 'Audiencias', time: '6 meses', done: true },
                        { step: 'Fallo', time: '4 meses', done: false },
                        { step: 'Apelación', time: '???', done: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${item.done ? 'bg-amber-100' : 'bg-neutral-100'}`}>
                              {item.done && <span className="text-amber-600 text-[8px]">✓</span>}
                            </div>
                            <span className="text-muted-foreground">{item.step}</span>
                          </div>
                          <span className={item.done ? 'text-amber-600' : 'text-neutral-400'}>{item.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-neutral-100 my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Total estimado:</span>
                      <span className="text-[12px] text-amber-600 font-bold">+14 meses</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-3">
                    {'"'}Cláusula no incluida{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Una cláusula faltante puede significar meses de proceso legal. La prevención cuesta minutos, la corrección años.
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
                  Contratos legales <span className="italic">en minutos</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Plantillas verificadas, firma digital certificada y almacenamiento seguro por 10 años.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - Contract Builder */}
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
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-[17px] font-mono uppercase font-normal text-white mb-3">
                    Editor de Contratos
                  </h3>
                  <p className="text-[15px] text-white/70 leading-relaxed max-w-md">
                    Crea contratos legales completos en minutos. Solo llena los datos, nosotros nos encargamos de las cláusulas.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-6">
                  {['18 cláusulas legales', 'Ley 820/2003', 'Auto-completado'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Digital Signature */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
                    <PenNib className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-3">
                    Firma Digital Certificada
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Firma electrónica con validez legal según Ley 527/1999. Verificación por código OTP y certificado digital.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Ley 527/1999', 'Código OTP', 'Certificado'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Storage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Cloud className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-3">
                    Almacenamiento Seguro
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Tus contratos guardados por 10 años en la nube. Encriptación AES-256, backup automático y acceso 24/7.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['10 años', 'AES-256', 'Backup 24/7'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Large Card - Audit Trail */}
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
                    <ClockCounterClockwise className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-mono uppercase font-normal text-white mb-3">
                      Historial y Trazabilidad
                    </h3>
                    <p className="text-[15px] text-white/70 leading-relaxed max-w-md mb-6">
                      Cada acción queda registrada: quién firmó, cuándo, desde dónde. Prueba legal irrefutable ante cualquier disputa.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Timestamps', 'Geolocalización', 'Audit trail'].map((item, i) => (
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

        {/* Contract TextTs Section */}
        <section id="plantillas" className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Elige tu tipo de <span className="italic">contrato</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Todas las plantillas redactadas por abogados especializados en arrendamiento.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
              {[
                { icon: House, name: 'Arrendamiento vivienda', description: 'Para apartamentos y casas residenciales', popular: true },
                { icon: Buildings, name: 'Arrendamiento comercial', description: 'Para locales, oficinas y bodegas', popular: false },
                { icon: Users, name: 'Arrendamiento habitación', description: 'Para habitaciones en vivienda compartida', popular: false },
                { icon: FileText, name: 'Subarrendamiento', description: 'Cuando el inquilino arrienda a terceros', popular: false },
                { icon: PenNib, name: 'Adenda de modificación', description: 'Para modificar términos existentes', popular: false },
                { icon: CheckCircle, name: 'Acta de entrega', description: 'Documento de entrega/recepción del inmueble', popular: false },
              ].map((type, i) => (
                <motion.div
                  key={type.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative bg-sand-50 rounded-xl p-6 min-h-[180px] flex flex-col hover:shadow-lg transition-shadow cursor-pointer ${type.popular ? 'ring-2 ring-foreground/20' : ''}`}
                >
                  {type.popular && (
                    <span className="absolute -top-2.5 left-4 px-3 py-1 text-[10px] font-mono font-normal uppercase tracking-wider bg-foreground text-white rounded-full">
                      Más usado
                    </span>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
                    <type.icon className="w-6 h-6 text-foreground/70" />
                  </div>
                  <h3 className="text-[17px] font-mono uppercase font-normal text-foreground mb-1">{type.name}</h3>
                  <p className="text-[13px] text-muted-foreground flex-1">{type.description}</p>
                </motion.div>
              ))}
            </div>

          </div>
        </section>

        {/* Legal Compliance Section - Premium Redesign */}
        <section className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            {/* Section Header */}
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Respaldo legal <span className="italic">total</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Cada contrato está respaldado por la legislación colombiana vigente y las mejores prácticas de seguridad digital.
                  </p>
                </div>
              </div>
            </div>

            {/* Legal Compliance Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Main Law Card - 7 cols */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="md:col-span-7 relative rounded-xl overflow-hidden min-h-[400px] group"
              >
                <Image
                  src="/hero-interior.jpg"
                  alt="Interior legal"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                      <Scales className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-normal text-emerald-400 uppercase tracking-wider">Marco Legal</span>
                      <h3 className="text-[17px] font-mono uppercase font-normal text-white">Ley 820 de 2003</h3>
                    </div>
                  </div>
                  <div>
                    <p className="text-[40px] md:text-[48px] font-heading font-light text-white leading-none tracking-tight mb-4">
                      Régimen de<br />arrendamiento urbano
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['18 cláusulas', 'Actualización 2024', 'Vivienda urbana'].map((item, i) => (
                        <span key={i} className="text-[12px] font-mono uppercase font-normal text-white/80 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Digital Signature Law + Stats */}
              <div className="md:col-span-5 flex flex-col gap-4 lg:gap-5">
                {/* Firma Electrónica Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-sand-50 rounded-xl p-6 flex-1"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <PenNib className="w-6 h-6 text-foreground/70" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-normal text-primary uppercase tracking-wider">Firma Digital</span>
                      <h4 className="text-[17px] font-mono uppercase font-normal text-foreground">Ley 527 de 1999</h4>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                    Comercio electrónico y firmas digitales con validez jurídica plena en Colombia.
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-[12px] text-foreground font-medium">Validez legal certificada</span>
                  </div>
                </motion.div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="bg-foreground rounded-xl p-5"
                  >
                    <p className="text-[40px] font-heading font-light text-white leading-none tracking-tight mb-1">
                      100%
                    </p>
                    <p className="text-[12px] text-white/70">Conforme a ley</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.35 }}
                    className="bg-white rounded-xl p-5 border border-neutral-200"
                  >
                    <p className="text-[40px] font-heading font-light text-foreground leading-none tracking-tight mb-1">
                      10
                    </p>
                    <p className="text-[12px] text-muted-foreground">Años archivo</p>
                  </motion.div>
                </div>
              </div>

              {/* Robottom Row - 3 Feature Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="md:col-span-4 bg-white rounded-xl p-6 border border-neutral-200 flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <SealCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="text-[17px] font-mono uppercase font-normal text-foreground mb-2">Certificado Digital</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                  Cada contrato incluye certificado de autenticidad con hash único verificable.
                </p>
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="font-mono text-[10px] text-muted-foreground bg-neutral-50 rounded-lg px-3 py-2 truncate">
                    SHA-256: a7f3c9d...e4b2
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45 }}
                className="md:col-span-4 bg-white rounded-xl p-6 border border-neutral-200 flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-[17px] font-mono uppercase font-normal text-foreground mb-2">Timestamps Legales</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                  Registro inmutable de fecha y hora de cada firma con validez probatoria.
                </p>
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    ISO 8601 + Timezone
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="md:col-span-4 bg-white rounded-xl p-6 border border-neutral-200 flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="text-[17px] font-mono uppercase font-normal text-foreground mb-2">Encriptación AES-256</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                  Datos personales protegidos con el estándar de encriptación más seguro.
                </p>
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Shield className="w-3.5 h-3.5" />
                    Cumple Ley 1581/2012
                  </div>
                </div>
              </motion.div>
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
                  Propietarios que firman digital
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
