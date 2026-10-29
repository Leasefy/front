/**
 * LOS DATOS DE EJEMPLO DE CADA SECCIÓN (el modo demo, `../modo-demo.ts`). Un registro de lecturas: el patrón de la
 * ruta del back y lo que responde. Escritos a mano con los tipos de cada servicio (así no se rompen en silencio cuando
 * cambia un tipo), siempre los mismos: con ellos también se graban los videos de las demos.
 *
 * Una lectura que no está aquí sigue al back como siempre (la pantalla muestra lo suyo, vacío si no tiene nada).
 */
import { CONTRATOS_DEMO } from './contratos';
import { DOCUMENTOS_DEMO } from './documentos';
import { FACTURACION_DEMO } from './facturacion';
import { MANTENIMIENTOS_DEMO } from './mantenimientos';
import { NOMINA_DEMO } from './nomina';
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
  ...MANTENIMIENTOS_DEMO,
  ...REPORTES_DEMO,
  ...DOCUMENTOS_DEMO,
  ...FACTURACION_DEMO,
  ...NOMINA_DEMO,
];

/** Las secciones del panel (su clave en `arquitectura-del-panel.ts`) que ya tienen datos de ejemplo. */
const SECCIONES_CON_DATOS_DE_EJEMPLO: ReadonlySet<string> = new Set(['servicios-publicos', 'contratos', 'solicitudes', 'mantenimientos', 'reportes', 'documentos', 'facturacion', 'nomina']);

export function hayDatosDeEjemplo(claveDelModulo: string | null | undefined): boolean {
  return Boolean(claveDelModulo && SECCIONES_CON_DATOS_DE_EJEMPLO.has(claveDelModulo));
}

/** Lo que responde la demo a una lectura, o `undefined` si la demo no la tiene. Siempre una copia nueva. */
export function lecturaDeLaDemo(camino: string): unknown {
  const l = LECTURAS.find((x) => x.patron.test(camino));
  if (!l) return undefined;
  return structuredClone(l.respuesta(camino));
}
