import {
  Buildings,
  CreditCard,
  FileText,
  Seal,
} from "@phosphor-icons/react/dist/ssr";
import { Eyebrow } from "@leasefy/cadence";
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { LandingFooterV2 } from "@/components/landing-v2/LandingFooterV2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AVALUO_WIZARD_URL } from "@/lib/avaluo/wizard-url";

// ---------------------------------------------------------------------------
// Metadata for this specific page is inherited from avaluo/layout.tsx
//
// 🔴 Lo que dice esta página es lo que hace el servicio de avalúos (repo
// `avaluo`, develop), no más (PROMESAS-Y-DIRECTOR, 05-10-2026). Antes prometía
// «Pago solo si apruebas», «Entrega en 48 h», «valuadores certificados»,
// «Lonja de Propiedad Raíz» y validez ante bancos, notarías y juzgados:
//   · se paga AL ENVIAR la solicitud (`src/app/avaluo/payment-screen.tsx`,
//     «pay-first») y si el avalúo firmado no sale, el pago se devuelve
//     (`src/avaluo/payment/refund.ts`);
//   · el código no tiene ningún plazo de entrega: depende de la firma;
//   · es remoto y sin visita (sección `sin-visita` del certificado), lo revisa y
//     firma una persona SIN inscripción en el RAA (`legal/cert-sections.ts`);
//   · no sirve para crédito, procesos judiciales ni la DIAN (`usos-documento`).
// Prueba: `no-promete-lo-que-no-hace.test.tsx`.
// ---------------------------------------------------------------------------

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: FileText,
    title: "Solicitar",
    tagline: "DATOS Y FOTOS DEL INMUEBLE",
    body: "Ingresa los datos del inmueble, sube unas fotos y acepta las autorizaciones de datos. Sin papeleo físico y sin visita al inmueble.",
  },
  {
    step: "02",
    icon: CreditCard,
    title: "Pagar",
    tagline: "PAGO EN LÍNEA AL SOLICITAR",
    body: "Pagas en línea al enviar la solicitud, y la estimación se prepara cuando el pago queda confirmado. Si al final no se puede emitir el avalúo, te devolvemos el pago.",
  },
  {
    step: "03",
    icon: Seal,
    title: "Recibir certificado",
    tagline: "REVISADO Y FIRMADO POR UNA PERSONA",
    body: "Un revisor revisa la estimación y firma el certificado. Te llega por correo el enlace al informe, con su PDF y un código para verificarlo.",
  },
] as const;

export default function AvaluoPage() {
  return (
    <LandingChrome activo="avaluo">
      <main className="min-h-screen bg-bg">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-4 pt-32 md:pt-40 pb-16 text-center section-padding">
        {/* Overline label */}
        <Eyebrow className="justify-center mb-6">Leasefy valuaciones</Eyebrow>

        {/* Headline — highlighted word on ink (brand surface) */}
        <h1 className="text-display max-w-3xl mx-auto leading-tight">
          Avalúo comercial{" "}
          <span className="inline-block px-4 py-1 rounded-[14px] bg-primary text-primary-fg">
            en línea
          </span>
        </h1>

        {/* Description */}
        <p className="text-body-lg text-fg-muted max-w-xl mx-auto mt-6 leading-relaxed">
          Una estimación del valor de referencia de tu inmueble, para venta o
          arriendo, hecha de forma remota con los datos y las fotos que cargas y
          con datos del mercado. Nadie visita el inmueble: un revisor la revisa
          y la firma antes de entregártela.
        </p>

        {/* CTA — primary button, Satoshi sentence case (brand contract §4) */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Button asChild size="lg">
            <a href={AVALUO_WIZARD_URL} target="_blank" rel="noopener noreferrer">
              Solicitar avalúo
            </a>
          </Button>
        </div>

        {/* Trust micro-copy */}
        <p className="mt-5 text-xs text-fg-subtle font-mono tracking-wide uppercase">
          100% en línea · Sin visita al inmueble · Si no se emite, te devolvemos el pago
        </p>
      </section>

      {/* ── Cómo funciona — Step cards (DESIGN.md §10.4) ─────────────────── */}
      <section className="px-4 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <Eyebrow className="justify-center mb-2">El proceso</Eyebrow>
          <h2 className="text-h2">Cómo funciona</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, tagline, body }) => (
            <Card
              key={step}
              className="rounded-[20px] p-8 space-y-6"
            >
              {/* Number + icon row */}
              <div className="flex items-start justify-between">
                <span className="text-7xl font-light text-border font-mono tabular-nums leading-none">
                  {step}
                </span>
                <div className="w-12 h-12 rounded-[14px] bg-surface-muted flex items-center justify-center flex-shrink-0">
                  <Icon
                    className="w-6 h-6 text-fg-muted"
                    weight="duotone"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Step title */}
              <h3 className="text-2xl font-medium tracking-tight">
                {title}
              </h3>

              {/* Mono tagline */}
              <p className="text-xs font-mono uppercase tracking-wider text-fg-muted">
                {tagline}
              </p>

              {/* Body */}
              <p className="text-body-sm text-fg-muted">{body}</p>
            </Card>
          ))}
        </div>

        {/* Salida alterna — el CTA vive una sola vez, en el hero */}
        <div className="mt-12 text-center">
          <p className="text-xs text-fg-muted">
            También puedes escribirnos a{" "}
            <a
              href="mailto:avaluos@leasefy.co"
              className="underline underline-offset-2"
            >
              avaluos@leasefy.co
            </a>
          </p>
        </div>
      </section>

      {/* ── Buildings icon strip — visual anchor above footer ─────────────── */}
      <section className="bg-surface-muted border-t border-border py-10 px-4">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-[14px] bg-surface flex items-center justify-center">
            <Buildings
              className="w-7 h-7 text-fg-muted"
              weight="duotone"
              aria-hidden="true"
            />
          </div>
          <p className="text-body-sm text-fg-muted max-w-md">
            Sirve como{" "}
            <span className="font-medium text-fg">referencia</span> para
            negociar una compraventa o fijar un canon de arriendo. No es un
            avalúo de un avaluador inscrito en el RAA: no sirve para crédito
            hipotecario, procesos judiciales ni trámites ante la DIAN.
          </p>
        </div>
      </section>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
