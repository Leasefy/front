/**
 * Las fotos del publicador rápido, listas para subir (Nico, 20-10-2026: «si
 * llegan a ser muchísimos inmuebles, ¿cómo escala esto?»).
 *
 * Una foto de celular pesa 4 a 8 MB y el marketplace la muestra a lo sumo a
 * 2048 px: subirla entera es esperar diez veces más por nada. Acá se achica
 * en el navegador (lado largo de 2048 px, JPEG 0,82: unos 300 a 600 KB) y se
 * saca una miniatura de 320 px para la pantalla, que con cientos de fotos es
 * la diferencia entre una página que se mueve y una que se congela.
 *
 * Si el navegador no puede leer la foto (HEIC en Chrome, un archivo dañado),
 * se deja tal cual: el back dirá si la acepta, y la tarjeta lo cuenta.
 */

/** El lado más largo de la foto que se sube. */
export const LADO_MAXIMO = 2048;
/** El lado más largo de la miniatura que se pinta. */
export const LADO_DE_LA_MINIATURA = 320;
/** Por debajo de esto y dentro del tamaño, la foto se sube como viene. */
export const PESO_QUE_NO_SE_TOCA = 900 * 1024;

const CALIDAD = 0.82;
const CALIDAD_DE_LA_MINIATURA = 0.7;

/** Las medidas para que el lado largo no pase de `maximo`, sin agrandar nunca. */
export function medidasParaAchicar(ancho: number, alto: number, maximo: number): { ancho: number; alto: number } {
  if (ancho <= 0 || alto <= 0) return { ancho: 0, alto: 0 };
  const escala = Math.min(1, maximo / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

/** «IMG_2041.HEIC» → «IMG_2041.jpg». */
export function nombreEnJpg(nombre: string): string {
  const base = nombre.replace(/\.[^./\\]+$/, '') || 'foto';
  return `${base}.jpg`;
}

export interface FotoPreparada {
  archivo: File;
  /** `null` si el navegador no pudo leerla: se pinta con el archivo. */
  miniatura: Blob | null;
}

async function aBlob(lienzo: HTMLCanvasElement | OffscreenCanvas, calidad: number): Promise<Blob | null> {
  if ('convertToBlob' in lienzo) {
    return lienzo.convertToBlob({ type: 'image/jpeg', quality: calidad }).catch(() => null);
  }
  return new Promise((listo) => (lienzo as HTMLCanvasElement).toBlob((b) => listo(b), 'image/jpeg', calidad));
}

function lienzoDe(ancho: number, alto: number): HTMLCanvasElement | OffscreenCanvas | null {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(ancho, alto);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return c;
}

async function dibujar(imagen: ImageBitmap, ancho: number, alto: number, calidad: number): Promise<Blob | null> {
  const lienzo = lienzoDe(ancho, alto);
  const ctx = lienzo?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
  if (!lienzo || !ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  return aBlob(lienzo, calidad);
}

export async function prepararFoto(original: File): Promise<FotoPreparada> {
  if (typeof createImageBitmap !== 'function') return { archivo: original, miniatura: null };
  let imagen: ImageBitmap;
  try {
    // `from-image` respeta la orientación de la cámara (la foto de lado sale derecha).
    imagen = await createImageBitmap(original, { imageOrientation: 'from-image' });
  } catch {
    return { archivo: original, miniatura: null };
  }
  try {
    const grande = medidasParaAchicar(imagen.width, imagen.height, LADO_MAXIMO);
    const chica = medidasParaAchicar(imagen.width, imagen.height, LADO_DE_LA_MINIATURA);
    const yaSirve =
      original.size <= PESO_QUE_NO_SE_TOCA &&
      grande.ancho === imagen.width &&
      /^image\/(jpeg|png|webp)$/.test(original.type);
    const [blob, miniatura] = await Promise.all([
      yaSirve ? Promise.resolve(null) : dibujar(imagen, grande.ancho, grande.alto, CALIDAD),
      dibujar(imagen, chica.ancho, chica.alto, CALIDAD_DE_LA_MINIATURA),
    ]);
    // Si achicarla no la hizo más liviana (una PNG chiquita), se sube la original.
    const archivo =
      blob && blob.size < original.size
        ? new File([blob], nombreEnJpg(original.name), { type: 'image/jpeg', lastModified: original.lastModified })
        : original;
    return { archivo, miniatura };
  } finally {
    imagen.close();
  }
}

/** Las imágenes de una lista de archivos, en orden natural de nombre («2.jpg» antes que «10.jpg»). */
export function soloImagenes(archivos: Iterable<File>): File[] {
  return Array.from(archivos)
    .filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }));
}
