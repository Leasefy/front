"use client";

import { motion } from "framer-motion";
import { MagnifyingGlass, ShieldCheck, PencilLine, ArrowRight, FileText } from '@phosphor-icons/react';
import Link from "next/link";

const steps = [
  {
    number: "01",
    icon: MagnifyingGlass,
    title: "Busca o publica",
    subtitle: "En minutos, no semanas",
    description: "Inquilinos: encuentra propiedades verificadas con IA que recomienda según tu perfil. Propietarios: publica gratis y recibe aplicaciones pre-evaluadas.",
    cta: { label: "Ver propiedades", href: "/propiedades" },
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Evaluación inteligente",
    subtitle: "Decisiones informadas en 48h",
    description: "Nuestro scoring AI evalúa capacidad de pago, historial y estabilidad. Sin sesgos, sin conjeturas. Sabrás exactamente qué esperar.",
    cta: { label: "Cómo funciona", href: "/productos/evaluacion" },
  },
  {
    number: "03",
    icon: FileText,
    title: "Firma y listo",
    subtitle: "100% digital y seguro",
    description: "Contrato digital legalmente válido, firma electrónica, y todo listo para mudarte. Sin intermediarios, sin comisiones ocultas.",
    cta: { label: "Ver contratos", href: "/productos/contratos" },
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
          <h2 className="text-[32px] md:text-[48px] font-heading font-normal text-foreground tracking-[-3px] leading-[1.1] mb-4 max-w-2xl mx-auto">
            De búsqueda a llaves en 3 pasos
          </h2>

          <p className="text-[17px] md:text-[19px] tracking-[-0.5px] text-muted-foreground max-w-xl mx-auto">
            Sin intermediarios, sin papeleo, sin sorpresas. Así de simple.
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
                <div className="relative bg-muted/30 border border-border hover:border-primary/30 rounded-2xl p-8 md:p-10 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
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
