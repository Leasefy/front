/**
 * Qué se le muestra a quien todavía no es cliente en cada parte cerrada del
 * panel (Nico, 20-10-2026): para qué sirve, en sus palabras, y la DEMO con las
 * pantallas reales del producto (capturas con datos de ejemplo de
 * `public/landing-v2/producto/`, las mismas de la landing).
 */

export interface CapturaDeDemo {
  src: string;
  alt: string;
}

export interface DemoDelModulo {
  /** Cómo se llama en la venta («Cobranza en piloto automático»). */
  titulo: string;
  /** Una frase: qué gana. */
  promesa: string;
  puntos: readonly string[];
  capturas: readonly CapturaDeDemo[];
  /**
   * Nico 28-10-2026 («las demos son videos»): el recorrido de la sección con datos de ejemplo, grabado sin voz con el
   * modo demo (`lib/demo/`). Si está, «Ver demo» lo reproduce en lugar de las capturas.
   */
  video?: { webm: string; mp4: string; poster: string; alt: string };
}

const P = '/landing-v2/producto';
const cap = (nombre: string, alt: string): CapturaDeDemo => ({ src: `${P}/${nombre}.webp`, alt });

const TABLERO = cap('erp-tablero', 'Tablero de la operación con recaudo, cartera y giros del mes');
const video = (clave: string, alt: string): NonNullable<DemoDelModulo['video']> => ({
  webm: `${P}/demo-${clave}.webm`,
  mp4: `${P}/demo-${clave}.mp4`,
  poster: `${P}/demo-${clave}.webp`,
  alt,
});

