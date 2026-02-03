"use client";

import { motion } from "framer-motion";
import {
  UserCheck,
  CreditCard,
  Megaphone,
  FileSignature,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: UserCheck,
    title: "Evaluación de inquilinos",
    pricing: {
      highlight: "GRATIS",
      detail: "para propietarios",
      subtext: "Hasta $49.900 para solicitantes",
    },
    description:
      "Identifica inquilinos calificados con verificación de antecedentes, historial crediticio y referencias laborales. Nuestro scoring con IA te da decisiones en minutos.",
    visual: "screening",
    benefits: [
      "Verificación de identidad",
      "Historial crediticio",
      "Referencias laborales",
      "Score de riesgo con IA",
    ],
  },
  {
    icon: CreditCard,
    title: "Cobro de arriendos",
    pricing: {
      highlight: "$3.900",
      detail: "por transacción",
      subtext: "Transferencias PSE gratuitas para inquilinos",
    },
    description:
      "Automatiza el cobro mensual. Recibimos el pago del inquilino y te transferimos automáticamente. Historial de pagos, recordatorios y reportes incluidos.",
    visual: "payments",
    benefits: [
      "PSE, tarjeta y efectivo",
      "Transferencia automática",
      "Recordatorios de pago",
      "Historial completo",
    ],
  },
  {
    icon: Megaphone,
    title: "Publicación en portales",
    pricing: {
      highlight: "GRATIS",
      detail: "para propietarios",
      subtext: "Publica en FincaRaíz, Metrocuadrado y más",
    },
    description:
      "Crea tu anuncio una vez y lo publicamos en los principales portales de Colombia. Recibe candidatos directamente en tu panel sin pagar comisiones.",
    visual: "marketing",
    benefits: [
      "Un clic, todos los portales",
      "Fotos optimizadas",
      "Candidatos centralizados",
      "Sin comisiones ocultas",
    ],
  },
  {
    icon: FileSignature,
    title: "Contratos digitales",
    pricing: {
      highlight: "Incluido",
      detail: "en todos los planes",
      subtext: "Firma electrónica con validez legal (Ley 527/1999)",
    },
    description:
      "Genera contratos de arrendamiento conformes a la Ley 820 de 2003. Firma electrónica para ambas partes, almacenamiento seguro y descarga en PDF.",
    visual: "contracts",
    benefits: [
      "Plantillas legales",
      "Firma electrónica",
      "Almacenamiento seguro",
      "Descarga PDF",
    ],
  },
];

// Visual mockups for each feature
function ScreeningVisual() {
  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
          ML
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">María López</p>
          <p className="text-xs text-muted-foreground">Solicitante verificada</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Score de riesgo</span>
          <span className="text-lg font-bold text-emerald-600">92/100</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: "92%" }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.8 }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        {["Identidad ✓", "Crédito ✓", "Empleo ✓", "Referencias ✓"].map((item) => (
          <div
            key={item}
            className="text-[10px] text-emerald-700 bg-emerald-50 rounded px-2 py-1 text-center"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsVisual() {
  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Febrero 2026
        </span>
        <span className="text-xs text-emerald-600 font-medium">3 de 3 pagados</span>
      </div>
      <div className="space-y-2">
        {[
          { month: "Ene", status: "Pagado", amount: "$2.400.000" },
          { month: "Feb", status: "Pagado", amount: "$2.400.000" },
          { month: "Mar", status: "Pendiente", amount: "$2.400.000" },
        ].map((payment, i) => (
          <div
            key={payment.month}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">{payment.month}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  payment.status === "Pagado"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {payment.status}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">{payment.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketingVisual() {
  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-16 h-12 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">
          Foto
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Apto Chapinero</p>
          <p className="text-xs text-muted-foreground">2 hab · 65m² · $2.4M</p>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Publicado en:</div>
      <div className="flex flex-wrap gap-1.5">
        {["FincaRaíz", "Metrocuadrado", "Properati", "Ciencuadras"].map((portal) => (
          <span
            key={portal}
            className="text-[10px] bg-primary/10 text-primary rounded px-2 py-1"
          >
            {portal} ✓
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-xs text-muted-foreground">12 candidatos</span>
        <span className="text-xs text-emerald-600">3 pre-aprobados</span>
      </div>
    </div>
  );
}

function ContractsVisual() {
  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileSignature className="w-4 h-4" />
        <span>Contrato de Arrendamiento</span>
      </div>
      <div className="border border-border rounded p-3 space-y-2">
        <div className="h-2 bg-muted rounded w-3/4" />
        <div className="h-2 bg-muted rounded w-full" />
        <div className="h-2 bg-muted rounded w-5/6" />
        <div className="h-2 bg-muted rounded w-2/3" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xs text-foreground">Propietario firmó</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xs text-foreground">Inquilino firmó</span>
        </div>
      </div>
    </div>
  );
}

const visuals: Record<string, () => JSX.Element> = {
  screening: ScreeningVisual,
  payments: PaymentsVisual,
  marketing: MarketingVisual,
  contracts: ContractsVisual,
};

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-[1200px] px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
            Para propietarios
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
            Todo lo que necesitas para arrendar
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Herramientas profesionales sin costo oculto. Evaluación, cobros, marketing y contratos en un solo lugar.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const Visual = visuals[feature.visual];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-card border border-border rounded-sm p-6 md:p-8"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Content */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {feature.title}
                        </h3>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-lg font-bold text-primary">
                            {feature.pricing.highlight}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {feature.pricing.detail}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>

                    <p className="text-xs text-muted-foreground/70">
                      {feature.pricing.subtext}
                    </p>

                    {/* Benefits list */}
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {feature.benefits.map((benefit) => (
                        <li
                          key={benefit}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Visual mockup */}
                  <div className="lg:w-[220px] flex-shrink-0">
                    <Visual />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link href="/pricing">
            <Button size="lg" className="gap-2">
              Ver todos los planes
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
