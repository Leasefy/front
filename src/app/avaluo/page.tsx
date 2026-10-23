import {
  CreditCard,
  FileText,
  Info,
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
    tagline: "Datos y fotos del inmueble",
    body: "Ingresa los datos del inmueble, sube unas fotos y acepta las autorizaciones de datos. Sin papeleo físico y sin visita al inmueble.",
  },
  {
    step: "02",
    icon: CreditCard,
    title: "Pagar",
    tagline: "Ves el valor antes de pagar",
    body: "Pagas en línea al enviar la solicitud, y la estimación se prepara cuando el pago queda confirmado. Si al final no se puede emitir el avalúo, te devolvemos el pago.",
  },
  {
    step: "03",
    icon: Seal,
    title: "Recibir certificado",
    tagline: "Revisado y firmado por una persona",
    body: "Un revisor revisa la estimación y firma el certificado. Te llega por correo el enlace al informe, con su PDF y un código para verificarlo.",
  },
] as const;

export default function AvaluoPage() {
  return (
    <LandingChrome activo="avaluo">
      <main className="min-h-screen bg-bg">
      {/* ── Hero: qué es, y UNA acción ───────────────────────────────────── */}
      {/* Revisora r25: sin `section-padding`, que a 390 le ganaba al pt-32 (py-16) y dejaba el sobretítulo
          pegado a la barra fija del sitio. El aire de arriba es el de las demás públicas (pt-32 · md:pt-40). */}
      <section className="flex flex-col items-center justify-center px-4 pt-32 md:pt-40 pb-12 text-center">
        <Eyebrow className="justify-center mb-6">Leasefy valuaciones</Eyebrow>

        {/* La palabra resaltada va en tinta: el único azul de la portada es «Solicitar avalúo». */}
        <h1 className="text-display max-w-3xl mx-auto leading-tight">
          Avalúo comercial{" "}
          <span className="inline-block rounded-md bg-fg px-4 py-1 text-bg">
            en línea
          </span>
        </h1>

        <p className="text-body-lg text-fg-muted max-w-xl mx-auto mt-6 leading-relaxed">
          {/* Revisora r27: a 390 eran 6 renglones. Más corta, sin perder que es una estimación de referencia. */}
          Una estimación de referencia del valor de tu inmueble, para vender o
          arrendar, sin que nadie vaya a verlo. Un revisor la firma antes de
          entregártela.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          {AVALUO_WIZARD_URL ? (
            <Button asChild size="lg">
              <a href={AVALUO_WIZARD_URL} target="_blank" rel="noopener noreferrer">
                Solicitar avalúo
              </a>
            </Button>
          ) : (
            // Revisora r25 (R8): sin la dirección de la solicitud el botón no
            // lleva a ningún lado; se apaga y dice por qué y qué hacer.
            <div className="flex flex-col items-center gap-2" data-testid="avaluo-en-pausa">
              <Button size="lg" disabled>
                Solicitar avalúo
              </Button>
              <p className="text-body-sm text-fg-muted">
                La solicitud está en pausa ·{" "}
                <a href="mailto:avaluos@leasefy.co" className="text-fg underline underline-offset-4">
                  escríbenos a avaluos@leasefy.co
                </a>
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 text-caption text-fg-muted">
          100 % en línea · Sin visita al inmueble · Si no se emite, te devolvemos el pago
        </p>
      </section>

      {/* ── Para qué sirve: ANTES de pagar, no al pie de la página ─────────── */}
      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-lg border border-border bg-surface px-5 py-4 text-left">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" aria-hidden="true" />
          <p className="text-body-sm text-fg-muted">
            Sirve como{" "}
            <span className="font-medium text-fg">referencia</span> para
            negociar una compraventa o fijar un canon de arriendo. No es un
            avalúo de un avaluador inscrito en el RAA: no sirve para crédito
            hipotecario, procesos judiciales ni trámites ante la DIAN.
          </p>
        </div>
      </section>

      {/* ── Cómo funciona: tres pasos, en orden ──────────────────────────── */}
      <section className="px-4 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <Eyebrow className="justify-center mb-2">El proceso</Eyebrow>
          <h2 className="text-h2">Cómo funciona</h2>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, tagline, body }) => (
            <li key={step}>
              <Card className="h-full space-y-4 rounded-lg p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption tabular-nums text-fg-subtle">{step}</span>
                  <Icon className="h-6 w-6 text-fg-subtle" weight="regular" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-[22px] font-[420] leading-tight tracking-[-0.02em] text-fg">
                    {title}
                  </h3>
                  <p className="text-caption text-fg-muted">{tagline}</p>
                </div>
                <p className="text-body-sm text-fg-muted">{body}</p>
              </Card>
            </li>
          ))}
        </ol>

        {/* Salida alterna — el CTA vive una sola vez, en el hero */}
        <p className="mt-12 text-center text-caption text-fg-muted">
          También puedes escribirnos a{" "}
          <a href="mailto:avaluos@leasefy.co" className="text-fg underline underline-offset-2">
            avaluos@leasefy.co
          </a>
        </p>
      </section>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
