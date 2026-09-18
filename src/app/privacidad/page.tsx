import type { Metadata } from "next";
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { LandingFooterV2 } from "@/components/landing-v2/LandingFooterV2";
import { SectionLabel } from "@/components/ui/section-label";
import { IndiceLegal, TextoLegal } from "@/components/legal/TextoLegal";
import { POLITICA_V3 } from "@/lib/legal/politica-v3";
import { VERSION_POLITICA_DE_TRATAMIENTO } from "@/lib/legal/versiones";

/**
 * Política de Tratamiento de Datos Personales.
 *
 * ── Por qué se reescribió entera (2026-09-05) ──────────────────────────────
 *
 * La versión anterior describía un producto que no es este. No mencionaba ni
 * una vez las palabras «voz», «llamada», «grabación», «transcripción»,
 * «cobranza», «Datacrédito» ni la Sentencia T-323 de 2024 — o sea que todo el
 * agente de cobranza, que llama a deudores y los graba, era invisible. Y
 * afirmaba cosas falsas y verificables: apps móviles iOS/Android que no
 * existen, Google Analytics y un banner de cookies que nunca se instalaron,
 * tokenización de cuentas bancarias que en realidad son VARCHAR en claro, y
 * secciones de cumplimiento para México, Brasil, Chile, Perú, Argentina y
 * Estados Unidos, para un producto que sólo opera en Colombia (no existe
 * columna `country` en ningún esquema y el catálogo de países de teléfono
 * tiene una sola entrada).
 *
 * La regla que ordenó la reescritura es la misma del resto del panel: el
 * documento no afirma un hecho que no ocurre. Donde el producto todavía no
 * hace lo que debería, la política lo dice en vez de prometerlo.
 *
 * ── Lo que hay que mantener sincronizado ───────────────────────────────────
 *
 * · Los plazos (10 y 15 días hábiles) son los de la Ley 1581, arts. 14 y 15.
 *   No son los mexicanos de 20 + 15; copiarlos sería incumplir.
 * · La §7 lista FUNCIONES, no marcas. La versión nominada se sacó a
 *   propósito: nombrar los once proveedores no lo exige ninguna norma
 *   colombiana (el art. 2.2.2.25.3.1 del Decreto 1074 enumera el contenido
 *   mínimo y los encargados no están), publicaba el stack completo, y
 *   convertía cada cambio de proveedor en una afirmación falsa en un
 *   documento legal. La lista con nombres va en el Anexo de Encargo que
 *   firma la inmobiliaria, y se entrega a quien la pida por correo.
 *   Al 2026-09-05 es: Supabase (infraestructura) · Anthropic y Cohere
 *   (modelos) · Vapi (telefonía) · Deepgram (transcripción) · Kapso
 *   (WhatsApp) · Resend (correo) · Wompi y Bold (pagos) · Certicámara
 *   (firma) · Sentry (errores). Si entra o sale uno, actualizar acá y en
 *   el Anexo — pero la tabla publicada sólo cambia si cambia una FUNCIÓN
 *   o el país desde donde se procesa.
 * · Los correos son @leasefy.co. La versión anterior mandaba a
 *   privacidad@leasefy.com, un dominio que no es el canónico del producto.
 */

export const metadata: Metadata = {
  title: "Política de Tratamiento de Datos Personales",
  description:
    "Cómo Leasefy recolecta, usa, comparte y protege los datos personales, conforme a la Ley 1581 de 2012 y la Ley 1266 de 2008.",
};

export default function PrivacidadPage() {
  return (
    <LandingChrome>
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform"><div className="max-w-[800px]">
            <SectionLabel className="mb-4">Legal</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Política de tratamiento de datos personales
            </h1>

            {/* Ficha de cabecera: quién responde, desde cuándo y qué versión.
                La mayoría de las políticas del mercado colombiano no llevan
                fecha ni versión, y sin eso no se puede saber qué aceptó cada
                persona ni cuándo. */}
            <dl className="mb-10 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[14px]">
              <dt className="font-medium text-foreground">Responsable</dt>
              <dd className="text-muted-foreground">Leasefy S.A.S.</dd>
              <dt className="font-medium text-foreground">Domicilio</dt>
              <dd className="text-muted-foreground">Sabaneta, Antioquia, Colombia</dd>
              <dt className="font-medium text-foreground">Área responsable</dt>
              <dd className="text-muted-foreground">
                Protección de Datos Personales · privacidad@leasefy.co
              </dd>
              <dt className="font-medium text-foreground">Ámbito</dt>
              <dd className="text-muted-foreground">Colombia, únicamente</dd>
              <dt className="font-medium text-foreground">Versión</dt>
              <dd className="text-muted-foreground">{VERSION_POLITICA_DE_TRATAMIENTO}</dd>
              <dt className="font-medium text-foreground">Vigencia de la base de datos</dt>
              <dd className="text-muted-foreground">
                Mientras dure la relación y los plazos legales de conservación (§13)
              </dd>
            </dl>

            <IndiceLegal secciones={POLITICA_V3} />
            <TextoLegal secciones={POLITICA_V3} />
          </div></div>
        </section>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
