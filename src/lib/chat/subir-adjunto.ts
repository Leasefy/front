/**
 * Subir un archivo al chat (`POST /inmobiliaria/chat/adjuntos`) con su avance.
 *
 * 🔴 Una planilla (Excel o CSV) se LEE aquí, en el navegador, con LOS MISMOS
 * lectores de las importaciones — el extracto bancario (`armarFilasDeExtracto`)
 * y el recaudo (`armarFilasDelRecaudo`), sobre `leerPlanilla` — y lo leído
 * viaja al lado del archivo (`lectura`). Así el chat carga el extracto o el
 * recaudo por la MISMA ruta y con las MISMAS filas que la pantalla
 * («nos adaptamos a sus archivos tal como vienen»), sin un segundo lector.
 *
 * El avance sale de `XMLHttpRequest` (`fetch` no cuenta lo que sube).
 */

import { getAccessToken } from '@/lib/api/client';
import { cabecerasDeLaCuenta } from '@/lib/auth/cuenta-activa';
import { leerPlanilla } from '@/lib/importar/leer-planilla';
import {
  CAMPOS_DE_EXTRACTO,
  ajustarMapeoDeExtracto,
  armarFilasDeExtracto,
  faltantesDelMapeo,
} from '@/lib/cobros/extracto-bancario';
import { CAMPOS_DEL_RECAUDO, armarFilasDelRecaudo } from '@/lib/tesoreria/recaudo-desde-planilla';
import { conCentavosEn, configDePlataAhora } from '@/lib/plata/con-centavos';
import { refrescarConfigDePlata } from '@/lib/plata/refrescar-config-de-plata';
import { familiaDe, leerAdjuntoSubido, type AdjuntoDelMensaje } from './adjuntos';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/** Lo más que viaja leído (el tope del extracto del back). */
const MAX_FILAS_LEIDAS = 20_000;

/** Lo que el navegador leyó de una planilla, por importador. */
export interface LecturaDeLaPlanilla {
  version: 1;
  planilla: { hoja: string; encabezados: string[]; filas: number };
  /** El extracto del banco: sus filas ya armadas, o lo que le falta al mapeo. */
  extracto: {
    reconocidos: number;
    faltantes: string[];
    filas: ReturnType<typeof armarFilasDeExtracto>['filas'];
    descartadas: number;
  };
  /** El archivo de recaudo del banco en planilla. */
  recaudo: {
    reconocidos: number;
    faltantes: string[];
    filas: ReturnType<typeof armarFilasDelRecaudo>['filas'];
    sinArmar: number;
  };
}

/**
 * Lee la planilla con los dos lectores. Nunca lanza: si no se puede leer, el
 * archivo viaja igual sin lectura (y el chat dice lo que no pudo).
 */
export async function leerLaPlanillaDelChat(archivo: File): Promise<LecturaDeLaPlanilla | null> {
  try {
    await refrescarConfigDePlata().catch(() => undefined);
    const conCentavos = conCentavosEn(configDePlataAhora(), 'tesoreria_y_conciliacion');
    const [deExtracto, deRecaudo] = await Promise.all([
      leerPlanilla(archivo, CAMPOS_DE_EXTRACTO),
      leerPlanilla(archivo, CAMPOS_DEL_RECAUDO),
    ]);
    if (deExtracto.encabezados.length === 0) return null;
    const mapeoDelExtracto = ajustarMapeoDeExtracto(deExtracto.mapeo);
    const extracto = armarFilasDeExtracto(deExtracto.filas as Record<string, unknown>[], mapeoDelExtracto, { conCentavos });
    const recaudo = armarFilasDelRecaudo(deRecaudo.filas, deRecaudo.mapeo, deRecaudo.filaDeEncabezado);
    const faltanDelRecaudo = CAMPOS_DEL_RECAUDO.filter((c) => c.requerido && !deRecaudo.mapeo[c.campo]).map((c) => c.etiqueta);
    return {
      version: 1,
      planilla: { hoja: deExtracto.hoja, encabezados: deExtracto.encabezados.slice(0, 60), filas: deExtracto.filas.length },
      extracto: {
        reconocidos: Object.keys(mapeoDelExtracto).length,
        faltantes: faltantesDelMapeo(mapeoDelExtracto),
        filas: extracto.filas.slice(0, MAX_FILAS_LEIDAS),
        descartadas: extracto.descartadas.length,
      },
      recaudo: {
        reconocidos: Object.keys(deRecaudo.mapeo).length,
        faltantes: faltanDelRecaudo,
        filas: recaudo.filas.slice(0, MAX_FILAS_LEIDAS),
        sinArmar: recaudo.sinArmar.length,
      },
    };
  } catch {
    return null;
  }
}

