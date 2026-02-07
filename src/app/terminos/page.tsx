import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Lee los términos y condiciones de uso de la plataforma Leasefy para arriendos en Colombia.",
};

export default function TerminosPage() {
  return (
    <ForceLightMode>
      <Navbar />
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform"><div className="max-w-[800px]">
            <SectionLabel className="mb-4">Legal</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Términos y condiciones
            </h1>
            <p className="text-[13px] text-muted-foreground mb-12">
              Última actualización: 1 de febrero de 2026
            </p>

            <div className="space-y-10 text-[15px] text-foreground/85 leading-relaxed">
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  1. Objeto
                </h2>
                <p>
                  Los presentes términos y condiciones regulan el acceso y uso
                  de la plataforma Leasefy, un marketplace digital que
                  facilita la conexión entre arrendadores y arrendatarios en
                  Colombia. El uso de la plataforma implica la aceptación plena
                  de estos términos.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  2. Definiciones
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85">Plataforma:</span>{" "}
                    el sitio web y aplicación Leasefy.
                  </li>
                  <li>
                    <span className="text-foreground/85">Arrendador:</span>{" "}
                    persona natural o jurídica que ofrece un inmueble en
                    arrendamiento a través de la plataforma.
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
                  La plataforma actúa como intermediaria tecnológica para
                  facilitar el encuentro entre arrendadores y arrendatarios.
                  Leasefy no es parte del contrato de arrendamiento que
                  se celebre entre los usuarios. Los contratos generados a
                  través de la plataforma se rigen por la Ley 820 de 2003 y
                  las disposiciones aplicables del Código Civil colombiano. La
                  firma electrónica de documentos se ampara en la Ley 527 de
                  1999 sobre comercio electrónico.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  4. Obligaciones del usuario
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Proporcionar información veraz, completa y actualizada al
                    registrarse y durante el uso de la plataforma.
                  </li>
                  <li>
                    No utilizar la plataforma para fines ilegales o contrarios
                    a estos términos.
                  </li>
                  <li>
                    Mantener la confidencialidad de sus credenciales de acceso.
                  </li>
                  <li>
                    Cumplir con las obligaciones derivadas de los contratos de
                    arrendamiento celebrados.
                  </li>
                  <li>
                    No publicar información falsa o engañosa sobre inmuebles.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  5. Responsabilidad
                </h2>
                <p>
                  Leasefy no garantiza la veracidad de la información
                  publicada por los usuarios ni se hace responsable de los
                  conflictos que puedan surgir entre arrendadores y
                  arrendatarios. La plataforma proporciona herramientas de
                  scoring y evaluación como referencia, sin que estas
                  constituyan una garantía sobre el comportamiento de las
                  partes. Leasefy no será responsable por daños
                  indirectos, lucro cesante o pérdidas derivadas del uso de la
                  plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  6. Propiedad intelectual
                </h2>
                <p>
                  Todos los contenidos de la plataforma, incluyendo pero no
                  limitado a textos, gráficos, logotipos, iconos, software y
                  bases de datos, son propiedad de Leasefy o de sus
                  licenciantes y están protegidos por las leyes colombianas e
                  internacionales de propiedad intelectual. Queda prohibida su
                  reproducción, distribución o modificación sin autorización
                  previa y escrita.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  7. Resolución de conflictos
                </h2>
                <p>
                  Cualquier controversia derivada del uso de la plataforma se
                  resolverá preferiblemente de manera amigable. En caso de no
                  llegar a un acuerdo, las partes podrán acudir a los
                  mecanismos alternativos de solución de conflictos o a la
                  jurisdicción ordinaria colombiana, con domicilio en Bogotá
                  D.C. Las relaciones de arrendamiento se regirán por la Ley
                  820 de 2003 y el Código Civil colombiano.
                </p>
              </section>
            </div>
          </div></div>
        </section>
      </main>
      <Footer />
    </ForceLightMode>
  );
}
