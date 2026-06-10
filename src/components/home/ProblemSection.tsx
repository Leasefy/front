"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

// Glass widget styles — always fully opaque so backdrop-filter works on every frame
const glassWidgetClass =
  "rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] border border-white/25 px-5 py-4 max-w-[260px] bg-white/15 backdrop-blur-xl";


/**
 * ProblemSection - Meridian-inspired editorial layout
 * Full-width imagery, floating UI elements, breathing space
 */
export function ProblemSection() {
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnd = () => {
    setVideoEnded(true);
  };

  return (
    <section className="bg-white overflow-hidden">
      {/* Section 1: Full-width hero with video then image */}
      <div className="relative w-full h-[600px] md:h-[700px] overflow-hidden">
        {/* Background Image (always present, shows when video ends) */}
        <Image
          src="/images/people/family-agent-tour.jpg"
          alt="Familia visitando un apartamento con agente inmobiliario"
          fill
          className="object-cover"
          priority
        />

        {/* Video overlay (fades out when ended) */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: videoEnded ? 0 : 1 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 z-[1]"
          style={{ pointerEvents: videoEnded ? "none" : "auto" }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnd}
            className="w-full h-full object-cover"
          >
            <source src="/videos/problem-section.mp4" type="video/mp4" />
          </video>
        </motion.div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent z-[2]" />

        {/* Hero tagline - Bottom Left (only during video) */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: videoEnded ? 0 : 1 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="absolute bottom-16 left-6 md:bottom-20 md:left-8 z-[3] max-w-2xl"
          style={{ pointerEvents: videoEnded ? "none" : "auto" }}
        >
          <h2 className="font-mono uppercase text-[36px] sm:text-[48px] md:text-[56px] font-normal text-white leading-[1.15] tracking-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">
            Arrienda seguro,<br />
            sin complicaciones.
          </h2>
        </motion.div>

        {/* Leasefy Logo - Top Left */}
        <div className="absolute top-6 left-6 md:top-8 md:left-8 z-[3]">
          <img
            src="/images/leasefy-logo.svg"
            alt="Leasefy"
            className="w-10 h-10 md:w-12 md:h-12"
          />
        </div>

        {/* Floating glass widgets — always rendered, transform-only entrance (no opacity) */}
        {/* Widget 1 - Left */}
        <div
          className={`absolute bottom-[30%] left-[8%] md:left-[12%] z-[3] transition-[transform,visibility] duration-700 ease-out ${
            videoEnded
              ? "visible translate-y-0 scale-100"
              : "invisible translate-y-5 scale-[0.92]"
          }`}
          style={{ transitionDelay: videoEnded ? "0.2s" : "0s" }}
        >
          <div className={glassWidgetClass}>
            <p className="font-mono uppercase text-[15px] text-white font-normal leading-snug drop-shadow-sm">
              3-6 meses buscando apartamento
            </p>
            <p className="text-[12px] text-white/80 mt-1.5 leading-relaxed">
              El proceso tradicional es agotador y frustrante.
            </p>
          </div>
        </div>

        {/* Widget 2 - Top Right */}
        <div
          className={`absolute top-[25%] right-[8%] md:right-[12%] z-[3] transition-[transform,visibility] duration-700 ease-out ${
            videoEnded
              ? "visible translate-y-0 scale-100"
              : "invisible translate-y-5 scale-[0.92]"
          }`}
          style={{ transitionDelay: videoEnded ? "0.45s" : "0s" }}
        >
          <div className={glassWidgetClass}>
            <p className="font-mono uppercase text-[15px] text-white font-normal leading-snug drop-shadow-sm">
              40% de impago sin verificación
            </p>
            <p className="text-[12px] text-white/80 mt-1.5 leading-relaxed">
              Sin verificación real, los propietarios asumen todo el riesgo.
            </p>
          </div>
        </div>

        {/* Widget 3 - Bottom Right */}
        <div
          className={`absolute bottom-[15%] right-[15%] md:right-[20%] z-[3] transition-[transform,visibility] duration-700 ease-out ${
            videoEnded
              ? "visible translate-y-0 scale-100"
              : "invisible translate-y-5 scale-[0.92]"
          }`}
          style={{ transitionDelay: videoEnded ? "0.7s" : "0s" }}
        >
          <div className={glassWidgetClass}>
            <p className="font-mono uppercase text-[15px] text-white font-normal leading-snug drop-shadow-sm">
              +$6M en comisiones
            </p>
            <p className="text-[12px] text-white/80 mt-1.5 leading-relaxed">
              Depósitos, comisiones y costos ocultos que no necesitas pagar.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Stats cards with real people - Meridian style */}
      <div className="bg-neutral-50 pt-24 md:pt-32 pb-12 md:pb-16">
        <div className="container-platform">
          {/* Section header - centered, powerful */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 md:mb-20"
          >
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] font-normal text-foreground tracking-[-0.03em] leading-[1.05]">
              El mercado de arriendos
              <br />
              está <span className="inline-block px-4 py-1 bg-foreground text-white rounded-xl">roto</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Procesos lentos, criterios subjetivos y riesgos innecesarios.
              Ni inquilinos ni propietarios ganan con el sistema actual.
            </p>
          </motion.div>

          {/* All cards grid - 6 columns: stat cards span 2, feature cards span 3 */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-5 md:gap-6">
            {/* Card 1 - Inquilinos rechazados */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group relative h-[420px] md:h-[480px] rounded-3xl overflow-hidden md:col-span-2"
            >
              <Image
                src="/images/people/woman-laptop-kitchen.jpg"
                alt="Inquilina frustrada con el proceso"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Tag */}
              <div className="absolute top-6 left-6">
                <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-mono font-normal text-white/90 uppercase tracking-wider">
                  Inquilinos
                </span>
              </div>

              {/* Stat overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-[56px] md:text-[72px] font-heading font-medium text-white leading-none tracking-[-0.03em]">
                    8 de 10
                  </span>
                  <p className="text-[15px] text-white/80 mt-3 leading-relaxed font-medium">
                    solicitudes rechazadas sin explicación
                  </p>
                  <p className="text-[13px] text-white/50 mt-1 leading-relaxed">
                    Criterios subjetivos y sesgos invisibles deciden tu futuro hogar
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {/* Card 2 - Propietarios pérdidas */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group relative h-[420px] md:h-[480px] rounded-3xl overflow-hidden md:col-span-2"
            >
              <Image
                src="/images/people/family-living-room.jpg"
                alt="Familia en su hogar"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Tag */}
              <div className="absolute top-6 left-6">
                <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-mono font-normal text-white/90 uppercase tracking-wider">
                  Propietarios
                </span>
              </div>

              {/* Stat overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="text-[56px] md:text-[72px] font-heading font-medium text-white leading-none tracking-[-0.03em]">
                    $18M
                  </span>
                  <p className="text-[15px] text-white/80 mt-3 leading-relaxed font-medium">
                    pérdida promedio por impago + desalojo
                  </p>
                  <p className="text-[13px] text-white/50 mt-1 leading-relaxed">
                    Sin verificación real, el riesgo lo asume completo el propietario
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {/* Card 3 - El proceso roto */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="group relative h-[420px] md:h-[480px] rounded-3xl overflow-hidden md:col-span-2"
            >
              <Image
                src="/images/people/woman-packing.jpg"
                alt="Persona preparando mudanza"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Tag */}
              <div className="absolute top-6 left-6">
                <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-mono font-normal text-white/90 uppercase tracking-wider">
                  El proceso
                </span>
              </div>

              {/* Stat overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="text-[56px] md:text-[72px] font-heading font-medium text-white leading-none tracking-[-0.03em]">
                    47 días
                  </span>
                  <p className="text-[15px] text-white/80 mt-3 leading-relaxed font-medium">
                    promedio para conseguir un arriendo
                  </p>
                  <p className="text-[13px] text-white/50 mt-1 leading-relaxed">
                    Documentos, visitas, negociaciones... un proceso del siglo pasado
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {/* Feature cards - each spans 3 columns */}
            {/* Card 4 - Inquilinos perspective - Compact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="group relative rounded-2xl overflow-hidden bg-indigo-50 md:col-span-3 p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
                {/* UI Illustration Area - Stack of 3 rejected applications */}
                <div className="relative flex-shrink-0 w-[220px] h-[160px]">
                  {/* Application #1 - Back (oldest) */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 0.4, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="absolute top-0 left-0 w-[160px] bg-white rounded-xl shadow-sm border border-neutral-200 p-3 -rotate-6"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-error-100 flex items-center justify-center">
                        <span className="text-error-400 text-[8px]">✕</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground/60">Aplicación #1</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 bg-neutral-100 rounded w-full" />
                      <div className="h-1.5 bg-neutral-100 rounded w-2/3" />
                    </div>
                  </motion.div>

                  {/* Application #2 - Middle */}
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    whileInView={{ opacity: 0.7, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-6 left-6 w-[160px] bg-white rounded-xl shadow-md border border-neutral-200 p-3 -rotate-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-error-100 flex items-center justify-center">
                        <span className="text-error-400 text-[8px]">✕</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground/80">Aplicación #2</span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 bg-neutral-100 rounded w-full" />
                      <div className="h-1.5 bg-neutral-100 rounded w-3/4" />
                    </div>
                  </motion.div>

                  {/* Application #3 - Front (current) */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="absolute top-10 left-12 w-[170px] bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden"
                  >
                    {/* Header with red stripe */}
                    <div className="h-1 bg-error-500" />
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-error-50 flex items-center justify-center">
                            <span className="text-error-500 text-[10px] font-bold">✕</span>
                          </div>
                          <div>
                            <div className="text-[9px] font-semibold text-foreground">Aplicación #3</div>
                            <div className="text-[8px] text-error-500 font-medium">Rechazada</div>
                          </div>
                        </div>
                        <div className="text-[8px] text-muted-foreground">Hoy</div>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        <div className="h-2 bg-indigo-100 rounded w-full" />
                        <div className="h-2 bg-indigo-100 rounded w-4/5" />
                        <div className="h-2 bg-indigo-100 rounded w-2/3" />
                      </div>
                      <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
                        <span>Motivo:</span>
                        <span className="text-error-500 font-medium">No especificado</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Question marks floating */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -top-1 right-4 text-2xl"
                  >
                    ❓
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 0.6, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="absolute top-8 right-0 text-lg"
                  >
                    ❓
                  </motion.div>
                </div>

                {/* Text content */}
                <div className="text-center md:text-left max-w-[280px]">
                  <h3 className="font-mono uppercase text-[20px] md:text-[22px] font-normal text-foreground tracking-[-0.02em] leading-tight mb-2">
                    {'"'}Rechazado 3 veces sin explicación{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Criterios subjetivos y sesgos invisibles. El proceso tradicional no es transparente.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Card 5 - Propietarios perspective - Compact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="group relative rounded-2xl overflow-hidden bg-[#F3EEE4] md:col-span-3 p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
                {/* UI Illustration Area - Bank statement with debt accumulation */}
                <div className="relative flex-shrink-0 w-[220px] h-[170px]">
                  {/* Main card - Account balance */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="absolute top-4 left-0 w-[190px] bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-200"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-[10px] font-medium">Cuenta de arriendo</span>
                        <span className="text-white/80 text-[8px]">2024</span>
                      </div>
                    </div>

                    {/* Payment timeline */}
                    <div className="p-3">
                      <div className="space-y-2">
                        {[
                          { month: "Ene", status: "paid", amount: "$2.5M" },
                          { month: "Feb", status: "paid", amount: "$2.5M" },
                          { month: "Mar", status: "unpaid", amount: "$2.5M" },
                          { month: "Abr", status: "unpaid", amount: "$2.5M" },
                        ].map((item, i) => (
                          <div key={item.month} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                item.status === "paid" ? "bg-success-50" : "bg-error-50"
                              }`}>
                                <span className={`text-[8px] font-bold ${
                                  item.status === "paid" ? "text-success-500" : "text-error-500"
                                }`}>
                                  {item.status === "paid" ? "✓" : "✕"}
                                </span>
                              </div>
                              <span className="text-[9px] text-muted-foreground">{item.month}</span>
                            </div>
                            <span className={`text-[9px] font-medium ${
                              item.status === "paid" ? "text-success-600" : "text-error-500 line-through"
                            }`}>
                              {item.amount}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Total debt */}
                      <div className="mt-3 pt-2 border-t border-neutral-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground">Deuda acumulada:</span>
                          <span className="text-[13px] font-bold text-error-600">$5.0M</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Alert notification */}
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="absolute top-0 right-0 bg-error-500 text-white rounded-lg shadow-lg px-2.5 py-1.5 flex items-center gap-1.5"
                  >
                    <span className="text-[10px]">⚠️</span>
                    <span className="text-[9px] font-semibold">4 meses</span>
                  </motion.div>

                  {/* Money flying away */}
                  <motion.div
                    initial={{ opacity: 0, x: 0, y: 0 }}
                    whileInView={{ opacity: 1, x: 10, y: -10 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="absolute bottom-2 right-2 text-xl"
                  >
                    💸
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 0, y: 0 }}
                    whileInView={{ opacity: 0.7, x: 15, y: -5 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="absolute bottom-8 right-0 text-lg"
                  >
                    💸
                  </motion.div>
                </div>

                {/* Text content */}
                <div className="text-center md:text-left max-w-[280px]">
                  <h3 className="font-mono uppercase text-[20px] md:text-[22px] font-normal text-foreground tracking-[-0.02em] leading-tight mb-2">
                    {'"'}4 meses sin cobrar arriendo{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Sin verificación real, el propietario asume todo el riesgo de impago.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