/** Por la clave del módulo del panel (`arquitectura-del-panel.ts`). */
const DE_LA_INMOBILIARIA: Record<string, DemoDelModulo> = {
  cobranza: {
    titulo: 'Cobranza en piloto automático',
    promesa: 'La mora se persigue sola: avisos, llamadas y WhatsApp a cada inquilino, con acuerdos de pago.',
    puntos: ['Recordatorios antes de que venza', 'Llamadas y WhatsApp que negocian', 'Acuerdos de pago con link de pago'],
    capturas: [cap('cob-resumen', 'Resumen de la cobranza del mes'), cap('cob-cartera', 'Cartera por edades'), cap('cob-whatsapp', 'Conversación de cobranza por WhatsApp')],
  },
  conciliacion: {
    titulo: 'El banco cuadrado, sin Excel',
    promesa: 'Cada pago del extracto se cruza con su inquilino y su recibo.',
    puntos: ['Sube el extracto y se concilia solo', 'Lo dudoso te lo propone', 'Cierre del mes firmado'],
    capturas: [cap('conc-resumen', 'Resumen de la conciliación'), cap('conc-movimientos', 'Movimientos del banco conciliados')],
  },
  avaluos: {
    titulo: 'Avalúos en minutos',
    promesa: 'El canon y el precio correctos para cada inmueble, con comparables reales.',
    puntos: ['Canon sugerido por zona', 'Comparables del mercado', 'Informe para el propietario'],
    capturas: [cap('ava-lista', 'Lista de avalúos')],
  },
  asegurabilidad: {
    titulo: 'Contratos protegidos',
    promesa: 'Cotiza el seguro de arrendamiento con varias aseguradoras a la vez.',
    puntos: ['Cotización en minutos', 'Varias aseguradoras', 'Todo atado al contrato'],
    capturas: [cap('aseg-resumen', 'Cotización con aseguradoras')],
  },
  matching: {
    titulo: 'El inquilino correcto, el mismo día',
    promesa: 'A cada interesado le ofrecemos los inmuebles que de verdad le sirven.',
    puntos: ['Cruce automático interesado-inmueble', 'Opciones el mismo día', 'Menos tiempo vacante'],
    capturas: [cap('match-ofrecer', 'Qué ofrecerle a cada interesado')],
  },
  estudio: {
    titulo: 'Estudio del inquilino en minutos',
    promesa: 'Identidad, capacidad de pago y listas restrictivas, verificados.',
    puntos: ['Verificación en minutos', 'Puntaje claro', 'Listas restrictivas'],
    capturas: [cap('inq-detalle', 'Detalle del estudio de un inquilino')],
  },
  retencion: {
    titulo: 'Que no se te vayan',
    promesa: 'Te avisa qué inquilinos y propietarios están por irse, a tiempo.',
    puntos: ['Riesgo de cada contrato', 'Renovaciones a tiempo', 'Acciones sugeridas'],
    capturas: [cap('ret-tablero', 'Tablero de retención')],
  },
  contratos: {
    // Nico, 27-10-2026: «aquí es "Administra tus contratos de arrendamiento"».
    titulo: 'Administra tus contratos de arrendamiento',
    promesa: 'Plantillas legales, firma electrónica y renovaciones con el IPC.',
    puntos: ['Firma electrónica con código', 'Renovación con IPC', 'Todo el contrato en un lugar'],
    capturas: [cap('demo-contratos', 'Contratos con datos de ejemplo'), cap('erp-renovaciones', 'Renovaciones de contratos')],
    video: video('contratos', 'Recorrido por Contratos con datos de ejemplo: activos, por empezar, por firmar y terminados'),
  },
  // Nico 28-10-2026 («revisa que cada sección tenga su demo correcta, Nómina está mal»): las que caían en la general.
  nomina: {
    titulo: 'La nómina de tu inmobiliaria, sin otro programa',
    promesa: 'Liquida la nómina de tu equipo y transmite la nómina electrónica a la DIAN desde Leasefy.',
    puntos: ['Liquidación del mes con prestaciones', 'Nómina electrónica ante la DIAN', 'Desprendible para cada persona'],
    capturas: [cap('demo-nomina', 'Nómina con datos de ejemplo')],
    video: video('nomina', 'Recorrido por Nómina con datos de ejemplo: el costo del mes, las personas y la liquidación del período'),
  },
  contabilidad: {
    titulo: 'La contabilidad se lleva sola',
    promesa: 'Cada recibo, giro y factura deja su asiento: el libro, la exógena y los certificados salen de ahí.',
    puntos: ['Asientos automáticos de la operación', 'Información exógena para la DIAN', 'Certificados de retención del año'],
    capturas: [cap('demo-contabilidad', 'Contabilidad con datos de ejemplo')],
    video: video('contabilidad', 'Recorrido por Contabilidad con datos de ejemplo: el cierre del mes, los asientos y el balance de prueba que cuadra'),
  },
  facturacion: {
    titulo: 'Facturación electrónica de tu inmobiliaria',
    promesa: 'Factura el canon y tu comisión ante la DIAN con tu resolución, sin salir de Leasefy.',
    puntos: ['Facturas y notas ante la DIAN', 'Tu resolución y tu numeración', 'Documento soporte de proveedores'],
    capturas: [cap('demo-facturacion', 'Facturación con datos de ejemplo')],
    video: video('facturacion', 'Recorrido por Facturación con datos de ejemplo: lo que hay por facturar a inquilinos y propietarios, lo emitido y la numeración'),
  },
  mantenimientos: {
    titulo: 'Las reparaciones, de la solicitud al pago',
    promesa: 'El inquilino reporta, el proveedor cotiza, el propietario aprueba y se descuenta en su giro.',
    puntos: ['Solicitudes con fotos', 'Cotizaciones y aprobación del propietario', 'La reparación diferida en cuotas'],
    capturas: [cap('demo-mantenimientos', 'Mantenimientos con datos de ejemplo')],
    video: video('mantenimientos', 'Recorrido por Mantenimientos con datos de ejemplo: el tablero, una reparación que espera al propietario y la lista'),
  },
  'servicios-publicos': {
    titulo: 'Los servicios públicos al día',
    promesa: 'El inquilino sube la factura pagada cada mes y tú ves de una quién está al día.',
    puntos: ['La factura del mes desde su portal', 'Recordatorios antes de que venza', 'La entrada y la salida liquidadas'],
    capturas: [cap('demo-servicios-publicos', 'Servicios públicos con datos de ejemplo')],
    video: video('servicios-publicos', 'Recorrido por Servicios públicos con datos de ejemplo: quién está al día, la factura por revisar y la cuenta de EPM'),
  },
  solicitudes: {
    titulo: 'Las solicitudes, respondidas a tiempo',
    promesa: 'Cada petición, queja o reclamo con su número, su plazo de ley y su respuesta por escrito.',
    puntos: ['Plazos en días hábiles', 'Respuestas sugeridas', 'Todo queda registrado'],
    capturas: [cap('demo-solicitudes', 'Solicitudes con datos de ejemplo')],
    video: video('solicitudes', 'Recorrido por Solicitudes con datos de ejemplo: las vencidas, las por vencer y la búsqueda'),
  },
  reportes: {
    titulo: 'Tu inmobiliaria en cifras',
    promesa: 'Ocupación, cartera, recaudo y renovaciones: lo que necesitas para decidir, al día.',
    puntos: ['Recaudo y ocupación del mes', 'Lo que deja cada inmueble', 'Cartera por edades'],
    capturas: [cap('demo-reportes', 'Reportes con datos de ejemplo')],
    video: video('reportes', 'Recorrido por Reportes con datos de ejemplo: el resumen del mes, la rentabilidad por inmueble y la ocupación por zona'),
  },
  documentos: {
    titulo: 'Los documentos de cada contrato, en un lugar',
    promesa: 'Plantillas legales, actas de entrega y todo lo firmado, organizado por inmueble y contrato.',
    puntos: ['Plantillas con la ley 820', 'Actas con fotos y firma', 'Todo encontrado en segundos'],
    capturas: [cap('demo-documentos', 'Documentos con datos de ejemplo')],
    video: video('documentos', 'Recorrido por Documentos con datos de ejemplo: lo generado, la búsqueda, las actas de entrega y las plantillas'),
  },
  'listas-restrictivas': {
    titulo: 'Sabes con quién haces negocio',
    promesa: 'Consulta a inquilinos y propietarios en listas restrictivas antes de firmar.',
    puntos: ['Consulta en listas', 'Soporte para tu SARLAFT', 'Queda en la ficha de cada persona'],
    capturas: [cap('inq-detalle', 'Ficha de la persona con su consulta')],
  },
  pagos: {
    titulo: 'Recaudo y giros a propietarios',
    promesa: 'Lo que entra se aplica solo y lo que sale a cada propietario se paga en un archivo del banco.',
    puntos: ['Recaudo por referencia', 'Giros con su liquidación', 'Extracto para cada propietario'],
    capturas: [cap('demo-pagos', 'Pagos con datos de ejemplo'), cap('erp-dispersiones', 'Giros a propietarios')],
    video: video('pagos', 'Recorrido por Pagos con datos de ejemplo: la deuda del mes, cuota por cuota, por vencer, en plazo, en cartera y pagada'),
  },
  // Nico 30-10-2026 («la sección de demo de propietario no vi ningún video»): antes caía en la de Pagos (la deuda del mes).
  propietarios: {
    titulo: 'Tus propietarios, al día y bien girados',
    promesa: 'Cada propietario con sus inmuebles, lo que recibe al mes y su giro: sabes a quién se le debe y desde cuándo.',
    puntos: ['Los giros atrasados primero', 'Lo que recibe cada uno, ya descontado', 'Su ficha con inmuebles y cuenta'],
    capturas: [cap('demo-propietarios', 'Propietarios con datos de ejemplo'), cap('erp-dispersiones', 'Giros a propietarios')],
    video: video('propietarios', 'Recorrido por Propietarios con datos de ejemplo: los giros atrasados, la lista completa y la ficha de un propietario'),
  },
};

