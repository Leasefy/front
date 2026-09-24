/**
 * El texto publicado de la política de tratamiento, como DATOS.
 *
 * ── Por qué es un módulo de datos y no JSX ─────────────────────────────────
 *
 * La v2.0 eran 548 líneas de JSX escritas a mano. Cada versión nueva obligaba a
 * reescribir el marcado entero, y el riesgo de eso no es estético: es que al
 * mover párrafos se pierda una frase que alguien ya autorizó. Con el texto como
 * datos, publicar una versión es editar contenido, y el marcado —que no cambia—
 * vive en un solo lugar.
 *
 * 🔴 NUNCA se edita el contenido de una versión ya publicada: se publica una
 * nueva y se sube la constante en `versiones.ts`. El porqué está ahí.
 *
 * ── Qué NO está acá, a propósito ───────────────────────────────────────────
 *
 * El borrador completo vive en `back-erp/docs/legal/politica-de-tratamiento-v3.0.md`
 * y trae 14 marcadores `⚖️ VERIFICAR` y notas internas para la revisión del
 * abogado. Eso es material de trabajo: no va a una página pública. Lo de acá es
 * la versión limpia.
 */

export interface Bloque {
  tipo: 'p' | 'lista' | 'aviso' | 'sub';
  texto?: string;
  items?: string[];
}

export interface Seccion {
  n: number;
  titulo: string;
  bloques: Bloque[];
}

const p = (texto: string): Bloque => ({ tipo: 'p', texto });
const lista = (items: string[]): Bloque => ({ tipo: 'lista', items });
const aviso = (texto: string): Bloque => ({ tipo: 'aviso', texto });
const sub = (texto: string): Bloque => ({ tipo: 'sub', texto });

