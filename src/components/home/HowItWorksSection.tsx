"use client";

import { motion } from "framer-motion";
import { Buildings, ShieldCheck, ArrowRight, CurrencyDollar } from '@phosphor-icons/react';
import Link from "next/link";

// --- Original multi-audience steps (commented for agency-only launch) ---
// const _originalSteps = [
//   { number: "01", icon: MagnifyingGlass, title: "Busca o publica", description: "Inquilinos: encuentra propiedades..." },
//   { number: "02", icon: ShieldCheck, title: "Evaluación inteligente", description: "Nuestro scoring AI evalúa..." },
//   { number: "03", icon: FileText, title: "Firma y listo", description: "Contrato digital legalmente válido..." },
// ];
// ---

const steps = [
  {
    number: "01",
    icon: Buildings,
    title: "Sube tu portafolio",
    subtitle: "En minutos, no semanas",
    description: "Registra tus propietarios y propiedades. Importa desde Excel o crea uno por uno. Tu portafolio organizado desde el día 1.",
    cta: { label: "Ver cómo funciona", href: "/para/inmobiliarias" },
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Los agentes AI trabajan",
    subtitle: "24/7 sin intervención",
    description: "Evaluación de inquilinos con scoring AI, matching inteligente de propiedades, y recordatorios automáticos. Tu equipo AI no descansa.",
    cta: { label: "Conocer agentes AI", href: "/para/inmobiliarias" },
  },
  {
    number: "03",
    icon: CurrencyDollar,
    title: "Cobra y dispersa",
    subtitle: "Automático y puntual",
    description: "Cobros automáticos a inquilinos, dispersiones a propietarios, y reportes financieros. Todo sin tocar una hoja de cálculo.",
    cta: { label: "Ver precios", href: "/pricing" },
  },
];

/**
 * HowItWorksSection - 3-step clear process
 * Part of the 6-section conversion structure
 */
export function HowItWorksSection() {
  return (
    <section className="bg-white py-20 md:py-28 overflow-hidden">
      <div className="container-platform">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          {/* Main heading */}
          <h2 className="text-[32px] md:text-[48px] font-heading font-normal text-foreground tracking-[-0.0625em] leading-[1.1] mb-4 max-w-2xl mx-auto">
            Administra más con menos en 3 pasos
          </h2>

          <p className="text-[17px] md:text-[19px] tracking-[-0.5px] text-muted-foreground max-w-xl mx-auto">
            Sin Excel, sin llamadas de cobro, sin trabajo manual. Así de simple.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="group"
              >
                {/* Card */}
                <div className="relative bg-muted/30 border border-border hover:border-primary/30 rounded-xl p-8 md:p-10 transition-all duration-300 hover: h-full flex flex-col">
                  {/* Step number */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[48px] md:text-[56px] font-extralight tracking-[-4px] text-primary/20">
                      {step.number}
                    </span>
                    <div className="w-14 h-14 flex items-center justify-center bg-primary/5 border border-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white uppercase tracking-wide font-mono transition-colors">
                      <Icon className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3 flex-1">
                    <h3 className="font-mono uppercase text-[22px] md:text-[26px] font-normal text-foreground tracking-[-1px]">
                      {step.title}
                    </h3>
                    <p className="text-[14px] font-medium text-primary tracking-wide uppercase">
                      {step.subtitle}
                    </p>
                    <p className="text-[15px] text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto pt-6 border-t border-border">
                    <Link
                      href={step.cta.href}
                      className="inline-flex items-center gap-2 text-[14px] font-medium text-foreground hover:text-primary transition-colors group/link"
                    >
                      {step.cta.label}
                      <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