const GENERAL: DemoDelModulo = {
  titulo: 'Tu inmobiliaria en piloto automático',
  promesa: 'Contratos, cobranza, giros a propietarios y contabilidad en un solo lugar, con agentes de IA que trabajan por ti.',
  puntos: ['Cobranza que se hace sola', 'Pagos a propietarios en un clic', 'Contabilidad y facturación electrónica'],
  capturas: [TABLERO, cap('home-chat', 'El chat que responde por toda la operación'), cap('erp-recaudo', 'Recaudo del mes')],
};

/** Claves del panel que comparten demo. */
const ALIAS: Record<string, string> = {
  'agente-de-pagos': 'pagos',
  juridico: 'cobranza',
  inquilinos: 'estudio',
  proveedores: 'mantenimientos',
  'desempeno-ia': 'reportes',
  'calidad-publicaciones': 'matching',
};

export function demoDeLaInmobiliaria(claveDelModulo: string | null | undefined): DemoDelModulo {
  if (!claveDelModulo) return GENERAL;
  return DE_LA_INMOBILIARIA[claveDelModulo] ?? DE_LA_INMOBILIARIA[ALIAS[claveDelModulo] ?? ''] ?? GENERAL;
}

/** El propietario: lo que le cobramos por administrarle el inmueble. */
const DEL_PROPIETARIO: Record<string, DemoDelModulo> = {
  contratos: {
    titulo: 'Tu contrato en regla, firmado en línea',
    promesa: 'Contrato legal, firma electrónica y renovación con el IPC, sin papeles.',
    puntos: ['Contrato con la ley 820', 'Firma con código al celular', 'Renovación a tiempo'],
    capturas: [cap('demo-propietario-contratos', 'Tus contratos con datos de ejemplo'), cap('erp-renovaciones', 'Renovaciones de contratos')],
    video: video('propietario-contratos', 'Recorrido por tus contratos con datos de ejemplo: los activos, el que espera al inquilino y el detalle con las firmas'),
  },
  cobro: {
    titulo: 'El arriendo te llega solo',
    promesa: 'Cobramos el arriendo cada mes y si se atrasa lo perseguimos por ti.',
    puntos: ['Recordatorios al inquilino', 'Cobranza por WhatsApp y llamada', 'Tu plata a tu cuenta'],
    capturas: [cap('demo-propietario-cobro', 'Tu arriendo y tu estado de cuenta con datos de ejemplo'), cap('cob-whatsapp', 'Conversación de cobranza por WhatsApp')],
    video: video('propietario-cobro', 'Recorrido por tu arriendo con datos de ejemplo: lo que paga el inquilino mes a mes y tu estado de cuenta con lo girado y lo que va en camino'),
  },
  estudio: {
    titulo: 'Sabes a quién le arriendas',
    promesa: 'Estudiamos al inquilino: identidad, capacidad de pago y listas restrictivas.',
    // 30-10: «Puntaje claro» salió: el propietario nunca ve un puntaje (F-07), y el video muestra la pantalla.
    puntos: ['Estudio en minutos', 'De qué vive y cuánto gana', 'Tú escoges a quién'],
    capturas: [cap('demo-propietario-estudio', 'Los candidatos de tu inmueble con datos de ejemplo'), cap('inq-detalle', 'Detalle del estudio de un inquilino')],
    video: video('propietario-estudio', 'Recorrido por los candidatos de tu inmueble con datos de ejemplo: la lista corta, de qué vive cada uno y a quién escogiste antes'),
  },
  // Ronda 30 (revisora r27): cada parte cerrada dice lo suyo; antes Inicio, Certificados, Informes y
  // Solicitudes repetían la general y Giros, Aprobaciones y Revisar el canon, la del cobro.
  giros: {
    titulo: 'Tu plata a tu cuenta, cada mes',
    promesa: 'Te giramos lo del arriendo con el extracto del mes: qué entró y qué se descontó.',
    puntos: ['Giro a tu cuenta', 'Extracto de cada mes', 'Todo tu historial de giros'],
    capturas: [cap('demo-propietario-giros', 'Tus giros con datos de ejemplo'), cap('erp-dispersiones', 'Giros a propietarios del mes')],
    video: video('propietario-giros', 'Recorrido por tus giros con datos de ejemplo: lo girado en el año, mes por mes, el que se devolvió y la cuenta a la que te giran'),
  },
  aprobaciones: {
    titulo: 'Las reparaciones, con tu visto bueno',
    promesa: 'Te mostramos cada reparación a tu cargo y nada se te descuenta sin tu aprobación.',
    puntos: ['Aprueba o rechaza en un clic', 'Hazla tú si no es urgente', 'Sabes cuánto y por qué'],
    capturas: [cap('demo-propietario-aprobaciones', 'Las reparaciones por aprobar con datos de ejemplo')],
    video: video('propietario-aprobaciones', 'Recorrido por las reparaciones con datos de ejemplo: las que esperan tu aprobación, la que haces tú y el historial con su detalle'),
  },
  'revisar-canon': {
    titulo: 'El canon justo para tu inmueble',
    promesa: 'Sabes cuánto te cuesta tenerlo desocupado y qué canon pide el mercado, para decidir a tiempo.',
    puntos: ['Avalúo con comparables reales', 'Lo que cuesta cada mes desocupado', 'Tú decides si lo cambias'],
    capturas: [cap('demo-propietario-revisar-canon', 'La revisión de tu canon con datos de ejemplo'), cap('ava-lista', 'Avalúos con comparables')],
    video: video('propietario-revisar-canon', 'Recorrido por la revisión del canon con datos de ejemplo: lo que te ha costado el inmueble desocupado y lo que cuesta el canon que escribes'),
  },
  informes: {
    titulo: 'Tu inmueble en cifras',
    promesa: 'Tu certificado anual de ingresos y el historial de reparaciones, siempre a la mano.',
    puntos: ['Certificado anual de ingresos', 'Historial de reparaciones', 'Listo para tu contador'],
    capturas: [cap('demo-propietario-informes', 'Tus informes con datos de ejemplo')],
    video: video('propietario-informes', 'Recorrido por tus informes con datos de ejemplo: el certificado de ingresos de cada año y el historial de reparaciones'),
  },
  certificados: {
    titulo: 'Tu declaración de renta, sin buscar papeles',
    promesa: 'Lo que los inquilinos te retuvieron en el año, en un certificado listo para declarar.',
    puntos: ['Retenciones del año', 'Certificados y facturas', 'Descárgalos cuando quieras'],
    capturas: [cap('demo-propietario-certificados', 'Tus certificados con datos de ejemplo')],
    video: video('propietario-certificados', 'Recorrido por tus certificados con datos de ejemplo: la retención del año, la certificación del mandatario y las facturas de la comisión'),
  },
  solicitudes: {
    titulo: 'Tus solicitudes, respondidas a tiempo',
    promesa: 'Lo que pides queda con número, plazo y respuesta por escrito.',
    puntos: ['Cada solicitud con su plazo', 'Sabes en qué va', 'Todo queda por escrito'],
    capturas: [cap('demo-propietario-solicitudes', 'Tus solicitudes con datos de ejemplo')],
    video: video('propietario-solicitudes', 'Recorrido por tus solicitudes con datos de ejemplo: las abiertas primero y el detalle de una con su respuesta'),
  },
};

