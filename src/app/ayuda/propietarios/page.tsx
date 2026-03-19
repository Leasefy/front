"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";
import { CaretDown, House, Users, FileText, CreditCard, Shield, ChartBarHorizontal, CheckCircle, ArrowRight, Lightbulb, ChartBar } from '@phosphor-icons/react';

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
    icon: <House className="w-5 h-5" />,
    title: "Cómo empezar",
    description: "Primeros pasos para publicar tu propiedad en Leasefy",
    content: [
      {
        subtitle: "Registro como propietario",
        text: "Crear una cuenta en Leasefy es gratuito y toma menos de 2 minutos. Solo necesitas tu correo electrónico y una contraseña segura.",
        steps: [
          "Visita leasefy.com y haz clic en 'Registrarse'",
          "Selecciona 'Soy propietario' como tipo de cuenta",
          "Completa tu información básica",
          "Verifica tu correo electrónico",
          "¡Listo! Ya puedes publicar propiedades",
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
    icon: <FileText className="w-5 h-5" />,
    title: "Publicar tu propiedad",
    description: "Guía paso a paso para crear una publicación atractiva",
    content: [
      {
        subtitle: "El wizard de publicación",
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
    icon: <Users className="w-5 h-5" />,
    title: "Gestión de candidatos",
    description: "Cómo revisar y seleccionar al mejor inquilino",
    content: [
      {
        subtitle: "Recibir aplicaciones",
        text: "Cuando alguien aplica a tu propiedad, recibes una notificación con su perfil completo y score de riesgo.",
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
    icon: <ChartBar className="w-5 h-5" />,
    title: "Score de riesgo",
    description: "Entiende cómo evaluamos a los candidatos",
    content: [
      {
        subtitle: "¿Qué es el score de riesgo?",
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
        subtitle: "Interpretación del score",
        text: "Un score alto indica menor riesgo. Recomendamos considerar candidatos con score superior a 70, aunque otros factores también son importantes.",
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
    icon: <FileText className="w-5 h-5" />,
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
    icon: <CreditCard className="w-5 h-5" />,
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
    icon: <Shield className="w-5 h-5" />,
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
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 p-5 text-left bg-background hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-medium text-foreground">
            {section.title}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {section.description}
          </p>
        </div>
        <CaretDown
          className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-border bg-muted/30">
          <div className="space-y-6">
            {section.content.map((item, idx) => (
              <div key={idx}>
                {item.subtitle && (
                  <h4 className="text-[15px] font-medium text-foreground mb-2">
                    {item.subtitle}
                  </h4>
                )}
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  {item.text}
                </p>

                {item.steps && (
                  <ol className="mt-3 space-y-2">
                    {item.steps.map((step, stepIdx) => (
                      <li
                        key={stepIdx}
                        className="flex items-start gap-3 text-[14px]"
                      >
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium shrink-0 mt-0.5">
                          {stepIdx + 1}
                        </span>
                        <span className="text-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {item.tips && (
                  <ul className="mt-3 space-y-2">
                    {item.tips.map((tip, tipIdx) => (
                      <li
                        key={tipIdx}
                        className="flex items-start gap-2 text-[14px]"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PropietariosGuidePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform">
            <div className="max-w-[800px]">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[13px] text-muted-foreground mb-6">
                <Link href="/ayuda" className="hover:text-foreground transition-colors">
                  Centro de ayuda
                </Link>
                <span>/</span>
                <span className="text-foreground">Guía para propietarios</span>
              </nav>

              <SectionLabel className="mb-4">Guía completa</SectionLabel>
              <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
                Guía para propietarios
              </h1>
              <p className="text-[15px] text-muted-foreground mb-8">
                Todo lo que necesitas saber para arrendar tu propiedad de forma
                segura y eficiente con Leasefy.
              </p>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-3 mb-12">
                <Link
                  href="/publicar"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[14px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Publicar propiedad
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground text-[14px] font-medium rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Ver planes y precios
                </Link>
              </div>

              {/* Pro tip */}
              <div className="flex items-start gap-3 p-4 mb-10 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    Consejo profesional
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Los propietarios que completan su perfil al 100% y responden
                    en menos de 24 horas reciben 4 veces más aplicaciones de
                    candidatos calificados.
                  </p>
                </div>
              </div>

              {/* Guide sections */}
              <div className="space-y-4">
                {guideSections.map((section) => (
                  <GuideAccordion key={section.id} section={section} />
                ))}
              </div>

              {/* Contact section */}
              <div className="mt-16 p-8 border border-border rounded-xl bg-muted/30 text-center">
                <h2 className="text-[18px] font-medium text-foreground mb-2">
                  ¿Tienes más preguntas?
                </h2>
                <p className="text-[14px] text-muted-foreground mb-4">
                  Nuestro equipo de soporte está listo para ayudarte en cada
                  paso del proceso.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/ayuda"
                    className="inline-flex items-center px-5 py-2.5 border border-border text-foreground text-[14px] font-medium rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    Ver preguntas frecuentes
                  </Link>
                  <a
                    href="mailto:soporte@leasefy.com"
                    className="inline-flex items-center px-5 py-2.5 bg-foreground text-background text-[14px] font-medium rounded-lg hover:bg-foreground/90 transition-colors"
                  >
                    Contactar soporte
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
