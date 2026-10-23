"use client";

import { useState } from "react";
import Link from "next/link";
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { LandingFooterV2 } from "@/components/landing-v2/LandingFooterV2";
import { SectionLabel } from "@/components/ui/section-label";
import { CaretDown, EnvelopeSimple } from '@phosphor-icons/react';
import { Collapse } from "@leasefy/cadence";
import { Button } from "@/components/ui/button";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  items: FAQ[];
}

// Revisora r25: primero las preguntas de quien busca arriendo (antes las del propietario), y las palabras de la casa:
// «propietarios», «inquilinos», «inmueble» (antes «arrendadores», «arrendatarios», «propiedad»).
const faqData: FAQCategory[] = [
  {
    title: "Para inquilinos",
    items: [
      {
        question: "¿Cómo me postulo a un inmueble?",
        answer:
          "Busca inmuebles disponibles, elige el que te interese y completa el formulario de postulación. El propietario recibe tu postulación junto con tu calificación.",
      },
      {
        question: "¿Qué documentos necesito para postularme?",
        answer:
          "Generalmente necesitas cédula de ciudadanía, certificado laboral o de ingresos, referencias personales y extractos bancarios. Los requisitos específicos pueden variar según el propietario.",
      },
      {
        question: "¿Puedo agendar visitas a través de la plataforma?",
        answer:
          "Sí, puedes solicitar visitas directamente desde la publicación del inmueble. El propietario confirma la fecha y hora disponible.",
      },
    ],
  },
  {
    title: "Para propietarios",
    items: [
      {
        question: "¿Cómo publico mi inmueble en Leasefy?",
        answer:
          "Regístrate como propietario, toca «Nuevo inmueble» y completa el formulario con los datos del inmueble, fotos y precio. Tu publicación estará visible una vez revisada.",
      },
      {
        question: "¿Qué es la calificación de riesgo de los inquilinos?",
        answer:
          "Es un análisis automatizado que evalúa el perfil financiero y de comportamiento de los candidatos, ayudándote a tomar decisiones informadas sobre a quién arrendar tu inmueble.",
      },
      {
        question: "¿Cuánto cuesta publicar un inmueble?",
        answer:
          "Publicar un inmueble es gratis en el plan básico. Los planes de pago suman funciones como destacar tu publicación y acceso a reportes avanzados.",
      },
      {
        question: "¿Cómo selecciono al mejor candidato?",
        answer:
          "Revisa las postulaciones recibidas, consulta la calificación de riesgo de cada candidato y utiliza las herramientas de comparación de la plataforma para tomar la mejor decisión.",
      },
    ],
  },
  {
    title: "Pagos",
    items: [
      {
        question: "¿Cómo funcionan los pagos de arriendo en la plataforma?",
        answer:
          "La plataforma facilita el registro y seguimiento de pagos mensuales. Puedes configurar recordatorios y llevar un historial completo de transacciones.",
      },
      {
        question: "¿Qué métodos de pago están disponibles?",
        answer:
          "Aceptamos transferencias bancarias, PSE y pagos con tarjeta de crédito o débito. Todos los pagos son procesados de forma segura.",
      },
      {
        question: "¿Qué sucede si un pago se retrasa?",
        answer:
          "La plataforma envía notificaciones automáticas de recordatorio. Los retrasos se registran en el historial y pueden afectar la calificación del inquilino conforme a lo establecido en el contrato.",
      },
    ],
  },
  {
    title: "Contratos",
    items: [
      {
        question: "¿Los contratos generados en la plataforma son legales?",
        answer:
          "Sí, los contratos se generan conforme a la Ley 820 de 2003 y el Código Civil colombiano. La firma electrónica está amparada por la Ley 527 de 1999.",
      },
      {
        question: "¿Puedo personalizar el contrato de arrendamiento?",
        answer:
          "Sí, la plataforma ofrece plantillas base que puedes ajustar según las necesidades del arrendamiento, siempre dentro del marco legal colombiano.",
      },
      {
        question: "¿Cómo firmo el contrato digitalmente?",
        answer:
          "Una vez acordadas las condiciones, ambas partes reciben el contrato para revisión. La firma se realiza electrónicamente desde la plataforma con validez legal.",
      },
    ],
  },
];

/** El ancla de cada tema («Para propietarios» → «para-propietarios»). */
function ancla(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function FAQItem({ item }: { item: FAQ }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border-faint last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        aria-expanded={open}
      >
        <span className="text-[15px] text-fg">{item.question}</span>
        <CaretDown
          className={`h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {/* La respuesta se abre con su altura (Collapse de Cadence), no de golpe. */}
      <Collapse open={open}>
        <p className="pb-4 pr-8 text-body-sm leading-relaxed text-fg-muted">{item.answer}</p>
      </Collapse>
    </div>
  );
}

export default function AyudaPage() {
  return (
    <LandingChrome>
      <main id="main-content" className="bg-bg">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform"><div className="max-w-[800px]">
            <SectionLabel className="mb-4">Soporte</SectionLabel>
            <h1 className="font-heading text-[32px] font-[420] leading-[1.08] tracking-[-0.03em] text-fg md:text-[44px] mb-4">
              Centro de ayuda
            </h1>
            <p className="mb-6 text-[15px] text-fg-muted">
              Encuentra respuestas a las preguntas más frecuentes sobre
              Leasefy.
            </p>

            {/* Los temas a la vista: se salta directo al que interesa. */}
            <nav aria-label="Temas de la ayuda" className="mb-12 flex flex-wrap gap-2">
              {faqData.map((category) => (
                <a
                  key={category.title}
                  href={`#${ancla(category.title)}`}
                  className="rounded-full border border-border px-3.5 py-1.5 text-body-sm text-fg transition-colors hover:bg-surface-muted"
                >
                  {category.title}
                </a>
              ))}
            </nav>

            <div className="space-y-10">
              {faqData.map((category) => (
                <section key={category.title} id={ancla(category.title)} className="scroll-mt-28">
                  <h2 className="mb-3 text-body font-medium text-fg">{category.title}</h2>
                  <div className="rounded-lg border border-border bg-surface px-5">
                    {category.items.map((item) => (
                      <FAQItem key={item.question} item={item} />
                    ))}
                  </div>
                  {/* Revisora r27: la Guía es OTRA página: va como enlace bajo «Para propietarios», no mezclada con
                      las anclas de los temas (se leían igual). */}
                  {category.title === 'Para propietarios' ? (
                    <Link
                      href="/ayuda/propietarios"
                      className="mt-3 inline-block text-body-sm text-fg underline underline-offset-4 hover:text-primary"
                      data-testid="ayuda-guia-propietarios"
                    >
                      Leer la guía para propietarios
                    </Link>
                  ) : null}
                </section>
              ))}
            </div>

            {/* Contact section */}
            <div className="mt-16 rounded-lg border border-border bg-surface-muted p-6 text-center sm:p-8">
              <h2 className="mb-2 text-h3 text-fg">
                ¿No encontraste lo que buscabas?
              </h2>
              <p className="mb-5 text-body-sm text-fg-muted">
                Nuestro equipo de soporte está disponible para ayudarte.
              </p>
              <Button asChild variant="secondary" hideArrow>
                <a href="mailto:hola@leasefy.co">
                  <EnvelopeSimple className="h-4 w-4" aria-hidden="true" />
                  Contactar soporte
                </a>
              </Button>
              <p className="mt-3 text-caption text-fg-muted">
                hola@leasefy.co
              </p>
            </div>
          </div></div>
        </section>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
