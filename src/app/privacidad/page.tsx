import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Conoce cómo Leasefy protege y maneja tus datos personales según la Ley 1581 de 2012 de Colombia.",
};

export default function PrivacidadPage() {
  return (
    <ForceLightMode>
      <Navbar />
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform"><div className="max-w-[800px]">
            <SectionLabel className="mb-4">Legal</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Política de privacidad
            </h1>
            <p className="text-[13px] text-muted-foreground mb-12">
              Última actualización: 1 de febrero de 2026
            </p>

            <div className="space-y-10 text-[15px] text-foreground/85 leading-relaxed">
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  1. Responsable del tratamiento
                </h2>
                <p>
                  Leasefy S.A.S., sociedad constituida conforme a las
                  leyes de la República de Colombia, con domicilio en Bogotá
                  D.C., es responsable del tratamiento de los datos personales
                  recopilados a través de esta plataforma, en cumplimiento de la
                  Ley 1581 de 2012 (Protección de Datos Personales) y el Decreto
                  1377 de 2013.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  2. Datos que recopilamos
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85">Datos de identificación:</span>{" "}
                    nombre completo, número de cédula o documento de identidad,
                    dirección, teléfono y correo electrónico.
                  </li>
                  <li>
                    <span className="text-foreground/85">Datos financieros:</span>{" "}
                    información laboral, ingresos mensuales y referencias
                    bancarias necesarias para el proceso de arrendamiento.
                  </li>
                  <li>
                    <span className="text-foreground/85">Datos de uso:</span>{" "}
                    información sobre la interacción con la plataforma,
                    dirección IP, tipo de navegador y páginas visitadas.
                  </li>
                  <li>
                    <span className="text-foreground/85">Datos sensibles:</span>{" "}
                    solo se recopilan con autorización previa y expresa del
                    titular, conforme al artículo 6 de la Ley 1581 de 2012.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  3. Finalidad del tratamiento
                </h2>
                <p className="mb-3">
                  Los datos personales serán utilizados para las siguientes
                  finalidades:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Gestionar el registro y la cuenta del usuario en la
                    plataforma.
                  </li>
                  <li>
                    Facilitar el proceso de búsqueda, evaluación y
                    formalización de contratos de arrendamiento.
                  </li>
                  <li>
                    Realizar el análisis de riesgo crediticio y scoring de
                    arrendatarios.
                  </li>
                  <li>
                    Enviar comunicaciones relacionadas con el servicio,
                    incluyendo notificaciones de pago y actualizaciones
                    contractuales.
                  </li>
                  <li>
                    Cumplir con obligaciones legales y requerimientos de
                    autoridades competentes.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  4. Derechos del titular
                </h2>
                <p className="mb-3">
                  De conformidad con el artículo 8 de la Ley 1581 de 2012,
                  usted tiene derecho a:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Conocer, actualizar y rectificar sus datos personales.
                  </li>
                  <li>
                    Solicitar prueba de la autorización otorgada para el
                    tratamiento.
                  </li>
                  <li>
                    Ser informado sobre el uso que se ha dado a sus datos.
                  </li>
                  <li>
                    Revocar la autorización y/o solicitar la supresión de los
                    datos cuando considere que no se respetan los principios,
                    derechos y garantías constitucionales y legales.
                  </li>
                  <li>
                    Presentar quejas ante la Superintendencia de Industria y
                    Comercio (SIC).
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  5. Contacto
                </h2>
                <p>
                  Para ejercer sus derechos o realizar consultas relacionadas
                  con el tratamiento de sus datos personales, puede
                  comunicarse con nosotros a través de:
                </p>
                <div className="mt-4 p-5 border border-border rounded-lg bg-muted/30">
                  <p className="text-foreground font-medium">
                    Leasefy S.A.S.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Correo:{" "}
                    <a
                      href="mailto:privacidad@leasefy.com"
                      className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                    >
                      privacidad@leasefy.com
                    </a>
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Bogotá D.C., Colombia
                  </p>
                </div>
              </section>
            </div>
          </div></div>
        </section>
      </main>
      <Footer />
    </ForceLightMode>
  );
}
