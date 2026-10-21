/**
 * Carpetas de fotos → inmuebles (Nico, 20-10-2026: «arrastrar carpetas»).
 *
 * Una inmobiliaria con muchos inmuebles ya tiene sus fotos ordenadas así: una
 * carpeta por inmueble. Se arrastra la carpeta madre (o varias carpetas) y
 * cada carpeta se vuelve una tarjeta con sus fotos puestas, en orden de
 * nombre: la primera es la portada. Si ya hay tarjetas (de un Excel) y la
 * carpeta se llama como su código o su dirección, las fotos van a ESA tarjeta.
 */

import { llaveDeDireccion, plegar, type InmuebleRapido } from './borrador';
import { soloImagenes } from './fotos';

export interface CarpetaLeida {
  /** El nombre de la carpeta: «Laureles 302», «INM-0041». */
  nombre: string;
  fotos: File[];
}

export interface ArchivoConRuta {
  /** «Inmuebles/Laureles 302/sala.jpg» (o sólo «sala.jpg» suelto). */
  ruta: string;
  archivo: File;
}

/**
 * Agrupa los archivos por carpeta.
 *
 * - Todo dentro de UNA carpeta y sin subcarpetas → un inmueble (esa carpeta).
 * - Una carpeta madre con subcarpetas → un inmueble por subcarpeta; lo que
 *   esté más adentro se suma a su subcarpeta de primer nivel, y las fotos
 *   sueltas en la madre se ignoran (no se sabe de cuál son).
 * - Varias carpetas soltadas a la vez → una por carpeta.
 * - Fotos sueltas, sin carpeta → un solo inmueble «Fotos sueltas».
 */
export function agruparPorCarpeta(archivos: ArchivoConRuta[]): CarpetaLeida[] {
  const conImagen = archivos.filter((a) => soloImagenes([a.archivo]).length === 1);
  if (conImagen.length === 0) return [];
  const partes = conImagen.map((a) => ({ ...a, trozos: a.ruta.split('/').filter(Boolean) }));
  const raices = new Set(partes.map((p) => (p.trozos.length > 1 ? p.trozos[0] : '')));

  // Una sola raíz que tiene subcarpetas: la raíz es la carpeta madre.
  const unaMadre =
    raices.size === 1 && !raices.has('') && partes.some((p) => p.trozos.length > 2);

  const grupos = new Map<string, File[]>();
  for (const p of partes) {
    let nombre: string | null;
    if (p.trozos.length === 1) nombre = unaMadre ? null : 'Fotos sueltas';
    else if (unaMadre) nombre = p.trozos.length > 2 ? p.trozos[1] : null;
    else nombre = p.trozos[0];
    if (nombre === null) continue;
    const lista = grupos.get(nombre) ?? [];
    lista.push(p.archivo);
    grupos.set(nombre, lista);
  }
  return [...grupos.entries()]
    .map(([nombre, fotos]) => ({ nombre, fotos: soloImagenes(fotos) }))
    .filter((c) => c.fotos.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }));
}

/** «INM-0041» = «inm 41»: sin ceros a la izquierda ni separadores. */
function llaveDeCodigo(texto: string): string {
  return plegar(texto)
    .replace(/\s+/g, '')
    .replace(/\d+/g, (d) => d.replace(/^0+(?=\d)/, ''));
}

/**
 * ¿Esta carpeta es de este inmueble? Por el código (el nombre de la carpeta
 * ES el código, o empieza con él: «0041 - Laureles») o por la dirección
 * (el nombre de la carpeta es la dirección).
 */
export function esLaCarpetaDe(nombre: string, i: InmuebleRapido): boolean {
  if (i.codigo) {
    const codigo = llaveDeCodigo(i.codigo);
    if (codigo) {
      const carpeta = llaveDeCodigo(nombre);
      if (carpeta === codigo) return true;
      const primerTrozo = llaveDeCodigo(nombre.split(/\s[-–—_]\s|\s{2,}/)[0] ?? '');
      if (primerTrozo === codigo) return true;
    }
  }
  const direccion = llaveDeDireccion(i.direccion);
  const carpeta = llaveDeDireccion(nombre);
  return !!direccion && !!carpeta && direccion.split('|')[1] === carpeta.split('|')[1];
}

/**
 * Acomoda cada carpeta en la tarjeta que le corresponde (sólo tarjetas sin
 * fotos todavía, y cada tarjeta recibe una sola carpeta). Las que no casan con
 * ninguna quedan para volverse tarjetas nuevas.
 */
export function acomodarCarpetas(
  carpetas: CarpetaLeida[],
  inmuebles: InmuebleRapido[],
  fotosPorInmueble: (clave: string) => number,
): { asignadas: Array<{ clave: string; carpeta: CarpetaLeida }>; nuevas: CarpetaLeida[] } {
  const tomadas = new Set<string>();
  const asignadas: Array<{ clave: string; carpeta: CarpetaLeida }> = [];
  const nuevas: CarpetaLeida[] = [];
  for (const carpeta of carpetas) {
    const destino = inmuebles.find(
      (i) => !tomadas.has(i.clave) && !i.idCreado && fotosPorInmueble(i.clave) === 0 && esLaCarpetaDe(carpeta.nombre, i),
    );
    if (destino) {
      tomadas.add(destino.clave);
      asignadas.push({ clave: destino.clave, carpeta });
    } else nuevas.push(carpeta);
  }
  return { asignadas, nuevas };
}

// ── Lo que el navegador entrega al soltar o elegir carpetas ─────────────────

interface EntradaDelSistema {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (ok: (f: File) => void, mal: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (e: EntradaDelSistema[]) => void, mal: (e: unknown) => void) => void };
}

async function recorrer(entrada: EntradaDelSistema, salida: ArchivoConRuta[]): Promise<void> {
  if (entrada.isFile && entrada.file) {
    const archivo = await new Promise<File | null>((ok) => entrada.file!(ok, () => ok(null)));
    if (archivo) salida.push({ ruta: entrada.fullPath.replace(/^\//, ''), archivo });
    return;
  }
  if (entrada.isDirectory && entrada.createReader) {
    const lector = entrada.createReader();
    // `readEntries` entrega de a 100: hay que pedir hasta que venga vacío.
    for (;;) {
      const tanda = await new Promise<EntradaDelSistema[]>((ok) => lector.readEntries(ok, () => ok([])));
      if (tanda.length === 0) break;
      for (const hija of tanda) await recorrer(hija, salida);
    }
  }
}

/** Lo soltado (archivos y carpetas) con su ruta. Sin soporte de carpetas, sólo los archivos. */
export async function leerLoSoltado(datos: DataTransfer): Promise<ArchivoConRuta[]> {
  const entradas = Array.from(datos.items ?? [])
    .map((it) => (it.kind === 'file' && 'webkitGetAsEntry' in it ? (it.webkitGetAsEntry() as EntradaDelSistema | null) : null))
    .filter((e): e is EntradaDelSistema => !!e);
  if (entradas.length === 0) {
    return Array.from(datos.files ?? []).map((archivo) => ({ ruta: archivo.name, archivo }));
  }
  const salida: ArchivoConRuta[] = [];
  for (const e of entradas) await recorrer(e, salida);
  return salida;
}

/** Lo elegido con `<input webkitdirectory>`: cada archivo trae `webkitRelativePath`. */
export function leerLoElegido(lista: FileList | null): ArchivoConRuta[] {
  return Array.from(lista ?? []).map((archivo) => ({
    ruta: (archivo as File & { webkitRelativePath?: string }).webkitRelativePath || archivo.name,
    archivo,
  }));
}