const GENERAL_DEL_PROPIETARIO: DemoDelModulo = {
  // Nico, 27-10-2026: la publicidad del propietario es «quiero que Leasefy maneje mi inmueble».
  titulo: 'Quiero que Leasefy maneje mi inmueble',
  promesa: 'Lo arrendamos bien, cobramos el arriendo y te tenemos todo en regla, por menos de lo que cobra el mercado.',
  puntos: ['Estudio del inquilino', 'Cobro del arriendo cada mes', 'Contrato y renovaciones en regla'],
  capturas: [cap('inq-detalle', 'Detalle del estudio de un inquilino'), cap('cob-whatsapp', 'Cobranza por WhatsApp'), cap('erp-renovaciones', 'Renovaciones de contratos')],
};

export function demoDelPropietario(clave: string | null | undefined): DemoDelModulo {
  return (clave && DEL_PROPIETARIO[clave]) || GENERAL_DEL_PROPIETARIO;
}

/**
 * EL AGENTE INMOBILIARIO (Juan, 27-10-2026): «un agente administrando sus propiedades, quitándole el limitante de
 * que no sabe cómo… lo va a hacer usted solo, de forma fácil». La publicidad de la demo para la cuenta de un agente.
 */
const DEL_AGENTE: Record<string, DemoDelModulo> = {
  contratos: {
    titulo: 'Administra tus propiedades tú solo',
    promesa: 'El contrato, el cobro y el giro al propietario, sin saber de administración: la plataforma te lleva paso a paso.',
    puntos: ['Contrato en línea con firma', 'El cobro del arriendo cada mes', 'El giro al propietario en un clic'],
    capturas: [cap('erp-renovaciones', 'Contratos y renovaciones')],
    video: video('contratos', 'Recorrido por Contratos con datos de ejemplo: activos, por empezar, por firmar y terminados'),
  },
  cobranza: {
    titulo: 'El arriendo se cobra solo',
    promesa: 'Recordatorios, enlace de pago y seguimiento de la mora sin que tengas que llamar a nadie.',
    puntos: ['Recordatorios por WhatsApp', 'Enlace de pago', 'Tú sólo ves quién pagó'],
    capturas: [cap('cob-whatsapp', 'Cobranza por WhatsApp')],
  },
  estudio: {
    titulo: 'Sabes a quién le arriendas',
    promesa: 'El estudio del inquilino con las aseguradoras, para que tu propietario arriende tranquilo.',
    puntos: ['Estudio en minutos', 'Varias aseguradoras a la vez', 'Te dice hasta cuánto lo respaldan'],
    capturas: [cap('inq-detalle', 'Detalle del estudio de un inquilino')],
  },
  pagos: {
    titulo: 'Tus propietarios reciben su plata a tiempo',
    promesa: 'Lo que entra se aplica solo y cada propietario recibe su giro con su liquidación.',
    puntos: ['Recaudo por referencia', 'Giro con su liquidación', 'Extracto para cada propietario'],
    capturas: [cap('erp-dispersiones', 'Giros a propietarios')],
    video: video('pagos', 'Recorrido por Pagos con datos de ejemplo: la deuda del mes, cuota por cuota, por vencer, en plazo, en cartera y pagada'),
  },
  reportes: {
    titulo: 'Tu negocio en cifras',
    promesa: 'Ocupación, cartera, recaudo y renovaciones de las propiedades que administras, al día.',
    puntos: ['Recaudo y ocupación del mes', 'Lo que deja cada inmueble', 'Cartera por edades'],
    capturas: [cap('demo-reportes', 'Reportes con datos de ejemplo')],
    video: video('reportes', 'Recorrido por Reportes con datos de ejemplo: el resumen del mes, la rentabilidad por inmueble y la ocupación por zona'),
  },
};

