"use client";

import { useState } from "react";
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";
import { CaretDown } from '@phosphor-icons/react';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  items: FAQ[];
}

const faqData: FAQCategory[] = [
  {
    title: "Para arrendadores",
    items: [
      {
        question: "¿Cómo publico mi propiedad en Leasefy?",
        answer:
          "Regístrate como arrendador, haz clic en 'Publicar propiedad' y completa el formulario con los datos del inmueble, fotos y precio. Tu publicación estará visible una vez revisada.",
      },
      {
        question: "¿Qué es el scoring de riesgo de arrendatarios?",
        answer:
          "Es un análisis automatizado que evalúa el perfil financiero y de comportamiento de los candidatos, ayudándote a tomar decisiones informadas sobre a quién arrendar tu inmueble.",
      },
      {
        question: "¿Cuánto cuesta publicar una propiedad?",
        answer:
          "Publicar una propiedad es gratuito en el plan básico. Ofrecemos planes premium con funcionalidades adicionales como destacar tu publicación y acceso a reportes avanzados.",
      },
      {
        question: "¿Cómo selecciono al mejor candidato?",
        answer:
          "Revisa las postulaciones recibidas, consulta el scoring de riesgo de cada candidato y utiliza las herramientas de comparación de la plataforma para tomar la mejor decisión.",
      },
    ],
  },
  {
    title: "Para arrendatarios",
    items: [
      {
        question: "¿Cómo me postulo a un inmueble?",
        answer:
          "Busca propiedades disponibles, selecciona la que te interese y completa el formulario de postulación. El arrendador recibirá tu solicitud junto con tu perfil de scoring.",
      },
      {
        question: "¿Qué documentos necesito para postularme?",
        answer:
          "Generalmente necesitas cédula de ciudadanía, certificado laboral o de ingresos, referencias personales y extractos bancarios. Los requisitos específicos pueden variar según el arrendador.",
      },
      {
        question: "¿Puedo agendar visitas a través de la plataforma?",
        answer:
          "Sí, puedes solicitar visitas directamente desde la publicación del inmueble. El arrendador confirmará la fecha y hora disponible.",
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
          "La plataforma envía notificaciones automáticas de recordatorio. Los retrasos se registran en el historial y pueden afectar el scoring del arrendatario conforme a lo establecido en el contrato.",
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

function FAQItem({ item }: { item: FAQ }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-foreground/70"
        aria-expanded={open}
      >
        <span className="text-[15px] font-medium text-foreground pr-4">
          {item.question}
        </span>
        <CaretDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="pb-4 pr-8">
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AyudaPage() {
  return (
    <LandingChrome>
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform"><div className="max-w-[800px]">
            <SectionLabel className="mb-4">Soporte</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Centro de ayuda
            </h1>
            <p className="text-[15px] text-muted-foreground mb-12">
              Encuentra respuestas a las preguntas más frecuentes sobre
              Leasefy.
            </p>

            <div className="space-y-10">
              {faqData.map((category) => (
                <div key={category.title}>
                  <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide mb-4">
                    {category.title}
                  </h2>
                  <div className="border border-border rounded-[20px] px-5">
                    {category.items.map((item) => (
                      <FAQItem key={item.question} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact section */}
            <div className="mt-16 p-8 border border-border rounded-[22px] bg-muted/30 text-center">
              <h2 className="text-[18px] font-medium text-foreground mb-2">
                ¿No encontraste lo que buscabas?
              </h2>
              <p className="text-[14px] text-muted-foreground mb-4">
                Nuestro equipo de soporte está disponible para ayudarte.
              </p>
              <a
                href="mailto:soporte@leasefy.com"
                className="inline-flex items-center px-5 py-2.5 bg-foreground text-background text-[14px] font-medium rounded-md hover:bg-foreground/90 transition-colors"
              >
                Contactar soporte
              </a>
              <p className="text-[12px] text-muted-foreground mt-3">
                soporte@leasefy.com
              </p>
            </div>
          </div></div>
        </section>
      </main>
      <Footer />
    </LandingChrome>
  );
}
