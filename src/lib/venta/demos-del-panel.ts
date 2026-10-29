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
    capturas: [cap('erp-renovaciones', 'Renovaciones de contratos'), TABLERO],
  },
  // Nico 28-10-2026 («revisa que cada sección tenga su demo correcta, Nómina está mal»): las que caían en la general.
  nomina: {
    titulo: 'La nómina de tu inmobiliaria, sin otro programa',
    promesa: 'Liquida la nómina de tu equipo y transmite la nómina electrónica a la DIAN desde Leasefy.',
    puntos: ['Liquidación del mes con prestaciones', 'Nómina electrónica ante la DIAN', 'Desprendible para cada persona'],
    capturas: [TABLERO],
  },
  contabilidad: {
    titulo: 'La contabilidad se lleva sola',
    promesa: 'Cada recibo, giro y factura deja su asiento: el libro, la exógena y los certificados salen de ahí.',
    puntos: ['Asientos automáticos de la operación', 'Información exógena para la DIAN', 'Certificados de retención del año'],
    capturas: [cap('erp-recaudo', 'Recaudo del mes con su asiento'), TABLERO],
  },
  facturacion: {
    titulo: 'Facturación electrónica de tu inmobiliaria',
    promesa: 'Factura el canon y tu comisión ante la DIAN con tu resolución, sin salir de Leasefy.',
    puntos: ['Facturas y notas ante la DIAN', 'Tu resolución y tu numeración', 'Documento soporte de proveedores'],
    capturas: [cap('erp-recaudo', 'Recaudo del mes listo para facturar'), TABLERO],
  },
  mantenimientos: {
    titulo: 'Las reparaciones, de la solicitud al pago',
    promesa: 'El inquilino reporta, el proveedor cotiza, el propietario aprueba y se descuenta en su giro.',
    puntos: ['Solicitudes con fotos', 'Cotizaciones y aprobación del propietario', 'La reparación diferida en cuotas'],
    capturas: [TABLERO],
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
    capturas: [TABLERO],
  },
  reportes: {
    titulo: 'Tu inmobiliaria en cifras',
    promesa: 'Ocupación, cartera, recaudo y renovaciones: lo que necesitas para decidir, al día.',
    puntos: ['Ocupación del portafolio', 'Cartera por edades', 'Recaudo y giros del mes'],
    capturas: [TABLERO, cap('cob-cartera', 'Cartera por edades')],
  },
  documentos: {
    titulo: 'Los documentos de cada contrato, en un lugar',
    promesa: 'Plantillas legales, actas de entrega y todo lo firmado, organizado por inmueble y contrato.',
    puntos: ['Plantillas con la ley 820', 'Actas con fotos y firma', 'Todo encontrado en segundos'],
    capturas: [cap('erp-renovaciones', 'Contratos y documentos')],
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
    capturas: [cap('erp-recaudo', 'Recaudo del mes'), cap('erp-dispersiones', 'Giros a propietarios')],
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
  propietarios: 'pagos',
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
    capturas: [cap('erp-renovaciones', 'Renovaciones de contratos')],
  },
  cobro: {
    titulo: 'El arriendo te llega solo',
    promesa: 'Cobramos el arriendo cada mes y si se atrasa lo perseguimos por ti.',
    puntos: ['Recordatorios al inquilino', 'Cobranza por WhatsApp y llamada', 'Tu plata a tu cuenta'],
    capturas: [cap('cob-whatsapp', 'Conversación de cobranza por WhatsApp'), cap('erp-recaudo', 'Recaudo del mes')],
  },
  estudio: {
    titulo: 'Sabes a quién le arriendas',
    promesa: 'Estudiamos al inquilino: identidad, capacidad de pago y listas restrictivas.',
    puntos: ['Estudio en minutos', 'Puntaje claro', 'Seguro de arrendamiento'],
    capturas: [cap('inq-detalle', 'Detalle del estudio de un inquilino'), cap('aseg-resumen', 'Cotización con aseguradoras')],
  },
  // Ronda 30 (revisora r27): cada parte cerrada dice lo suyo; antes Inicio, Certificados, Informes y
  // Solicitudes repetían la general y Giros, Aprobaciones y Revisar el canon, la del cobro.
  giros: {
    titulo: 'Tu plata a tu cuenta, cada mes',
    promesa: 'Te giramos lo del arriendo con el extracto del mes: qué entró y qué se descontó.',
    puntos: ['Giro a tu cuenta', 'Extracto de cada mes', 'Todo tu historial de giros'],
    capturas: [cap('erp-dispersiones', 'Giros a propietarios del mes'), cap('erp-recaudo', 'Recaudo del mes')],
  },
  aprobaciones: {
    titulo: 'Las reparaciones, con tu visto bueno',
    promesa: 'Te mostramos cada reparación a tu cargo y nada se te descuenta sin tu aprobación.',
    puntos: ['Aprueba o rechaza en un clic', 'Hazla tú si no es urgente', 'Sabes cuánto y por qué'],
    capturas: [TABLERO],
  },
  'revisar-canon': {
    titulo: 'El canon justo para tu inmueble',
    promesa: 'Sabes cuánto te cuesta tenerlo desocupado y qué canon pide el mercado, para decidir a tiempo.',
    puntos: ['Avalúo con comparables reales', 'Lo que cuesta cada mes desocupado', 'Tú decides si lo cambias'],
    capturas: [cap('ava-lista', 'Avalúos con comparables')],
  },
  informes: {
    titulo: 'Tu inmueble en cifras',
    promesa: 'Tu certificado anual de ingresos y el historial de reparaciones, siempre a la mano.',
    puntos: ['Certificado anual de ingresos', 'Historial de reparaciones', 'Listo para tu contador'],
    capturas: [TABLERO],
  },
  certificados: {
    titulo: 'Tu declaración de renta, sin buscar papeles',
    promesa: 'Lo que los inquilinos te retuvieron en el año, en un certificado listo para declarar.',
    puntos: ['Retenciones del año', 'Certificados y facturas', 'Descárgalos cuando quieras'],
    capturas: [cap('erp-recaudo', 'Recaudo del mes')],
  },
  solicitudes: {
    titulo: 'Tus solicitudes, respondidas a tiempo',
    promesa: 'Lo que pides queda con número, plazo y respuesta por escrito.',
    puntos: ['Cada solicitud con su plazo', 'Sabes en qué va', 'Todo queda por escrito'],
    capturas: [TABLERO],
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

export function demoDelAgente(claveDelModulo: string | null | undefined): DemoDelModulo {
  if (!claveDelModulo) return GENERAL_DEL_AGENTE;
  return DEL_AGENTE[claveDelModulo] ?? DEL_AGENTE[ALIAS_DEL_AGENTE[claveDelModulo] ?? ''] ?? GENERAL_DEL_AGENTE;
}
