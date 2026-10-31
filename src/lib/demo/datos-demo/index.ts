/**
 * LOS DATOS DE EJEMPLO DE CADA SECCIÓN (el modo demo, `../modo-demo.ts`). Un registro de lecturas: el patrón de la
 * ruta del back y lo que responde. Escritos a mano con los tipos de cada servicio (así no se rompen en silencio cuando
 * cambia un tipo), siempre los mismos: con ellos también se graban los videos de las demos.
 *
 * Una lectura que no está aquí sigue al back como siempre (la pantalla muestra lo suyo, vacío si no tiene nada).
 */
import { AGENTES_DEL_BACK_DEMO } from './agentes-del-back';
import { APROBACIONES_DEL_PROPIETARIO_DEMO } from './del-propietario-aprobaciones';
import { CERTIFICADOS_DEL_PROPIETARIO_DEMO } from './del-propietario-certificados';
import { COBRO_DEL_PROPIETARIO_DEMO } from './del-propietario-cobro';
import { ESCOGER_INQUILINO_DEMO } from './del-propietario-escoger';
import { INFORMES_DEL_PROPIETARIO_DEMO } from './del-propietario-informes';
import { REVISAR_CANON_DEMO } from './del-propietario-revisar-canon';
import { SOLICITUDES_DEL_PROPIETARIO_DEMO } from './del-propietario-solicitudes';
import { CONTABILIDAD_DEMO } from './contabilidad';
import { CONTRATOS_DEMO } from './contratos';
import { DOCUMENTOS_DEMO } from './documentos';
import { FACTURACION_DEMO } from './facturacion';
import { GIROS_DEL_PROPIETARIO_DEMO } from './del-propietario-giros';
import { MANTENIMIENTOS_DEMO } from './mantenimientos';
import { NOMINA_DEMO } from './nomina';
import { PAGOS_DEMO } from './pagos';
import { PROPIETARIOS_DEMO } from './propietarios';
import { REPORTES_DEMO } from './reportes';
import { SERVICIOS_PUBLICOS_DEMO } from './servicios-publicos';
import { SOLICITUDES_DEMO } from './solicitudes';

export interface LecturaDeLaDemo {
  /** El camino del back, sin el dominio (con su `?query`). */
  patron: RegExp;
  respuesta: (camino: string) => unknown;
}

const LECTURAS: readonly LecturaDeLaDemo[] = [
  ...SERVICIOS_PUBLICOS_DEMO,
  ...CONTRATOS_DEMO,
  ...SOLICITUDES_DEMO,
  // Antes que Mantenimientos: responde los inmuebles de un propietario de la demo (ver `./propietarios.ts`).
  ...PROPIETARIOS_DEMO,
  ...MANTENIMIENTOS_DEMO,
  ...REPORTES_DEMO,
  ...DOCUMENTOS_DEMO,
  ...FACTURACION_DEMO,
  ...NOMINA_DEMO,
  ...CONTABILIDAD_DEMO,
  ...PAGOS_DEMO,
  // Avalúos y los enlaces de pago del Agente de pagos (las secciones de IA que leen del back).
  ...AGENTES_DEL_BACK_DEMO,
  // El propietario independiente (sus rutas `/portal/propietario/*` no chocan con las de la inmobiliaria).
  ...GIROS_DEL_PROPIETARIO_DEMO,
  ...COBRO_DEL_PROPIETARIO_DEMO,
  ...ESCOGER_INQUILINO_DEMO,
  ...APROBACIONES_DEL_PROPIETARIO_DEMO,
  ...REVISAR_CANON_DEMO,
  ...INFORMES_DEL_PROPIETARIO_DEMO,
  ...CERTIFICADOS_DEL_PROPIETARIO_DEMO,
  ...SOLICITUDES_DEL_PROPIETARIO_DEMO,
];

/** Las secciones del panel (su clave en `arquitectura-del-panel.ts`) que ya tienen datos de ejemplo. */
const SECCIONES_CON_DATOS_DE_EJEMPLO: ReadonlySet<string> = new Set(['servicios-publicos', 'contratos', 'solicitudes', 'mantenimientos', 'reportes', 'documentos', 'facturacion', 'nomina', 'contabilidad', 'pagos', 'propietarios', 'cobranza', 'avaluos', 'matching', 'asegurabilidad', 'conciliacion', 'retencion', 'agente-de-pagos', 'desempeno-ia', 'listas-restrictivas']);

export function hayDatosDeEjemplo(claveDelModulo: string | null | undefined): boolean {
  return Boolean(claveDelModulo && SECCIONES_CON_DATOS_DE_EJEMPLO.has(claveDelModulo));
}

/**
 * Las del propietario independiente en lo gratis (Nico 30-10-2026: «la posibilidad de… ver cómo quedaría pintada cada
 * sección»), por su clave de demo (`claveDeDemoDelPropietario`).
 */
const SECCIONES_DEL_PROPIETARIO_CON_DATOS: ReadonlySet<string> = new Set([
  'giros',
  'contratos',
  'cobro',
  'estudio',
  'aprobaciones',
  'revisar-canon',
  'informes',
  'certificados',
  'solicitudes',
]);

export function hayDatosDeEjemploDelPropietario(clave: string | null | undefined): boolean {
  return Boolean(clave && SECCIONES_DEL_PROPIETARIO_CON_DATOS.has(clave));
}

/** Lo que responde la demo a una lectura, o `undefined` si la demo no la tiene. Siempre una copia nueva. */
export function lecturaDeLaDemo(camino: string): unknown {
  const l = LECTURAS.find((x) => x.patron.test(camino));
  if (!l) return undefined;
  return structuredClone(l.respuesta(camino));
}
