"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from '@phosphor-icons/react';

const faqs = [
  {
    question: "¿Cómo funciona el proceso de arriendo?",
    answer:
      "Comenzamos con una consulta para entender tus necesidades, áreas preferidas y presupuesto. Nuestro equipo luego selecciona propiedades personalizadas, coordina visitas y te guía en el proceso de aplicación. Cada paso es apoyado con claridad y transparencia.",
  },
  {
    question: "¿Qué es el scoring de riesgo AI?",
    answer:
      "Nuestro sistema de scoring AI evalúa múltiples factores del inquilino potencial: capacidad de pago, historial crediticio, referencias y estabilidad laboral. El resultado es un score de A a D que te ayuda a tomar decisiones informadas.",
  },
  {
    question: "¿Cuánto tiempo toma el proceso?",
    answer:
      "El tiempo varía según el tipo de propiedad y la documentación del inquilino. En promedio, el proceso completo desde la búsqueda hasta la firma del contrato toma entre 1 y 2 semanas.",
  },
  {
    question: "¿Ofrecen visitas virtuales?",
    answer:
      "Sí. Ofrecemos tours virtuales en HD, recorridos en video en vivo y consultas remotas para clientes que no pueden visitar en persona.",
  },
  {
    question: "¿Cuáles son los costos del servicio?",
    answer:
      "Para inquilinos, nuestro servicio de búsqueda es gratuito. Para propietarios, manejamos diferentes planes según el nivel de servicio requerido.",
  },
];

/**
 * FAQSection - Luxterra pixel-perfect clone
 * Light gray background #f5f5f5, image + CTA on left, accordion on right
 * Exact CSS values from Luxterra
 */
export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-white overflow-hidden">
      <div className="container-platform py-[80px] pb-[100px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left - Header, Image & CTA */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32 self-start"
          >
            {/* Label with purple dot - 16px, -0.32px letter-spacing */}
            <div className="flex items-center gap-2 mb-[10px]">
              <span className="w-[6px] h-[6px] rounded-full bg-primary" />
              <span className="text-[16px] tracking-[-0.32px] leading-[21.6px] text-muted-foreground">
                FAQ
              </span>
            </div>

            {/* Main heading - 58px, -4.176px letter-spacing */}
            <h2 className="text-[40px] md:text-[58px] font-heading font-normal text-foreground tracking-[-4.176px] leading-[1.05] mb-[40px]">
              Preguntas frecuentes
            </h2>

            {/* Small portrait image - Luxterra style (about 140px wide) */}
            <div className="relative w-[140px] h-[180px] mb-[24px] rounded-sm overflow-hidden bg-muted">
              <Image
                src="https://images.pexels.com/photos/3785104/pexels-photo-3785104.jpeg?auto=compress&cs=tinysrgb&w=400"
                alt="Equipo de asesores"
                fill
                className="object-cover"
                sizes="140px"
              />
            </div>

            {/* Helper text - 18px, -0.72px letter-spacing, black/70% */}
            <p className="text-[18px] tracking-[-0.72px] leading-[24px] text-foreground/70 mb-[16px] max-w-[300px]">
              ¿Tienes más preguntas? Nuestro equipo está feliz de ayudar.
            </p>

            {/* CTA Button - Luxterra style: 35px height, 2px border-radius */}
            <a
              href="mailto:info@leasefy.co"
              className="inline-flex items-center justify-center h-[35px] px-[22px] rounded-sm border border-border text-[15px] text-foreground tracking-[-0.15px] leading-[20px] hover:bg-black/5 transition-colors group/btn overflow-hidden"
            >
              <span className="relative overflow-hidden h-[20px]">
                <span className="block transition-transform duration-300 group-hover/btn:-translate-y-full">
                  Contáctanos
                </span>
                <span className="block absolute top-full transition-transform duration-300 group-hover/btn:-translate-y-full">
                  Contáctanos
                </span>
              </span>
            </a>
          </motion.div>

          {/* Right - FAQ Accordion with fixed height to prevent layout shift */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="min-h-[600px]"
          >
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-b border-border last:border-0"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between py-[24px] text-left group"
                >
                  {/* Question text - 24px, -0.96px letter-spacing */}
                  <span className="text-[24px] font-normal text-foreground tracking-[-0.96px] leading-[29.28px] pr-6">
                    {faq.question}
                  </span>
                  <span className="flex-shrink-0 w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground group-hover:bg-black/5 transition-colors">
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
                      {/* Answer text - 18px, -0.72px letter-spacing, black/70% */}
                      <p className="text-[18px] tracking-[-0.72px] leading-[24px] text-foreground/70 pb-[24px] pr-12">
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
