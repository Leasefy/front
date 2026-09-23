/**
 * Las reglas de pantalla de un lote de dispersión, sin React.
 *
 * Qué acción se ofrece en cada estado, qué permiso pide cada una, cómo se
 * llama cada estado para una persona, y qué formato de archivo se puede
 * generar hoy. Todo lo que decide «qué botón aparece» vive acá, probado sin
 * montar nada; la UI sólo pinta lo que estas funciones dicen.
 *
 * El back es la autoridad: si acá se ofrece algo que él rechaza, el mensaje
 * de él se muestra tal cual. Pero ofrecer «Aprobar» en un lote pagado es un
 * botón que siempre falla, y eso es lo que estas tablas evitan.
 */

import type {
  EstadoDelLote,
  FormatoArchivoDePagos,
  LoteResumen,
} from '@/lib/api/lotes-de-dispersion.types';

/**
 * El camino feliz, en orden. `ANULADO` es una salida, no un paso. `EN_WOMPI`
 * ocupa el lugar del archivo cuando el lote sale por Wompi · Pagos a terceros
 * (`pasoAlcanzado` lo pone ahí).
 */
export const CAMINO_DEL_LOTE: readonly EstadoDelLote[] = [
  'BORRADOR',
  'ESPERANDO_APROBACION',
  'APROBADO',
  'ARCHIVO_GENERADO',
  'PAGADO',
];

export const NOMBRE_DEL_ESTADO: Record<EstadoDelLote, string> = {
  BORRADOR: 'Borrador',
  ESPERANDO_APROBACION: 'Esperando aprobación',
  APROBADO: 'Aprobado',
  ARCHIVO_GENERADO: 'Archivo generado',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
  EN_WOMPI: 'En Wompi',
};

/** Qué significa el estado y qué sigue, para quien abre el lote. */
export const QUE_SIGUE: Record<EstadoDelLote, string> = {
  BORRADOR:
    'El lote está armado con las dispersiones pendientes del mes. Revisa los excluidos y mándalo a aprobación.',
  ESPERANDO_APROBACION:
    'Lo tiene que aprobar otra persona con permiso sobre dispersiones. Si el monto lo exige, el código de 6 dígitos le llegó por correo.',
  APROBADO: 'Ya se puede generar el archivo plano para subirlo al banco.',
  ARCHIVO_GENERADO:
    'Descarga el archivo y súbelo al banco. Cuando el banco confirme el pago, marca el lote como pagado con la referencia.',
  PAGADO: 'La plata salió. Un lote pagado no se anula: un pago hecho se corrige con una contrapartida.',
  ANULADO: 'Las dispersiones de este lote volvieron a quedar libres para entrar en otro.',
  EN_WOMPI:
    'El lote está en Wompi. Se cierra solo cuando Wompi confirme cada pago; lo que el banco rechace vuelve a la lista para otro lote.',
};

/** Variantes del `Badge` local (adaptador de cadence). */
export type TonoDeBadge = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export const TONO_DEL_ESTADO: Record<EstadoDelLote, TonoDeBadge> = {
  BORRADOR: 'secondary',
  ESPERANDO_APROBACION: 'warning',
  APROBADO: 'default',
  ARCHIVO_GENERADO: 'default',
  PAGADO: 'success',
  ANULADO: 'destructive',
  EN_WOMPI: 'warning',
};

export type AccionDelLote =
  | 'pedirAprobacion'
  | 'reenviarCodigo'
  | 'aprobar'
  | 'generarArchivo'
  | 'descargarArchivo'
  | 'marcarPagado'
  | 'anular';

/** La acción del `@RequirePermission('dispersiones', …)` del back, una por una. */
export const PERMISO_DE_LA_ACCION: Record<AccionDelLote, 'edit' | 'export'> = {
  pedirAprobacion: 'edit',
  reenviarCodigo: 'edit',
  aprobar: 'edit',
  generarArchivo: 'export',
  descargarArchivo: 'export',
  marcarPagado: 'edit',
  anular: 'edit',
};

/**
 * Qué se puede hacer en cada estado. Calcado de los `if (lote.estado !== …)`
 * del servicio del back:
 *
 * - pedir aprobación: BORRADOR (y ESPERANDO_APROBACION, que reemite el código);
 * - aprobar: ESPERANDO_APROBACION;
 * - generar el archivo: APROBADO;
 * - descargarlo: ARCHIVO_GENERADO;
 * - marcar pagado: ARCHIVO_GENERADO;
 * - anular: cualquiera menos PAGADO y ANULADO.
 */