const GENERAL_DEL_AGENTE: DemoDelModulo = {
  titulo: 'Administra tus propiedades tú solo, de forma fácil',
  promesa: 'Lo que hace una inmobiliaria —contratos, cobro del arriendo, giros y estudio del inquilino— hecho para un agente que trabaja solo.',
  puntos: ['Contratos y firma en línea', 'El arriendo se cobra solo', 'Giros a tus propietarios en un clic'],
  capturas: [TABLERO, cap('cob-whatsapp', 'Cobranza por WhatsApp'), cap('erp-dispersiones', 'Giros a propietarios')],
};

/** El agente no tiene facturación propia: su demo de pagos la cubre (la inmobiliaria sí tiene la suya desde el 29-10). */
const ALIAS_DEL_AGENTE: Record<string, string> = { ...ALIAS, facturacion: 'pagos' };

/**
 * Nico 30-10-2026 («en agente inmobiliario… tiene que haber videos, no imágenes, en las demos»): el agente usa el panel
 * de la inmobiliaria (sin Nómina), así que la sección que no tiene texto propio del agente muestra la demo de esa
 * sección —con su video— y no la general con capturas.
 */
export function demoDelAgente(claveDelModulo: string | null | undefined): DemoDelModulo {
  if (!claveDelModulo) return GENERAL_DEL_AGENTE;
  const propia = DEL_AGENTE[claveDelModulo] ?? DEL_AGENTE[ALIAS_DEL_AGENTE[claveDelModulo] ?? ''];
  if (propia) return propia;
  return DE_LA_INMOBILIARIA[claveDelModulo] ?? DE_LA_INMOBILIARIA[ALIAS[claveDelModulo] ?? ''] ?? GENERAL_DEL_AGENTE;
}
