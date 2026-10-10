/**
 * Fotos masivas en un ZIP (Nico, 09-10-2026: «ambas, Excel o ZIP, así como en
 * migración que tenemos varias opciones»).
 *
 * El ZIP trae UNA CARPETA POR INMUEBLE, con su código (el de su sistema
 * anterior o el de Leasefy), y adentro sus fotos. Se lee en el navegador con
 * el lector de ZIP que ya trae `xlsx` (un .xlsx es un ZIP): sin dependencias
 * nuevas y sin subir el archivo entero a ningún lado.
 *
 * Reglas:
 *  · Las fotos van en el orden del nombre del archivo (1, 2, 10: orden natural).
 *  · Sólo JPG, PNG o WebP; lo demás (un .txt, la basura de macOS) se ignora.
 *  · Si todo viene dentro de UNA carpeta (fotos/LAB-001/…), esa se salta.
 *  · Se SUMAN a las que el inmueble ya tiene, hasta 40 en total.
 */

export const FOTOS_MAXIMAS_POR_INMUEBLE = 40;

const TIPOS: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export interface FotoDelZip {
  nombre: string;
  tipo: string;
  bytes: Uint8Array;
}

export interface CarpetaDelZip {
  carpeta: string;
  fotos: FotoDelZip[];
}

const comparar = new Intl.Collator('es', { numeric: true, sensitivity: 'base' }).compare;

/** Las rutas «carpeta/foto» del ZIP → carpetas con sus fotos (pura: recibe las entradas ya leídas). */
export function agruparFotos(entradas: { ruta: string; bytes: Uint8Array }[]): CarpetaDelZip[] {
  const utiles = entradas
    .map((e) => ({ ...e, partes: e.ruta.split('/').filter(Boolean) }))
    .filter((e) => !e.partes.some((p) => p.startsWith('.') || p === '__MACOSX'))
    .filter((e) => TIPOS[(e.partes.at(-1)?.split('.').pop() ?? '').toLowerCase()]);
  if (utiles.length === 0) return [];

  // Todo dentro de una sola carpeta raíz (fotos/LAB-001/1.jpg): se salta esa raíz.
  const raices = new Set(utiles.map((e) => (e.partes.length > 2 ? e.partes[0] : null)));
  const saltar = raices.size === 1 && !raices.has(null) && utiles.every((e) => e.partes.length > 2) ? 1 : 0;

  const porCarpeta = new Map<string, FotoDelZip[]>();
  for (const e of utiles) {
    const partes = e.partes.slice(saltar);
    const carpeta = partes.length > 1 ? partes[0].trim() : '';
    const nombre = partes.at(-1)!;
    const tipo = TIPOS[nombre.split('.').pop()!.toLowerCase()];
    const lista = porCarpeta.get(carpeta) ?? [];
    lista.push({ nombre, tipo, bytes: e.bytes });
    porCarpeta.set(carpeta, lista);
  }
  return [...porCarpeta.entries()]
    .map(([carpeta, fotos]) => ({ carpeta, fotos: fotos.sort((a, b) => comparar(a.nombre, b.nombre)) }))
    .sort((a, b) => comparar(a.carpeta, b.carpeta));
}

/** Lee el ZIP (el lector de `xlsx`, cargado sólo cuando hace falta). */
export async function leerFotosDelZip(datos: ArrayBuffer): Promise<CarpetaDelZip[]> {
  const XLSX = await import('xlsx');
  const zip = XLSX.CFB.read(new Uint8Array(datos), { type: 'array' });
  const entradas: { ruta: string; bytes: Uint8Array }[] = [];
  zip.FileIndex.forEach((f: { type: number; content?: ArrayLike<number> | null }, i: number) => {
    if (f.type !== 2 || !f.content || f.content.length === 0) return;
    const ruta = zip.FullPaths[i].replace(/^Root Entry\//, '');
    entradas.push({ ruta, bytes: f.content instanceof Uint8Array ? f.content : new Uint8Array(f.content) });
  });
  return agruparFotos(entradas);
}

export interface InmuebleConCodigo {
  id: string;
  code: number | null;
  externalId: string | null;
  titulo: string;
  fotos: number;
}

export interface Emparejamiento {
  carpeta: string;
  inmueble: InmuebleConCodigo | null;
  fotos: FotoDelZip[];
  /** Las que entran sin pasar de 40 (las demás se dicen). */
  caben: number;
}

const normal = (s: string) => s.trim().toLowerCase().replace(/^0+(?=\d)/, '');

/** Empareja cada carpeta con su inmueble: primero el código de su sistema anterior, después el de Leasefy. */
export function emparejar(carpetas: CarpetaDelZip[], inmuebles: InmuebleConCodigo[]): Emparejamiento[] {
  const porExterno = new Map<string, InmuebleConCodigo>();
  const porCodigo = new Map<string, InmuebleConCodigo>();
  for (const i of inmuebles) {
    if (i.externalId?.trim()) porExterno.set(normal(i.externalId), i);
    if (i.code != null) porCodigo.set(String(i.code), i);
  }
  return carpetas.map((c) => {
    const llave = normal(c.carpeta);
    const inmueble = (llave && (porExterno.get(llave) ?? porCodigo.get(llave))) || null;
    const caben = inmueble ? Math.max(0, Math.min(c.fotos.length, FOTOS_MAXIMAS_POR_INMUEBLE - inmueble.fotos)) : 0;
    return { carpeta: c.carpeta, inmueble, fotos: c.fotos, caben };
  });
}
