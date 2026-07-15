import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";
export const metadata: Metadata = {
  title: "Términos y Condiciones | Leasefy",
  description:
    "Términos y condiciones de uso de Leasefy. Plataforma tecnológica para la gestión integral de arrendamientos.",
};

export default function TerminosPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform"><div className="max-w-[800px]">
            <SectionLabel className="mb-4">Legal</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Términos y condiciones
            </h1>
            <p className="text-[13px] text-muted-foreground mb-12">
              Última actualización: 11 de marzo de 2026
            </p>

            <div className="space-y-10 text-[15px] text-foreground/85 leading-relaxed">

              {/* ── 1. OBJETO Y ALCANCE ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  1. Objeto y alcance
                </h2>
                <p className="mb-3">
                  Los presentes Términos y Condiciones de Uso (en adelante, los
                  &quot;Términos&quot;) regulan el acceso, registro y uso de la plataforma
                  tecnológica Leasefy (en adelante, la &quot;Plataforma&quot;), operada por
                  Leasefy S.A.S. (en adelante, &quot;Leasefy&quot;, &quot;nosotros&quot; o la
                  &quot;Empresa&quot;), sociedad constituida conforme a las leyes de la
                  República de Colombia con domicilio principal en Bogotá D.C.
                </p>
                <p className="mb-3">
                  Estos Términos constituyen un acuerdo legal vinculante entre usted
                  (el &quot;Usuario&quot;) y Leasefy. Al acceder, registrarse o utilizar la
                  Plataforma por cualquier medio, usted declara haber leído,
                  comprendido y aceptado la totalidad de estos Términos, así como
                  nuestra Política de Privacidad. Si no está de acuerdo con alguna
                  disposición, debe abstenerse de utilizar la Plataforma.
                </p>
                <p>
                  La Plataforma opera en múltiples jurisdicciones. Cuando
                  disposiciones específicas de una jurisdicción apliquen a su uso,
                  se indicarán en la Sección 27 (Disposiciones por Jurisdicción) de
                  estos Términos. En caso de conflicto entre las disposiciones
                  generales y las específicas por jurisdicción, prevalecerán estas
                  últimas.
                </p>
              </section>

              {/* ── 2. DEFINICIONES ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  2. Definiciones
                </h2>
                <p className="mb-3">
                  Los siguientes términos tendrán el significado que se les atribuye
                  a continuación, independientemente de que se utilicen en singular o
                  plural:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Plataforma:</span>{" "}
                    el sitio web, aplicaciones móviles, APIs y cualquier otro medio
                    digital mediante el cual Leasefy presta sus servicios.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Usuario:</span>{" "}
                    toda persona natural o jurídica que acceda, se registre o utilice
                    la Plataforma en cualquiera de sus roles.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Arrendador / Propietario:</span>{" "}
                    persona natural o jurídica que ofrece uno o más inmuebles en
                    arrendamiento a través de la Plataforma.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Arrendatario / Inquilino:</span>{" "}
                    persona natural que busca, aplica o arrienda un inmueble a través
                    de la Plataforma.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Agente Inmobiliario:</span>{" "}
                    persona natural o jurídica que actúa como intermediario
                    inmobiliario, corredor o administrador de propiedades y utiliza
                    la Plataforma para gestionar portafolios de arrendamiento en
                    representación de terceros.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Inmobiliaria / Agencia:</span>{" "}
                    persona jurídica dedicada a la intermediación inmobiliaria que
                    utiliza la Plataforma para administrar múltiples propiedades y
                    agentes.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Contrato de Arrendamiento:</span>{" "}
                    acuerdo celebrado entre el Arrendador y el Arrendatario para el
                    uso y goce de un inmueble a cambio de un canon, conforme a la
                    legislación aplicable en cada jurisdicción.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Evaluación de Inquilino / Scoring:</span>{" "}
                    análisis de perfil del potencial arrendatario que genera una
                    puntuación de riesgo indicativa, basada en información
                    proporcionada voluntariamente y fuentes permitidas por la ley.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Servicios:</span>{" "}
                    el conjunto de funcionalidades ofrecidas a través de la
                    Plataforma, incluyendo el marketplace de propiedades, gestión de
                    arrendamientos, procesamiento de pagos, firma electrónica,
                    evaluación de inquilinos y demás herramientas descritas en la
                    Sección 6.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Contenido del Usuario:</span>{" "}
                    toda información, texto, fotografía, documento o material que un
                    Usuario publique, cargue o comparta a través de la Plataforma.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Plan de Suscripción:</span>{" "}
                    el paquete de servicios contratado por el Usuario, cuyas
                    características, precios y condiciones específicas se detallan
                    en la página de precios de la Plataforma.
                  </li>
                </ul>
              </section>

              {/* ── 3. ELEGIBILIDAD ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  3. Elegibilidad
                </h2>
                <p className="mb-3">
                  Para registrarse y utilizar la Plataforma, usted declara y
                  garantiza que:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Es mayor de edad según la legislación aplicable en su
                    jurisdicción (18 años en Colombia, México, Chile, Perú y
                    Argentina; 18 años en Brasil; 18 años en Estados Unidos, salvo
                    excepciones estatales).
                  </li>
                  <li>
                    Si actúa en representación de una persona jurídica, cuenta con
                    la capacidad legal y autorización necesaria para vincular a dicha
                    entidad a estos Términos.
                  </li>
                  <li>
                    No ha sido previamente suspendido o inhabilitado para usar la
                    Plataforma.
                  </li>
                  <li>
                    Cumple con todas las leyes y regulaciones aplicables en su
                    jurisdicción para celebrar contratos de arrendamiento, actuar
                    como intermediario inmobiliario o utilizar servicios financieros
                    digitales.
                  </li>
                  <li>
                    No se encuentra en ninguna lista de sanciones internacionales
                    (OFAC, ONU, Unión Europea) ni es una Persona Políticamente
                    Expuesta (PEP) sin haberlo declarado previamente.
                  </li>
                </ul>
              </section>

              {/* ── 4. REGISTRO Y CUENTAS DE USUARIO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  4. Registro y cuentas de usuario
                </h2>
                <p className="mb-3">
                  Para acceder a las funcionalidades de la Plataforma, usted deberá
                  crear una cuenta proporcionando información veraz, completa y
                  actualizada. Usted se compromete a:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Mantener la exactitud y vigencia de su información personal en
                    todo momento.
                  </li>
                  <li>
                    Mantener la confidencialidad de sus credenciales de acceso
                    (contraseña, tokens de autenticación, factores de autenticación
                    multifactor).
                  </li>
                  <li>
                    No compartir su cuenta ni permitir el acceso de terceros no
                    autorizados.
                  </li>
                  <li>
                    Notificar inmediatamente a Leasefy sobre cualquier uso no
                    autorizado de su cuenta o cualquier brecha de seguridad.
                  </li>
                </ul>
                <p className="mt-3">
                  Leasefy se reserva el derecho de verificar la identidad de los
                  Usuarios mediante documentos de identidad, verificación biométrica
                  u otros mecanismos permitidos por la ley. Usted es responsable de
                  toda la actividad que ocurra bajo su cuenta, incluidas las acciones
                  de terceros que accedan con sus credenciales.
                </p>
              </section>

              {/* ── 5. NATURALEZA DEL SERVICIO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  5. Naturaleza del servicio
                </h2>
                <p className="mb-3">
                  Leasefy opera como una plataforma tecnológica de intermediación
                  digital que facilita la conexión entre Arrendadores, Arrendatarios
                  y Agentes Inmobiliarios. Se precisa expresamente que:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Leasefy <span className="text-foreground/85 font-medium">no es parte</span>{" "}
                    de los contratos de arrendamiento que se celebren entre los
                    Usuarios.
                  </li>
                  <li>
                    Leasefy <span className="text-foreground/85 font-medium">no es un corredor inmobiliario</span>,
                    agente de bienes raíces, ni presta servicios de asesoría
                    inmobiliaria, jurídica o financiera.
                  </li>
                  <li>
                    Leasefy <span className="text-foreground/85 font-medium">no garantiza</span>{" "}
                    la disponibilidad, calidad, estado o legalidad de los inmuebles
                    publicados, ni la veracidad o exactitud de la información
                    proporcionada por los Usuarios.
                  </li>
                  <li>
                    Leasefy <span className="text-foreground/85 font-medium">no actúa como entidad financiera</span>,
                    compañía de seguros ni garante de las obligaciones contractuales
                    entre las partes.
                  </li>
                  <li>
                    Leasefy facilita herramientas tecnológicas para la gestión, pero
                    la responsabilidad sobre las decisiones de arrendamiento recae
                    exclusivamente en las partes involucradas.
                  </li>
                </ul>
              </section>

              {/* ── 6. SERVICIOS OFRECIDOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  6. Servicios ofrecidos
                </h2>
                <p className="mb-3">
                  A través de la Plataforma, Leasefy ofrece las siguientes
                  funcionalidades, cuya disponibilidad puede variar según el Plan
                  de Suscripción y la jurisdicción del Usuario:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Marketplace de propiedades:</span>{" "}
                    publicación, búsqueda y visualización de inmuebles disponibles
                    para arrendamiento.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Gestión de arrendamientos:</span>{" "}
                    herramientas para la administración del ciclo de vida del
                    contrato de arrendamiento, incluyendo renovaciones, ajustes de
                    canon y terminaciones.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Evaluación de inquilinos (Scoring):</span>{" "}
                    análisis de perfil con generación de puntuación de riesgo
                    indicativa. Ver Sección 11 para detalles y limitaciones.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Procesamiento de pagos y dispersiones:</span>{" "}
                    facilitación del cobro de cánones de arrendamiento y dispersión
                    de fondos a propietarios. Ver Sección 10 para detalles.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Firma electrónica:</span>{" "}
                    generación y firma electrónica de contratos y documentos
                    relacionados. Ver Sección 12.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Panel de gestión para inmobiliarias:</span>{" "}
                    herramientas de administración de portafolios, agentes,
                    reportes financieros y operativos.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Notificaciones y comunicaciones:</span>{" "}
                    alertas sobre vencimientos, pagos, mantenimiento y otros eventos
                    relevantes del arrendamiento.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Documentos y reportes:</span>{" "}
                    generación de extractos de pago, reportes financieros,
                    certificados de arrendamiento y documentos complementarios.
                  </li>
                </ul>
              </section>

              {/* ── 7. PLANES Y SUSCRIPCIONES ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  7. Planes y suscripciones
                </h2>
                <p className="mb-3">
                  La Plataforma ofrece diferentes Planes de Suscripción con
                  funcionalidades, límites y precios específicos. Al contratar un
                  plan, usted acepta:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Los precios, características y limitaciones vigentes al momento
                    de la contratación, tal como se describen en la página de
                    precios de la Plataforma.
                  </li>
                  <li>
                    Los planes pueden ser de facturación mensual o anual, según la
                    modalidad seleccionada.
                  </li>
                  <li>
                    Leasefy podrá modificar los precios y características de los
                    planes con un aviso previo de al menos treinta (30) días
                    calendario. Las modificaciones aplicarán al siguiente período de
                    facturación.
                  </li>
                  <li>
                    La falta de pago oportuno podrá resultar en la suspensión o
                    degradación del plan, sin perjuicio del cobro de los valores
                    adeudados.
                  </li>
                  <li>
                    Algunas funcionalidades pueden estar disponibles como
                    complementos (add-ons) contratables individualmente.
                  </li>
                </ul>
              </section>

              {/* ── 8. PAGOS Y FACTURACIÓN ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  8. Pagos y facturación
                </h2>
                <p className="mb-3">
                  Al realizar pagos a través de la Plataforma, usted acepta las
                  siguientes condiciones:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Los pagos se procesan a través de pasarelas de pago autorizadas
                    y reguladas. Leasefy no almacena directamente información de
                    tarjetas de crédito o débito.
                  </li>
                  <li>
                    Usted autoriza los cargos recurrentes correspondientes a su Plan
                    de Suscripción según la periodicidad contratada.
                  </li>
                  <li>
                    Los precios pueden incluir impuestos aplicables (IVA, GST u
                    otros) según la jurisdicción. Los impuestos serán calculados y
                    mostrados antes de la confirmación del pago.
                  </li>
                  <li>
                    Las facturas electrónicas se emitirán conforme a la normativa
                    tributaria aplicable y estarán disponibles en la Plataforma.
                  </li>
                  <li>
                    En caso de contracargo (chargeback) fraudulento o injustificado,
                    Leasefy se reserva el derecho de suspender la cuenta y perseguir
                    las acciones legales pertinentes.
                  </li>
                  <li>
                    Las monedas de cobro y los métodos de pago disponibles podrán
                    variar según la jurisdicción del Usuario.
                  </li>
                </ul>
              </section>

              {/* ── 9. CANCELACIÓN Y REEMBOLSOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  9. Cancelación y reembolsos
                </h2>
                <p className="mb-3">
                  La cancelación de suscripciones y la política de reembolsos se
                  rigen por las siguientes condiciones:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Usted puede cancelar su suscripción en cualquier momento desde
                    la configuración de su cuenta. La cancelación será efectiva al
                    final del período de facturación vigente.
                  </li>
                  <li>
                    No se realizarán reembolsos parciales por períodos no utilizados,
                    salvo disposición legal en contrario o que aplique el derecho de
                    retracto conforme a la Sección 20.
                  </li>
                  <li>
                    En caso de cobros duplicados o erróneos, Leasefy procesará el
                    reembolso correspondiente dentro de los quince (15) días hábiles
                    siguientes a la notificación del Usuario.
                  </li>
                  <li>
                    Para suscripciones anuales, aplica el derecho de retracto dentro
                    de los cinco (5) días hábiles siguientes a la contratación en
                    Colombia, conforme al artículo 47 de la Ley 1480 de 2011, y
                    según la normativa de cada jurisdicción.
                  </li>
                </ul>
              </section>

              {/* ── 10. PROCESAMIENTO DE PAGOS Y DISPERSIONES ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  10. Procesamiento de pagos de arrendamiento y dispersiones
                </h2>
                <p className="mb-3">
                  Cuando la Plataforma sea utilizada para el cobro y dispersión de
                  cánones de arrendamiento, aplican las siguientes condiciones
                  adicionales:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Leasefy actúa exclusivamente como facilitador tecnológico del
                    procesamiento de pagos. Los fondos pertenecen en todo momento al
                    Arrendador o a quien este designe.
                  </li>
                  <li>
                    Las dispersiones a propietarios se realizarán dentro de los
                    plazos establecidos en el plan contratado, sujetos a la
                    disponibilidad de fondos y verificación de la transacción.
                  </li>
                  <li>
                    Leasefy podrá retener fondos temporalmente cuando existan indicios
                    razonables de fraude, lavado de activos o actividades ilícitas,
                    conforme a la normativa aplicable.
                  </li>
                  <li>
                    Las comisiones por procesamiento de pagos serán informadas
                    previamente y deducidas según lo establecido en el Plan de
                    Suscripción.
                  </li>
                  <li>
                    Leasefy no será responsable por retrasos en las dispersiones
                    ocasionados por la pasarela de pagos, la entidad financiera del
                    Usuario o causas de fuerza mayor.
                  </li>
                  <li>
                    En jurisdicciones donde se requiera licencia o registro como
                    transmisor de dinero (money transmitter), Leasefy operará a
                    través de proveedores debidamente autorizados.
                  </li>
                </ul>
              </section>

              {/* ── 11. EVALUACIÓN DE INQUILINOS Y USO DE IA ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  11. Evaluación de inquilinos, scoring y uso de inteligencia artificial
                </h2>
                <p className="mb-3">
                  Leasefy ofrece un servicio de evaluación de perfil de inquilinos
                  que genera una puntuación de riesgo indicativa. Es fundamental
                  comprender las siguientes condiciones y limitaciones:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Naturaleza indicativa:</span>{" "}
                    el scoring es una herramienta de apoyo a la toma de decisiones y
                    no constituye una recomendación, garantía ni calificación
                    crediticia oficial. La decisión final de arrendamiento es
                    responsabilidad exclusiva del Arrendador.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Uso de inteligencia artificial:</span>{" "}
                    el proceso de evaluación puede utilizar modelos de inteligencia
                    artificial y aprendizaje automático para analizar la información
                    proporcionada. Estos modelos son complementarios y no sustituyen
                    el criterio humano.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Fuentes de información:</span>{" "}
                    la evaluación se basa en información proporcionada
                    voluntariamente por el Usuario y, cuando la ley lo permita y el
                    Usuario lo autorice, en consultas a centrales de riesgo y
                    fuentes de información financiera autorizadas (en Colombia,
                    conforme a la Ley 1266 de 2008 — Habeas Data Financiero).
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">No discriminación:</span>{" "}
                    Leasefy se compromete a que sus modelos de evaluación no
                    discriminen por motivos de raza, color, religión, sexo,
                    orientación sexual, identidad de género, origen nacional,
                    estado familiar, discapacidad, edad u otras categorías
                    protegidas por la ley aplicable.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Derecho de explicación:</span>{" "}
                    el Usuario evaluado tendrá derecho a solicitar una explicación
                    general de los factores que influyeron en su puntuación, así
                    como a impugnar resultados que considere incorrectos.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Verificación del scoring:</span>{" "}
                    la Plataforma genera un código de verificación único para cada
                    evaluación, que permite a terceros confirmar la autenticidad del
                    resultado a través de la Plataforma. La verificación muestra
                    información limitada para proteger la privacidad del evaluado.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Vigencia:</span>{" "}
                    las evaluaciones tienen una vigencia limitada indicada al
                    momento de su generación. Leasefy no garantiza que las
                    condiciones del evaluado permanezcan invariables después de la
                    fecha de evaluación.
                  </li>
                </ul>
                <p className="mt-3 text-[13px] text-muted-foreground italic">
                  En Estados Unidos, el servicio de scoring de Leasefy no
                  constituye un &quot;consumer report&quot; bajo la Fair Credit Reporting
                  Act (FCRA) ni se basa en información de consumer reporting
                  agencies. Las decisiones de vivienda basadas en reportes de
                  crédito tradicionales deben cumplir con la FCRA, la Fair Housing
                  Act (FHA) y la Equal Credit Opportunity Act (ECOA). Leasefy no
                  reemplaza dichos procesos.
                </p>
              </section>

              {/* ── 12. FIRMA ELECTRÓNICA ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  12. Firma electrónica de documentos
                </h2>
                <p className="mb-3">
                  La Plataforma permite la generación y firma electrónica de
                  contratos de arrendamiento y documentos relacionados. Al utilizar
                  esta funcionalidad, usted acepta que:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    La firma electrónica realizada a través de la Plataforma tiene
                    la misma validez y efectos jurídicos que una firma manuscrita,
                    conforme a la legislación aplicable: Ley 527 de 1999 (Colombia),
                    NOM-151-SCFI-2016 (México), Ley 25.506 (Argentina), MP
                    2.200-2/2001 (Brasil), Ley 19.799 (Chile), E-SIGN Act y UETA
                    (Estados Unidos).
                  </li>
                  <li>
                    Leasefy registra metadatos de cada firma, incluyendo fecha, hora,
                    dirección IP y método de autenticación, como evidencia de la
                    transacción.
                  </li>
                  <li>
                    El Usuario es responsable de revisar íntegramente el contenido
                    de cualquier documento antes de firmarlo electrónicamente.
                  </li>
                  <li>
                    Leasefy almacenará los documentos firmados de manera segura
                    durante el período que establezca la ley aplicable, y los pondrá
                    a disposición de las partes para su descarga.
                  </li>
                  <li>
                    En caso de requerir una firma electrónica avanzada o certificada
                    por disposición legal o por acuerdo de las partes, el Usuario
                    deberá utilizar un prestador de servicios de certificación
                    acreditado.
                  </li>
                </ul>
              </section>

              {/* ── 13. CONTRATOS DE ARRENDAMIENTO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  13. Contratos de arrendamiento
                </h2>
                <p className="mb-3">
                  Los contratos de arrendamiento facilitados a través de la
                  Plataforma se rigen por las siguientes condiciones:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    El contrato se celebra exclusivamente entre el Arrendador y el
                    Arrendatario. Leasefy no es parte del contrato ni asume
                    obligaciones derivadas del mismo.
                  </li>
                  <li>
                    La Plataforma puede proporcionar plantillas de contratos como
                    referencia. Estas plantillas no constituyen asesoría jurídica y
                    es responsabilidad de las partes adaptar su contenido a sus
                    necesidades específicas.
                  </li>
                  <li>
                    En Colombia, los contratos de arrendamiento de vivienda urbana
                    se rigen por la Ley 820 de 2003 y las disposiciones aplicables
                    del Código Civil colombiano. La Plataforma incorpora las
                    disposiciones obligatorias de dicha legislación en sus
                    plantillas.
                  </li>
                  <li>
                    El reajuste del canon de arrendamiento se realizará conforme a
                    la legislación aplicable en cada jurisdicción. En Colombia, no
                    podrá exceder el 100% del IPC del año anterior, conforme al
                    artículo 20 de la Ley 820 de 2003.
                  </li>
                  <li>
                    Se recomienda a las partes obtener asesoría legal independiente
                    antes de celebrar cualquier contrato de arrendamiento.
                  </li>
                </ul>
              </section>

              {/* ── 14. OBLIGACIONES DEL USUARIO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  14. Obligaciones del usuario
                </h2>
                <p className="mb-3">
                  Todo Usuario de la Plataforma se compromete a:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Proporcionar información veraz, completa, precisa y actualizada
                    al registrarse y durante todo el uso de la Plataforma.
                  </li>
                  <li>
                    Utilizar la Plataforma de buena fe y conforme a la ley, la
                    moral, el orden público y estos Términos.
                  </li>
                  <li>
                    Mantener la confidencialidad de sus credenciales de acceso y no
                    compartirlas con terceros.
                  </li>
                  <li>
                    No publicar información falsa, engañosa o fraudulenta sobre
                    inmuebles, condiciones de arrendamiento o identidad personal.
                  </li>
                  <li>
                    Cumplir oportunamente con las obligaciones derivadas de los
                    contratos de arrendamiento celebrados a través de la Plataforma.
                  </li>
                  <li>
                    Notificar inmediatamente a Leasefy cualquier irregularidad, uso
                    indebido o brecha de seguridad detectada.
                  </li>
                  <li>
                    Respetar los derechos de propiedad intelectual de Leasefy y de
                    terceros.
                  </li>
                  <li>
                    Abstenerse de utilizar mecanismos de scraping, bots o
                    herramientas automatizadas para extraer información de la
                    Plataforma.
                  </li>
                  <li>
                    Cumplir con las obligaciones tributarias derivadas de las
                    operaciones realizadas a través de la Plataforma.
                  </li>
                </ul>
              </section>

              {/* ── 15. USOS PROHIBIDOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  15. Usos prohibidos
                </h2>
                <p className="mb-3">
                  Queda expresamente prohibido utilizar la Plataforma para:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Publicar inmuebles inexistentes, ajenos o sobre los cuales no se
                    tiene autorización legal para ofrecer en arrendamiento.
                  </li>
                  <li>
                    Realizar actividades fraudulentas, incluyendo suplantación de
                    identidad, estafas o phishing.
                  </li>
                  <li>
                    Lavar activos, financiar el terrorismo o realizar cualquier
                    actividad tipificada como delito.
                  </li>
                  <li>
                    Discriminar en la oferta o selección de arrendatarios por motivos
                    de raza, color, religión, sexo, orientación sexual, identidad de
                    género, origen nacional, estado familiar, discapacidad, edad u
                    otras categorías protegidas.
                  </li>
                  <li>
                    Distribuir virus, malware, código malicioso o intentar vulnerar
                    la seguridad de la Plataforma.
                  </li>
                  <li>
                    Utilizar la Plataforma para enviar spam, comunicaciones
                    comerciales no solicitadas o publicidad no autorizada.
                  </li>
                  <li>
                    Realizar ingeniería inversa, descompilar o desensamblar el
                    software de la Plataforma.
                  </li>
                  <li>
                    Eludir las medidas de seguridad, autenticación o restricciones
                    de acceso de la Plataforma.
                  </li>
                  <li>
                    Utilizar la información de scoring o evaluaciones para fines
                    distintos a la toma de decisiones de arrendamiento, o compartir
                    resultados de manera discriminatoria.
                  </li>
                  <li>
                    Cualquier otra actividad que contravenga la legislación aplicable,
                    estos Términos o los derechos de terceros.
                  </li>
                </ul>
                <p className="mt-3">
                  El incumplimiento de estas prohibiciones podrá resultar en la
                  suspensión o terminación inmediata de la cuenta, sin perjuicio de
                  las acciones legales que correspondan.
                </p>
              </section>

              {/* ── 16. OBLIGACIONES ESPECÍFICAS PARA AGENTES E INMOBILIARIAS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  16. Disposiciones para agentes inmobiliarios e inmobiliarias
                </h2>
                <p className="mb-3">
                  Los Agentes Inmobiliarios e Inmobiliarias que utilicen la
                  Plataforma aceptan adicionalmente:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Contar con las licencias, permisos y registros necesarios para
                    ejercer la intermediación inmobiliaria en su jurisdicción.
                  </li>
                  <li>
                    Actuar con la debida diligencia en la verificación de los
                    inmuebles que publiquen y la información de los propietarios que
                    representen.
                  </li>
                  <li>
                    Mantener actualizadas las autorizaciones de los propietarios para
                    la publicación y gestión de sus inmuebles.
                  </li>
                  <li>
                    Cumplir con las obligaciones de prevención de lavado de activos y
                    financiación del terrorismo (SARLAFT en Colombia) aplicables a su
                    actividad.
                  </li>
                  <li>
                    Garantizar la confidencialidad de la información personal de los
                    inquilinos y propietarios con los que interactúen.
                  </li>
                  <li>
                    Leasefy se reserva el derecho de verificar la identidad y
                    credenciales de los agentes, y de suspender o revocar el acceso
                    en caso de incumplimiento.
                  </li>
                </ul>
              </section>

              {/* ── 17. CONTENIDO DEL USUARIO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  17. Contenido del usuario
                </h2>
                <p className="mb-3">
                  Al publicar, cargar o compartir Contenido del Usuario en la
                  Plataforma, usted:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Declara ser el titular o tener la autorización necesaria para
                    compartir dicho contenido.
                  </li>
                  <li>
                    Otorga a Leasefy una licencia no exclusiva, mundial, libre de
                    regalías y sublicenciable para usar, reproducir, modificar,
                    adaptar, publicar y mostrar dicho contenido con el fin de operar
                    y mejorar la Plataforma.
                  </li>
                  <li>
                    Reconoce que Leasefy puede moderar, editar o eliminar contenido
                    que considere inapropiado, ilegal o contrario a estos Términos.
                  </li>
                  <li>
                    Comprende que el contenido publicado puede ser indexado por
                    motores de búsqueda, salvo que el Usuario configure opciones de
                    privacidad disponibles.
                  </li>
                  <li>
                    Es el único responsable del contenido que publique y de cualquier
                    consecuencia legal derivada del mismo.
                  </li>
                </ul>
              </section>

              {/* ── 18. PROPIEDAD INTELECTUAL ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  18. Propiedad intelectual
                </h2>
                <p className="mb-3">
                  Todos los contenidos, materiales, software, código fuente,
                  algoritmos, diseños, marcas, logotipos, nombres comerciales,
                  bases de datos y demás elementos que componen la Plataforma son
                  propiedad exclusiva de Leasefy o de sus licenciantes, y están
                  protegidos por las leyes nacionales e internacionales de propiedad
                  intelectual, incluyendo pero no limitado a:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Decisión 486 de la Comunidad Andina (Propiedad Industrial).
                  </li>
                  <li>
                    Ley 23 de 1982 y Ley 1915 de 2018 (Derechos de Autor - Colombia).
                  </li>
                  <li>
                    Copyright Act (Title 17 U.S.C.) y Lanham Act (Estados Unidos).
                  </li>
                  <li>
                    Tratados internacionales aplicables (Convenio de Berna, ADPIC/TRIPS).
                  </li>
                </ul>
                <p className="mt-3">
                  Queda prohibida la reproducción, distribución, modificación,
                  comunicación pública, ingeniería inversa o cualquier uso no
                  autorizado del contenido de la Plataforma, total o parcialmente,
                  sin el consentimiento previo y escrito de Leasefy.
                </p>
              </section>

              {/* ── 19. LIMITACIÓN DE RESPONSABILIDAD ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  19. Limitación de responsabilidad
                </h2>
                <p className="mb-3">
                  En la máxima medida permitida por la ley aplicable:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Leasefy proporciona la Plataforma &quot;tal como está&quot; (&quot;as is&quot;) y
                    &quot;según disponibilidad&quot; (&quot;as available&quot;), sin garantías
                    expresas o implícitas de comerciabilidad, idoneidad para un fin
                    particular o no infracción.
                  </li>
                  <li>
                    Leasefy no garantiza que la Plataforma esté libre de errores,
                    interrupciones, virus o defectos, ni que funcione de manera
                    ininterrumpida.
                  </li>
                  <li>
                    Leasefy no será responsable por daños indirectos, incidentales,
                    especiales, consecuenciales o punitivos, incluyendo lucro
                    cesante, pérdida de datos, pérdida de oportunidades de negocio o
                    daños a la reputación.
                  </li>
                  <li>
                    La responsabilidad total acumulada de Leasefy frente a un Usuario
                    no excederá el mayor valor entre: (a) los montos pagados por el
                    Usuario a Leasefy durante los doce (12) meses anteriores al
                    evento que generó la reclamación, o (b) el equivalente a cien
                    dólares estadounidenses (USD $100).
                  </li>
                  <li>
                    Leasefy no se responsabiliza por los conflictos, incumplimientos
                    contractuales, daños materiales o perjuicios que puedan surgir
                    entre Arrendadores y Arrendatarios derivados de los contratos de
                    arrendamiento.
                  </li>
                  <li>
                    Las limitaciones anteriores no aplican en jurisdicciones donde la
                    exclusión o limitación de ciertas garantías o responsabilidades
                    no esté permitida por ley.
                  </li>
                </ul>
              </section>

              {/* ── 20. DERECHO DE RETRACTO Y PROTECCIÓN AL CONSUMIDOR ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  20. Derecho de retracto y protección al consumidor
                </h2>
                <p className="mb-3">
                  En cumplimiento de la normativa de protección al consumidor
                  aplicable:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Colombia (Ley 1480 de 2011):</span>{" "}
                    el consumidor tiene derecho a retractarse de la compra de
                    servicios digitales dentro de los cinco (5) días hábiles
                    siguientes a la contratación, mediante comunicación escrita a
                    Leasefy. El reembolso se realizará dentro de los treinta (30)
                    días calendario siguientes. Igualmente, aplica el derecho de
                    reversión del pago conforme al artículo 51 cuando el servicio no
                    corresponda a lo contratado.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">México (Ley Federal de Protección al Consumidor):</span>{" "}
                    el consumidor puede cancelar la contratación dentro de los cinco
                    (5) días hábiles posteriores a la entrega del servicio, sin
                    necesidad de justificación.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Brasil (Código de Defesa do Consumidor):</span>{" "}
                    el consumidor tiene derecho de arrepentimiento (arrependimento)
                    de siete (7) días desde la contratación de servicios adquiridos
                    fuera del establecimiento comercial.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Otras jurisdicciones:</span>{" "}
                    aplicará la normativa de protección al consumidor local. Leasefy
                    garantiza el cumplimiento de los estándares mínimos de protección
                    vigentes en cada país donde opere.
                  </li>
                </ul>
                <p className="mt-3">
                  Para ejercer su derecho de retracto o presentar una reclamación,
                  comuníquese a{" "}
                  <a
                    href="mailto:soporte@leasefy.com"
                    className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                  >
                    soporte@leasefy.com
                  </a>
                  .
                </p>
              </section>

              {/* ── 21. INDEMNIZACIÓN ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  21. Indemnización
                </h2>
                <p>
                  Usted acepta defender, indemnizar y mantener indemne a Leasefy,
                  sus directores, empleados, agentes, contratistas y afiliados
                  frente a cualquier reclamación, daño, obligación, pérdida, costo o
                  gasto (incluyendo honorarios razonables de abogados) que surja de
                  o esté relacionado con: (a) su uso de la Plataforma; (b) el
                  incumplimiento de estos Términos; (c) la violación de derechos de
                  terceros, incluyendo derechos de propiedad intelectual, privacidad
                  o publicidad; (d) la información o contenido que publique en la
                  Plataforma; o (e) sus actividades de arrendamiento realizadas a
                  través de la Plataforma.
                </p>
              </section>

              {/* ── 22. TERMINACIÓN Y SUSPENSIÓN ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  22. Terminación y suspensión
                </h2>
                <p className="mb-3">
                  Leasefy puede suspender o terminar su acceso a la Plataforma, total
                  o parcialmente, con o sin previo aviso, en los siguientes casos:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Incumplimiento de cualquier disposición de estos Términos.
                  </li>
                  <li>
                    Actividades fraudulentas, ilegales o que representen un riesgo
                    para la seguridad de la Plataforma u otros Usuarios.
                  </li>
                  <li>
                    Falta de pago de las obligaciones derivadas del Plan de
                    Suscripción durante un período superior a treinta (30) días.
                  </li>
                  <li>
                    Inactividad prolongada de la cuenta por un período superior a
                    doce (12) meses.
                  </li>
                  <li>
                    Requerimiento de autoridad judicial o administrativa competente.
                  </li>
                  <li>
                    Decisión de Leasefy de descontinuar la Plataforma o alguno de
                    sus servicios, con un aviso previo razonable.
                  </li>
                </ul>
                <p className="mt-3">
                  En caso de terminación, Leasefy proporcionará al Usuario un plazo
                  razonable para descargar su información y documentos, salvo que la
                  terminación se deba a actividades fraudulentas o ilegales. Las
                  obligaciones de confidencialidad, propiedad intelectual,
                  limitación de responsabilidad e indemnización sobrevivirán a la
                  terminación.
                </p>
              </section>

              {/* ── 23. VIVIENDA JUSTA Y NO DISCRIMINACIÓN ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  23. Vivienda justa y no discriminación
                </h2>
                <p className="mb-3">
                  Leasefy se compromete con los principios de igualdad de
                  oportunidades en materia de vivienda y prohíbe la discriminación
                  en cualquiera de sus formas. Todos los Usuarios deben cumplir con:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    La legislación de vivienda justa aplicable en cada jurisdicción,
                    incluyendo la Fair Housing Act (FHA) en Estados Unidos, la
                    Constitución Política de Colombia (Art. 13 - Derecho a la
                    igualdad), y normativa equivalente en otros países.
                  </li>
                  <li>
                    La prohibición de rechazar, condicionar o discriminar en la
                    oferta o selección de arrendatarios basándose en categorías
                    protegidas como raza, color, religión, sexo, orientación sexual,
                    identidad de género, origen nacional, estado familiar,
                    discapacidad, edad, condición migratoria o cualquier otra
                    categoría protegida por ley.
                  </li>
                  <li>
                    La obligación de realizar adaptaciones razonables para personas
                    con discapacidad cuando así lo requiera la ley.
                  </li>
                </ul>
                <p className="mt-3">
                  Leasefy investigará las denuncias de discriminación y tomará las
                  medidas correctivas apropiadas, incluyendo la suspensión o
                  terminación de cuentas.
                </p>
              </section>

              {/* ── 24. PREVENCIÓN DE LAVADO DE ACTIVOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  24. Prevención de lavado de activos y financiación del terrorismo
                </h2>
                <p className="mb-3">
                  En cumplimiento de la normativa de prevención de lavado de activos
                  y financiación del terrorismo (LA/FT), Leasefy:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Implementa procedimientos de conocimiento del cliente (KYC) y
                    debida diligencia para la verificación de identidad de los
                    Usuarios.
                  </li>
                  <li>
                    Puede requerir documentación adicional para verificar la
                    identidad, origen de fondos y actividad económica del Usuario.
                  </li>
                  <li>
                    Monitorea las transacciones realizadas a través de la Plataforma
                    para detectar operaciones inusuales o sospechosas.
                  </li>
                  <li>
                    Reportará a las autoridades competentes (UIAF en Colombia,
                    FinCEN en Estados Unidos, UIF en México, COAF en Brasil) las
                    operaciones sospechosas detectadas, sin necesidad de notificación
                    previa al Usuario.
                  </li>
                  <li>
                    Se reserva el derecho de congelar cuentas, retener fondos o
                    suspender transacciones cuando existan indicios razonables de
                    actividades ilícitas.
                  </li>
                </ul>
                <p className="mt-3">
                  El Usuario se compromete a no utilizar la Plataforma para
                  cualquier actividad relacionada con el lavado de activos,
                  financiación del terrorismo o proliferación de armas de destrucción
                  masiva.
                </p>
              </section>

              {/* ── 25. COMUNICACIONES ELECTRÓNICAS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  25. Comunicaciones electrónicas
                </h2>
                <p className="mb-3">
                  Al registrarse en la Plataforma, usted consiente recibir
                  comunicaciones electrónicas de Leasefy, incluyendo:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Comunicaciones transaccionales:</span>{" "}
                    confirmaciones de pago, notificaciones de vencimiento,
                    actualizaciones contractuales y alertas de seguridad. Estas
                    comunicaciones son esenciales para la prestación del servicio y
                    no pueden desactivarse.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Comunicaciones de servicio:</span>{" "}
                    actualizaciones de la Plataforma, cambios en los Términos,
                    nuevas funcionalidades y mantenimientos programados.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Comunicaciones promocionales:</span>{" "}
                    ofertas, contenido educativo y novedades comerciales. Usted
                    puede desactivar estas comunicaciones en cualquier momento desde
                    la configuración de su cuenta o mediante el enlace de
                    desuscripción incluido en cada comunicación, conforme a la Ley
                    2300 de 2023 (Colombia), CAN-SPAM Act (EE.UU.) y normativa
                    aplicable.
                  </li>
                </ul>
                <p className="mt-3">
                  Las comunicaciones por WhatsApp, SMS u otros canales de mensajería
                  se realizarán únicamente con su consentimiento previo y conforme a
                  la normativa de comunicaciones no solicitadas de cada jurisdicción.
                </p>
              </section>

              {/* ── 26. FUERZA MAYOR ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  26. Fuerza mayor
                </h2>
                <p>
                  Leasefy no será responsable del incumplimiento o retraso en el
                  cumplimiento de sus obligaciones cuando dicho incumplimiento o
                  retraso se deba a causas de fuerza mayor o caso fortuito,
                  incluyendo pero no limitado a: desastres naturales, pandemias,
                  conflictos armados, actos de terrorismo, fallos en la
                  infraestructura de telecomunicaciones, ataques cibernéticos,
                  cambios legislativos o regulatorios, decisiones gubernamentales,
                  huelgas o cualquier otra circunstancia imprevisible e irresistible
                  ajena al control de Leasefy. Leasefy realizará esfuerzos
                  comercialmente razonables para restablecer el servicio lo antes
                  posible.
                </p>
              </section>

              {/* ── 27. DISPOSICIONES POR JURISDICCIÓN ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  27. Disposiciones específicas por jurisdicción
                </h2>
                <p className="mb-4">
                  Las siguientes disposiciones complementan o modifican los Términos
                  generales según la jurisdicción del Usuario:
                </p>

                {/* Colombia */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    27.1. Colombia
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los contratos de arrendamiento de vivienda urbana se rigen por
                      la Ley 820 de 2003 y el Código Civil colombiano.
                    </li>
                    <li>
                      El tratamiento de datos personales se realiza conforme a la
                      Ley 1581 de 2012 y el Decreto 1377 de 2013. La consulta de
                      datos financieros se rige por la Ley 1266 de 2008 (Habeas Data
                      Financiero).
                    </li>
                    <li>
                      La protección al consumidor se rige por la Ley 1480 de 2011
                      (Estatuto del Consumidor), incluyendo los derechos de retracto
                      (Art. 47), reversión de pagos (Art. 51) y la prohibición de
                      cláusulas abusivas (Art. 42-43). No se incluirán en estos
                      Términos las cláusulas enumeradas en la &quot;lista negra&quot; del
                      artículo 43.
                    </li>
                    <li>
                      La firma electrónica se ampara en la Ley 527 de 1999 sobre
                      mensajes de datos y comercio electrónico, y el Decreto 2364
                      de 2012.
                    </li>
                    <li>
                      Las comunicaciones comerciales cumplen con la Ley 2300 de 2023
                      que regula los horarios y medios de contacto con los
                      consumidores.
                    </li>
                    <li>
                      Autoridad de supervisión: Superintendencia de Industria y
                      Comercio (SIC). Jurisdicción: jueces de la República de
                      Colombia, con domicilio en Bogotá D.C.
                    </li>
                  </ul>
                </div>

                {/* México */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    27.2. México
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los contratos de arrendamiento se rigen por el Código Civil
                      Federal y los códigos civiles de cada entidad federativa
                      aplicable.
                    </li>
                    <li>
                      La protección de datos personales se rige por la Ley Federal
                      de Protección de Datos Personales en Posesión de los
                      Particulares (LFPDPPP) y su Reglamento.
                    </li>
                    <li>
                      La firma electrónica se ampara en la NOM-151-SCFI-2016 y el
                      Código de Comercio (Título Segundo).
                    </li>
                    <li>
                      Autoridad de supervisión: Instituto Nacional de Transparencia,
                      Acceso a la Información y Protección de Datos Personales
                      (INAI) y la Procuraduría Federal del Consumidor (PROFECO).
                    </li>
                  </ul>
                </div>

                {/* Brasil */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    27.3. Brasil
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los contratos de arrendamiento se rigen por la Lei do
                      Inquilinato (Lei 8.245/1991).
                    </li>
                    <li>
                      La protección de datos personales se rige por la Lei Geral de
                      Proteção de Dados (LGPD - Lei 13.709/2018). El Usuario tiene
                      derecho a confirmación, acceso, corrección, anonimización,
                      portabilidad y eliminación de sus datos.
                    </li>
                    <li>
                      La protección al consumidor se rige por el Código de Defesa do
                      Consumidor (CDC - Lei 8.078/1990), incluyendo el derecho de
                      arrependimento de 7 días.
                    </li>
                    <li>
                      La firma electrónica se ampara en la Medida Provisória
                      2.200-2/2001 y la Lei 14.063/2020.
                    </li>
                    <li>
                      Autoridad de supervisión: Autoridade Nacional de Proteção de
                      Dados (ANPD).
                    </li>
                  </ul>
                </div>

                {/* Chile */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    27.4. Chile
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los contratos de arrendamiento se rigen por la Ley 18.101
                      sobre Arrendamiento de Predios Urbanos y el Código Civil
                      chileno.
                    </li>
                    <li>
                      La protección de datos personales se rige por la Ley 19.628
                      sobre Protección de la Vida Privada, y a partir de diciembre
                      de 2026, por la nueva Ley 21.719 de Protección de Datos
                      Personales.
                    </li>
                    <li>
                      La firma electrónica se ampara en la Ley 19.799 sobre
                      Documentos Electrónicos y Firma Electrónica.
                    </li>
                    <li>
                      La protección al consumidor se rige por la Ley 19.496 sobre
                      Protección de los Derechos de los Consumidores, administrada
                      por el SERNAC.
                    </li>
                  </ul>
                </div>

                {/* Perú */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    27.5. Perú
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los contratos de arrendamiento se rigen por el Código Civil
                      peruano (Libro VII, Sección Segunda).
                    </li>
                    <li>
                      La protección de datos personales se rige por la Ley 29733 y
                      su Reglamento (D.S. 003-2013-JUS).
                    </li>
                    <li>
                      Autoridad de supervisión: Autoridad Nacional de Protección de
                      Datos Personales (ANPDP) e INDECOPI para protección al
                      consumidor.
                    </li>
                  </ul>
                </div>

                {/* Argentina */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    27.6. Argentina
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los contratos de arrendamiento se rigen por el Código Civil y
                      Comercial de la Nación (Arts. 1187 y ss.).
                    </li>
                    <li>
                      La protección de datos personales se rige por la Ley 25.326 de
                      Protección de Datos Personales y su Decreto Reglamentario
                      1558/2001.
                    </li>
                    <li>
                      La firma electrónica se ampara en la Ley 25.506 de Firma
                      Digital.
                    </li>
                    <li>
                      Autoridad de supervisión: Agencia de Acceso a la Información
                      Pública (AAIP) y Dirección Nacional de Defensa del Consumidor.
                    </li>
                  </ul>
                </div>

                {/* Estados Unidos */}
                <div className="pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    27.7. Estados Unidos
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los contratos de arrendamiento se rigen por la legislación
                      estatal del lugar donde se ubique el inmueble.
                    </li>
                    <li>
                      La Fair Housing Act (42 U.S.C. § 3601 et seq.) prohíbe la
                      discriminación en vivienda por motivos de raza, color,
                      religión, sexo, origen nacional, estado familiar o
                      discapacidad. Los usuarios deben cumplir con las leyes de
                      vivienda justa federales, estatales y locales.
                    </li>
                    <li>
                      Si el servicio de scoring utiliza información de consumer
                      reporting agencies, cumplirá con la Fair Credit Reporting Act
                      (15 U.S.C. § 1681). Incluye el derecho a adverse action
                      notices cuando un solicitante sea rechazado.
                    </li>
                    <li>
                      La Equal Credit Opportunity Act (ECOA) prohíbe la
                      discriminación crediticia por categorías protegidas.
                    </li>
                    <li>
                      Para residentes de California: aplican los derechos adicionales
                      del California Consumer Privacy Act (CCPA) y California Privacy
                      Rights Act (CPRA), incluyendo el derecho a conocer, eliminar y
                      optar por no vender información personal. Ver nuestra Política
                      de Privacidad para detalles.
                    </li>
                    <li>
                      La firma electrónica se ampara en la Electronic Signatures in
                      Global and National Commerce Act (E-SIGN Act, 15 U.S.C. § 7001
                      et seq.) y la Uniform Electronic Transactions Act (UETA).
                    </li>
                    <li>
                      Las comunicaciones comerciales cumplen con la CAN-SPAM Act (15
                      U.S.C. § 7701 et seq.) y el Telephone Consumer Protection Act
                      (TCPA).
                    </li>
                    <li>
                      Leasefy no recopila deliberadamente información de menores de
                      13 años, conforme a la Children&apos;s Online Privacy Protection
                      Act (COPPA).
                    </li>
                  </ul>
                </div>
              </section>

              {/* ── 28. MODIFICACIONES A LOS TÉRMINOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  28. Modificaciones a los Términos
                </h2>
                <p className="mb-3">
                  Leasefy se reserva el derecho de modificar estos Términos en
                  cualquier momento. Las modificaciones se comunicarán al Usuario
                  mediante:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Publicación de la versión actualizada en la Plataforma con
                    indicación de la fecha de la última actualización.
                  </li>
                  <li>
                    Notificación por correo electrónico para cambios sustanciales,
                    con al menos quince (15) días de antelación a su entrada en
                    vigor.
                  </li>
                  <li>
                    Aviso destacado en la Plataforma durante los primeros treinta
                    (30) días desde la modificación.
                  </li>
                </ul>
                <p className="mt-3">
                  El uso continuado de la Plataforma después de la fecha de entrada
                  en vigor de los nuevos Términos constituirá aceptación de los
                  mismos. Si no está de acuerdo con las modificaciones, deberá dejar
                  de utilizar la Plataforma y podrá solicitar la cancelación de su
                  cuenta.
                </p>
              </section>

              {/* ── 29. RESOLUCIÓN DE CONFLICTOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  29. Resolución de conflictos
                </h2>
                <p className="mb-3">
                  Cualquier controversia derivada del uso de la Plataforma o de la
                  interpretación de estos Términos se resolverá conforme al
                  siguiente procedimiento:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Etapa 1 — Negociación directa:</span>{" "}
                    las partes intentarán resolver la controversia de buena fe
                    mediante negociación directa durante un plazo de treinta (30)
                    días calendario.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Etapa 2 — Mediación:</span>{" "}
                    si la negociación directa no resulta en un acuerdo, las partes
                    podrán acudir a mediación ante un centro de conciliación
                    reconocido en la jurisdicción aplicable.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Etapa 3 — Arbitraje o jurisdicción ordinaria:</span>{" "}
                    si la mediación no prospera, la controversia se someterá a
                    arbitraje o a la jurisdicción ordinaria según las siguientes
                    reglas: (i) para usuarios en Colombia: arbitraje administrado por
                    el Centro de Arbitraje y Conciliación de la Cámara de Comercio de
                    Bogotá, o jurisdicción ordinaria en Bogotá D.C.; (ii) para
                    usuarios en otras jurisdicciones: los tribunales competentes del
                    domicilio del Usuario, conforme a la legislación procesal
                    aplicable.
                  </li>
                </ul>
                <p className="mt-3">
                  Lo anterior no limita el derecho del consumidor a acudir
                  directamente a las autoridades de protección al consumidor ni a
                  ejercer acciones de grupo o colectivas cuando la legislación
                  aplicable lo permita.
                </p>
              </section>

              {/* ── 30. DIVISIBILIDAD ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  30. Divisibilidad
                </h2>
                <p>
                  Si cualquier disposición de estos Términos es declarada nula,
                  inválida o inaplicable por un tribunal competente, dicha
                  disposición se considerará separada del resto de los Términos, los
                  cuales continuarán en pleno vigor y efecto. La disposición nula o
                  inaplicable será reemplazada por una disposición válida que se
                  aproxime en la mayor medida posible al propósito económico y
                  jurídico de la disposición original.
                </p>
              </section>

              {/* ── 31. CESIÓN ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  31. Cesión
                </h2>
                <p>
                  Usted no podrá ceder ni transferir sus derechos u obligaciones
                  bajo estos Términos sin el consentimiento previo y escrito de
                  Leasefy. Leasefy podrá ceder estos Términos, total o parcialmente,
                  a cualquier empresa afiliada, sucesora o adquirente de sus activos
                  o negocio, previa notificación al Usuario.
                </p>
              </section>

              {/* ── 32. ACUERDO COMPLETO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  32. Acuerdo completo
                </h2>
                <p>
                  Estos Términos, junto con la Política de Privacidad, los términos
                  específicos de cada Plan de Suscripción y cualquier acuerdo
                  adicional celebrado entre usted y Leasefy, constituyen el acuerdo
                  completo entre las partes con respecto al uso de la Plataforma y
                  reemplazan todos los acuerdos, comunicaciones y propuestas
                  anteriores, sean orales o escritos, relativos al mismo objeto.
                </p>
              </section>

              {/* ── 33. LEGISLACIÓN APLICABLE ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  33. Legislación aplicable
                </h2>
                <p>
                  Estos Términos se rigen por la legislación de la República de
                  Colombia, sin perjuicio de las disposiciones imperativas de
                  protección al consumidor y protección de datos personales
                  aplicables en la jurisdicción de residencia del Usuario. Cuando la
                  legislación local del Usuario establezca protecciones más
                  favorables que las previstas en estos Términos, prevalecerán las
                  protecciones locales.
                </p>
              </section>

              {/* ── 34. CONTACTO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  34. Contacto
                </h2>
                <p className="mb-3">
                  Para cualquier consulta, reclamación o solicitud relacionada con
                  estos Términos, puede comunicarse con nosotros a través de los
                  siguientes canales:
                </p>
                <div className="p-5 border border-border rounded-md bg-muted/30 space-y-1">
                  <p className="text-foreground font-medium">Leasefy S.A.S.</p>
                  <p className="text-muted-foreground">NIT: [Pendiente de registro]</p>
                  <p className="text-muted-foreground">
                    Correo general:{" "}
                    <a
                      href="mailto:soporte@leasefy.com"
                      className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                    >
                      soporte@leasefy.com
                    </a>
                  </p>
                  <p className="text-muted-foreground">
                    Correo legal:{" "}
                    <a
                      href="mailto:legal@leasefy.com"
                      className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                    >
                      legal@leasefy.com
                    </a>
                  </p>
                  <p className="text-muted-foreground">
                    Protección de datos:{" "}
                    <a
                      href="mailto:privacidad@leasefy.com"
                      className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                    >
                      privacidad@leasefy.com
                    </a>
                  </p>
                  <p className="text-muted-foreground">Bogotá D.C., Colombia</p>
                </div>
              </section>

            </div>
          </div></div>
        </section>
      </main>
      <Footer />
    </>
  );
}
