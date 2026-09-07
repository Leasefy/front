/**
 * El texto de los Términos y Condiciones, sin la página alrededor.
 *
 * Vive aparte de `app/terminos/page.tsx` para poder mostrarse también dentro
 * de un cajón: en el paso «Habeas Data» del registro de la inmobiliaria el
 * enlace abría la página completa en otra pestaña y sacaba a la persona del
 * asistente (Nico, 2026-09-07: «que no lo saque a uno a otro lado»). Un solo
 * texto, dos superficies: la página pública y el cajón del asistente.
 */
export function TerminosContenido() {
  return (
    <>
            <div className="mb-10 rounded-lg border border-border bg-surface-muted/40 p-5 text-[14px]">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
                <dt className="font-medium text-foreground">Prestador</dt>
                <dd className="text-muted-foreground">Leasefy S.A.S.</dd>
                <dt className="font-medium text-foreground">Domicilio</dt>
                <dd className="text-muted-foreground">Sabaneta, Antioquia, Colombia</dd>
                <dt className="font-medium text-foreground">Contacto</dt>
                <dd className="text-muted-foreground">hola@leasefy.co</dd>
                <dt className="font-medium text-foreground">Ámbito</dt>
                <dd className="text-muted-foreground">Colombia, únicamente</dd>
                <dt className="font-medium text-foreground">Vigente desde</dt>
                <dd className="text-muted-foreground">5 de septiembre de 2026</dd>
                <dt className="font-medium text-foreground">Versión</dt>
                <dd className="text-muted-foreground font-mono">v2.0</dd>
              </dl>
            </div>

            <div className="space-y-10 text-[15px] text-foreground/85 leading-relaxed">

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">1. Qué es esto</h2>
                <p className="mb-3">
                  Leasefy es una plataforma que usan las inmobiliarias colombianas
                  para administrar arriendos: publicar inmuebles, estudiar
                  candidatos, generar contratos, recaudar el canon, girarlo al
                  propietario y gestionar la cartera.
                </p>
                <p>
                  Estos términos regulan el uso de la plataforma. Se rigen por la ley
                  colombiana. <strong className="text-foreground/90">Sólo operamos en Colombia</strong>{" "}
                  y no prestamos el servicio en otros países.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  2. Lo que Leasefy no es
                </h2>
                <p className="mb-3">Conviene decirlo antes que nada:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                  <li><strong className="text-foreground/85">No somos parte del contrato de arrendamiento.</strong> Ese contrato es entre el propietario y el inquilino.</li>
                  <li><strong className="text-foreground/85">No somos inmobiliaria.</strong> No captamos, no mostramos inmuebles ni asesoramos sobre arrendar.</li>
                  <li><strong className="text-foreground/85">No somos entidad financiera, aseguradora ni afianzadora</strong>, ni garantizamos el pago del canon.</li>
                  <li><strong className="text-foreground/85">No damos asesoría jurídica, contable ni tributaria.</strong> Las plantillas y los cálculos son herramientas; la responsabilidad de usarlos bien es de quien los usa.</li>
                  <li><strong className="text-foreground/85">No decidimos a quién se le arrienda.</strong> Eso lo decide el propietario o su inmobiliaria (§10).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  3. Tres relaciones distintas, y cuál te aplica
                </h2>
                <p className="mb-3">
                  No todos los que usan la plataforma tienen el mismo contrato con
                  nosotros, y la ley no los trata igual.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-3">
                  <li>
                    <strong className="text-foreground/85">La inmobiliaria</strong> contrata el
                    servicio para su actividad económica. Le aplican estos términos
                    completos, incluidas las secciones 6, 8, 9 y 18.
                  </li>
                  <li>
                    <strong className="text-foreground/85">El propietario</strong> usa el portal
                    para ver su inmueble, sus giros y sus documentos. Si contrata
                    directamente con nosotros un plan pago, es consumidor.
                  </li>
                  <li>
                    <strong className="text-foreground/85">El inquilino y el candidato</strong> usan
                    el portal para postularse, firmar y pagar. Son consumidores.
                  </li>
                </ul>
                <p>
                  Cuando alguien actúa como consumidor, se aplica el Estatuto del
                  Consumidor (Ley 1480 de 2011) y{" "}
                  <strong className="text-foreground/90">ninguna cláusula de estos términos limita los derechos que esa ley le reconoce</strong>.
                  Si algo de acá dijera lo contrario, no produce efecto.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  4. Cuenta y seguridad
                </h2>
                <p className="mb-3">
                  Para usar la plataforma hay que crear una cuenta con información
                  veraz y mantenerla al día. Sos responsable de lo que pase con tus
                  credenciales; avisanos apenas sospeches un uso no autorizado.
                </p>
                <p>
                  Sólo puede abrir cuenta quien sea mayor de edad. Una cuenta admite
                  una sesión activa a la vez: al entrar desde otro dispositivo, la
                  anterior se cierra.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  5. Disponibilidad del servicio
                </h2>
                <p className="mb-3">
                  Trabajamos para que la plataforma esté disponible y funcione como se
                  describe. Puede haber interrupciones por mantenimiento, por fallas
                  de terceros de los que dependemos —el proveedor de nube, la
                  pasarela de pagos, la telefonía— o por causas fuera de nuestro
                  control.
                </p>
                <p>
                  Avisamos con anticipación los mantenimientos programados. Ante una
                  interrupción prolongada imputable a nosotros, la inmobiliaria puede
                  pedir la compensación proporcional del período no disponible.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  6. Planes, precios y facturación
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li>Los precios vigentes son los publicados al momento de contratar, en pesos colombianos y con los impuestos discriminados.</li>
                  <li>Un cambio de precio se avisa con <strong className="text-foreground/85">treinta (30) días</strong> de anticipación y rige desde el siguiente período.</li>
                  <li>La facturación es mensual o anual, según lo contratado.</li>
                  <li>La mora puede llevar a suspender el servicio, previo aviso, sin perjuicio del cobro de lo adeudado.</li>
                  <li><strong className="text-foreground/85">Podés cancelar cuando quieras</strong>, desde la configuración de la cuenta y sin penalidad. La cancelación surte efecto al final del período pagado.</li>
                </ul>
                <p>
                  Al cancelar, mantenemos tu información disponible para descarga
                  durante <strong className="text-foreground/90">sesenta (60) días</strong>.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  7. Retracto y reversión del pago
                </h2>
                <p className="mb-3">
                  Si contratás como consumidor, tenés{" "}
                  <strong className="text-foreground/90">cinco (5) días hábiles</strong> para
                  retractarte, contados desde la celebración del contrato, conforme al
                  artículo 47 de la Ley 1480 de 2011. Escribinos a{" "}
                  <span className="text-foreground/85 font-medium">hola@leasefy.co</span> y
                  devolvemos lo pagado dentro de los{" "}
                  <strong className="text-foreground/90">quince (15) días calendario</strong>{" "}
                  siguientes.
                </p>
                <p>
                  También podés pedir la <strong className="text-foreground/90">reversión del pago</strong>{" "}
                  cuando haya fraude, una operación que no solicitaste, o un servicio
                  no prestado o distinto del contratado (artículo 51 de la misma ley),
                  dentro de los cinco días hábiles siguientes a que te enteres,
                  avisándonos a nosotros y a tu banco o emisor del medio de pago.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  8. El dinero del arriendo: de quién es y cuándo se gira
                </h2>
                <p className="mb-3">
                  Cuando la inmobiliaria usa la plataforma para recaudar, lo hace bajo
                  un <strong className="text-foreground/90">mandato de administración específica y determinada</strong>:
                  recaudar el canon, descontar la comisión pactada y las retenciones
                  que correspondan, y girar el saldo al propietario en el plazo
                  convenido. Nada más.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li><strong className="text-foreground/85">El dinero recaudado es del propietario</strong> desde que ingresa y hasta que se le gira. Está en tránsito, no en administración libre.</li>
                  <li><strong className="text-foreground/85">No invertimos, prestamos ni disponemos de esos fondos</strong>, ni los retenemos a discreción, ni generan rendimientos a nuestro favor.</li>
                  <li><strong className="text-foreground/85">No hay billetera ni saldo acumulable.</strong> La plataforma no abre depósitos ni guarda dinero a la vista de nadie.</li>
                  <li>El recaudo se procesa a través de pasarelas autorizadas y vigiladas. No almacenamos datos de tarjetas.</li>
                  <li>Podemos retener un giro cuando exista una orden de autoridad competente o un indicio razonable de fraude, informando el motivo.</li>
                </ul>
                <p>
                  Cada giro queda soportado con su detalle: qué se recaudó, qué se
                  descontó y por qué concepto.{" "}
                  <strong className="text-foreground/90">Girar fuera del plazo pactado es un incumplimiento del contrato de administración</strong>,
                  y como tal puede reclamarse.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  9. El agente automatizado (Piloto)
                </h2>
                <p className="mb-3">
                  La plataforma incluye agentes que ejecutan gestiones por cuenta de
                  la inmobiliaria. Activarlos es{" "}
                  <strong className="text-foreground/90">un mandato aparte, limitado y revocable</strong>,
                  que se acepta con una manifestación propia y no queda incluido en la
                  aceptación general de estos términos.
                </p>
                <p className="mb-2 font-medium text-foreground/90">Lo que el agente puede hacer</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-3">
                  <li>Enviar recordatorios y comunicaciones de cobro por los canales autorizados.</li>
                  <li>Realizar llamadas de gestión de cartera dentro de los horarios y frecuencias que permite la ley.</li>
                  <li>Proponer acuerdos de pago dentro de los límites que la inmobiliaria configuró.</li>
                  <li>Agendar visitas, citas y recordatorios.</li>
                  <li>Preparar documentos, conciliaciones y reportes para revisión humana.</li>
                  <li>Priorizar la cartera y sugerir la siguiente gestión.</li>
                </ul>
                <p className="mb-3 text-muted-foreground">
                  <strong className="text-foreground/85">Toda acción no incluida en esta lista está prohibida.</strong>
                </p>
                <p className="mb-2 font-medium text-foreground/90">Lo que el agente no puede hacer</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-3">
                  <li>Disponer de fondos, ordenar giros o aprobar dispersiones por sí solo.</li>
                  <li>Celebrar, modificar o terminar un contrato de arrendamiento.</li>
                  <li>Condonar deudas, otorgar quitas o renunciar a derechos del propietario.</li>
                  <li>Iniciar acciones judiciales.</li>
                  <li>Reportar a centrales de riesgo sin la decisión de una persona.</li>
                </ul>
                <p className="mb-3">
                  <strong className="text-foreground/90">Tres modos.</strong> En{" "}
                  <em>sombra</em> el agente sólo sugiere; en <em>copiloto</em> prepara y
                  espera aprobación; en <em>autónomo</em> ejecuta las acciones de la
                  lista de arriba. El modo lo elige la inmobiliaria y puede cambiarlo
                  o apagarlo cuando quiera, volviendo a gestión manual.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">El modo nunca levanta un límite legal.</strong>{" "}
                  Los horarios y la frecuencia de contacto de la Ley 2300 de 2023, el
                  respeto a quien pidió no ser contactado y las reglas de protección de
                  datos se verifican antes de cada gestión, en cualquier modo. La
                  autonomía sólo puede exigir más intervención humana, nunca menos
                  cumplimiento.
                </p>
                <p className="mb-2 font-medium text-foreground/90">Cómo se comunica</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-3">
                  <li>Se identifica como sistema automatizado al inicio de cada llamada.</li>
                  <li>Informa que la llamada se graba.</li>
                  <li>Tiene prohibido usar lenguaje intimidatorio o humillante, y simular ser una autoridad, un juzgado o un despacho judicial.</li>
                  <li>No pregunta el motivo del incumplimiento (artículo 7 de la Ley 2300).</li>
                  <li>No contacta a referencias ni a terceros ajenos a la obligación.</li>
                </ul>
                <p>
                  Cada gestión queda registrada con fecha, hora, canal, destinatario y
                  contenido. La inmobiliaria puede consultar ese registro, y la persona
                  contactada puede pedir copia de la gestión que la involucra.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  10. Estudio de candidatos: quién decide
                </h2>
                <p className="mb-3">
                  La plataforma organiza la información de un candidato y produce un
                  puntaje de riesgo.{" "}
                  <strong className="text-foreground/90">Ese puntaje es un insumo, no una decisión.</strong>{" "}
                  Quien decide a quién arrendarle es el propietario o su inmobiliaria,
                  bajo su responsabilidad.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li>La consulta a centrales de riesgo requiere autorización previa, expresa e informada del candidato, otorgada por separado.</li>
                  <li>Una decisión no puede basarse únicamente en el reporte de incumplimiento de una central. Ante un rechazo, el candidato puede pedir por escrito las razones objetivas.</li>
                  <li>El candidato puede pedir que una persona revise una decisión que se haya tomado con apoyo de sistemas automatizados.</li>
                  <li>Está prohibido usar la plataforma para discriminar por raza, sexo, orientación sexual, religión, origen, discapacidad, edad o composición familiar.</li>
                </ul>
                <p>
                  El detalle del tratamiento de datos está en la{" "}
                  <a href="/privacidad" className="text-foreground/90 underline underline-offset-2">Política de tratamiento</a>.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  11. Contratos de arrendamiento
                </h2>
                <p className="mb-3">
                  Las plantillas de la plataforma son un punto de partida, no asesoría
                  legal. Quien las usa debe revisarlas y adaptarlas.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">Vivienda urbana.</strong> Se rige por la
                  Ley 820 de 2003. Conviene tener presente que{" "}
                  <strong className="text-foreground/90">está prohibido exigir depósitos en dinero u otras cauciones reales</strong>{" "}
                  (artículo 16), bajo cualquier denominación; que el canon no puede
                  exceder el 1 % del valor comercial del inmueble (artículo 18); que el
                  reajuste anual no puede superar el IPC del año anterior y{" "}
                  <strong className="text-foreground/90">debe comunicarse por el medio que el contrato haya previsto, so pena de ser inoponible</strong>{" "}
                  (artículo 20); y que hay que entregar copia firmada al arrendatario y
                  al codeudor dentro de los diez días siguientes (artículo 8).
                </p>
                <p>
                  <strong className="text-foreground/90">Local comercial.</strong> Es otro régimen:
                  artículos 518 a 524 del Código de Comercio, que son imperativos —
                  incluyen el derecho de renovación y el desahucio con seis meses de
                  anticipación—. No se puede usar una plantilla de vivienda para un
                  local.
                </p>
                <p>
                  Desde la Ley 2625 de 2026, el arrendatario de un local tiene derecho
                  a fijar un <strong className="text-foreground/90">aviso de traslado</strong> de
                  hasta 1.600 cm² durante un mes contado desde la restitución, a su
                  costo, y{" "}
                  <strong className="text-foreground/90">nadie puede oponerse</strong> — ni el
                  propietario, ni el arrendador, ni el nuevo arrendatario—, so pena de
                  multa. Una cláusula que lo prohíba quedó sin efecto.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  12. Firma electrónica
                </h2>
                <p className="mb-3">
                  Al usar la plataforma para firmar,{" "}
                  <strong className="text-foreground/90">las partes acuerdan expresamente que el método de firma que provee Leasefy es el mecanismo de identificación y autenticación del documento</strong>,
                  conforme a la Ley 527 de 1999 y a los artículos 2.2.2.47.1 y
                  siguientes del Decreto 1074 de 2015. La firma así realizada tiene los
                  mismos efectos que la manuscrita.
                </p>
                <p>
                  De cada firma conservamos el registro del método usado, la fecha y
                  hora, la dirección IP y la evidencia de integridad del documento, y
                  entregamos copia a quien la pida. El documento se conserva en su
                  formato original.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  13. Estudio de asegurabilidad y pólizas
                </h2>
                <p className="mb-3">
                  La plataforma permite solicitar el estudio de asegurabilidad de un
                  candidato ante aseguradoras y afianzadoras, y consultar el resultado.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li><strong className="text-foreground/85">Leasefy no es aseguradora, afianzadora ni corredor de seguros</strong>, y no interviene en la decisión de asegurar ni en los términos de la póliza.</li>
                  <li>La aprobación, el rechazo, la prima y las condiciones las define la compañía, bajo sus propios criterios y su propia responsabilidad.</li>
                  <li>La póliza, si se expide, es un contrato entre esa compañía y quien la tome. Nosotros transmitimos la información y mostramos el resultado.</li>
                  <li>Un rechazo de asegurabilidad no es una decisión de Leasefy y sus razones las da la compañía que lo emitió.</li>
                </ul>
                <p>
                  El envío de datos del candidato a una aseguradora requiere su
                  autorización previa, en los términos de la{" "}
                  <a href="/privacidad" className="text-foreground/90 underline underline-offset-2">Política de tratamiento</a>.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  14. Estimación comercial de valor
                </h2>
                <p className="mb-3">
                  Cuando la plataforma calcula cuánto podría valer un inmueble, el
                  resultado es una{" "}
                  <strong className="text-foreground/90">estimación comercial de valor referencial</strong>:
                  una referencia para decidir un precio de arriendo o de venta.
                </p>
                <p>
                  <strong className="text-foreground/90">No constituye un avalúo formal</strong>{" "}
                  ni un dictamen pericial, no lo emite un avaluador inscrito en el
                  Registro Abierto de Avaluadores, y no puede presentarse como tal
                  ante una entidad financiera, una autoridad ni un juez. Cuando la
                  ley o un tercero exijan un avalúo, hay que contratarlo aparte, con
                  un avaluador inscrito (Ley 1673 de 2013).
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  15. Contabilidad, facturación y conciliación
                </h2>
                <p className="mb-3">
                  La plataforma ayuda a llevar los registros contables, calcular
                  impuestos y retenciones, conciliar el extracto bancario y preparar
                  documentos. Son herramientas de apoyo.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li><strong className="text-foreground/85">La responsabilidad tributaria y contable es de la inmobiliaria</strong>, incluidas las obligaciones de agente retenedor cuando administra por cuenta de terceros.</li>
                  <li>Los cálculos dependen de la información y de la configuración que cargue el usuario —tarifas, perfiles tributarios, bases—. Revisarlos antes de declarar o pagar es parte de su deber.</li>
                  <li>La conciliación sugiere cruces entre movimientos; confirmarlos es una decisión humana.</li>
                  <li>La emisión de factura electrónica ante la DIAN se realiza a través de proveedores habilitados. Quien está obligado a facturar sigue siendo el responsable ante la autoridad.</li>
                </ul>
                <p>
                  No damos asesoría tributaria ni contable, y un error de configuración
                  del usuario no se convierte en responsabilidad nuestra por haber
                  usado la herramienta.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  16. Mantenimientos, solicitudes, agenda y mensajería
                </h2>
                <p className="mb-3">
                  La plataforma permite registrar solicitudes de arreglo y PQRS,
                  agendar visitas y comunicar a la inmobiliaria con propietarios e
                  inquilinos.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                  <li>Somos el canal, no el prestador: la ejecución de un arreglo, la respuesta a una PQRS y el cumplimiento de una visita son de la inmobiliaria o del proveedor que ella contrate.</li>
                  <li>Registrar una solicitud no la aprueba ni compromete a nadie a atenderla en un plazo, salvo que la inmobiliaria lo haya pactado.</li>
                  <li>El contenido de los mensajes es de quien los escribe. No los moderamos, y sólo accedemos a ellos para prestar el servicio, atender un reclamo o cumplir una orden de autoridad.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  17. Migración de información
                </h2>
                <p>
                  Si traés información desde otro sistema, seguís siendo su
                  responsable: que sea veraz, que tengas derecho a usarla y que
                  cuentes con la autorización de los titulares. Nosotros la
                  importamos, mostramos qué quedó sin poder asociarse y no la
                  completamos por inferencia.{" "}
                  <strong className="text-foreground/90">Revisar el resultado de una migración antes de operar sobre él es parte del trabajo</strong>,
                  porque de ahí salen los cobros.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  18. Obligaciones de la inmobiliaria
                </h2>
                <p className="mb-3">
                  Además de lo anterior, quien contrata la plataforma para su
                  operación se obliga a:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li><strong className="text-foreground/85">Contar con la matrícula de arrendadores</strong> vigente donde la ley se la exija, e incluir su número en sus anuncios y contratos (artículos 28 a 31 de la Ley 820).</li>
                  <li>Tener autorización de los propietarios para publicar y administrar sus inmuebles.</li>
                  <li><strong className="text-foreground/85">Haber obtenido la autorización de tratamiento de datos</strong> de las personas cuya información carga en la plataforma, y responder como responsable del tratamiento frente a ellas (§19).</li>
                  <li>Cumplir las obligaciones de prevención de lavado de activos que le correspondan según su tamaño y actividad.</li>
                  <li>Publicar información veraz de los inmuebles. Lo que se anuncia obliga a quien lo anuncia (artículo 29 de la Ley 1480).</li>
                  <li>Cumplir sus obligaciones tributarias, incluidas las de agente retenedor cuando administra por cuenta de terceros.</li>
                </ul>
                <p>
                  Damos las herramientas para cumplir estos deberes; cumplirlos es de
                  la inmobiliaria.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  19. Datos personales: quién responde
                </h2>
                <p className="mb-3">
                  Cuando la inmobiliaria carga en la plataforma datos de sus
                  propietarios, inquilinos, codeudores o deudores,{" "}
                  <strong className="text-foreground/90">ella es la responsable del tratamiento y Leasefy actúa como encargado</strong>,
                  tratándolos por su cuenta y siguiendo sus instrucciones.
                </p>
                <p className="mb-3">Como encargado nos obligamos a:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground mb-3">
                  <li>Tratar los datos sólo para las finalidades que el titular autorizó y que la inmobiliaria indicó.</li>
                  <li>Aplicar las obligaciones de la política de tratamiento de la inmobiliaria.</li>
                  <li>Guardar la seguridad y la confidencialidad de la información.</li>
                  <li>Atender las consultas y reclamos que nos lleguen y trasladarlos cuando corresponda.</li>
                  <li>Informarle cualquier incidente de seguridad que afecte sus datos, y reportarlo a la autoridad cuando la ley nos obligue.</li>
                  <li>Devolver o suprimir los datos al terminar la relación, salvo lo que debamos conservar por ley.</li>
                </ul>
                <p>
                  De los datos de nuestros propios clientes y de quien navega el sitio,
                  el responsable es Leasefy. Todo el detalle está en la{" "}
                  <a href="/privacidad" className="text-foreground/90 underline underline-offset-2">Política de tratamiento</a>.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  20. Usos prohibidos
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                  <li>Publicar inmuebles inexistentes, ajenos o sin autorización para ofrecerlos.</li>
                  <li>Suplantar identidades o falsificar documentos.</li>
                  <li>Usar la plataforma para lavar activos o financiar actividades ilícitas.</li>
                  <li>Discriminar en la selección de arrendatarios.</li>
                  <li>Usar el resultado de un estudio para una finalidad distinta de decidir sobre ese arrendamiento, o compartirlo con quien no participa en él.</li>
                  <li>Extraer información de forma automatizada, vulnerar la seguridad o hacer ingeniería inversa del software.</li>
                  <li>Enviar comunicaciones comerciales no solicitadas a través de la plataforma.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  21. Contenido y propiedad intelectual
                </h2>
                <p className="mb-3">
                  El software, la marca y el diseño de la plataforma son de Leasefy. Se
                  otorga el derecho a usarlos mientras dure la relación, y nada más.
                </p>
                <p>
                  La información y los archivos que cargás siguen siendo tuyos. Nos
                  autorizás a alojarlos, procesarlos y mostrarlos{" "}
                  <strong className="text-foreground/90">con el único fin de prestarte el servicio</strong>{" "}
                  y mientras dure la relación. No los usamos para otra cosa, no los
                  cedemos y no adquirimos ninguna licencia perpetua sobre ellos.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  22. Responsabilidad
                </h2>
                <p className="mb-3">
                  Respondemos por los daños que causemos por incumplir estas
                  obligaciones, conforme a la ley colombiana.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">Frente a consumidores</strong>, la
                  garantía legal de los artículos 7 y 8 de la Ley 1480 de 2011 se
                  aplica íntegramente y no admite renuncia ni límite. Nada de este
                  documento la restringe.
                </p>
                <p className="mb-3">
                  <strong className="text-foreground/90">Frente a la inmobiliaria</strong>, y sólo
                  respecto de daños indirectos o lucro cesante, las partes acuerdan
                  como límite el valor pagado a Leasefy en los doce meses anteriores al
                  hecho. Este límite{" "}
                  <strong className="text-foreground/90">no aplica al dolo, a la culpa grave, al incumplimiento de las obligaciones de protección de datos ni al manejo del dinero recaudado</strong>.
                </p>
                <p>
                  No respondemos por lo que ocurra entre propietario e inquilino en
                  ejecución de su contrato de arrendamiento, ni por las decisiones que
                  la inmobiliaria tome usando la plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  23. Suspensión y terminación
                </h2>
                <p className="mb-3">
                  Podés terminar cuando quieras (§6). Nosotros podemos suspender o
                  terminar la cuenta por mora en el pago, por un uso de los prohibidos
                  en la §20 o por orden de autoridad competente, siempre{" "}
                  <strong className="text-foreground/90">avisando antes y explicando el motivo</strong>,
                  salvo que la ley lo impida.
                </p>
                <p>
                  En cualquier caso conservás sesenta (60) días para descargar tu
                  información.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  24. Peticiones, quejas y reclamos
                </h2>
                <p className="mb-3">
                  Escribinos a{" "}
                  <span className="text-foreground/85 font-medium">hola@leasefy.co</span>. Toda
                  solicitud recibe{" "}
                  <strong className="text-foreground/90">número de radicado con fecha y hora</strong>,
                  y podés hacerle seguimiento. Respondemos dentro de los plazos legales.
                </p>
                <p>
                  Si el reclamo es sobre tus datos personales, el canal es{" "}
                  <span className="text-foreground/85 font-medium">privacidad@leasefy.co</span>{" "}
                  y los plazos están en la Política de tratamiento. Como consumidor
                  podés acudir a la{" "}
                  <a href="https://www.sic.gov.co" className="text-foreground/90 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                    Superintendencia de Industria y Comercio
                  </a>.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  25. Cambios a estos términos
                </h2>
                <p>
                  Un cambio sustancial se publica acá con{" "}
                  <strong className="text-foreground/90">treinta (30) días</strong> de
                  anticipación y se avisa por correo. Si no estás de acuerdo, podés
                  terminar sin penalidad antes de que entre a regir. Conservamos las
                  versiones anteriores.
                </p>
              </section>

              <section>
                <h2 className="text-[18px] font-medium text-foreground mb-3">
                  26. Ley aplicable y controversias
                </h2>
                <p>
                  Estos términos se rigen por la ley colombiana. Las controversias se
                  someten a los jueces de la República de Colombia. Si sos consumidor,
                  conservás el derecho de acudir al juez de tu domicilio y a la
                  Superintendencia de Industria y Comercio: nada de este documento te
                  obliga a litigar en otra ciudad ni a renunciar a esa opción.
                </p>
              </section>

            </div>
    </>
  )
}
