"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { EyebrowPill, Reveal, lpHeading, LpButton } from "./_kit";

const faqs = [
  {
    question: "¿Qué es Leasefy?",
    answer:
      "El sistema operativo para inmobiliarias: combina CRM, ERP y agentes AI para centralizar y automatizar toda la operación de arriendos en una sola plataforma.",
  },
  {
    question: "¿Tengo que implementar todo de una vez?",
    answer:
      "No. Puedes empezar por una capa —CRM, ERP o agentes AI— y crecer a tu ritmo hacia la plataforma completa.",
  },
  {
    question: "¿Qué hacen los agentes AI?",
    answer:
      "Automatizan los momentos críticos del arriendo: matching, validación de inquilinos, asegurabilidad, cobranza, avalúos y conciliación, siempre con tu equipo en control.",
  },
  {
    question: "¿Los agentes reemplazan a mi equipo?",
    answer:
      "No. Trabajan junto a tu equipo: reducen tareas repetitivas y entregan información clara para que las personas tomen mejores decisiones.",
  },
  {
    question: "¿Cómo manejan los datos y el cumplimiento?",
    answer:
      "Con controles de acceso por rol, registro de auditoría y tratamiento de datos diseñado conforme a la Ley 1581 (Habeas Data) y la Ley 2300 en cobranza.",
  },
  {
    question: "¿Para quién es Leasefy?",
    answer:
      "Para inmobiliarias en Colombia que quieren operar más arriendos sin aumentar su equipo, con más control y trazabilidad.",
  },
];

/**
 * FaqSection — Handle-style FAQ: sticky header + CTA on the left, a clean
 * hairline-divided accordion on the right. Each row toggles a smooth height
 * reveal; the Plus mark rotates into an X on open. Light, generous spacing.
 */
export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) =>
    setOpenIndex(openIndex === index ? null : index);

  return (
    <section id="faq" className="bg-white py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left — sticky header + CTA */}
          <Reveal className="self-start lg:sticky lg:top-28">
            <EyebrowPill>Preguntas frecuentes</EyebrowPill>
            <h2 className={`${lpHeading} mt-6 text-neutral-950`}>
              ¿Tienes preguntas?{" "}
              <span className="text-neutral-400">Aquí van las respuestas.</span>
            </h2>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-neutral-500 md:text-lg">
              ¿Necesitas más detalle? Habla con nuestro equipo y te resolvemos
              lo que falte.
            </p>
            <LpButton
              href="https://wa.me/573116558833"
              variant="light"
              className="mt-7"
            >
              Hablar con ventas
            </LpButton>
          </Reveal>

          {/* Right — accordion */}
          <Reveal delay={0.1}>
            <div>
              {faqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div
                    key={faq.question}
                    className="border-b border-neutral-200 first:border-t"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(index)}
                      aria-expanded={isOpen}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className="font-heading text-lg font-medium tracking-[-0.01em] text-neutral-950 md:text-xl">
                        {faq.question}
                      </span>
                      <span
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                          isOpen
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-200 text-neutral-950 group-hover:bg-neutral-50"
                        }`}
                      >
                        <Plus
                          className={`h-4 w-4 transition-transform duration-300 ${
                            isOpen ? "rotate-45" : "rotate-0"
                          }`}
                        />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="pb-6 pr-12 leading-relaxed text-neutral-500">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
