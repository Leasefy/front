"use client";

import { motion } from "framer-motion";

/**
 * IntroSection - High-impact value proposition
 * Meridian-style cards with UI illustrations and colored backgrounds
 */
export function IntroSection() {
  return (
    <section className="bg-white py-20 md:py-28 overflow-hidden">
      <div className="container-platform">
        {/* Main headline - Bold impactful statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-24"
        >
          <h2 className="font-heading text-[42px] md:text-[64px] lg:text-[80px] font-medium text-foreground tracking-[-0.02em] leading-[1.08] mb-6 max-w-5xl mx-auto">
            Arrienda diferente.
            <br />
            Arrienda{" "}
            <span className="inline-block bg-primary text-white px-4 md:px-6 py-1 md:py-2 rounded-lg md:rounded-xl align-middle">
              <span className="block" style={{ transform: 'translateY(-0.06em)' }}>simple</span>
            </span>
          </h2>

          <p className="text-[18px] md:text-[22px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Evaluación con IA, contratos digitales, cobro automatizado y seguro de arriendo — todo en un solo lugar.
          </p>
        </motion.div>

        {/* Two audience cards - Solid color Meridian style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Inquilinos card - Solid indigo light */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative rounded-3xl overflow-hidden bg-indigo-50"
          >
            {/* UI Illustration Area */}
            <div className="relative p-8 md:p-12 min-h-[320px] md:min-h-[380px] flex items-center justify-center">
              {/* Floating UI Elements - Property MagnifyingGlass */}
              <div className="relative w-full max-w-[340px]">
                {/* Main property card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg p-4 relative z-10"
                >
                  {/* Property image placeholder */}
                  <div className="bg-gradient-to-br from-neutral-200 to-neutral-100 rounded-xl h-32 mb-3 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-12 h-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    {/* Badge */}
                    <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Disponible
                    </div>
                  </div>
                  {/* Property info */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-muted-foreground">Chapinero Alto, Bogotá</div>
                    <div className="text-[13px] font-medium text-foreground">Apartamento moderno</div>
                    <div className="flex items-center justify-between">
                      <div className="text-[15px] font-semibold text-foreground">$2.500.000<span className="text-[11px] font-normal text-muted-foreground">/mes</span></div>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span>2 hab</span>
                        <span>•</span>
                        <span>75m²</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* MagnifyingGlass bar floating above */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="absolute -top-6 left-4 right-4 bg-white rounded-xl shadow-md px-4 py-2.5 flex items-center gap-2 z-20"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-[12px] text-muted-foreground">2 hab en Chapinero...</span>
                </motion.div>

                {/* Match badge floating */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="absolute -right-4 top-20 bg-success-500 text-white rounded-xl px-3 py-2 shadow-lg z-20"
                >
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[11px] font-medium">92% match</span>
                  </div>
                </motion.div>

                {/* Time badge */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="absolute -left-2 bottom-16 bg-white rounded-lg px-2.5 py-1.5 shadow-md border border-border z-20"
                >
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[10px] font-medium text-foreground">48h respuesta</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Text content below - same solid background */}
            <div className="p-6 md:p-8 text-center">
              <h3 className="font-mono uppercase text-[22px] md:text-[26px] font-medium text-foreground tracking-[-0.02em] leading-tight mb-3">
                Encuentra tu hogar en días, no meses
              </h3>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Búsqueda inteligente que entiende lo que necesitas. Aplicaciones pre-aprobadas,
                respuestas en 48 horas, sin sorpresas ni costos ocultos.
              </p>
            </div>
          </motion.div>

          {/* Propietarios card - Solid sand color */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group relative rounded-3xl overflow-hidden bg-[#F3EEE4]"
          >
            {/* UI Illustration Area */}
            <div className="relative p-8 md:p-12 min-h-[320px] md:min-h-[380px] flex items-center justify-center">
              {/* Floating UI Elements - Tenant Scoring Dashboard */}
              <div className="relative w-full max-w-[340px]">
                {/* Main scoring card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg p-5 relative z-10"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sand-100 to-sand-200 flex items-center justify-center">
                        <span className="text-[14px] font-semibold text-neutral-700">MG</span>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-foreground">María García</div>
                        <div className="text-[10px] text-muted-foreground">Solicitante verificada</div>
                      </div>
                    </div>
                    <div className="bg-success-50 text-success-700 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                      Score A
                    </div>
                  </div>

                  {/* Score visualization */}
                  <div className="bg-muted rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-muted-foreground">Capacidad de pago</span>
                      <span className="text-[11px] font-medium text-success-500">Excelente</span>
                    </div>
                    <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div className="h-full w-[85%] bg-gradient-to-r from-success-500 to-success-500 rounded-full" />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-[16px] font-semibold text-foreground">$4.5M</div>
                      <div className="text-[9px] text-muted-foreground">Ingresos</div>
                    </div>
                    <div className="text-center border-x border-border">
                      <div className="text-[16px] font-semibold text-foreground">3 años</div>
                      <div className="text-[9px] text-muted-foreground">Empleo</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[16px] font-semibold text-success-500">92%</div>
                      <div className="text-[9px] text-muted-foreground">Prob. pago</div>
                    </div>
                  </div>
                </motion.div>

                {/* Verification badge floating */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="absolute -right-3 -top-2 bg-white rounded-xl px-3 py-2 shadow-lg border border-border z-20"
                >
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-[10px] font-medium text-foreground">Verificado</span>
                  </div>
                </motion.div>

                {/* Payment card floating */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="absolute -left-4 bottom-8 bg-white rounded-xl px-3 py-2.5 shadow-lg border border-border z-20"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-warning-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Cobro mensual</div>
                      <div className="text-[12px] font-semibold text-foreground">Automático</div>
                    </div>
                  </div>
                </motion.div>

                {/* Insurance badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                  className="absolute right-4 -bottom-2 bg-warning-500 text-white rounded-lg px-3 py-1.5 shadow-lg z-20"
                >
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-[10px] font-medium">Protegido</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Text content below - same solid background */}
            <div className="p-6 md:p-8 text-center">
              <h3 className="font-mono uppercase text-[22px] md:text-[26px] font-medium text-foreground tracking-[-0.02em] leading-tight mb-3">
                Arrienda con tranquilidad total
              </h3>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Scoring AI que predice comportamiento de pago. Cobro automatizado y seguro de arriendo
                que te protege ante cualquier impago.
              </p>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
