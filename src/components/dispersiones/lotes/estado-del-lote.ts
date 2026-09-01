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

/** El camino feliz, en orden. `ANULADO` es una salida, no un paso. */
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
};

/** Qué significa el estado y qué sigue, para quien abre el lote. */
export const QUE_SIGUE: Record<EstadoDelLote, string> = {
  BORRADOR:
    'El lote está armado con las dispersiones pendientes del mes. Revisá los excluidos y mandalo a aprobación.',
  ESPERANDO_APROBACION:
    'Lo tiene que aprobar otra persona con permiso sobre dispersiones. Si el monto lo exige, el código de 6 dígitos le llegó por correo.',
  APROBADO: 'Ya se puede generar el archivo plano para subirlo al banco.',
  ARCHIVO_GENERADO:
    'Descargá el archivo y subilo al banco. Cuando el banco confirme el pago, marcá el lote como pagado con la referencia.',
  PAGADO: 'La plata salió. Un lote pagado no se anula: un pago hecho se corrige con una contrapartida.',
  ANULADO: 'Las dispersiones de este lote volvieron a quedar libres para entrar en otro.',
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

export interface OpcionDeFormato {
  codigo: FormatoArchivoDePagos;
  nombre: string;
  descripcion: string;
  /** `false` = el back no tiene el layout; pedirlo devuelve 400. */
  disponible: boolean;
  porQueNo?: string;
}

/**
 * Los formatos, tal como los declara el back (`formatos/index.ts`): sólo PAB
 * tiene generador. Los otros dos se ven —para que se sepa que existen— y no
 * se pueden elegir, con el motivo.
 */
export const FORMATOS: readonly OpcionDeFormato[] = [
  {
    codigo: 'BANCOLOMBIA_PAB',
    nombre: 'Bancolombia PAB',
    descripcion: 'El del «conversor» (formato 2003). Pagos a proveedores.',
    disponible: true,
  },
  {
    codigo: 'BANCOLOMBIA_SAP',
    nombre: 'Bancolombia SAP',
    descripcion: 'Nómina y proveedores por Sucursal Virtual Empresas.',
    disponible: false,
    porQueNo: 'Pendiente del archivo de ejemplo del banco.',
  },
  {
    codigo: 'ONEPAY',
    nombre: 'OnePay',
    descripcion: 'Pagos masivos por OnePay.',
    disponible: false,
    porQueNo: 'Pendiente del archivo de ejemplo del banco.',
  },
];

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