/** Un fallo de la subida, ya en palabras (el sobre del back o la red). */
export class FalloDeLaSubida extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'FalloDeLaSubida';
  }
}

function mensajeDelSobre(status: number, cuerpo: unknown, nombre: string): FalloDeLaSubida {
  const o = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {};
  const code = typeof o.code === 'string' ? o.code : null;
  const msg = typeof o.message === 'string' && o.message.length < 400 && !/[\n<]/.test(o.message) ? o.message : null;
  if (status === 0) return new FalloDeLaSubida(`No hubo conexión para subir «${nombre}». Revisa tu internet y reinténtalo.`, 0, null);
  if (status === 413) return new FalloDeLaSubida(`«${nombre}» pesa más de lo que el chat recibe (10 MB).`, status, code);
  if (status >= 500) {
    const ref = typeof o.referencia === 'string' ? ` (referencia ${o.referencia})` : '';
    return new FalloDeLaSubida(msg ?? `No pudimos guardar «${nombre}» por un problema de nuestro lado${ref}. Reinténtalo.`, status, code);
  }
  return new FalloDeLaSubida(msg ?? `No se pudo subir «${nombre}».`, status, code);
}

export interface SubidaEnCurso {
  promesa: Promise<AdjuntoDelMensaje>;
  cancelar: () => void;
}

/**
 * Sube el archivo (y su lectura, si es una planilla). `alAvanzar` recibe de 0
 * a 1. `cancelar` aborta la subida (la persona quitó el archivo).
 */
export function subirAdjuntoDelChat(
  archivo: File,
  alAvanzar: (fraccion: number) => void,
  opciones: { leerPlanilla?: typeof leerLaPlanillaDelChat; xhr?: () => XMLHttpRequest } = {},
): SubidaEnCurso {
  let xhr: XMLHttpRequest | null = null;
  let cancelado = false;
  const promesa = (async () => {
    const lectura = familiaDe(archivo) === 'planilla' ? await (opciones.leerPlanilla ?? leerLaPlanillaDelChat)(archivo) : null;
    if (cancelado) throw new FalloDeLaSubida('Quitaste el archivo.', 0, 'CANCELADA');
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    if (lectura) datos.append('lectura', new Blob([JSON.stringify(lectura)], { type: 'application/json' }), 'lectura.json');
    return await new Promise<AdjuntoDelMensaje>((resolver, rechazar) => {
      const x = (opciones.xhr ?? (() => new XMLHttpRequest()))();
      xhr = x;
      x.open('POST', `${BACKEND_URL}/inmobiliaria/chat/adjuntos`);
      const token = getAccessToken();
      if (token) x.setRequestHeader('Authorization', `Bearer ${token}`);
      for (const [k, v] of Object.entries(cabecerasDeLaCuenta())) x.setRequestHeader(k, v);
      x.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) alAvanzar(Math.min(0.99, e.loaded / e.total));
      };
      x.onerror = () => rechazar(mensajeDelSobre(0, null, archivo.name));
      x.onabort = () => rechazar(new FalloDeLaSubida('Quitaste el archivo.', 0, 'CANCELADA'));
      x.onload = () => {
        let cuerpo: unknown = null;
        try {
          cuerpo = JSON.parse(x.responseText);
        } catch {
          cuerpo = null;
        }
        if (x.status >= 200 && x.status < 300) {
          const adjunto = leerAdjuntoSubido(cuerpo);
          if (adjunto) {
            alAvanzar(1);
            resolver(adjunto);
            return;
          }
          rechazar(new FalloDeLaSubida(`El servidor no confirmó «${archivo.name}». Reinténtalo.`, x.status, null));
          return;
        }
        rechazar(mensajeDelSobre(x.status, cuerpo, archivo.name));
      };
      x.send(datos);
    });
  })();
  return {
    promesa,
    cancelar: () => {
      cancelado = true;
      xhr?.abort();
    },
  };
}
