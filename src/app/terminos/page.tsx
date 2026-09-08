import type { Metadata } from "next";
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { LandingFooterV2 } from "@/components/landing-v2/LandingFooterV2";
import { TerminosContenido } from "@/components/legal/TerminosContenido";
import { SectionLabel } from "@/components/ui/section-label";

/**
 * Términos y Condiciones.
 *
 * ── Por qué se reescribieron enteros (2026-09-05) ──────────────────────────
 *
 * La versión anterior tenía 34 secciones y siete jurisdicciones —Colombia,
 * México, Brasil, Chile, Perú, Argentina y Estados Unidos— con declaraciones
 * de cumplimiento de la LFPDPPP, la LGPD, el CCPA, la FCRA y la Fair Housing
 * Act. El producto opera SÓLO en Colombia: no existe columna `country` en
 * ningún esquema, la moneda tiene guarda dura en COP y el catálogo de países
 * de teléfono tiene una sola entrada. Declarar cumplimiento ante seis
 * reguladores extranjeros no protege: crea seis obligaciones inexistentes.
 *
 * Tres cláusulas se cayeron por ineficaces, no por gusto (Ley 1480 art. 43):
 *
 *   · El tope de responsabilidad en USD $100 — num. 1, limitar la
 *     responsabilidad legal del proveedor.
 *   · El descargo «as is» / «según disponibilidad» — num. 2, renuncia a la
 *     garantía legal de los arts. 7 y 8.
 *   · La renovación automática sin salida — num. 14.
 *
 * El art. 42 es claro: las cláusulas abusivas «serán ineficaces de pleno
 * derecho». No hay que demandarlas para que no produzcan efecto, así que
 * tenerlas escritas sólo servía para parecer poco serios ante un cliente que
 * nos confía su recaudo.
 *
 * Y se retiró la promesa de un «código de verificación único que permite a
 * terceros confirmar la autenticidad del resultado»: la página que lo haría
 * lee `localStorage` con un comentario `// Mock:` al lado, así que un tercero
 * en otro navegador nunca puede verificar nada.
 *
 * ── El cambio estructural ──────────────────────────────────────────────────
 *
 * Ahora hay TRES relaciones distintas y el documento las separa (§3), porque
 * el régimen de cláusulas abusivas protege al consumidor y no al empresario:
 * la inmobiliaria contrata un servicio para su actividad económica; el
 * propietario y el inquilino pueden ser consumidores. Un texto único para los
 * tres deja las limitaciones sin efecto frente a los dos últimos.
 *
 * ── Lo que hay que mantener sincronizado ───────────────────────────────────
 *
 * · §8 (dinero en tránsito): el mandato es de administración ESPECÍFICA. La
 *   palabra «libre administración» activaría el supuesto 2 del Decreto 1981
 *   de 1988 (captación masiva). Cualquier cláusula que permita invertir,
 *   prestar o retener saldos a discreción rompe eso. Tampoco puede haber
 *   billetera ni saldo acumulable: eso convertiría a Leasefy en candidata a
 *   ser vigilada como SEDPE.
 * · §9 (agente automatizado): el catálogo es cerrado a propósito. Si el
 *   Piloto gana una acción nueva, entra acá o no se puede ejecutar.
 */

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Condiciones de uso de la plataforma Leasefy para inmobiliarias, propietarios e inquilinos en Colombia.",
};

export default function TerminosPage() {
  return (
    <LandingChrome>
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform"><div className="max-w-[800px]">
            <SectionLabel className="mb-4">Legal</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Términos y condiciones
            </h1>

            <TerminosContenido />
          </div></div>
        </section>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
