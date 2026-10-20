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
}

const P = '/landing-v2/producto';
const cap = (nombre: string, alt: string): CapturaDeDemo => ({ src: `${P}/${nombre}.webp`, alt });

const TABLERO = cap('erp-tablero', 'Tablero de la operación con recaudo, cartera y giros del mes');

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
    titulo: 'Contratos que se firman solos',
    promesa: 'Plantillas legales, firma electrónica y renovaciones con el IPC.',
    puntos: ['Firma electrónica con código', 'Renovación con IPC', 'Todo el contrato en un lugar'],
    capturas: [cap('erp-renovaciones', 'Renovaciones de contratos'), TABLERO],
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
  facturacion: 'pagos',
  juridico: 'cobranza',
  inquilinos: 'estudio',
  propietarios: 'pagos',
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
};

const GENERAL_DEL_PROPIETARIO: DemoDelModulo = {
  titulo: 'Tu inmueble administrado, por menos',
  promesa: 'Lo arrendamos bien, cobramos el arriendo y te tenemos todo en regla, por menos de lo que cobra el mercado.',
  puntos: ['Estudio del inquilino', 'Cobro del arriendo cada mes', 'Contrato y renovaciones en regla'],
  capturas: [cap('inq-detalle', 'Detalle del estudio de un inquilino'), cap('cob-whatsapp', 'Cobranza por WhatsApp'), cap('erp-renovaciones', 'Renovaciones de contratos')],
};

export function demoDelPropietario(clave: string | null | undefined): DemoDelModulo {
  return (clave && DEL_PROPIETARIO[clave]) || GENERAL_DEL_PROPIETARIO;
}
