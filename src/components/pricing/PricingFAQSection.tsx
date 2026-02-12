'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, Plus, X, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export const pricingFaqs = [
  {
    question: "¿Cuál es la diferencia entre administración y suscripción?",
    answer: "La administración es para propietarios que quieren desentenderse: nosotros cobramos el arriendo, gestionamos la comunicación y coordinamos mantenimientos. La suscripción es para quienes quieren herramientas pero prefieren administrar directamente.",
  },
  {
    question: "¿Cómo funciona el cobro del porcentaje?",
    answer: "Cobramos el arriendo al inquilino (PSE, tarjeta, efectivo) y te transferimos el monto menos nuestro porcentaje. Todo automático, sin que tengas que hacer nada.",
  },
  {
    question: "¿Puedo cambiar de plan en cualquier momento?",
    answer: "Sí, puedes actualizar o cambiar tu plan cuando quieras. Los cambios se aplican inmediatamente y ajustamos la facturación de forma proporcional.",
  },
  {
    question: "¿Qué incluye la póliza de arriendo?",
    answer: "La póliza cubre entre 12 y 24 meses de arriendo en caso de impago, dependiendo del plan que elijas (Básica: 12 meses, Premium: 24 meses). También incluye cobertura por daños a la propiedad, servicios públicos y reparaciones de emergencia. Es opcional y tiene un costo desde 2% del arriendo mensual.",
  },
  {
    question: "¿Cómo funciona el Arriendo Pass para inquilinos?",
    answer: "El Arriendo Pass te permite verificar tu perfil una sola vez y aplicar a todas las propiedades que quieras durante 60 días (o 90 con Premium). Pagas una única vez, completas tu verificación, y los propietarios ven tu score sin costo adicional. Es la forma más económica de buscar arriendo si planeas aplicar a varias propiedades.",
  },
  {
    question: "¿Por qué los inquilinos pagan la evaluación?",
    answer: "Este modelo beneficia a todos: los propietarios reciben candidatos pre-verificados sin costo, y los inquilinos serios demuestran compromiso real. Además, con el Arriendo Pass tu reporte es portable — lo pagas una vez y aplicas a muchas propiedades, ahorrando tiempo y dinero vs. pagar evaluación en cada inmobiliaria.",
  },
];

export function PricingFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-muted overflow-hidden">
      <div className="container-platform py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left - Header */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32 self-start"
          >
            {/* Label with icon */}
            <div className="flex items-center gap-2 mb-4">
              <Circle className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                FAQ
              </span>
            </div>

            {/* Main heading */}
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em] mb-8">
              Preguntas frecuentes
            </h2>

            {/* Helper text */}
            <p className="text-[17px] text-muted-foreground leading-relaxed mb-6 max-w-[340px]">
              ¿Tienes más preguntas? Nuestro equipo está feliz de ayudar.
            </p>

            {/* CTA Button */}
            <a
              href="mailto:info@leasefy.co"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-foreground text-background text-[14px] font-medium hover:bg-foreground/90 transition-colors"
            >
              Contáctanos
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </motion.div>

          {/* Right - FAQ Accordion */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {pricingFaqs.map((faq, index) => (
              <div
                key={index}
                className="border-b border-border/60 last:border-0"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between py-6 text-left group"
                >
                  {/* Question text */}
                  <span className="text-[17px] md:text-[19px] font-heading font-medium text-foreground leading-snug pr-6">
                    {faq.question}
                  </span>
                  <span className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    openIndex === index
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    {openIndex === index ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </span>
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      {/* Answer text */}
                      <p className="text-[15px] md:text-[16px] text-muted-foreground leading-relaxed pb-6 pr-12">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
