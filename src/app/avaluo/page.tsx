import {
  Buildings,
  CreditCard,
  FileText,
  Seal,
} from "@phosphor-icons/react/dist/ssr";
import { Eyebrow } from "@leasefy/cadence";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AVALUO_WIZARD_URL } from "@/lib/avaluo/wizard-url";

// ---------------------------------------------------------------------------
// Metadata for this specific page is inherited from avaluo/layout.tsx
// ---------------------------------------------------------------------------

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: FileText,
    title: "Solicitar",
    tagline: "EN MINUTOS, NO SEMANAS",
    body: "Ingresá los datos del inmueble, subí unas fotos y aceptá las autorizaciones de datos. Sin papeleo físico.",
  },
  {
    step: "02",
    icon: CreditCard,
    title: "Pagar",
    tagline: "PAGO SEGURO EN LÍNEA",
    body: "Una vez revisada tu solicitud, recibís el link de pago. Tarjeta, PSE o transferencia bancaria.",
  },
  {
    step: "03",
    icon: Seal,
    title: "Recibir certificado",
    tagline: "INFORME FIRMADO POR VALUADOR",
    body: "Descargá tu avalúo comercial certificado en PDF. Válido ante entidades financieras, notarías y juzgados.",
  },
] as const;

export default function AvaluoPage() {
  return (
    <main className="min-h-screen bg-bg">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center section-padding">
        {/* Overline label */}
        <Eyebrow className="justify-center mb-6">Leasefy valuaciones</Eyebrow>

        {/* Headline — highlighted word on ink (brand surface) */}
        <h1 className="text-display max-w-3xl mx-auto leading-tight">
          Avalúo comercial{" "}
          <span className="inline-block px-4 py-1 rounded-[14px] bg-ink text-ink-fg">
            certificado
          </span>
        </h1>

        {/* Description */}
        <p className="text-body-lg text-fg-muted max-w-xl mx-auto mt-6 leading-relaxed">
          Valoración profesional de tu inmueble para compraventa, arrendamiento,
          crédito hipotecario o procesos legales. Emitido por valuadores
          certificados. Entrega en&nbsp;48&nbsp;h.
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
          Sin compromiso · Pago solo si aprobás · 100% en línea
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

        {/* Secondary CTA at bottom */}
        <div className="mt-12 text-center">
          <Button asChild size="lg">
            <a href={AVALUO_WIZARD_URL} target="_blank" rel="noopener noreferrer">
              Solicitar avalúo
            </a>
          </Button>
          <p className="mt-4 text-xs text-fg-muted">
            También podés escribirnos a{" "}
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
            Avaluadores registrados en la{" "}
            <span className="font-medium text-fg">
              Lonja de Propiedad Raíz
            </span>
            . Informes aceptados por bancos, notarías y despachos judiciales en
            todo el territorio nacional.
          </p>
        </div>
      </section>
    </main>
  );
}
