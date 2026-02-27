"use client";

import Image from "next/image";
import { SectionLabel } from "@/components/ui/section-label";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { TrendUp, Users, PiggyBank, Heart, Shield, Lightning, CheckCircle } from '@phosphor-icons/react';

const stats = [
  {
    value: "$0",
    suffix: "",
    label: "Costo para propietarios",
    description: "Evaluación de inquilinos y publicación en portales completamente gratis.",
    icon: PiggyBank,
  },
  {
    value: "48",
    suffix: "h",
    label: "Tiempo promedio",
    description: "Desde publicar hasta recibir candidatos pre-aprobados.",
    icon: TrendUp,
  },
  {
    value: "92",
    suffix: "%",
    label: "Tasa de aprobación",
    description: "Inquilinos evaluados que cumplen criterios de riesgo bajo.",
    icon: Users,
  },
  {
    value: "4.9",
    suffix: "/5",
    label: "Satisfacción",
    description: "Propietarios que recomiendan la plataforma a otros.",
    icon: Heart,
  },
];

function StatCard({ stat, index }: { stat: typeof stats[number]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const Icon = stat.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative bg-white p-6 flex flex-col justify-between overflow-hidden transition-shadow duration-300 hover:shadow-lg"
      style={{ border: "1px solid rgba(0,0,0,0.06)" }}
    >
      {/* Icon top-right — subtle */}
      <div className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-foreground/[0.03] group-hover:bg-indigo-50 transition-colors duration-300">
        <Icon className="w-3.5 h-3.5 text-foreground/20 group-hover:text-indigo-500 transition-colors duration-300" strokeWidth={1.5} />
      </div>

      <div>
        {/* Big number */}
        <p className="text-[2.25rem] md:text-[2.75rem] font-heading font-extralight text-foreground leading-none tracking-[-0.03em]">
          {stat.value}
          <span className="text-muted-foreground/60">{stat.suffix}</span>
        </p>
        <p className="text-[13px] font-medium text-foreground tracking-[-0.01em] mt-1.5">
          {stat.label}
        </p>
      </div>

      {/* Thin separator */}
      <div className="w-6 h-[1px] bg-foreground/10 my-4" />

      <p className="text-[12px] text-muted-foreground leading-relaxed tracking-[-0.01em]">
        {stat.description}
      </p>
    </motion.div>
  );
}

export function WhyUsSection() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container-platform">
        {/* Header */}
        <div className="mb-14 md:mb-20">
          <SectionLabel className="mb-4">Por qué nosotros</SectionLabel>
          <h2 className="text-[1.75rem] md:text-[2.5rem] font-heading font-light text-foreground leading-[1.2] tracking-[-0.02em] italic whitespace-nowrap">
            Expertos en arriendos en Colombia
          </h2>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left — Image (7 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 relative overflow-hidden min-h-[520px] lg:min-h-0 group rounded-2xl"
          >
            <Image
              src="https://images.pexels.com/photos/7613843/pexels-photo-7613843.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt="Vista aérea de ciudad colombiana"
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 1024px) 100vw, 58vw"
            />

            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Floating widget - top left (Glass morphism) */}
            <motion.div
              initial={{ opacity: 0, x: -20, y: -10 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="absolute top-6 left-6 md:top-8 md:left-8"
            >
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-success-500" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-foreground">Evaluación Gratis</p>
                  <p className="text-[10px] text-muted-foreground">Para propietarios</p>
                </div>
              </div>
            </motion.div>

            {/* Floating widget - top right (Glass morphism) */}
            <motion.div
              initial={{ opacity: 0, x: 20, y: -10 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="absolute top-6 right-6 md:top-8 md:right-8"
            >
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Lightning className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-foreground">Cobro Automatizado</p>
                  <p className="text-[10px] text-muted-foreground">$3.900/transacción</p>
                </div>
              </div>
            </motion.div>

            {/* Floating widget - middle right (Glass morphism) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute top-[45%] right-6 md:right-8 hidden md:block"
            >
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-warning-500" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-foreground">Contratos Digitales</p>
                  <p className="text-[10px] text-muted-foreground">Firma electrónica</p>
                </div>
              </div>
            </motion.div>

            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-1 w-1 rounded-full bg-white/50" />
                <span className="text-[11px] font-mono font-normal text-white/60 tracking-wide uppercase">
                  La plataforma de arriendos de Colombia
                </span>
              </div>
              <h3 className="text-[1.5rem] md:text-[2rem] font-heading font-light text-white leading-[1.2] tracking-[-0.02em] max-w-md mb-3">
                Arrienda sin pagar comisiones innecesarias
              </h3>
              <p className="text-[13px] text-white/60 leading-relaxed max-w-sm">
                Evaluación gratis, cobros automatizados y contratos digitales. Todo en un solo lugar.
              </p>
            </div>
          </motion.div>

          {/* Right — Stats Grid (5 cols, 2x2) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
