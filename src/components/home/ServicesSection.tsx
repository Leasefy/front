"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/section-label";
import { ArrowUpRight, MagnifyingGlass, ShieldCheck, ChartBar, ChartBarHorizontal } from '@phosphor-icons/react';

const services = [
  {
    title: "Arriendo",
    subtitle: "Encuentra tu hogar",
    description: "Propiedades verificadas con IA que recomienda según tu perfil y estilo de vida.",
    image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1600",
    href: "/propiedades",
    cta: "Ver propiedades",
    icon: MagnifyingGlass,
    // Hero — tall, spans 7 cols and 2 rows
    className: "md:col-span-7 md:row-span-2 h-[320px] md:h-auto",
  },
  {
    title: "Evaluación",
    subtitle: "Scoring inteligente",
    description: "Evaluamos inquilinos con IA para decisiones informadas en minutos.",
    image: "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1600",
    href: "/productos/evaluacion",
    cta: "Cómo funciona",
    icon: ShieldCheck,
    className: "md:col-span-5 h-[280px] md:h-auto",
  },
  {
    title: "Valoración",
    subtitle: "Precio justo, datos reales",
    description: "Análisis comparativo del mercado para entender el valor real de tu propiedad.",
    image: "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1600",
    href: "/para/propietarios",
    cta: "Solicitar valoración",
    icon: ChartBar,
    className: "md:col-span-5 h-[280px] md:h-auto",
  },
];

export function ServicesSection() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container-platform">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-14 md:mb-20">
          <SectionLabel className="mb-4 justify-center">
            Nuestros servicios
          </SectionLabel>
          <h2 className="text-[1.75rem] md:text-[2.5rem] font-heading font-light text-foreground leading-[1.2] tracking-[-0.02em] italic mb-3">
            Lo que ofrecemos
          </h2>
          <p className="text-muted-foreground text-[15px] md:text-base max-w-md leading-relaxed">
            Servicio confiable, rapidez y transparencia en cada decisión de arriendo
          </p>
        </div>

        {/* Bento Grid: 12 cols, 2 rows */}
        <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-2 gap-4 md:h-[600px]">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={service.className}
              >
                <Link
                  href={service.href}
                  className="group relative block w-full h-full overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {/* Image */}
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes={index === 0 ? "(max-width: 768px) 100vw, 58vw" : "(max-width: 768px) 100vw, 42vw"}
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5 group-hover:from-black/80 transition-all duration-500" />

                  {/* Content at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7">
                    {/* Icon + subtitle row */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full border border-white/10">
                        <Icon className="w-3.5 h-3.5 text-white/80" strokeWidth={1.5} />
                      </div>
                      <span className="text-[11px] font-mono font-normal text-white/60 tracking-wide uppercase">
                        {service.subtitle}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`font-heading font-medium text-white tracking-[-0.02em] leading-tight mb-1.5 flex items-center gap-2 ${
                      index === 0 ? "text-[1.75rem] md:text-[2.25rem]" : "text-[1.25rem] md:text-[1.5rem]"
                    }`}>
                      {service.title}
                      <ArrowUpRight className="w-4 h-4 text-white/40 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
                    </h3>

                    {/* Description */}
                    <p className={`text-white/60 leading-relaxed ${
                      index === 0 ? "text-[14px] max-w-md" : "text-[13px] max-w-xs"
                    }`}>
                      {service.description}
                    </p>

                    {/* CTA — reveals on hover */}
                    <div className="mt-3 max-h-0 overflow-hidden opacity-0 group-hover:max-h-12 group-hover:opacity-100 transition-all duration-500 ease-out">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white border-b border-white/30 pb-0.5">
                        {service.cta}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
