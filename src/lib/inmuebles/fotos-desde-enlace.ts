/**
 * Traer las fotos de un inmueble desde el aviso donde ya está publicado.
 *
 * 🔴 Nico, 2026-09-12: «además de que puedan arrastrar o subir las fotos,
 * deberíamos dar la opción de que pueda colocar el link de donde tienen esa
 * propiedad, donde podamos sacar las imágenes, y ya nosotros hacemos la tarea
 * de sacarlas y subirlas al inmueble».
 *
 * Una inmobiliaria que migra ya tiene sus 2.800 inmuebles publicados en
 * Fincaraíz o Metrocuadrado, con sus fotos. Pedirle que las vuelva a
 * conseguir una por una es pedirle el trabajo dos veces.
 *
 * ── Qué se reusa, que es todo ──────────────────────────────────────────────
 * Esto NO trae maquinaria nueva. El asistente de importación ya lee avisos
 * desde su URL (`leerEnlaces` → `/api/inmuebles/desde-enlace`) y ya baja las
 * fotos por el proxy (`traerFotoComoArchivo` →
 * `/api/inmuebles/imagen-remota`), que es lo que esquiva el CORS del portal.
 * Acá sólo se encadenan las dos para UN inmueble que ya existe, y el
 * resultado son `File`s — exactamente lo que `SubidaDeFotos` ya entrega a la
 * ficha.
 *
 * ── Las fotos que fallan no tumban a las que sirven ────────────────────────
 * `traerFotoComoArchivo` devuelve `null` cuando una imagen no se pudo bajar.
 * Se cuentan y se dicen, pero las demás entran igual: un aviso con 18 fotos
 * de las que 2 dieron 403 son 16 fotos, no un error.
 */

import {
  leerEnlaces,
  traerFotoComoArchivo,
  type ResultadoDeEnlace,
} from './enlaces.service';

export interface FotosTraidas {
  archivos: File[];
  /** Cuántas imágenes traía el aviso, antes del cupo y de los fallos. */
  encontradas: number;
  /** Cuántas no se pudieron bajar. Se dicen: un corte en silencio miente. */
  fallidas: number;
  /** Cuántas quedaron fuera por el cupo del inmueble. */
  fueraDeCupo: number;
}

export type ResultadoDeFotos =
  | ({ ok: true } & FotosTraidas)
  | { ok: false; motivo: string; mensaje: string };

/** Cómo se llama cada archivo. El nombre importa: se ve al subir y al fallar. */
function nombreDeFoto(indice: number): string {
  return `foto-${String(indice + 1).padStart(2, '0')}`;
}

/**
 * Lee el aviso y devuelve sus fotos como archivos listos para subir.
 *
 * `cupo` es cuántas caben todavía en el inmueble; si el aviso trae más, se
 * toman las primeras y se dice cuántas quedaron fuera. Las primeras y no unas
 * cualesquiera: en un aviso la primera foto es la de portada.
 */
export async function fotosDesdeEnlace(
  url: string,
  cupo: number,
  alAvanzar?: (listas: number, total: number) => void,
): Promise<ResultadoDeFotos> {
  if (cupo <= 0) {
    return {
      ok: false,
      motivo: 'sin_cupo',
      mensaje: 'Este inmueble ya tiene todas las fotos que caben.',
    };
  }

  const [leido] = (await leerEnlaces([url])) as [ResultadoDeEnlace];
  if (!leido || !leido.ok) {
    return {
      ok: false,
      motivo: leido?.motivo ?? 'no_responde',
      mensaje: leido?.mensaje ?? 'No se pudo leer el enlace.',
    };
  }

  const imagenes = leido.inmueble.imagenes ?? [];
  if (imagenes.length === 0) {
    return {
      ok: false,
      motivo: 'sin_fotos',
      mensaje: 'El aviso se leyó bien, pero no tiene fotos que traer.',
    };
  }

  const aTraer = imagenes.slice(0, cupo);
  const archivos: File[] = [];
  let listas = 0;

  /*
   * De a una y en orden, no en paralelo. Son hasta 40 imágenes por el mismo
   * proxy; dispararlas todas juntas es la forma de que el portal corte por
   * ráfaga y de que el orden de llegada decida el orden de la galería. Acá el
   * orden es el del aviso, que es el que alguien ya eligió.
   */
  for (const [i, imagen] of aTraer.entries()) {
    const archivo = await traerFotoComoArchivo(imagen, nombreDeFoto(i));
    if (archivo) archivos.push(archivo);
    listas += 1;
    alAvanzar?.(listas, aTraer.length);
  }

  return {
    ok: true,
    archivos,
    encontradas: imagenes.length,
    fallidas: aTraer.length - archivos.length,
    fueraDeCupo: Math.max(0, imagenes.length - cupo),
  };
}
