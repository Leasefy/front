import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Evaluación de Inquilinos con IA",
  description:
    "Sistema de scoring inteligente para evaluar inquilinos. Analiza historial crediticio, referencias, capacidad de pago y más. Reduce el riesgo de impago hasta un 80%.",
  keywords: [
    "evaluación inquilinos",
    "scoring arrendatarios",
    "verificar inquilino Colombia",
    "historial crediticio inquilino",
    "riesgo inquilino",
    "verificación arrendatario",
  ],
  openGraph: {
    title: "Evaluación de Inquilinos con IA | Leasefy",
    description:
      "Sistema de scoring inteligente que analiza capacidad de pago, historial y referencias. Toma decisiones informadas en minutos.",
    type: "website",
  },
  alternates: {
    canonical: "/productos/evaluacion",
  },
};

export default function EvaluacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SoftwareProductJsonLd
        name="Scoring de Inquilinos Leasefy"
        description="Sistema de evaluación de riesgo con inteligencia artificial para verificar inquilinos en Colombia."
        url="/productos/evaluacion"
        category="BusinessApplication"
        rating={{ value: 4.8, count: 1250 }}
      />
      {children}
    </>
  );
}
