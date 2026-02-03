"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";
import { ChevronDown } from "lucide-react";

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
        question: "Como publico mi propiedad en Arriendo Facil?",
        answer:
          "Registrate como arrendador, haz clic en 'Publicar propiedad' y completa el formulario con los datos del inmueble, fotos y precio. Tu publicacion estara visible una vez revisada.",
      },
      {
        question: "Que es el scoring de riesgo de arrendatarios?",
        answer:
          "Es un analisis automatizado que evalua el perfil financiero y de comportamiento de los candidatos, ayudandote a tomar decisiones informadas sobre a quien arrendar tu inmueble.",
      },
      {
        question: "Cuanto cuesta publicar una propiedad?",
        answer:
          "Publicar una propiedad es gratuito en el plan basico. Ofrecemos planes premium con funcionalidades adicionales como destacar tu publicacion y acceso a reportes avanzados.",
      },
      {
        question: "Como selecciono al mejor candidato?",
        answer:
          "Revisa las aplicaciones recibidas, consulta el scoring de riesgo de cada candidato y utiliza las herramientas de comparacion de la plataforma para tomar la mejor decision.",
      },
    ],
  },
  {
    title: "Para arrendatarios",
    items: [
      {
        question: "Como aplico a una propiedad?",
        answer:
          "Busca propiedades disponibles, selecciona la que te interese y completa el formulario de aplicacion. El arrendador recibira tu solicitud junto con tu perfil de scoring.",
      },
      {
        question: "Que documentos necesito para aplicar?",
        answer:
          "Generalmente necesitas cedula de ciudadania, certificado laboral o de ingresos, referencias personales y extractos bancarios. Los requisitos especificos pueden variar segun el arrendador.",
      },
      {
        question: "Puedo agendar visitas a traves de la plataforma?",
        answer:
          "Si, puedes solicitar visitas directamente desde la publicacion del inmueble. El arrendador confirmara la fecha y hora disponible.",
      },
    ],
  },
  {
    title: "Pagos",
    items: [
      {
        question: "Como funcionan los pagos de arriendo en la plataforma?",
        answer:
          "La plataforma facilita el registro y seguimiento de pagos mensuales. Puedes configurar recordatorios y llevar un historial completo de transacciones.",
      },
      {
        question: "Que metodos de pago estan disponibles?",
        answer:
          "Aceptamos transferencias bancarias, PSE y pagos con tarjeta de credito o debito. Todos los pagos son procesados de forma segura.",
      },
      {
        question: "Que sucede si un pago se retrasa?",
        answer:
          "La plataforma envia notificaciones automaticas de recordatorio. Los retrasos se registran en el historial y pueden afectar el scoring del arrendatario conforme a lo establecido en el contrato.",
      },
    ],
  },
  {
    title: "Contratos",
    items: [
      {
        question: "Los contratos generados en la plataforma son legales?",
        answer:
          "Si, los contratos se generan conforme a la Ley 820 de 2003 y el Codigo Civil colombiano. La firma electronica esta amparada por la Ley 527 de 1999.",
      },
      {
        question: "Puedo personalizar el contrato de arrendamiento?",
        answer:
          "Si, la plataforma ofrece plantillas base que puedes ajustar segun las necesidades del arrendamiento, siempre dentro del marco legal colombiano.",
      },
      {
        question: "Como firmo el contrato digitalmente?",
        answer:
          "Una vez acordadas las condiciones, ambas partes reciben el contrato para revision. La firma se realiza electronicamente desde la plataforma con validez legal.",
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
        <ChevronDown
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
    <>
      <Navbar />
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="mx-auto max-w-[800px] px-6 md:px-12">
            <SectionLabel className="mb-4">Soporte</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Centro de ayuda
            </h1>
            <p className="text-[15px] text-muted-foreground mb-12">
              Encuentra respuestas a las preguntas mas frecuentes sobre
              Arriendo Facil.
            </p>

            <div className="space-y-10">
              {faqData.map((category) => (
                <div key={category.title}>
                  <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide mb-4">
                    {category.title}
                  </h2>
                  <div className="border border-border rounded-lg px-5">
                    {category.items.map((item) => (
                      <FAQItem key={item.question} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact section */}
            <div className="mt-16 p-8 border border-border rounded-lg bg-muted/30 text-center">
              <h2 className="text-[18px] font-medium text-foreground mb-2">
                No encontraste lo que buscabas?
              </h2>
              <p className="text-[14px] text-muted-foreground mb-4">
                Nuestro equipo de soporte esta disponible para ayudarte.
              </p>
              <a
                href="mailto:soporte@arriendofacil.com"
                className="inline-flex items-center px-5 py-2.5 bg-foreground text-background text-[14px] font-medium rounded-lg hover:bg-foreground/90 transition-colors"
              >
                Contactar soporte
              </a>
              <p className="text-[12px] text-muted-foreground mt-3">
                soporte@arriendofacil.com
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