export const POLITICA_V3: Seccion[] = [
  {
    n: 1,
    titulo: 'La pieza que decide todo lo demás: quién responde por tus datos',
    bloques: [
      p('Esta sección no es formalismo. Determina **a quién le reclamas** y quién responde ante la autoridad, y el resto de la política cuelga de ella.'),
      sub('Si eres inquilino, propietario, codeudor o proveedor'),
      p('**La inmobiliaria es la responsable de tus datos. Leasefy es su encargado.** Tu relación es con ella: ella te arrienda, te cobra, te gira, te estudia. Leasefy es la herramienta con la que ella opera, y tratamos tus datos siguiendo sus instrucciones y para sus finalidades, no las nuestras.'),
      lista([
        '**Tus derechos los ejerces ante la inmobiliaria.** Si nos escribes, te ponemos en contacto con ella y le trasladamos tu solicitud; no la resolvemos por nuestra cuenta, porque no es nuestra decisión.',
        '**No decidimos qué pasa contigo.** No decidimos si te aprueban, si te cobran ni si te reportan a centrales. Eso lo decide la inmobiliaria.',
        'Si la inmobiliaria deja de usar Leasefy, sus datos se le devuelven o se eliminan según lo que ella instruya, dentro de los plazos legales.',
      ]),
      sub('Si eres la inmobiliaria o una persona de su equipo'),
      p('**Leasefy es la responsable** de los datos de la cuenta: quién eres, tu correo, tu rol, tu actividad en la plataforma y tu facturación con nosotros.'),
      sub('Si eres visitante del sitio o prospecto comercial'),
      p('**Leasefy es la responsable** de lo que nos dejes al pedir una demo, escribir al chat o navegar el sitio público.'),
    ],
  },
  {
    n: 2,
    titulo: 'Qué datos tratamos, según quién seas',
    bloques: [
      sub('Si eres inquilino o aspirante'),
      lista([
        'Identificación: nombre, tipo y número de documento, fecha de expedición, nacionalidad, fecha de nacimiento.',
        'Contacto: correo, teléfono, dirección.',
        'Actividad económica e ingresos: ocupación, empleador, ingresos declarados y los soportes que cargues.',
        'Perfil tributario, para calcular las retenciones.',
        'Comportamiento de pago: cuotas, abonos, mora, acuerdos de pago y condonaciones.',
        'Resultado del estudio de arrendamiento y el cupo aprobado. **Nunca te mostramos, ni le mostramos a la inmobiliaria, tu puntaje ni el detalle de centrales de riesgo.**',
        'Comunicaciones: correos, WhatsApp, chat y **grabaciones de llamadas**.',
        'Documentos del contrato, incluidas las **fotos por espacio** de las actas de entrega y devolución.',
      ]),
      sub('Si eres propietario'),
      lista([
        'Identificación y contacto.',
        '**Datos bancarios**: banco, tipo y número de cuenta o billetera, y titular. Es donde te giramos.',
        'Tu participación en el inmueble, y si eres el propietario principal.',
        'Perfil tributario, retenciones practicadas y tu certificado anual.',
        'Liquidaciones, deducciones y extractos.',
        'Certificado de tradición del inmueble y documentos del mandato.',
      ]),
      sub('Si eres codeudor'),
      p('Identificación, contacto, actividad económica e ingresos, y el estudio de arrendamiento cuando la aseguradora lo exige.'),
      aviso('Dos cosas que debes saber como codeudor: tu estudio **va incluido en lo que paga el inquilino** —no se te cobra aparte— y tu autorización de tratamiento es **tuya y separada**. Nadie puede autorizarla por ti.'),
      sub('Si eres empleado, contratista o aprendiz de una inmobiliaria que usa Nómina'),
      p('Esta es la categoría más sensible del sistema, y por eso la nombramos en detalle en vez de esconderla en una frase general.'),
      lista([
        'Identificación, contacto, cargo, sede y fecha de ingreso.',
        'Salario, auxilios, comisiones, horas extras y recargos.',
        'Aportes a seguridad social y parafiscales.',
        '**Incapacidades y licencias.** Una incapacidad revela estado de salud: es un dato sensible, y lo tratamos como tal.',
        '**Libranzas y embargos.** Un embargo revela un proceso judicial en tu contra.',
        'Prestaciones sociales provisionadas y pagadas, y los documentos de nómina electrónica que se transmiten a la DIAN.',
      ]),
      sub('Si eres proveedor de mantenimiento'),
      p('Identificación, contacto, especialidades, **RUT** y **planilla de seguridad social** con sus vigencias, y las calificaciones de tus trabajos.'),
    ],
  },
  {
    n: 3,
    titulo: 'Datos sensibles: cuáles tratamos, y por qué lo decimos',
    bloques: [
      p('La ley considera sensibles los datos que afectan la intimidad o cuyo uso indebido puede generar discriminación: salud, vida sexual, datos biométricos, origen racial o étnico, orientación política, convicciones religiosas y pertenencia a sindicatos.'),
      p('**En Leasefy pueden aparecer dos, y los nombramos porque callarlos sería el error:**'),
      lista([
        '**Salud** — incapacidades y licencias médicas en el módulo de Nómina, y la afiliación a seguridad social de los proveedores de mantenimiento.',
        '**Pertenencia a sindicato** — puede inferirse de una deducción de cuota sindical en nómina.',
      ]),
      p('**Las reglas que aplicamos:** su tratamiento requiere autorización explícita y separada de la general; **nadie está obligado a autorizar el tratamiento de datos sensibles**, y decírtelo es obligación nuestra; los datos de salud **no viajan a la DIAN** ni a ningún tercero comercial; y el acceso está restringido a quien deba verlos por su rol.'),
    ],
  },
  {
    n: 4,
    titulo: 'Para qué usamos los datos',
    bloques: [
      p('Un dato solo se puede usar para lo que se informó. Esta lista es exhaustiva: **lo que no esté aquí, no lo hacemos.**'),
      sub('Operar el arrendamiento'),
      p('Evaluar una solicitud, celebrar y administrar el contrato, generar y cobrar las cuotas, recibir pagos y emitir recibos, liquidar y girar al propietario, calcular retenciones y emitir certificados, administrar mantenimientos, PQRS y actas, y renovar, prorrogar o terminar contratos.'),
      sub('Cumplir obligaciones legales y tributarias'),
      lista([
        '**Facturación electrónica ante la DIAN.** Emitimos por cuenta de la inmobiliaria con su resolución y su numeración; los datos de quien recibe la factura viajan a la DIAN. Alcanza también a notas crédito y débito y al documento soporte de proveedores no obligados a facturar.',
        '**Información exógena.** Reportamos anualmente a la DIAN pagos a terceros, retenciones practicadas y sufridas, ingresos recibidos para terceros y cuentas por cobrar y pagar, con el nombre y documento de cada tercero.',
        '**Nómina electrónica.** Transmitimos a la DIAN el documento de nómina de cada empleado.',
        '**Prevención de lavado de activos**, con la consulta de listas restrictivas que se explica más abajo.',
        'Conservación de soportes contables y tributarios.',
      ]),
      sub('Cobrar la cartera'),
      p('Recordar el pago, calcular intereses de mora con el tope de usura, gestionar la cobranza dentro de los límites legales de contacto, reportar a centrales de riesgo con el preaviso de ley, reportar el siniestro a la aseguradora y adelantar el cobro jurídico.'),
      sub('Seguridad de la plataforma'),
      p('Autenticar, prevenir fraude y accesos no autorizados, **registrar en bitácora quién hizo qué en lo que mueve plata**, e investigar incidentes.'),
      sub('Mejorar el producto y nuestra relación comercial'),
      p('Entender cómo se usa la plataforma, encontrar errores, medir desempeño y desarrollar funciones nuevas, con el alcance y los límites de la sección «Qué hacemos con la información de la plataforma». Y facturarle su plan a la inmobiliaria, cobrarle y atenderla.'),
    ],
  },
  {
    n: 5,
    titulo: 'Cómo recogemos tu autorización, y cómo la probamos',
    bloques: [
      p('**No tratamos tus datos sin autorización previa, expresa e informada**, salvo las excepciones que la ley establece: obligación legal, orden judicial, datos de naturaleza pública, urgencia médica o sanitaria, fines estadísticos con datos disociados, y el habeas data financiero.'),
      aviso('**Cómo la probamos, que es lo que casi nadie hace bien.** Cada autorización que otorgas se guarda con **la versión exacta del texto que aceptaste**, la fecha y el canal. Así, cuando pidas copia de lo que autorizaste —y es tu derecho— te entregamos **ese** texto, no el que esté vigente hoy.'),
      p('La consecuencia práctica es que **no reescribimos una política ya publicada**. Si cambia, publicamos una versión nueva. Por eso este documento es la versión 3.0 y no una corrección sobre la anterior.'),
      p('**Puedes revocar tu autorización** en cualquier momento, con dos límites que preferimos decir de frente: no podemos borrar lo que la ley nos obliga a conservar, y revocar puede impedir que sigamos prestándote el servicio.'),
    ],
  },
  {
    n: 6,
    titulo: 'Decisiones automatizadas e inteligencia artificial',
    bloques: [
      p('Leasefy usa agentes automatizados. Te decimos exactamente qué hacen y qué no.'),
      sub('Los agentes se identifican'),
      p('Cuando un agente automatizado te escribe o te llama, **se presenta como asistente virtual de Leasefy** y **siempre puedes pedir hablar con una persona**. No simulamos ser humanos.'),
      sub('Tres niveles, y el que manda lo elige la inmobiliaria'),
      lista([
        '**Sombra** — el agente prepara, una persona revisa y envía. Es el nivel por defecto.',
        '**Copiloto** — el agente propone, una persona aprueba.',
        '**Automático** — el agente ejecuta dentro de límites, con registro de todo.',
      ]),
      sub('Lo que nunca decide una máquina sola'),
      lista([
        'Aprobar o rechazar una solicitud de arrendamiento.',
        'Radicar una PQRS: el agente la detecta y la propone, **una persona confirma**.',
        'Ofrecer un descuento, una condonación o un acuerdo de pago.',
        'Romper un acuerdo de pago.',
        'Reportar a centrales de riesgo.',
        'Aprobar un giro o mover dinero.',
      ]),
      sub('Tu derecho frente a una decisión automatizada'),
      p('Si una decisión automatizada te afecta, tienes derecho a **conocer que la hubo, pedir que una persona la revise y explicar tu caso**. Escribe a privacidad@leasefy.co o a tu inmobiliaria.'),
    ],
  },
  {
    n: 7,
    titulo: 'Llamadas: se graban, y te lo decimos al empezar',
    bloques: [
      lista([
        '**Te avisamos al inicio de la llamada**, antes de cualquier otra cosa.',
        'Se guardan **12 meses**, o hasta que se cierre el caso jurídico al que pertenecen, lo que ocurra después.',
        '**Solo las escuchan los administradores** de la inmobiliaria y el personal de Leasefy que investigue un incidente.',
        'Se usan para verificar lo acordado, resolver disputas y mejorar el servicio.',
        '**Puedes pedir copia de la grabación de una llamada tuya.**',
      ]),
    ],
  },
  {
    n: 8,
    titulo: 'Centrales de riesgo',
    bloques: [
      p('**Quién reporta es la inmobiliaria, no Leasefy.** Nosotros somos la herramienta con la que lo hace.'),
      p('**Antes de reportar** un incumplimiento, la ley exige comunicártelo **con al menos 20 días calendario de anticipación** para que puedas pagar o controvertir. El sistema no permite reportar sin ese preaviso registrado. Cuando pagas, la inmobiliaria debe reportar la actualización.'),
      aviso('**Lo que nunca sale hacia ti ni hacia la inmobiliaria:** tu puntaje crediticio y el detalle de tu historial. El estudio devuelve un resultado —apto o no, y un cupo—, nunca el dato de origen. Si te rechazan, recibes un **motivo general** y un canal para pedir detalle o corregir datos.'),
    ],
  },
  {
    n: 9,
    titulo: 'Listas restrictivas y prevención de lavado de activos',
    bloques: [
      p('Cuando se crea un tercero en la plataforma —propietario, inquilino, codeudor o proveedor— **el sistema consulta automáticamente listas restrictivas internacionales** (OFAC, ONU, Unión Europea y las que cargue la inmobiliaria).'),
      p('**Si hay una coincidencia, la operación se bloquea** hasta que un administrador la revise. Liberar una coincidencia exige dejar quién, cuándo y **por qué**, y queda registrado.'),
      aviso('**Qué significa para ti:** una coincidencia **no es una acusación**. Los nombres se parecen y los homónimos existen. Por eso ninguna coincidencia se resuelve sola: siempre la revisa una persona, y tienes derecho a que te digan que la hubo y a aportar prueba de que no eres esa persona.'),
    ],
  },
  {
    n: 10,
    titulo: 'Cobranza: cuántas veces te podemos contactar',
    bloques: [
      lista([
        '**Máximo un contacto al día** por deuda.',
        '**Un solo canal por semana calendario.**',
        'Dentro de los horarios que fija la ley.',
        'Puedes **elegir el canal** por el que quieres que te contactemos, y cambiarlo.',
        'Puedes **pedir que no te contacten** por un canal, y lo respetamos.',
      ]),
      p('Si crees que te contactamos de más, escríbenos: queda registrado y es verificable.'),
    ],
  },
  {
    n: 11,
    titulo: 'Con quién compartimos tus datos',
    bloques: [
      p('Solo con quien hace falta, y para lo que hace falta.'),
      lista([
        '**Tu inmobiliaria**, para operar tu contrato.',
        '**El proveedor de facturación electrónica y la DIAN**, para emitir y reportar lo que la ley exige.',
        '**Aseguradoras**, para el estudio y los siniestros.',
        '**Centrales de riesgo**, con el preaviso de ley.',
        '**Pasarela de pagos y bancos**, para recibir y girar.',
        '**Proveedores de nube, correo, WhatsApp y telefonía**, para operar la plataforma.',
        '**Modelos de inteligencia artificial**, con los límites de la sección siguiente.',
        '**Abogados externos**, cuando el caso pasa a cobro jurídico.',
        '**Autoridades**, ante orden judicial o requerimiento legal.',
      ]),
      aviso('**Nunca vendemos tus datos personales**, y no los cedemos a terceros para su propio marketing.'),
    ],
  },
  {
    n: 12,
    titulo: 'Inteligencia artificial y datos fuera de Colombia',
    bloques: [
      p('Algunos proveedores de nube y de inteligencia artificial procesan datos **fuera de Colombia**. La ley restringe esas transferencias y exige que el país de destino ofrezca un nivel adecuado de protección, o que aplique alguna de las excepciones legales.'),
      p('**Lo que hacemos para reducirlo al mínimo:**'),
      lista([
        '**Minimizamos** lo que se envía: al modelo va lo necesario para la tarea, no el expediente completo.',
        '**No enviamos datos sensibles** a modelos de inteligencia artificial.',
        'El sistema tiene una verificación automática que **impide que información personal identificable salga en trazas y búsquedas internas**.',
      ]),
    ],
  },
  {
    n: 13,
    titulo: 'Cuánto tiempo guardamos los datos',
    bloques: [
      p('Conservamos cada dato **el tiempo que exige su finalidad y la ley**, y no más:'),
      lista([
        '**Contrato y sus soportes**: mientras dure y por los plazos de conservación comercial y tributaria posteriores a su terminación.',
        '**Soportes contables, facturas electrónicas y documentos ante la DIAN**: los plazos que fija la normativa tributaria.',
        '**Nómina y seguridad social**: los plazos de conservación laboral y pensional, que son largos porque sirven de prueba para tu pensión.',
        '**Grabaciones de llamadas**: 12 meses, o hasta el cierre del caso jurídico.',
        '**Estudio de arrendamiento**: el resultado vale 60 días y queda asociado a la solicitud.',
        '**Cuenta de la inmobiliaria**: mientras dure la relación, más los plazos legales.',
      ]),
      p('Cumplidos los plazos, los datos se eliminan o se anonimizan de forma que no se pueda volver a identificar a nadie.'),
    ],
  },
  {
    n: 14,
    titulo: 'Tus derechos, y cómo ejercerlos',
    bloques: [
      p('Tienes derecho a **conocer** qué datos tenemos, **actualizarlos**, **rectificarlos**, **solicitar prueba de tu autorización**, **ser informado del uso** que les damos, **revocar la autorización**, **solicitar su supresión** cuando no exista un deber legal de conservarlos, **acceder gratuitamente** a ellos y **presentar quejas ante la autoridad**.'),
      p('**Cómo:** escribe a **privacidad@leasefy.co** con tu nombre, documento, lo que pides y un dato de contacto. Si los datos los administra tu inmobiliaria, te ponemos en contacto con ella y le trasladamos tu solicitud.'),
      sub('Los plazos que nos obligan'),
      lista([
        '**Consulta: 10 días hábiles.** Si no podemos responder en ese plazo, te explicamos por qué y tenemos 5 días hábiles más.',
        '**Reclamo: 15 días hábiles.** Si no podemos, te explicamos y tenemos 8 días hábiles más.',
        'Un reclamo incompleto se te devuelve dentro de los 5 días para que lo completes. Si no lo completas en 2 meses, se entiende desistido.',
      ]),
      p('Si no te respondemos o no quedas conforme, puedes acudir a la **Superintendencia de Industria y Comercio**, que es la autoridad de protección de datos en Colombia.'),
    ],
  },
  {
    n: 15,
    titulo: 'Menores de edad',
    bloques: [
      p('La plataforma **no está dirigida a menores** y no abrimos cuentas a menores de edad.'),
      p('Un menor puede aparecer como dato dentro de un contrato, por ejemplo en la composición del hogar del inquilino. En ese caso el tratamiento **responde al interés superior del menor, respeta sus derechos fundamentales y solo procede con autorización de su representante legal**.'),
      aviso('**No perfilamos menores, no les hacemos estudio y no los contactamos.**'),
    ],
  },
  {
    n: 16,
    titulo: 'Qué hacemos con la información de la plataforma',
    bloques: [
      p('Esta sección existe para que una inmobiliaria sepa exactamente a qué se expone antes de subir su portafolio.'),
      sub('Lo que sí hacemos'),
      lista([
        '**Estadísticas agregadas y anonimizadas**: cuántos contratos se renuevan, cuánto tarda un inmueble en arrendarse, cómo se comporta la mora por zona. Agregado significa que **no se puede volver a identificar a nadie**.',
        '**Comparables de mercado**: rangos de canon por zona, tipo y área, para sugerir precios. Salen de muchos contratos, nunca de uno identificable.',
        '**Mejorar el producto y entrenar modelos propios** con datos disociados.',
        'Publicar estudios de mercado con cifras agregadas.',
      ]),
      sub('Lo que no hacemos'),
      lista([
        '**No vendemos datos personales.**',
        '**No le entregamos a una inmobiliaria los datos de otra.**',
        '**No usamos los datos de los clientes de una inmobiliaria para ofrecerles nuestros servicios por fuera de ella**, salvo que esa inmobiliaria lo haya autorizado expresamente y por escrito en su contrato comercial.',
      ]),
    ],
  },
  {
    n: 17,
    titulo: 'Seguridad e incidentes',
    bloques: [
      p('**Lo que hacemos:** cifrado en tránsito y en reposo; acceso por rol y por inmobiliaria, con aislamiento entre ellas; **segundo factor obligatorio para administradores y contadores**; bitácora de todo lo que mueve plata; doble aprobación para giros sobre un monto; sesión única por dispositivo; y respaldos.'),
      p('**Si ocurre un incidente** que comprometa datos personales, lo **reportamos a la autoridad** en el plazo de ley, **te avisamos** si tus datos están afectados explicando qué pasó y qué puedes hacer, y publicamos qué cambiamos para que no se repita.'),
    ],
  },
  {
    n: 18,
    titulo: 'Cookies y qué guarda tu navegador',
    bloques: [
      lista([
        '**Necesarias**, que no se pueden desactivar: sesión, seguridad y preferencia de idioma.',
        '**De preferencia**: lo que elegiste en la interfaz.',
        '**Analíticas**: cómo se usa el producto, de forma agregada.',
      ]),
      p('Puedes borrarlas o bloquearlas desde tu navegador. Si bloqueas las necesarias, la plataforma puede dejar de funcionar.'),
    ],
  },
  {
    n: 19,
    titulo: 'Cambios a esta política',
    bloques: [
      p('Cuando cambiemos esta política **publicamos una versión nueva**: no reescribimos la anterior. Si el cambio amplía las finalidades o cambia quién trata tus datos, **te lo comunicamos y, cuando la ley lo exija, te pedimos autorización nueva**.'),
      p('Las versiones anteriores quedan disponibles, porque tienes derecho a saber exactamente **a qué dijiste que sí**.'),
    ],
  },
];
