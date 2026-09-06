import type { Metadata } from "next";
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";

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
 * · La lista de encargados de la §7 tiene que moverse con el código. Si se
 *   agrega un proveedor que recibe un dato personal, entra acá.
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
            <div className="mb-10 rounded-lg border border-border bg-surface-muted/40 p-5 text-[14px]">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
                <dt className="font-medium text-foreground">Responsable</dt>
                <dd className="text-muted-foreground">Leasefy S.A.S.</dd>
                <dt className="font-medium text-foreground">Domicilio</dt>
                <dd className="text-muted-foreground">Sabaneta, Antioquia, Colombia</dd>
                <dt className="font-medium text-foreground">Área responsable</dt>
                <dd className="text-muted-foreground">Protección de Datos Personales · privacidad@leasefy.co</dd>
                <dt className="font-medium text-foreground">Ámbito</dt>
                <dd className="text-muted-foreground">Colombia, únicamente</dd>
                <dt className="font-medium text-foreground">Vigente desde</dt>
                <dd className="text-muted-foreground">5 de septiembre de 2026</dd>
                <dt className="font-medium text-foreground">Vigencia de la base de datos</dt>
                <dd className="text-muted-foreground">Mientras dure la relación y los plazos legales de conservación (§9)</dd>
                <dt className="font-medium text-foreground">Versión</dt>
                <dd className="text-muted-foreground font-mono">v2.0</dd>
              </dl>
            </div>

            <div className="space-y-10 text-[15px] text-foreground/85 leading-relaxed">

              {/* ── 1 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  1. Qué cubre esta política, y dónde operamos
                </h2>
                <p className="mb-3">
                  Leasefy es una plataforma de administración de arriendos que usan
                  inmobiliarias en Colombia. Esta política explica qué datos
                  personales tratamos, para qué, con quién los compartimos y qué
                  podés hacer al respecto.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">Operamos únicamente en Colombia.</strong>{" "}
                  No prestamos el servicio en otros países. El tratamiento se rige
                  por la Ley 1581 de 2012 y el Decreto 1074 de 2015 (que compiló el Decreto
                  1377 de 2013), y —cuando hay
                  información financiera y crediticia— por la Ley 1266 de 2008 y la
                  Ley 2157 de 2021. La autoridad de control es la Superintendencia
                  de Industria y Comercio.
                </p>
                <p>
                  Aplica al sitio web, al panel de la inmobiliaria, a los portales
                  del propietario y del inquilino, y a las comunicaciones que
                  enviamos por correo, WhatsApp y llamada telefónica. No tenemos
                  aplicaciones móviles.
                </p>
              </section>

              {/* ── 2 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  2. Quién responde por tus datos: nosotros o tu inmobiliaria
                </h2>
                <p className="mb-3">
                  Esta distinción decide a quién reclamarle, así que la ponemos
                  primero.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">Leasefy es responsable</strong> de
                  los datos de las personas que contratan directamente con nosotros
                  —las inmobiliarias y quienes usan sus cuentas— y de los datos de
                  quienes navegan el sitio.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">Leasefy es encargado</strong> cuando
                  una inmobiliaria carga en la plataforma los datos de sus
                  propietarios, inquilinos, codeudores o deudores. En ese caso la
                  responsable es la inmobiliaria: ella decidió recolectarlos y para
                  qué, y es quien debe haber obtenido tu autorización. Nosotros los
                  tratamos por cuenta de ella, siguiendo sus instrucciones.
                </p>
                <p>
                  Aun así te explicamos acá cómo cuidamos esos datos, porque
                  escondernos detrás del rol de encargado no te serviría de nada. Si
                  no sabés cuál inmobiliaria administra tu contrato, escribinos y te
                  lo decimos.
                </p>
              </section>

              {/* ── 3 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  3. Qué datos tratamos, según quién seas
                </h2>
                <p className="mb-4">
                  No todos los que aparecen en la plataforma tienen la misma
                  relación con nosotros. Por eso va separado.
                </p>

                <h3 className="text-[15px] font-medium text-foreground mb-2">
                  3.1. Si te postulás a un arriendo
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-4">
                  <li>Identificación: nombre, tipo y número de documento, fecha de nacimiento, estado civil y número de personas a cargo.</li>
                  <li>Contacto: teléfono, correo y dirección actual.</li>
                  <li>Laborales y de ingresos: empleador, cargo, antigüedad, salario, otros ingresos y obligaciones mensuales.</li>
                  <li>Documentos que subís: cédula, desprendibles de pago, extractos bancarios, carta laboral. Guardamos el archivo y también el texto que extraemos de él.</li>
                  <li>Referencias que aportás: arrendadores anteriores, referencias laborales y personales.</li>
                  <li>Historial crediticio, cuando autorizás la consulta (ver §5).</li>
                </ul>

                <h3 className="text-[15px] font-medium text-foreground mb-2">
                  3.2. Si sos propietario
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-4">
                  <li>Identificación y contacto.</li>
                  <li>Datos bancarios para recibir los giros: banco, tipo y número de cuenta, y titular.</li>
                  <li>Perfil tributario, para calcular las retenciones.</li>
                  <li>Los inmuebles que administrás y su historial.</li>
                </ul>

                <h3 className="text-[15px] font-medium text-foreground mb-2">
                  3.3. Si tenés un pago en mora
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-4">
                  <li>Identificación, teléfonos y correo.</li>
                  <li>El detalle de la obligación: montos, fechas, días de atraso y acuerdos de pago.</li>
                  <li><strong className="text-foreground/85">La grabación y la transcripción de las llamadas</strong>, y el contenido de los mensajes de WhatsApp y correo (ver §4).</li>
                  <li>Un resumen de la gestión que produce nuestro sistema: si hubo intención de pago, si manifestaste una dificultad económica, y qué canal y horario funcionan mejor. Sirve para no volver a pedirte lo mismo y para respetar tus preferencias de contacto.</li>
                </ul>

                <h3 className="text-[15px] font-medium text-foreground mb-2">
                  3.4. Si sos codeudor, fiador o referencia
                </h3>
                <p className="mb-4 text-muted-foreground">
                  Puede que estemos tratando tus datos porque otra persona los
                  aportó al postularse, y que te contactemos por teléfono. Quien te
                  incluyó debía tener tu permiso. Si no lo diste, escribinos a{" "}
                  <span className="text-foreground/85 font-medium">privacidad@leasefy.co</span>{" "}
                  y los sacamos.
                </p>

                <h3 className="text-[15px] font-medium text-foreground mb-2">
                  3.5. Si sólo visitás el sitio
                </h3>
                <p className="text-muted-foreground">
                  Datos técnicos de la conexión y de tu navegador. Ver §10.
                </p>
              </section>

              {/* ── 4 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  4. Llamadas: se graban, y te lo decimos al empezar
                </h2>
                <p className="mb-3">
                  Cuando gestionamos un pago en mora podemos llamarte con un sistema
                  automatizado. Tres cosas, dichas sin rodeos:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-3">
                  <li>
                    <strong className="text-foreground/85">Te decimos que es un sistema automatizado.</strong>{" "}
                    La llamada empieza identificando a quien llama y aclarando que no
                    es una persona.
                  </li>
                  <li>
                    <strong className="text-foreground/85">Se graba la totalidad de la llamada, y te lo informamos al inicio.</strong>{" "}
                    Guardamos el audio y su transcripción como prueba de la gestión y
                    para verificar que cumplimos las reglas de cobranza.
                  </li>
                  <li>
                    <strong className="text-foreground/85">Podés pedir que no te llamemos más.</strong>{" "}
                    Decilo durante la llamada, o respondé el mensaje de WhatsApp
                    pidiendo la baja. Queda registrado y deja de usarse ese canal.
                  </li>
                </ul>
                <p>
                  Los horarios, la frecuencia y los canales que usamos están
                  limitados por la Ley 2300 de 2023, y el sistema los verifica antes
                  de cada intento: si el contacto no está permitido, no se hace.
                  También consultamos el Registro Nacional de Excluidos de la
                  Superintendencia de Industria y Comercio antes de llamar; si no
                  podemos consultarlo, no llamamos.
                </p>
              </section>

              {/* ── 5 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  5. Centrales de riesgo
                </h2>
                <p className="mb-3">
                  El estudio de una postulación puede incluir la consulta de tu
                  historial en <strong className="text-foreground/90">DataCrédito (Experian)</strong> y{" "}
                  <strong className="text-foreground/90">TransUnion</strong>. Esa consulta{" "}
                  <strong className="text-foreground/90">sólo ocurre si la autorizás</strong>,
                  con una autorización separada del resto del formulario, previa,
                  expresa e informada, como exige la Ley 1266 de 2008.
                </p>
                <p className="mb-3">
                  Guardamos constancia de esa autorización —la versión exacta del
                  texto que aceptaste, la fecha y la hora— y podés pedirnos una copia
                  cuando quieras. Podés revocarla; eso no borra las consultas ya
                  hechas, pero impide las siguientes.
                </p>
                <p>
                  Si por incumplimiento correspondiera reportar información negativa
                  a una central, la ley exige avisarte por escrito con al menos{" "}
                  <strong className="text-foreground/90">veinte (20) días</strong> de
                  anticipación, para que puedas controvertirla o ponerte al día. Ese
                  aviso se envía siempre.
                </p>
              </section>

              {/* ── 6 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  6. Decisiones automatizadas e inteligencia artificial
                </h2>
                <p className="mb-3">
                  Usamos sistemas automatizados, algunos con modelos de lenguaje, en
                  cuatro puntos: para leer los documentos que subís, para calcular un
                  puntaje de riesgo de una postulación, para redactar y priorizar las
                  gestiones de cobranza, y para sugerir inmuebles.
                </p>
                <p className="mb-3">
                  La regla que seguimos, y que la Corte Constitucional fijó en la
                  Sentencia T-323 de 2024, es la separación entre lo que un sistema
                  puede ejecutar solo y lo que decide una persona:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-3">
                  <li>
                    <strong className="text-foreground/85">Los sistemas ejecutan gestiones reversibles</strong>:
                    recordatorios, mensajes, agendar una llamada, proponer un acuerdo
                    dentro de los límites que la inmobiliaria configuró.
                  </li>
                  <li>
                    <strong className="text-foreground/85">Las decisiones con efecto jurídico o económico las toma una persona</strong>:
                    aceptar o rechazar una postulación, aprobar un giro, reportar a
                    una central, iniciar un proceso.
                  </li>
                  <li>
                    <strong className="text-foreground/85">El puntaje de riesgo es un insumo, no un veredicto.</strong>{" "}
                    Quien decide a quién arrendarle es el propietario o la
                    inmobiliaria, no Leasefy ni el modelo.
                  </li>
                </ul>
                <p className="mb-3">
                  <strong className="text-foreground/90">Tenés derecho a que una persona revise cualquier decisión automatizada que te afecte</strong>,
                  a que te expliquemos en términos comprensibles qué se tuvo en
                  cuenta, y a impugnar el resultado si se basó en información
                  equivocada. Para ejercerlo, escribí a{" "}
                  <span className="text-foreground/85 font-medium">privacidad@leasefy.co</span>{" "}
                  indicando de qué decisión se trata.
                </p>
                <p>
                  No usamos estos sistemas para discriminar por raza, sexo,
                  orientación sexual, religión, origen, discapacidad ni ninguna otra
                  categoría protegida.
                </p>
              </section>

              {/* ── 7 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  7. Con quién compartimos datos
                </h2>
                <p className="mb-4">
                  Estos son los proveedores que tratan datos personales por cuenta
                  nuestra. Los nombramos porque creemos que tenés derecho a saber por
                  dónde pasa tu información, no sólo a qué «categorías de terceros»
                  llega.
                </p>
                <div className="overflow-x-auto rounded-lg border border-border mb-3">
                  <table className="w-full min-w-[34rem] text-[13.5px]">
                    <thead>
                      <tr className="bg-surface-muted/60 text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Proveedor</th>
                        <th className="px-3 py-2 font-medium">Para qué</th>
                        <th className="px-3 py-2 font-medium">Qué recibe</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-t border-border"><td className="px-3 py-2">Supabase</td><td className="px-3 py-2">Base de datos, cuentas y archivos</td><td className="px-3 py-2">Todo lo que guardamos, incluidos los documentos</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Anthropic</td><td className="px-3 py-2">Modelos de lenguaje</td><td className="px-3 py-2">Texto de contratos, transcripción de llamadas, fotos de inspección</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Cohere</td><td className="px-3 py-2">Lectura de documentos</td><td className="px-3 py-2">El contenido de la cédula, desprendibles y extractos</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Vapi</td><td className="px-3 py-2">Llamadas de voz</td><td className="px-3 py-2">Teléfono y la grabación de la llamada</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Deepgram</td><td className="px-3 py-2">Transcripción de audio</td><td className="px-3 py-2">El audio de la conversación</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Kapso</td><td className="px-3 py-2">WhatsApp</td><td className="px-3 py-2">Teléfono, nombre, monto y dirección del inmueble</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Resend</td><td className="px-3 py-2">Correo</td><td className="px-3 py-2">Correo, nombre y el contenido del mensaje</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Wompi · Bold</td><td className="px-3 py-2">Pagos</td><td className="px-3 py-2">Correo, número de documento y monto</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">DataCrédito · TransUnion</td><td className="px-3 py-2">Historial crediticio</td><td className="px-3 py-2">Sólo con tu autorización (§5)</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Certicámara</td><td className="px-3 py-2">Firma electrónica</td><td className="px-3 py-2">Nombre, documento, correo y el documento a firmar</td></tr>
                      <tr className="border-t border-border"><td className="px-3 py-2">Sentry</td><td className="px-3 py-2">Diagnóstico de errores</td><td className="px-3 py-2">Datos técnicos del error</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="mb-3">
                  También compartimos datos con la inmobiliaria que administra tu
                  contrato y con el propietario del inmueble, en lo que corresponde a
                  esa relación; con las aseguradoras y afianzadoras, cuando pedís un
                  estudio de asegurabilidad; y con autoridades, cuando una norma o
                  una orden judicial lo exige.
                </p>
                <p>
                  <strong className="text-foreground/90">Transferencia internacional.</strong>{" "}
                  Varios de estos proveedores están fuera de Colombia, principalmente
                  en Estados Unidos, que figura en la lista de países con nivel
                  adecuado de protección de la Superintendencia de Industria y
                  Comercio. Con cada proveedor suscribimos un contrato de transmisión
                  que lo obliga a tratar los datos conforme a esta política y sólo
                  para la finalidad que autorizaste.
                </p>
              </section>

              {/* ── 8 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  8. Datos sensibles
                </h2>
                <p className="mb-3">
                  Hay datos que la ley protege de forma especial y que no estás
                  obligado a entregar. En la plataforma pueden aparecer tres:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li>Tu <strong className="text-foreground/85">voz</strong>, en la grabación de una llamada de cobranza.</li>
                  <li>Tu <strong className="text-foreground/85">firma manuscrita</strong>, cuando firmás en pantalla.</li>
                  <li>Los datos que aparecen impresos en tu <strong className="text-foreground/85">documento de identidad</strong> al escanearlo.</li>
                </ul>
                <p>
                  No los usamos para nada distinto de lo descrito en esta política, y
                  nunca para decidir sobre vos por tu pertenencia a un grupo.
                </p>
              </section>

              {/* ── 9 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  9. Cuánto tiempo los guardamos
                </h2>
                <p className="mb-3">
                  Mientras exista la relación —tu cuenta, tu postulación, tu
                  contrato— y después por el tiempo que las normas comerciales,
                  contables y tributarias nos obliguen a conservar los soportes, que
                  para los libros y papeles del comercio es de{" "}
                  <strong className="text-foreground/90">diez (10) años</strong>.
                </p>
                <p className="mb-3">
                  Ese plazo es de los soportes contables y no se usa para justificar
                  guardar todo lo demás. Los datos de un estudio que no prosperó se
                  eliminan a los noventa (90) días. Las grabaciones de llamadas se
                  conservan por el tiempo necesario para acreditar la gestión y
                  atender un reclamo, y luego se suprimen.
                </p>
                <p>
                  Cerrar tu cuenta desactiva el acceso de inmediato. No borra la
                  información que debemos conservar por obligación legal ni la que
                  quedó incorporada a un contrato firmado, porque un contrato no se
                  puede alterar después de firmado.
                </p>
              </section>

              {/* ── 10 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  10. Cookies y qué guarda tu navegador
                </h2>
                <p className="mb-3">
                  Usamos <strong className="text-foreground/90">una sola familia de cookies</strong>:
                  las que mantienen tu sesión abierta. Son necesarias para que
                  puedas usar la plataforma y no se pueden desactivar sin cerrar
                  sesión.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">No tenemos analítica de terceros, ni cookies de publicidad, ni píxeles de seguimiento.</strong>{" "}
                  Ni Google Analytics, ni Meta, ni ninguna otra. Por eso tampoco vas
                  a ver un banner de cookies: no hay nada que consentir.
                </p>
                <p>
                  Además, mientras completás un formulario largo guardamos el
                  borrador en tu propio navegador, para que no pierdas lo escrito.
                  Ese borrador no sale de tu equipo. Si usás un computador
                  compartido, cerrá sesión y borrá los datos del sitio al terminar.
                </p>
              </section>

              {/* ── 11 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  11. Tus derechos, y cómo ejercerlos
                </h2>
                <p className="mb-3">Podés, en cualquier momento:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li>Conocer qué datos tuyos tenemos y de dónde salieron.</li>
                  <li>Pedir que los actualicemos o corrijamos si están mal.</li>
                  <li>Pedir que los suprimamos, salvo los que debemos conservar por ley.</li>
                  <li>Revocar la autorización que diste.</li>
                  <li>Pedir que una persona revise una decisión automatizada (§6).</li>
                  <li>Pedir que dejemos de contactarte por un canal, o por todos.</li>
                  <li>Presentar una queja ante la Superintendencia de Industria y Comercio.</li>
                </ul>
                <p className="mb-3">
                  Consultar tus datos es{" "}
                  <strong className="text-foreground/90">gratuito</strong>, al menos una
                  vez por mes calendario y cada vez que cambiemos sustancialmente esta
                  política. Mientras un reclamo tuyo está en curso, tu registro queda
                  marcado como{" "}
                  <strong className="text-foreground/90">«reclamo en trámite»</strong>{" "}
                  con el motivo, dentro de los dos días hábiles siguientes y hasta que
                  se decida.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">Canal:</strong>{" "}
                  <span className="text-foreground/85 font-medium">privacidad@leasefy.co</span>.
                  Contanos qué querés y cómo verificar que sos vos.
                </p>
                <p>
                  <strong className="text-foreground/90">Plazos.</strong> Una consulta se
                  responde en <strong className="text-foreground/90">diez (10) días hábiles</strong>,
                  prorrogables por cinco más. Un reclamo, en{" "}
                  <strong className="text-foreground/90">quince (15) días hábiles</strong>,
                  prorrogables por ocho más. Si nos pasamos, avisamos por qué y
                  cuándo respondemos. Son los plazos de los artículos 14 y 15 de la
                  Ley 1581 de 2012.
                </p>
              </section>

              {/* ── 12 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  12. Menores de edad
                </h2>
                <p>
                  La plataforma es para mayores de 18 años. No creamos cuentas para
                  menores. Si un menor aparece como ocupante de una vivienda, sólo
                  tratamos lo indispensable para el contrato, con autorización de
                  quien ejerce la patria potestad y después de escuchar al menor.
                  Responder preguntas sobre datos de un menor es facultativo: no
                  estás obligado a hacerlo y ningún trámite se condiciona a ello. Si creés que tenemos datos de un
                  menor sin ese respaldo, escribinos y los eliminamos.
                </p>
              </section>

              {/* ── 13 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  13. Seguridad e incidentes
                </h2>
                <p className="mb-3">
                  Ciframos la información en tránsito, limitamos el acceso interno
                  por rol, exigimos segundo factor donde corresponde y dejamos
                  registro de quién consulta datos sensibles. Ningún sistema es
                  invulnerable, y no vamos a decirte lo contrario.
                </p>
                <p>
                  Si ocurre un incidente que afecte tus datos, lo reportamos a la
                  Superintendencia de Industria y Comercio en el plazo que exige la
                  Circular Externa 02 de 2015 y te avisamos cuando pueda afectarte.
                </p>
              </section>

              {/* ── 14 ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  14. Cambios
                </h2>
                <p>
                  Si cambiamos algo sustancial, lo publicamos acá con{" "}
                  <strong className="text-foreground/90">treinta (30) días</strong> de
                  anticipación y te avisamos por correo. La versión y la fecha de
                  vigencia están arriba, y conservamos las versiones anteriores para
                  que puedas saber qué decía la política cuando aceptaste.
                </p>
              </section>

            </div>
          </div></div>
        </section>
      </main>
      <Footer />
    </LandingChrome>
  );
}
