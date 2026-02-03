import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";

export default function PrivacidadPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="mx-auto max-w-[800px] px-6 md:px-12">
            <SectionLabel className="mb-4">Legal</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Politica de privacidad
            </h1>
            <p className="text-[13px] text-muted-foreground mb-12">
              Ultima actualizacion: 1 de febrero de 2026
            </p>

            <div className="space-y-10 text-[15px] text-foreground/85 leading-relaxed">
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  1. Responsable del tratamiento
                </h2>
                <p>
                  Arriendo Facil S.A.S., sociedad constituida conforme a las
                  leyes de la Republica de Colombia, con domicilio en Bogota
                  D.C., es responsable del tratamiento de los datos personales
                  recopilados a traves de esta plataforma, en cumplimiento de la
                  Ley 1581 de 2012 (Proteccion de Datos Personales) y el Decreto
                  1377 de 2013.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  2. Datos que recopilamos
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85">Datos de identificacion:</span>{" "}
                    nombre completo, numero de cedula o documento de identidad,
                    direccion, telefono y correo electronico.
                  </li>
                  <li>
                    <span className="text-foreground/85">Datos financieros:</span>{" "}
                    informacion laboral, ingresos mensuales y referencias
                    bancarias necesarias para el proceso de arrendamiento.
                  </li>
                  <li>
                    <span className="text-foreground/85">Datos de uso:</span>{" "}
                    informacion sobre la interaccion con la plataforma,
                    direccion IP, tipo de navegador y paginas visitadas.
                  </li>
                  <li>
                    <span className="text-foreground/85">Datos sensibles:</span>{" "}
                    solo se recopilan con autorizacion previa y expresa del
                    titular, conforme al articulo 6 de la Ley 1581 de 2012.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  3. Finalidad del tratamiento
                </h2>
                <p className="mb-3">
                  Los datos personales seran utilizados para las siguientes
                  finalidades:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Gestionar el registro y la cuenta del usuario en la
                    plataforma.
                  </li>
                  <li>
                    Facilitar el proceso de busqueda, evaluacion y
                    formalizacion de contratos de arrendamiento.
                  </li>
                  <li>
                    Realizar el analisis de riesgo crediticio y scoring de
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
                  De conformidad con el articulo 8 de la Ley 1581 de 2012,
                  usted tiene derecho a:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Conocer, actualizar y rectificar sus datos personales.
                  </li>
                  <li>
                    Solicitar prueba de la autorizacion otorgada para el
                    tratamiento.
                  </li>
                  <li>
                    Ser informado sobre el uso que se ha dado a sus datos.
                  </li>
                  <li>
                    Revocar la autorizacion y/o solicitar la supresion de los
                    datos cuando considere que no se respetan los principios,
                    derechos y garantias constitucionales y legales.
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
                  comunicarse con nosotros a traves de:
                </p>
                <div className="mt-4 p-5 border border-border rounded-lg bg-muted/30">
                  <p className="text-foreground font-medium">
                    Arriendo Facil S.A.S.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Correo:{" "}
                    <a
                      href="mailto:privacidad@arriendofacil.com"
                      className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                    >
                      privacidad@arriendofacil.com
                    </a>
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Bogota D.C., Colombia
                  </p>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
