import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { LandingFooterV2 } from "@/components/landing-v2/LandingFooterV2";
import { AVALUO_WIZARD_URL } from "@/lib/avaluo/wizard-url";
import { PaginaDelAvaluo } from "./PaginaDelAvaluo";

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
//
// Diseño nuevo (24-10-2026, ronda 30): `PaginaDelAvaluo` —la llegada con la
// corriente de voltaje, «Antes de pagar», los pasos, el certificado en la
// medianoche y el cierre—, en español e inglés. Lo de arriba sigue mandando.
// ---------------------------------------------------------------------------

export default function AvaluoPage() {
  return (
    <LandingChrome activo="avaluo">
      <PaginaDelAvaluo solicitud={AVALUO_WIZARD_URL} />
      <LandingFooterV2 />
    </LandingChrome>
  );
}
