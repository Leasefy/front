import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";

export default function TerminosPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="mx-auto max-w-[800px] px-6 md:px-12">
            <SectionLabel className="mb-4">Legal</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Terminos y condiciones
            </h1>
            <p className="text-[13px] text-muted-foreground mb-12">
              Ultima actualizacion: 1 de febrero de 2026
            </p>

            <div className="space-y-10 text-[15px] text-foreground/85 leading-relaxed">
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  1. Objeto
                </h2>
                <p>
                  Los presentes terminos y condiciones regulan el acceso y uso
                  de la plataforma Arriendo Facil, un marketplace digital que
                  facilita la conexion entre arrendadores y arrendatarios en
                  Colombia. El uso de la plataforma implica la aceptacion plena
                  de estos terminos.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  2. Definiciones
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85">Plataforma:</span>{" "}
                    el sitio web y aplicacion Arriendo Facil.
                  </li>
                  <li>
                    <span className="text-foreground/85">Arrendador:</span>{" "}
                    persona natural o juridica que ofrece un inmueble en
                    arrendamiento a traves de la plataforma.
                  </li>
                  <li>
                    <span className="text-foreground/85">Arrendatario:</span>{" "}
                    persona natural que busca un inmueble en arrendamiento.
                  </li>
                  <li>
                    <span className="text-foreground/85">Contrato de arrendamiento:</span>{" "}
                    acuerdo celebrado entre arrendador y arrendatario conforme a
                    la Ley 820 de 2003.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  3. Uso de la plataforma
                </h2>
                <p>
                  La plataforma actua como intermediaria tecnologica para
                  facilitar el encuentro entre arrendadores y arrendatarios.
                  Arriendo Facil no es parte del contrato de arrendamiento que
                  se celebre entre los usuarios. Los contratos generados a
                  traves de la plataforma se rigen por la Ley 820 de 2003 y
                  las disposiciones aplicables del Codigo Civil colombiano. La
                  firma electronica de documentos se ampara en la Ley 527 de
                  1999 sobre comercio electronico.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  4. Obligaciones del usuario
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Proporcionar informacion veraz, completa y actualizada al
                    registrarse y durante el uso de la plataforma.
                  </li>
                  <li>
                    No utilizar la plataforma para fines ilegales o contrarios
                    a estos terminos.
                  </li>
                  <li>
                    Mantener la confidencialidad de sus credenciales de acceso.
                  </li>
                  <li>
                    Cumplir con las obligaciones derivadas de los contratos de
                    arrendamiento celebrados.
                  </li>
                  <li>
                    No publicar informacion falsa o enganosa sobre inmuebles.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  5. Responsabilidad
                </h2>
                <p>
                  Arriendo Facil no garantiza la veracidad de la informacion
                  publicada por los usuarios ni se hace responsable de los
                  conflictos que puedan surgir entre arrendadores y
                  arrendatarios. La plataforma proporciona herramientas de
                  scoring y evaluacion como referencia, sin que estas
                  constituyan una garantia sobre el comportamiento de las
                  partes. Arriendo Facil no sera responsable por danos
                  indirectos, lucro cesante o perdidas derivadas del uso de la
                  plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  6. Propiedad intelectual
                </h2>
                <p>
                  Todos los contenidos de la plataforma, incluyendo pero no
                  limitado a textos, graficos, logotipos, iconos, software y
                  bases de datos, son propiedad de Arriendo Facil o de sus
                  licenciantes y estan protegidos por las leyes colombianas e
                  internacionales de propiedad intelectual. Queda prohibida su
                  reproduccion, distribucion o modificacion sin autorizacion
                  previa y escrita.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  7. Resolucion de conflictos
                </h2>
                <p>
                  Cualquier controversia derivada del uso de la plataforma se
                  resolvera preferiblemente de manera amigable. En caso de no
                  llegar a un acuerdo, las partes podran acudir a los
                  mecanismos alternativos de solucion de conflictos o a la
                  jurisdiccion ordinaria colombiana, con domicilio en Bogota
                  D.C. Las relaciones de arrendamiento se regiran por la Ley
                  820 de 2003 y el Codigo Civil colombiano.
                </p>
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
