"use client";

import { useState } from "react";
import Link from "next/link";
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { LandingFooterV2 } from "@/components/landing-v2/LandingFooterV2";
import { SectionLabel } from "@/components/ui/section-label";
import { Button } from "@/components/ui/button";
import { CaretDown, House, Users, FileText, CreditCard, Shield, CheckCircle, EnvelopeSimple, Lightbulb, ChartBar } from '@phosphor-icons/react';
import { Collapse } from "@leasefy/cadence";

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  content: {
    subtitle?: string;
    text: string;
    tips?: string[];
    steps?: string[];
  }[];
}

const guideSections: GuideSection[] = [
  {
    id: "empezar",
    icon: <House className="h-5 w-5" />,
    title: "Cómo empezar",
    description: "Primeros pasos para publicar tu propiedad en Leasefy",
    content: [
      {
        subtitle: "Registro como propietario",
        text: "Crear una cuenta en Leasefy es gratuito y toma menos de 2 minutos. Solo necesitas tu correo electrónico y una contraseña segura.",
        steps: [
          "Visita leasefy.co y haz clic en 'Registrarse'",
          "Selecciona 'Soy propietario' como tipo de cuenta",
          "Completa tu información básica",
          "Verifica tu correo electrónico",
          "Listo: ya puedes publicar propiedades",
        ],
      },
      {
        subtitle: "Prepara tu propiedad",
        text: "Antes de publicar, asegúrate de tener lista la información y las fotos de tu inmueble.",
        tips: [
          "Toma fotos con buena iluminación natural",
          "Incluye fotos de todas las habitaciones, baños y áreas comunes",
          "Mide el área total de la propiedad",
          "Ten a la mano el valor del arriendo y la administración",
          "Prepara la dirección exacta y referencias del sector",
        ],
      },
    ],
  },
  {
    id: "publicar",
    icon: <FileText className="h-5 w-5" />,
    title: "Publicar tu propiedad",
    description: "Guía paso a paso para crear una publicación atractiva",
    content: [
      {
        subtitle: "El asistente de publicación",
        text: "Nuestro asistente te guía en 10 pasos simples para crear una publicación completa y profesional.",
        steps: [
          "Tipo de propiedad: Apartamento, casa, estudio, etc.",
          "Ubicación: Ciudad, barrio y dirección exacta",
          "Detalles: Área, habitaciones, baños, estrato",
          "Amenidades: Parqueadero, gimnasio, piscina, etc.",
          "Fotos: Mínimo 5, recomendamos 10-15",
          "Descripción: Texto atractivo sobre tu propiedad",
          "Precio: Arriendo mensual y administración",
          "Inquilino ideal: Requisitos y preferencias",
          "Plan: Selecciona el plan que se ajuste a tus necesidades",
          "Revisión: Verifica todos los datos antes de publicar",
        ],
      },
      {
        subtitle: "Consejos para destacar",
        text: "Una publicación bien elaborada recibe hasta 3 veces más aplicaciones.",
        tips: [
          "Usa un título descriptivo: 'Apartamento moderno con vista a la ciudad en Chapinero'",
          "Destaca los puntos fuertes: cerca al transmilenio, zona tranquila, etc.",
          "Sé honesto sobre las características del inmueble",
          "Responde rápido a las consultas de los interesados",
          "Mantén tus fotos actualizadas",
        ],
      },
    ],
  },
  {
    id: "candidatos",
    icon: <Users className="h-5 w-5" />,
    title: "Gestión de candidatos",
    description: "Cómo revisar y seleccionar al mejor inquilino",
    content: [
      {
        subtitle: "Recibir aplicaciones",
        text: "Cuando alguien aplica a tu propiedad, recibes una notificación con su perfil completo y su puntaje de riesgo.",
      },
      {
        subtitle: "Comparar candidatos",
        text: "Usa las herramientas de la plataforma para comparar candidatos lado a lado y tomar la mejor decisión.",
        tips: [
          "Revisa el historial de arrendamientos anteriores",
          "Verifica la estabilidad laboral e ingresos",
          "Considera las referencias personales",
          "Agenda visitas con los candidatos preseleccionados",
          "Comunícate directamente a través del chat de la plataforma",
        ],
      },
      {
        subtitle: "Agendar visitas",
        text: "Coordina visitas al inmueble directamente desde la plataforma. Puedes proponer horarios y recibir confirmaciones automáticas.",
      },
    ],
  },
  {
    id: "scoring",
    icon: <ChartBar className="h-5 w-5" />,
    title: "Puntaje de riesgo",
    description: "Entiende cómo evaluamos a los candidatos",
    content: [
      {
        subtitle: "¿Qué es el puntaje de riesgo?",
        text: "Es una puntuación del 0 al 100 que indica qué tan confiable es un candidato basándose en múltiples factores verificables.",
      },
      {
        subtitle: "Factores evaluados",
        text: "Nuestro algoritmo analiza diversos aspectos del perfil del candidato:",
        tips: [
          "Historial crediticio: Comportamiento financiero pasado",
          "Verificación de ingresos: Capacidad real de pago",
          "Historial de arrendamientos: Referencias de arrendadores anteriores",
          "Estabilidad laboral: Tipo de contrato y antigüedad",
          "Antecedentes: Verificación de antecedentes judiciales",
        ],
      },
      {
        subtitle: "Cómo leer el puntaje",
        text: "Un puntaje alto indica menor riesgo. Recomendamos considerar candidatos con puntaje superior a 70, aunque otros factores también son importantes.",
        tips: [
          "90-100: Excelente candidato, bajo riesgo",
          "70-89: Buen candidato, riesgo moderado",
          "50-69: Candidato aceptable, requiere análisis adicional",
          "Menor a 50: Alto riesgo, considerar con precaución",
        ],
      },
    ],
  },
  {
    id: "contratos",
    icon: <FileText className="h-5 w-5" />,
    title: "Contratos digitales",
    description: "Genera y firma contratos con validez legal",
    content: [
      {
        subtitle: "Contratos legales",
        text: "Todos los contratos generados en Leasefy cumplen con la Ley 820 de 2003 y tienen plena validez legal en Colombia.",
      },
      {
        subtitle: "Personalización",
        text: "Puedes personalizar las cláusulas del contrato según las necesidades específicas de tu arrendamiento.",
        tips: [
          "Define la duración del contrato (6, 12 o 24 meses)",
          "Especifica las condiciones de pago",
          "Incluye cláusulas sobre mascotas, subarrendamiento, etc.",
          "Añade inventario detallado del inmueble",
          "Establece las causales de terminación anticipada",
        ],
      },
      {
        subtitle: "Firma electrónica",
        text: "La firma electrónica está respaldada por la Ley 527 de 1999. Ambas partes firman digitalmente con verificación de identidad.",
        steps: [
          "Selecciona al candidato aprobado",
          "Genera el contrato con las condiciones acordadas",
          "Revisa y ajusta el contrato si es necesario",
          "Envía el contrato al inquilino para revisión",
          "Ambas partes firman electrónicamente",
          "Recibe el contrato firmado con certificado de autenticidad",
        ],
      },
    ],
  },
  {
    id: "pagos",
    icon: <CreditCard className="h-5 w-5" />,
    title: "Gestión de pagos",
    description: "Recibe y administra los pagos de arriendo",
    content: [
      {
        subtitle: "Recibir pagos",
        text: "La plataforma facilita el registro y seguimiento de pagos mensuales. Tu inquilino puede pagar por múltiples métodos.",
        tips: [
          "Transferencia bancaria",
          "PSE (Pagos Seguros en Línea)",
          "Tarjeta de crédito o débito",
          "Efectivo en puntos autorizados",
        ],
      },
      {
        subtitle: "Seguimiento y recordatorios",
        text: "Configura recordatorios automáticos para que tu inquilino nunca olvide la fecha de pago. Recibe notificaciones cuando se registre un pago.",
      },
      {
        subtitle: "Historial de pagos",
        text: "Mantén un registro completo de todos los pagos recibidos. Este historial es útil para declaraciones de renta y posibles disputas.",
        tips: [
          "Descarga reportes mensuales y anuales",
          "Genera certificados de pago para el inquilino",
          "Lleva control de pagos atrasados o parciales",
          "Accede al historial desde cualquier dispositivo",
        ],
      },
    ],
  },
  {
    id: "seguro",
    icon: <Shield className="h-5 w-5" />,
    title: "Seguro de arrendamiento",
    description: "Protege tu inversión con nuestro seguro",
    content: [
      {
        subtitle: "¿Qué cubre el seguro?",
        text: "El seguro de arrendamiento de Leasefy te protege contra impagos, daños al inmueble y gastos legales.",
        tips: [
          "Hasta 12 meses de arriendo impago",
          "Daños al inmueble hasta por $50 millones",
          "Gastos legales de desahucio",
          "Servicios públicos impagos",
        ],
      },
      {
        subtitle: "¿Cuánto cuesta?",
        text: "El costo del seguro es un porcentaje del arriendo mensual. El inquilino puede asumir este costo como alternativa al codeudor tradicional.",
      },
      {
        subtitle: "Cómo activarlo",
        text: "Puedes activar el seguro al momento de firmar el contrato o en cualquier momento durante el arrendamiento.",
        steps: [
          "Selecciona la opción de seguro en el contrato",
          "El inquilino acepta los términos y condiciones",
          "Se activa la cobertura desde el primer día",
          "En caso de siniestro, reporta a través de la plataforma",
        ],
      },
    ],
  },
];

