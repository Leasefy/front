import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionLabel } from "@/components/ui/section-label";
export const metadata: Metadata = {
  title: "Política de Privacidad | Leasefy",
  description:
    "Política de privacidad y protección de datos personales de Leasefy. Conoce cómo recopilamos, usamos y protegemos tu información.",
};

export default function PrivacidadPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-background">
        <section className="pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="container-platform"><div className="max-w-[800px]">
            <SectionLabel className="mb-4">Legal</SectionLabel>
            <h1 className="text-[2rem] md:text-[3rem] font-light text-foreground leading-[1.15] tracking-[-0.02em] italic mb-4">
              Política de privacidad
            </h1>
            <p className="text-[13px] text-muted-foreground mb-12">
              Última actualización: 11 de marzo de 2026
            </p>

            <div className="space-y-10 text-[15px] text-foreground/85 leading-relaxed">

              {/* ── 1. RESPONSABLE DEL TRATAMIENTO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  1. Responsable del tratamiento
                </h2>
                <p className="mb-3">
                  Leasefy S.A.S. (en adelante, &quot;Leasefy&quot;, &quot;nosotros&quot; o la
                  &quot;Empresa&quot;), sociedad constituida conforme a las leyes de la
                  República de Colombia, con domicilio principal en Bogotá D.C., es
                  el responsable del tratamiento de los datos personales recopilados
                  a través de la plataforma Leasefy (en adelante, la
                  &quot;Plataforma&quot;).
                </p>
                <p>
                  Esta Política de Privacidad (en adelante, la &quot;Política&quot;)
                  describe cómo recopilamos, usamos, compartimos, almacenamos y
                  protegemos su información personal. Al acceder, registrarse o
                  utilizar la Plataforma, usted acepta las prácticas descritas en
                  esta Política. Le recomendamos leerla detenidamente y consultarla
                  periódicamente.
                </p>
              </section>

              {/* ── 2. ALCANCE Y APLICABILIDAD ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  2. Alcance y aplicabilidad
                </h2>
                <p className="mb-3">
                  Esta Política aplica a todos los datos personales recopilados a
                  través de:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    El sitio web de Leasefy y cualquier subdominio asociado.
                  </li>
                  <li>
                    Las aplicaciones móviles de Leasefy (iOS y Android).
                  </li>
                  <li>
                    Las APIs y servicios integrados de la Plataforma.
                  </li>
                  <li>
                    Las comunicaciones por correo electrónico, WhatsApp, SMS u otros
                    canales de contacto operados por Leasefy.
                  </li>
                  <li>
                    La interacción con terceros proveedores de servicios que actúan
                    en nombre de Leasefy.
                  </li>
                </ul>
                <p className="mt-3">
                  La Plataforma opera en múltiples jurisdicciones. Cuando apliquen
                  normativas de protección de datos específicas de su país de
                  residencia, las disposiciones adicionales se describen en la
                  Sección 17 de esta Política.
                </p>
              </section>

              {/* ── 3. DATOS QUE RECOPILAMOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  3. Datos que recopilamos
                </h2>
                <p className="mb-3">
                  Recopilamos las siguientes categorías de datos personales:
                </p>

                <h3 className="text-[15px] font-medium text-foreground mb-2 mt-4">
                  3.1. Datos proporcionados por el usuario
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de identificación:</span>{" "}
                    nombre completo, número de documento de identidad (cédula de
                    ciudadanía, cédula de extranjería, pasaporte, CPF, CURP, DNI,
                    SSN según jurisdicción), fecha de nacimiento, nacionalidad,
                    fotografía del documento de identidad.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de contacto:</span>{" "}
                    dirección de correo electrónico, número de teléfono, dirección
                    física de residencia.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos financieros y laborales:</span>{" "}
                    información de empleo, ingresos mensuales, referencias
                    bancarias, extractos financieros, información tributaria
                    necesaria para el proceso de evaluación de arrendamiento.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de inmuebles:</span>{" "}
                    dirección, características, fotografías, escritura o certificado
                    de tradición, avalúo y demás información relacionada con los
                    inmuebles ofrecidos en arrendamiento.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos contractuales:</span>{" "}
                    historial de arrendamiento, contratos anteriores, referencias de
                    arrendadores previos.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de la empresa (usuarios corporativos):</span>{" "}
                    razón social, NIT/RFC/CNPJ/RUT/CUIT, registro mercantil,
                    representación legal, información de agentes autorizados.
                  </li>
                </ul>

                <h3 className="text-[15px] font-medium text-foreground mb-2 mt-4">
                  3.2. Datos recopilados automáticamente
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de uso:</span>{" "}
                    páginas visitadas, funcionalidades utilizadas, búsquedas
                    realizadas, inmuebles visualizados, frecuencia y duración de
                    las sesiones, clics e interacciones con la Plataforma.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos del dispositivo:</span>{" "}
                    dirección IP, tipo y versión del navegador, sistema operativo,
                    resolución de pantalla, idioma del dispositivo, identificadores
                    únicos del dispositivo.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de ubicación:</span>{" "}
                    ubicación aproximada derivada de la dirección IP. No recopilamos
                    ubicación GPS precisa sin su consentimiento explícito.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Cookies y tecnologías similares:</span>{" "}
                    identificadores de sesión, preferencias de usuario, datos de
                    rendimiento. Ver Sección 10 para detalles.
                  </li>
                </ul>

                <h3 className="text-[15px] font-medium text-foreground mb-2 mt-4">
                  3.3. Datos obtenidos de terceros
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Centrales de riesgo e información financiera:</span>{" "}
                    cuando usted lo autorice y la ley lo permita, consultamos
                    información crediticia y financiera en centrales de riesgo
                    autorizadas (en Colombia: DataCrédito, TransUnion CIFIN,
                    conforme a la Ley 1266 de 2008).
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Proveedores de autenticación:</span>{" "}
                    cuando inicie sesión con proveedores externos (Google, Apple),
                    recibimos los datos que usted autorice compartir (nombre, correo,
                    foto de perfil).
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Fuentes públicas:</span>{" "}
                    información disponible en registros públicos, conforme a la
                    legislación aplicable.
                  </li>
                </ul>
              </section>

              {/* ── 4. BASE LEGAL DEL TRATAMIENTO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  4. Base legal del tratamiento
                </h2>
                <p className="mb-3">
                  El tratamiento de sus datos personales se fundamenta en las
                  siguientes bases legales, según la naturaleza del dato y la
                  finalidad del tratamiento:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Consentimiento:</span>{" "}
                    autorización previa, expresa e informada otorgada por el titular
                    al momento del registro o en oportunidades posteriores para
                    finalidades específicas.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Ejecución contractual:</span>{" "}
                    tratamiento necesario para la prestación de los servicios
                    contratados a través de la Plataforma.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Obligación legal:</span>{" "}
                    cumplimiento de obligaciones impuestas por la ley, incluyendo
                    normativa tributaria, prevención de lavado de activos y
                    requerimientos de autoridades competentes.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Interés legítimo:</span>{" "}
                    cuando sea aplicable conforme a la legislación de la jurisdicción
                    del Usuario, para fines como la prevención del fraude, la
                    seguridad de la Plataforma y la mejora de los servicios,
                    siempre que no prevalezcan los derechos fundamentales del
                    titular.
                  </li>
                </ul>
              </section>

              {/* ── 5. FINALIDAD DEL TRATAMIENTO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  5. Finalidad del tratamiento
                </h2>
                <p className="mb-3">
                  Sus datos personales serán utilizados para las siguientes
                  finalidades:
                </p>

                <h3 className="text-[15px] font-medium text-foreground mb-2 mt-4">
                  5.1. Finalidades principales (necesarias para la prestación del
                  servicio)
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Gestionar el registro, creación y administración de su cuenta en
                    la Plataforma.
                  </li>
                  <li>
                    Verificar su identidad y autenticidad de la información
                    proporcionada.
                  </li>
                  <li>
                    Facilitar la búsqueda, evaluación y formalización de contratos
                    de arrendamiento.
                  </li>
                  <li>
                    Realizar el análisis de riesgo y scoring de inquilinos, cuando
                    el usuario lo solicite y autorice.
                  </li>
                  <li>
                    Procesar pagos de cánones de arrendamiento y dispersiones a
                    propietarios.
                  </li>
                  <li>
                    Generar y facilitar la firma electrónica de contratos y
                    documentos.
                  </li>
                  <li>
                    Enviar comunicaciones transaccionales relacionadas con el
                    servicio (confirmaciones, alertas, notificaciones).
                  </li>
                  <li>
                    Proporcionar soporte técnico y atención al cliente.
                  </li>
                  <li>
                    Cumplir con obligaciones legales, tributarias y regulatorias.
                  </li>
                  <li>
                    Prevenir fraude, lavado de activos y financiación del terrorismo.
                  </li>
                </ul>

                <h3 className="text-[15px] font-medium text-foreground mb-2 mt-4">
                  5.2. Finalidades secundarias (requieren consentimiento adicional)
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Enviar comunicaciones comerciales, promocionales y de marketing
                    sobre productos y servicios de Leasefy.
                  </li>
                  <li>
                    Realizar estudios de mercado, análisis estadísticos y encuestas
                    de satisfacción.
                  </li>
                  <li>
                    Personalizar la experiencia en la Plataforma mediante análisis de
                    patrones de uso.
                  </li>
                  <li>
                    Compartir información con socios comerciales para ofertas
                    relacionadas con el arrendamiento (seguros, servicios públicos,
                    mudanzas).
                  </li>
                </ul>
                <p className="mt-3">
                  Usted puede revocar su consentimiento para las finalidades
                  secundarias en cualquier momento, sin que ello afecte la
                  prestación de los servicios principales.
                </p>
              </section>

              {/* ── 6. DATOS SENSIBLES ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  6. Datos sensibles
                </h2>
                <p className="mb-3">
                  Conforme al artículo 5 de la Ley 1581 de 2012 (Colombia) y la
                  normativa equivalente en otras jurisdicciones, los datos sensibles
                  son aquellos que afectan la intimidad del titular o cuyo uso
                  indebido puede generar discriminación. Leasefy:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Solo recopila datos sensibles cuando existe una autorización
                    previa, expresa e informada del titular, o cuando la ley lo
                    permita sin consentimiento (obligación legal, protección de
                    interés vital, datos necesarios para el reconocimiento de
                    derechos en proceso judicial).
                  </li>
                  <li>
                    No condiciona la prestación de sus servicios a la entrega de
                    datos sensibles, salvo que sean estrictamente necesarios para
                    la finalidad del tratamiento.
                  </li>
                  <li>
                    Aplica medidas de seguridad reforzadas para el almacenamiento y
                    procesamiento de datos sensibles.
                  </li>
                  <li>
                    No utiliza datos biométricos sin el consentimiento explícito e
                    informado del titular, conforme a la legislación aplicable en
                    cada jurisdicción.
                  </li>
                </ul>
              </section>

              {/* ── 7. CONSENTIMIENTO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  7. Consentimiento y autorización
                </h2>
                <p className="mb-3">
                  Al registrarse en la Plataforma, usted otorga su consentimiento
                  previo, expreso e informado para el tratamiento de sus datos
                  personales conforme a esta Política. Adicionalmente:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    La Plataforma presenta solicitudes de autorización específicas
                    para la consulta de centrales de riesgo, la recopilación de
                    datos sensibles y el envío de comunicaciones comerciales.
                  </li>
                  <li>
                    Usted puede revocar su consentimiento en cualquier momento, sin
                    efecto retroactivo, mediante comunicación escrita a{" "}
                    <a
                      href="mailto:privacidad@leasefy.com"
                      className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                    >
                      privacidad@leasefy.com
                    </a>
                    .
                  </li>
                  <li>
                    La revocación del consentimiento para finalidades principales
                    puede resultar en la imposibilidad de continuar prestando
                    algunos servicios.
                  </li>
                  <li>
                    Leasefy conserva prueba del consentimiento otorgado, incluyendo
                    fecha, hora, medio y alcance de la autorización.
                  </li>
                </ul>
              </section>

              {/* ── 8. USO DE IA Y DECISIONES AUTOMATIZADAS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  8. Uso de inteligencia artificial y decisiones automatizadas
                </h2>
                <p className="mb-3">
                  Leasefy utiliza sistemas de inteligencia artificial (IA) y
                  algoritmos automatizados en los siguientes procesos:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Evaluación de inquilinos (Scoring):</span>{" "}
                    análisis automatizado de información financiera, laboral y
                    personal para generar una puntuación de riesgo indicativa. Esta
                    puntuación es un insumo de apoyo y no una decisión final
                    automatizada.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Recomendaciones de propiedades:</span>{" "}
                    personalización de resultados de búsqueda basada en historial
                    de navegación y preferencias del usuario.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Detección de fraude:</span>{" "}
                    monitoreo automatizado de patrones de uso para identificar
                    actividades sospechosas.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Análisis de mercado:</span>{" "}
                    estimaciones de valor de arrendamiento basadas en datos del
                    mercado local.
                  </li>
                </ul>
                <p className="mt-3 mb-3">
                  Con respecto a las decisiones automatizadas, usted tiene derecho a:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Ser informado cuando una decisión que le afecte se base total o
                    parcialmente en un proceso automatizado.
                  </li>
                  <li>
                    Solicitar una explicación general de la lógica utilizada y los
                    factores principales que influyen en el resultado.
                  </li>
                  <li>
                    Solicitar la revisión humana de cualquier decisión automatizada
                    que le afecte significativamente.
                  </li>
                  <li>
                    Impugnar resultados que considere incorrectos o basados en
                    información errónea.
                  </li>
                </ul>
                <p className="mt-3 text-[13px] text-muted-foreground italic">
                  Leasefy se compromete a que sus sistemas de IA no discriminen por
                  motivos de raza, género, religión, orientación sexual, origen
                  nacional, discapacidad u otras categorías protegidas. Los modelos
                  son auditados periódicamente para detectar y corregir sesgos.
                </p>
              </section>

              {/* ── 9. DATOS FINANCIEROS Y HABEAS DATA ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  9. Datos financieros y habeas data
                </h2>
                <p className="mb-3">
                  Cuando la evaluación de inquilinos incluya consulta de información
                  financiera en centrales de riesgo:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">En Colombia:</span>{" "}
                    las consultas se realizan conforme a la Ley 1266 de 2008
                    (Habeas Data Financiero), previa autorización expresa del
                    titular. El titular tiene derecho a conocer, actualizar,
                    rectificar y solicitar la supresión de su información financiera.
                    Las centrales consultadas son aquellas autorizadas por la
                    Superintendencia de Industria y Comercio.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">En Estados Unidos:</span>{" "}
                    si en el futuro se accede a información de consumer reporting
                    agencies, Leasefy cumplirá con la Fair Credit Reporting Act
                    (FCRA), incluyendo el deber de proporcionar adverse action
                    notices, permitir la disputa de información inexacta y limitar
                    el uso permisible de reportes de crédito.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">En otras jurisdicciones:</span>{" "}
                    se cumplirá con la normativa local de protección de datos
                    financieros y crediticios aplicable.
                  </li>
                </ul>
              </section>

              {/* ── 10. COOKIES Y TECNOLOGÍAS DE RASTREO ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  10. Cookies y tecnologías de rastreo
                </h2>
                <p className="mb-3">
                  La Plataforma utiliza cookies y tecnologías similares para mejorar
                  la experiencia del usuario. A continuación se describen los tipos
                  de cookies utilizadas:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Cookies esenciales:</span>{" "}
                    necesarias para el funcionamiento básico de la Plataforma
                    (autenticación, seguridad, preferencias de sesión). No pueden
                    desactivarse.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Cookies de rendimiento:</span>{" "}
                    recopilan información anónima sobre el uso de la Plataforma
                    para mejorar su rendimiento y funcionalidad (tiempos de carga,
                    errores, páginas más visitadas).
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Cookies funcionales:</span>{" "}
                    permiten recordar preferencias del usuario (idioma, moneda,
                    filtros de búsqueda guardados).
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Cookies de análisis:</span>{" "}
                    utilizadas para comprender cómo los usuarios interactúan con la
                    Plataforma, mediante herramientas como Google Analytics u otras
                    plataformas de análisis.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Cookies de publicidad:</span>{" "}
                    se utilizan para mostrar publicidad relevante al usuario. Solo
                    se activan con su consentimiento explícito.
                  </li>
                </ul>
                <p className="mt-3">
                  Usted puede configurar su navegador para rechazar cookies no
                  esenciales o eliminar las cookies almacenadas. Tenga en cuenta que
                  la desactivación de ciertas cookies puede afectar la
                  funcionalidad de la Plataforma. También puede gestionar sus
                  preferencias de cookies desde el banner de consentimiento de la
                  Plataforma.
                </p>
              </section>

              {/* ── 11. COMPARTIR DATOS CON TERCEROS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  11. Compartir datos con terceros
                </h2>
                <p className="mb-3">
                  Leasefy podrá compartir sus datos personales con las siguientes
                  categorías de terceros, siempre conforme a la legislación
                  aplicable y con las garantías adecuadas:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Proveedores de servicios (encargados del tratamiento):</span>{" "}
                    empresas que prestan servicios en nombre de Leasefy, incluyendo
                    procesamiento de pagos, alojamiento en la nube, envío de
                    comunicaciones, análisis de datos y soporte técnico. Estos
                    proveedores están obligados contractualmente a proteger sus datos
                    y a utilizarlos exclusivamente para los fines autorizados.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Contrapartes del arrendamiento:</span>{" "}
                    los datos necesarios para la evaluación y formalización del
                    contrato podrán compartirse con la contraparte (Arrendador o
                    Arrendatario) según corresponda.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Agentes inmobiliarios e inmobiliarias:</span>{" "}
                    cuando un agente gestione propiedades en nombre de un
                    propietario, tendrá acceso a los datos necesarios para la
                    gestión del arrendamiento.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Centrales de riesgo e información financiera:</span>{" "}
                    cuando usted autorice la consulta o reporte de información
                    crediticia, conforme a la legislación aplicable.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Autoridades competentes:</span>{" "}
                    cuando exista una obligación legal, orden judicial,
                    requerimiento de autoridad administrativa o cuando sea necesario
                    para la prevención de actividades delictivas.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Empresas del grupo o afiliadas:</span>{" "}
                    con empresas vinculadas a Leasefy que cumplan con estándares
                    equivalentes de protección de datos.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">En caso de fusión, adquisición o reorganización:</span>{" "}
                    si Leasefy participa en una fusión, adquisición, venta de
                    activos o reestructuración, los datos personales podrán
                    transferirse como parte de la transacción, previa notificación
                    a los titulares.
                  </li>
                </ul>
                <p className="mt-3">
                  Leasefy <span className="text-foreground/85 font-medium">no vende</span>{" "}
                  datos personales a terceros para fines de marketing directo ni
                  para ningún otro fin comercial ajeno a la prestación de sus
                  servicios.
                </p>
              </section>

              {/* ── 12. TRANSFERENCIAS INTERNACIONALES DE DATOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  12. Transferencias internacionales de datos
                </h2>
                <p className="mb-3">
                  Dado que Leasefy opera en múltiples jurisdicciones y utiliza
                  proveedores de servicios globales, sus datos personales pueden
                  ser transferidos y procesados en países distintos al de su
                  residencia. Cuando esto ocurra:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Las transferencias se realizarán conforme a la normativa de
                    protección de datos aplicable en la jurisdicción de origen de
                    los datos.
                  </li>
                  <li>
                    Se implementarán garantías adecuadas, tales como cláusulas
                    contractuales tipo, acuerdos de transferencia de datos o la
                    verificación de que el país receptor ofrezca un nivel adecuado
                    de protección.
                  </li>
                  <li>
                    En Colombia, las transferencias internacionales cumplen con lo
                    establecido en el artículo 26 de la Ley 1581 de 2012 y la
                    Circular Única de la SIC.
                  </li>
                  <li>
                    En Brasil, las transferencias cumplen con el Capítulo V de la
                    LGPD (Arts. 33-36).
                  </li>
                  <li>
                    Los proveedores de infraestructura en la nube utilizados por
                    Leasefy cumplen con estándares internacionales de seguridad
                    (SOC 2 Type II, ISO 27001).
                  </li>
                </ul>
              </section>

              {/* ── 13. SEGURIDAD DE LOS DATOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  13. Seguridad de los datos
                </h2>
                <p className="mb-3">
                  Leasefy implementa medidas técnicas, administrativas y
                  organizativas apropiadas para proteger sus datos personales
                  contra el acceso no autorizado, la pérdida, la alteración, la
                  divulgación o la destrucción, incluyendo:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Cifrado de datos en tránsito (TLS/SSL) y en reposo (AES-256).
                  </li>
                  <li>
                    Autenticación multifactor (MFA) disponible para todos los
                    usuarios.
                  </li>
                  <li>
                    Control de acceso basado en roles (RBAC) con principio de
                    mínimo privilegio.
                  </li>
                  <li>
                    Monitoreo continuo de seguridad, detección de intrusiones y
                    registro de auditoría.
                  </li>
                  <li>
                    Evaluaciones periódicas de seguridad y pruebas de penetración.
                  </li>
                  <li>
                    Planes de respuesta a incidentes y continuidad del negocio.
                  </li>
                  <li>
                    Capacitación regular del personal en materia de protección de
                    datos y seguridad de la información.
                  </li>
                  <li>
                    Tokenización de datos financieros sensibles (números de tarjeta,
                    cuentas bancarias).
                  </li>
                </ul>
                <p className="mt-3">
                  No obstante, ningún sistema de seguridad es infalible. Leasefy no
                  puede garantizar la seguridad absoluta de la información y no
                  será responsable de brechas de seguridad que ocurran a pesar de
                  haber implementado medidas razonables y conformes al estado de la
                  técnica.
                </p>
              </section>

              {/* ── 14. RETENCIÓN DE DATOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  14. Retención de datos
                </h2>
                <p className="mb-3">
                  Leasefy conservará sus datos personales durante el tiempo
                  necesario para cumplir con las finalidades descritas en esta
                  Política, salvo que un período de retención mayor sea requerido o
                  permitido por la ley:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de cuenta activa:</span>{" "}
                    mientras la cuenta permanezca activa y durante el período
                    necesario para la prestación de servicios.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos contractuales:</span>{" "}
                    por un período mínimo de cinco (5) años después de la
                    terminación del contrato, conforme a las obligaciones legales
                    de retención documental.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos tributarios y contables:</span>{" "}
                    por el período establecido en la legislación tributaria
                    aplicable (generalmente 5-10 años).
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de prevención LA/FT:</span>{" "}
                    por un período mínimo de cinco (5) años después de la
                    terminación de la relación comercial, conforme a la normativa
                    de prevención de lavado de activos.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Registros de firma electrónica:</span>{" "}
                    por el período de validez del documento firmado y el plazo de
                    prescripción de las acciones legales derivadas del mismo.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Datos de evaluación/scoring:</span>{" "}
                    la vigencia de las evaluaciones es indicada al momento de su
                    generación. Los datos de soporte se conservan conforme a los
                    plazos legales aplicables.
                  </li>
                </ul>
                <p className="mt-3">
                  Una vez cumplido el período de retención, los datos serán
                  eliminados de forma segura o anonimizados de manera irreversible
                  para fines estadísticos.
                </p>
              </section>

              {/* ── 15. DERECHOS DEL TITULAR ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  15. Derechos del titular
                </h2>
                <p className="mb-3">
                  Independientemente de su jurisdicción, como titular de datos
                  personales usted tiene los siguientes derechos fundamentales:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground/85 font-medium">Acceso:</span>{" "}
                    conocer qué datos personales suyos están siendo tratados por
                    Leasefy y obtener una copia de los mismos.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Rectificación:</span>{" "}
                    solicitar la corrección de datos personales inexactos,
                    incompletos o desactualizados.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Supresión / Eliminación:</span>{" "}
                    solicitar la eliminación de sus datos personales cuando ya no
                    sean necesarios para las finalidades autorizadas, cuando revoque
                    su consentimiento, o cuando el tratamiento sea ilícito.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Revocación del consentimiento:</span>{" "}
                    retirar en cualquier momento el consentimiento otorgado para el
                    tratamiento de sus datos, sin efecto retroactivo.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Oposición:</span>{" "}
                    oponerse al tratamiento de sus datos para finalidades
                    específicas, especialmente para fines de marketing directo.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Portabilidad:</span>{" "}
                    solicitar la entrega de sus datos personales en un formato
                    estructurado, de uso común y lectura mecánica, cuando sea
                    técnicamente factible y la legislación lo prevea.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Limitación del tratamiento:</span>{" "}
                    solicitar que se restrinja el tratamiento de sus datos en
                    determinadas circunstancias.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">No ser objeto de decisiones automatizadas:</span>{" "}
                    solicitar intervención humana en decisiones basadas
                    exclusivamente en tratamientos automatizados que le afecten
                    significativamente.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Solicitar prueba del consentimiento:</span>{" "}
                    pedir evidencia de la autorización otorgada para el tratamiento
                    de sus datos.
                  </li>
                  <li>
                    <span className="text-foreground/85 font-medium">Presentar quejas:</span>{" "}
                    acudir ante la autoridad de protección de datos competente en
                    su jurisdicción si considera que sus derechos han sido
                    vulnerados.
                  </li>
                </ul>
                <p className="mt-3">
                  Para ejercer cualquiera de estos derechos, envíe su solicitud a{" "}
                  <a
                    href="mailto:privacidad@leasefy.com"
                    className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                  >
                    privacidad@leasefy.com
                  </a>
                  {" "}indicando: (a) su nombre completo y datos de contacto; (b) una
                  descripción clara de su solicitud; (c) documentos que acrediten
                  su identidad. Leasefy responderá dentro de los plazos
                  establecidos por la legislación aplicable (15 días hábiles en
                  Colombia, conforme a la Ley 1581 de 2012).
                </p>
              </section>

              {/* ── 16. DERECHOS ESPECÍFICOS POR JURISDICCIÓN ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  16. Derechos específicos por jurisdicción
                </h2>
                <p className="mb-4">
                  Además de los derechos generales descritos en la Sección 15, las
                  siguientes jurisdicciones otorgan derechos adicionales:
                </p>

                {/* Colombia */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    16.1. Colombia
                  </h3>
                  <p className="mb-2">
                    De conformidad con la Ley 1581 de 2012 y el Decreto 1377 de
                    2013:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los titulares pueden ejercer sus derechos de consulta (Art. 14)
                      y reclamo (Art. 15) directamente ante Leasefy.
                    </li>
                    <li>
                      Las consultas serán atendidas en un término máximo de diez (10)
                      días hábiles. Los reclamos en un término máximo de quince (15)
                      días hábiles, prorrogables por ocho (8) días más.
                    </li>
                    <li>
                      Para datos de habeas data financiero (Ley 1266 de 2008), el
                      titular puede solicitar la actualización, rectificación o
                      supresión de información reportada en centrales de riesgo.
                    </li>
                    <li>
                      Autoridad de supervisión: Superintendencia de Industria y
                      Comercio (SIC), Delegatura para la Protección de Datos
                      Personales.
                    </li>
                  </ul>
                </div>

                {/* México */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    16.2. México
                  </h3>
                  <p className="mb-2">
                    De conformidad con la LFPDPPP:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los titulares gozan de los derechos ARCO (Acceso,
                      Rectificación, Cancelación y Oposición).
                    </li>
                    <li>
                      Las solicitudes ARCO serán atendidas en un plazo máximo de
                      veinte (20) días hábiles.
                    </li>
                    <li>
                      El Aviso de Privacidad se pone a disposición del titular al
                      momento de la recopilación de datos, conforme al artículo 15
                      de la LFPDPPP.
                    </li>
                    <li>
                      Autoridad de supervisión: Instituto Nacional de Transparencia,
                      Acceso a la Información y Protección de Datos Personales
                      (INAI).
                    </li>
                  </ul>
                </div>

                {/* Brasil */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    16.3. Brasil
                  </h3>
                  <p className="mb-2">
                    De conformidad con la LGPD (Lei 13.709/2018):
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los titulares tienen derechos de confirmación de existencia
                      del tratamiento, acceso, corrección, anonimización, bloqueo,
                      eliminación, portabilidad, información sobre compartición
                      con terceros y revocación del consentimiento.
                    </li>
                    <li>
                      Leasefy designará un Encarregado (DPO) conforme al artículo
                      41 de la LGPD, cuyos datos de contacto estarán publicados en
                      la Plataforma.
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
                    16.4. Chile
                  </h3>
                  <p className="mb-2">
                    De conformidad con la Ley 19.628 y la futura Ley 21.719 (vigente
                    a partir de diciembre de 2026):
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los titulares tienen derechos de acceso, rectificación,
                      cancelación, oposición y portabilidad (este último bajo la
                      nueva Ley 21.719).
                    </li>
                    <li>
                      La nueva ley establecerá la Agencia de Protección de Datos
                      Personales como autoridad de supervisión.
                    </li>
                  </ul>
                </div>

                {/* Perú y Argentina */}
                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    16.5. Perú
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los titulares gozan de los derechos establecidos en la Ley
                      29733: acceso, rectificación, cancelación, oposición e
                      información.
                    </li>
                    <li>
                      Autoridad de supervisión: Autoridad Nacional de Protección
                      de Datos Personales (ANPDP), adscrita al Ministerio de
                      Justicia.
                    </li>
                  </ul>
                </div>

                <div className="mb-6 pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    16.6. Argentina
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      Los titulares gozan de los derechos establecidos en la Ley
                      25.326: acceso, rectificación, actualización, supresión y
                      confidencialidad.
                    </li>
                    <li>
                      Autoridad de supervisión: Agencia de Acceso a la Información
                      Pública (AAIP).
                    </li>
                  </ul>
                </div>

                {/* Estados Unidos */}
                <div className="pl-4 border-l-2 border-foreground/10">
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    16.7. Estados Unidos
                  </h3>
                  <p className="mb-2">
                    Para residentes de California y otros estados con leyes de
                    privacidad:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>
                      <span className="text-foreground/85 font-medium">California (CCPA/CPRA):</span>{" "}
                      los residentes de California tienen derecho a: (a) conocer qué
                      información personal se recopila y cómo se utiliza; (b)
                      solicitar la eliminación de su información; (c) optar por no
                      participar en la &quot;venta&quot; o &quot;compartición&quot; de información
                      personal; (d) no ser discriminados por ejercer sus derechos de
                      privacidad; (e) corregir información personal inexacta; (f)
                      limitar el uso de información personal sensible. Leasefy no
                      vende información personal de los usuarios.
                    </li>
                    <li>
                      <span className="text-foreground/85 font-medium">Otros estados:</span>{" "}
                      Leasefy cumplirá con las leyes de privacidad estatales
                      aplicables, incluyendo las de Virginia (VCDPA), Colorado
                      (CPA), Connecticut (CTDPA), Utah (UCPA) y otros estados que
                      adopten legislación de privacidad.
                    </li>
                    <li>
                      Leasefy no recopila deliberadamente información de menores de
                      13 años (COPPA). Si toma conocimiento de que un menor ha
                      proporcionado información, la eliminará de inmediato.
                    </li>
                  </ul>
                </div>
              </section>

              {/* ── 17. MENORES DE EDAD ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  17. Menores de edad
                </h2>
                <p>
                  La Plataforma está diseñada para personas mayores de edad según
                  la legislación de cada jurisdicción. Leasefy no recopila
                  deliberadamente datos personales de menores de edad. Si toma
                  conocimiento de que un menor ha proporcionado datos personales
                  sin la autorización de su representante legal, procederá a
                  eliminar dicha información de manera inmediata. Si usted es padre,
                  madre o tutor legal y tiene conocimiento de que un menor bajo su
                  responsabilidad ha proporcionado datos a la Plataforma, por favor
                  contáctenos a{" "}
                  <a
                    href="mailto:privacidad@leasefy.com"
                    className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                  >
                    privacidad@leasefy.com
                  </a>
                  .
                </p>
              </section>

              {/* ── 18. NOTIFICACIÓN DE INCIDENTES ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  18. Notificación de incidentes de seguridad
                </h2>
                <p className="mb-3">
                  En caso de que ocurra un incidente de seguridad que afecte datos
                  personales, Leasefy:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Activará su plan de respuesta a incidentes de manera inmediata
                    para contener y mitigar el impacto.
                  </li>
                  <li>
                    Notificará a la autoridad de protección de datos competente
                    dentro de los plazos establecidos por la legislación aplicable
                    (72 horas bajo LGPD en Brasil; sin plazo específico pero
                    &quot;oportunamente&quot; bajo la Ley 1581 de 2012 en Colombia).
                  </li>
                  <li>
                    Notificará a los titulares afectados cuando el incidente
                    represente un riesgo alto para sus derechos y libertades,
                    indicando: (a) la naturaleza del incidente; (b) los datos
                    potencialmente afectados; (c) las medidas adoptadas; (d) las
                    recomendaciones para proteger sus intereses.
                  </li>
                  <li>
                    Documentará internamente todos los incidentes de seguridad,
                    incluyendo las causas, el impacto y las acciones correctivas
                    implementadas.
                  </li>
                </ul>
              </section>

              {/* ── 19. MODIFICACIONES A LA POLÍTICA ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  19. Modificaciones a esta Política
                </h2>
                <p className="mb-3">
                  Leasefy se reserva el derecho de modificar esta Política en
                  cualquier momento para reflejar cambios en nuestras prácticas,
                  la legislación aplicable o la operación de la Plataforma. Las
                  modificaciones serán comunicadas mediante:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    Publicación de la versión actualizada en la Plataforma con la
                    fecha de la última modificación.
                  </li>
                  <li>
                    Notificación por correo electrónico para cambios sustanciales
                    que afecten el tratamiento de datos, con al menos quince (15)
                    días de antelación.
                  </li>
                  <li>
                    Para cambios que requieran consentimiento adicional conforme a
                    la ley, se solicitará nueva autorización antes de implementar
                    las modificaciones.
                  </li>
                </ul>
                <p className="mt-3">
                  El uso continuado de la Plataforma después de la publicación de
                  cambios constituirá aceptación de la Política modificada.
                </p>
              </section>

              {/* ── 20. CONTACTO Y OFICIAL DE PROTECCIÓN DE DATOS ── */}
              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  20. Contacto y oficial de protección de datos
                </h2>
                <p className="mb-3">
                  Para ejercer sus derechos, realizar consultas o presentar
                  reclamaciones relacionadas con el tratamiento de sus datos
                  personales, puede comunicarse con nosotros a través de los
                  siguientes canales:
                </p>
                <div className="p-5 border border-border rounded-lg bg-muted/30 space-y-1">
                  <p className="text-foreground font-medium">Leasefy S.A.S.</p>
                  <p className="text-foreground font-medium text-[13px] mt-1">
                    Oficial de Protección de Datos / Data Protection Officer
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Correo:{" "}
                    <a
                      href="mailto:privacidad@leasefy.com"
                      className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                    >
                      privacidad@leasefy.com
                    </a>
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Correo alternativo:{" "}
                    <a
                      href="mailto:dpo@leasefy.com"
                      className="text-foreground underline underline-offset-4 hover:text-foreground/70 transition-colors"
                    >
                      dpo@leasefy.com
                    </a>
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Bogotá D.C., Colombia
                  </p>
                </div>

                <div className="mt-6 p-4 border border-border rounded-lg bg-muted/20">
                  <p className="text-[14px] font-medium text-foreground mb-2">
                    Autoridades de supervisión por jurisdicción
                  </p>
                  <ul className="space-y-1 text-[13px] text-muted-foreground">
                    <li>
                      <span className="text-foreground/85">Colombia:</span>{" "}
                      Superintendencia de Industria y Comercio (SIC) — www.sic.gov.co
                    </li>
                    <li>
                      <span className="text-foreground/85">México:</span>{" "}
                      Instituto Nacional de Transparencia (INAI) — www.inai.org.mx
                    </li>
                    <li>
                      <span className="text-foreground/85">Brasil:</span>{" "}
                      Autoridade Nacional de Proteção de Dados (ANPD) — www.gov.br/anpd
                    </li>
                    <li>
                      <span className="text-foreground/85">Chile:</span>{" "}
                      Consejo para la Transparencia — www.consejotransparencia.cl
                    </li>
                    <li>
                      <span className="text-foreground/85">Perú:</span>{" "}
                      Autoridad Nacional de Protección de Datos Personales — www.gob.pe/anpdp
                    </li>
                    <li>
                      <span className="text-foreground/85">Argentina:</span>{" "}
                      Agencia de Acceso a la Información Pública (AAIP) — www.argentina.gob.ar/aaip
                    </li>
                    <li>
                      <span className="text-foreground/85">Estados Unidos:</span>{" "}
                      Federal Trade Commission (FTC) — www.ftc.gov | California Attorney General — oag.ca.gov
                    </li>
                  </ul>
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