export function accionesPara(estado: EstadoDelLote): AccionDelLote[] {
  switch (estado) {
    case 'BORRADOR':
      return ['pedirAprobacion', 'anular'];
    case 'ESPERANDO_APROBACION':
      return ['aprobar', 'reenviarCodigo', 'anular'];
    case 'APROBADO':
      return ['generarArchivo', 'anular'];
    case 'ARCHIVO_GENERADO':
      return ['descargarArchivo', 'marcarPagado', 'anular'];
    case 'PAGADO':
    case 'ANULADO':
    // 🔴 En Wompi no se baja el archivo (sería girar dos veces), no se marca
    // pagado a mano y no se anula: se cierra solo, o vuelve a APROBADO.
    case 'EN_WOMPI':
      return [];
  }
}

/**
 * Hasta qué paso del camino llegó el lote (índice en `CAMINO_DEL_LOTE`).
 *
 * Para un lote anulado el estado ya no dice dónde estaba; se deduce de las
 * fechas que quedaron escritas. Sin fecha de aprobación no se puede saber si
 * murió en borrador o esperando aprobación: se muestra el borrador.
 */
export function pasoAlcanzado(lote: Pick<LoteResumen, 'estado' | 'aprobadoAt' | 'archivoGeneradoAt' | 'pagadoAt'>): number {
  // En Wompi el lote está donde estaría el archivo: aprobado y saliendo.
  if (lote.estado === 'EN_WOMPI') return 3;
  if (lote.estado !== 'ANULADO') return CAMINO_DEL_LOTE.indexOf(lote.estado);
  if (lote.pagadoAt) return 4;
  if (lote.archivoGeneradoAt) return 3;
  if (lote.aprobadoAt) return 2;
  return 0;
}

/**
 * 🔴 El nombre del archivo lleva `SIN-VERIFICAR` mientras el layout no se
 * haya cotejado contra un archivo real del banco. La pantalla lo lee de ahí
 * y no de una bandera aparte: es el mismo aviso que viaja hasta el escritorio.
 */
export function esSinVerificar(nombreArchivo: string): boolean {
  return /SIN-VERIFICAR/i.test(nombreArchivo);
}

/**
 * El nombre de cada formato, para mostrar el que tiene un lote.
 *
 * Ya no hay que elegir formato al generar el archivo: es el del BANCO que se
 * eligió al armar el lote (Nico, 22-09). Cuáles bancos tienen formato y por
 * qué los demás no lo dice el back (`GET /lotes-de-dispersion/bancos`), no una
 * lista de acá que se pueda quedar vieja.
 */
export const NOMBRE_DEL_FORMATO: Record<FormatoArchivoDePagos, string> = {
  BANCOLOMBIA_PAB: 'Bancolombia — pagos PAB',
  BANCO_DE_BOGOTA: 'Banco de Bogotá — pagos masivos',
  BANCO_AGRARIO: 'Banco Agrario — pagos masivos',
  BANCO_AV_VILLAS: 'AV Villas — pagos a terceros ACH',
  BANCO_CAJA_SOCIAL: 'Banco Caja Social — pagos masivos (.csv)',
  BANCOOMEVA: 'Bancoomeva — transferencias masivas',
  BANCO_DAVIVIENDA: 'Davivienda — pagos masivos (sin verificar)',
  BANCO_DAVIBANK: 'Davibank — pago empresarial (sin verificar)',
  BANCO_BBVA: 'BBVA — Net Cash por líneas (sin verificar)',
  BANCO_DE_OCCIDENTE: 'Banco de Occidente — pagos a terceros (sin verificar)',
  PLANILLA_MANUAL: 'Planilla para cargar a mano',
  PLANILLA_FINANDINA: 'Planilla para la macro de Banco Finandina',
  PLANILLA_BANCAMIA: 'Planilla para la plantilla de Bancamía',
  BANCOLOMBIA_SAP: 'Bancolombia SAP',
  ONEPAY: 'OnePay',
};

/** Los 6 dígitos del código, y nada más: es lo que valida el DTO del back. */
export function codigoValido(codigo: string): boolean {
  return /^\d{6}$/.test(codigo.trim());
}

/** El motivo de anulación: 5 a 300 caracteres, como el DTO del back. */
export function motivoValido(motivo: string): boolean {
  const largo = motivo.trim().length;
  return largo >= 5 && largo <= 300;
}

/**
 * Guarda un archivo de texto desde el navegador.
 *
 * Aparte para poder reemplazarlo en tests: `URL.createObjectURL` no existe en
 * el DOM de prueba, y un clic en un `<a download>` no se puede observar.
 */
export function guardarArchivo(contenido: Blob | string, nombre: string): void {
  const blob =
    contenido instanceof Blob ? contenido : new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