function GuideAccordion({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(false);

  return (
    <div id={section.id} className="scroll-mt-28 overflow-hidden rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        aria-expanded={open}
      >
        {/* Ícono suelto, sin caja de color. */}
        <span className="shrink-0 text-fg-subtle" aria-hidden="true">
          {section.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-medium text-fg">{section.title}</h3>
          <p className="mt-0.5 text-caption text-fg-muted">{section.description}</p>
        </div>
        <CaretDown
          className={`h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <Collapse open={open}>
        <div className="border-t border-border-faint px-5 pb-5 pt-4">
          <div className="space-y-6">
            {section.content.map((item, idx) => (
              <div key={idx}>
                {item.subtitle && (
                  <h4 className="mb-1.5 text-[15px] font-medium text-fg">{item.subtitle}</h4>
                )}
                <p className="text-body-sm leading-relaxed text-fg-muted">{item.text}</p>

                {item.steps && (
                  <ol className="mt-3 space-y-2">
                    {item.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="flex items-start gap-3 text-body-sm">
                        <span
                          className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-border px-1 font-mono text-caption leading-none tabular-nums text-fg-muted"
                          aria-hidden="true"
                        >
                          {stepIdx + 1}
                        </span>
                        <span className="text-fg">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {item.tips && (
                  <ul className="mt-3 space-y-2">
                    {item.tips.map((tip, tipIdx) => (
                      <li key={tipIdx} className="flex items-start gap-2 text-body-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        <span className="text-fg">{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </Collapse>
    </div>
  );
}

export default function PropietariosGuidePage() {
  return (
    <LandingChrome>
      <main id="main-content" className="bg-bg">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform">
            <div className="max-w-[800px]">
              {/* Breadcrumb */}
              <nav aria-label="Ruta" className="mb-6 flex items-center gap-2 text-caption text-fg-muted">
                <Link href="/ayuda" className="transition-colors hover:text-fg">
                  Centro de ayuda
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-fg">Guía para propietarios</span>
              </nav>

              <SectionLabel className="mb-4">Guía completa</SectionLabel>
              <h1 className="font-heading text-[32px] font-[420] leading-[1.08] tracking-[-0.03em] text-fg md:text-[44px] mb-4">
                Guía para propietarios
              </h1>
              <p className="mb-8 text-[15px] text-fg-muted">
                Todo lo que necesitas saber para arrendar tu propiedad de forma
                segura y eficiente con Leasefy.
              </p>

              {/* Quick actions */}
              <div className="mb-10 flex flex-wrap gap-3">
                <Button asChild hideArrow>
                  <Link href="/publicar">Publicar propiedad</Link>
                </Button>
                <Button variant="outline" asChild hideArrow>
                  <Link href="/pricing">Ver planes y precios</Link>
                </Button>
              </div>

              {/* Los temas a la vista: se salta directo al que interesa. */}
              <nav aria-label="Temas de la guía" className="mb-8 flex flex-wrap gap-2">
                {guideSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="rounded-full border border-border px-3.5 py-1.5 text-body-sm text-fg transition-colors hover:bg-surface-muted"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              {/* Pro tip: un consejo, no una advertencia (sin el amarillo de alerta). */}
              <div className="mb-10 flex items-start gap-3 rounded-lg bg-surface-muted p-4">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" aria-hidden="true" />
                <div>
                  <p className="text-body-sm font-medium text-fg">
                    Consejo profesional
                  </p>
                  <p className="mt-1 text-body-sm text-fg-muted">
                    Los propietarios que completan su perfil al 100% y responden
                    en menos de 24 horas reciben 4 veces más aplicaciones de
                    candidatos calificados.
                  </p>
                </div>
              </div>

              {/* Guide sections */}
              <div className="space-y-3">
                {guideSections.map((section) => (
                  <GuideAccordion key={section.id} section={section} />
                ))}
              </div>

              {/* Contact section */}
              <div className="mt-16 rounded-lg border border-border bg-surface-muted p-6 text-center sm:p-8">
                <h2 className="mb-2 text-h3 text-fg">
                  ¿Tienes más preguntas?
                </h2>
                <p className="mb-5 text-body-sm text-fg-muted">
                  Nuestro equipo de soporte está listo para ayudarte en cada
                  paso del proceso.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" asChild hideArrow>
                    <Link href="/ayuda">Ver preguntas frecuentes</Link>
                  </Button>
                  <Button variant="secondary" asChild hideArrow>
                    <a href="mailto:hola@leasefy.co">
                      <EnvelopeSimple className="h-4 w-4" aria-hidden="true" />
                      Contactar soporte
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
