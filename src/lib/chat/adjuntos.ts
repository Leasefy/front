/**
 * Adjuntos en el chat de Ori (Nico, 29-10-2026: «el chat lo resuelve todo»).
 *
 * Lo que se puede mandar y con qué límites — el ESPEJO de
 * `back-erp/src/inmobiliaria/adjuntos-del-chat/adjunto-del-chat.ts` (el back
 * vuelve a revisarlo todo, también los bytes). Acá sólo se dice antes, en
 * palabras y junto al archivo, para que nadie espere una subida que el
 * servidor iba a rechazar.
 */

export type FamiliaDelAdjunto = 'imagen' | 'pdf' | 'xml' | 'planilla' | 'texto';

/** Por extensión: la que ve la persona. El back manda la misma tabla. */
export const TIPOS_DEL_CHAT: Readonly<Record<string, FamiliaDelAdjunto>> = {
  jpg: 'imagen',
  jpeg: 'imagen',
  png: 'imagen',
  webp: 'imagen',
  heic: 'imagen',
  heif: 'imagen',
  pdf: 'pdf',
  xml: 'xml',
  csv: 'planilla',
  xlsx: 'planilla',
  xls: 'planilla',
  ofx: 'texto',
  txt: 'texto',
};

/** Lo que pide el selector de archivos (`accept`). */
export const ACEPTA_EL_CHAT = [
  ...Object.keys(TIPOS_DEL_CHAT).map((e) => `.${e}`),
  'image/*',
  'application/pdf',
].join(',');

export const MAX_BYTES_DEL_ADJUNTO = 10 * 1024 * 1024;
/** Por mensaje (el back acepta hasta 10 por acción). */
export const MAX_ADJUNTOS_POR_MENSAJE = 10;

export function extensionDe(nombre: string): string {
  const m = /\.([A-Za-z0-9]{1,6})$/.exec(nombre.trim());
  return m ? m[1]!.toLowerCase() : '';
}

/** La familia del archivo; una foto pegada sin nombre se reconoce por su tipo. */
export function familiaDe(archivo: Pick<File, 'name' | 'type'>): FamiliaDelAdjunto | null {
  const porNombre = TIPOS_DEL_CHAT[extensionDe(archivo.name)];
  if (porNombre) return porNombre;
  if (/^image\/(jpeg|png|webp|heic|heif)$/.test(archivo.type)) return 'imagen';
  if (archivo.type === 'application/pdf') return 'pdf';
  return null;
}

/** «230 KB», «1,4 MB». */
export function pesoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('es-CO')} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`;
}

/**
 * Por qué el chat NO recibe este archivo, en palabras (o `null` si sí). Lo que
 * se dice es lo que hay que hacer, no el código.
 */
export function porQueNoSeAdjunta(archivo: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (archivo.size === 0) return `«${archivo.name}» está vacío.`;
  if (!familiaDe(archivo)) {
    return `«${archivo.name}» no se puede mandar al chat. Manda fotos (JPG, PNG, WEBP o HEIC), PDF, XML de la DIAN, Excel, CSV, OFX o TXT.`;
  }
  if (archivo.size > MAX_BYTES_DEL_ADJUNTO) {
    return `«${archivo.name}» pesa ${pesoLegible(archivo.size)}: el máximo es 10 MB. Mándalo más liviano.`;
  }
  return null;
}

/**
 * Una foto pegada del portapapeles llega como «image.png» (o sin nombre): se le
 * pone uno que diga qué es y cuándo, para que en el hilo no aparezcan tres
 * «image.png».
 */
export function nombreDelPegado(archivo: File, ahora: Date, n: number): File {
  if (archivo.name && !/^image\.(png|jpe?g|webp)$/i.test(archivo.name)) return archivo;
  const ext = archivo.type === 'image/jpeg' ? 'jpg' : archivo.type === 'image/webp' ? 'webp' : 'png';
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const nombre = `captura-${hh}${mm}${n > 0 ? `-${n + 1}` : ''}.${ext}`;
  return new File([archivo], nombre, { type: archivo.type || 'image/png', lastModified: archivo.lastModified });
}

/** Lo que el micro recibe de cada archivo (y lo que guarda el mensaje de la persona). */
export interface AdjuntoDelMensaje {
  id: string;
  nombre: string;
  tipo: string;
  familia: FamiliaDelAdjunto;
  tamano: number;
}

/** Lee la respuesta del back al subir; lo que no tenga la forma se descarta. */
export function leerAdjuntoSubido(v: unknown): AdjuntoDelMensaje | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const familia = o.familia as FamiliaDelAdjunto;
  if (
    typeof o.id !== 'string' ||
    typeof o.nombre !== 'string' ||
    typeof o.tipo !== 'string' ||
    typeof o.tamano !== 'number' ||
    !['imagen', 'pdf', 'xml', 'planilla', 'texto'].includes(familia)
  ) {
    return null;
  }
  return { id: o.id, nombre: o.nombre, tipo: o.tipo, familia, tamano: o.tamano };
}

/** Los adjuntos guardados en un mensaje (localStorage), sin confiar en la forma. */
export function leerAdjuntosDelMensaje(v: unknown): AdjuntoDelMensaje[] {
  return Array.isArray(v) ? v.map(leerAdjuntoSubido).filter((a): a is AdjuntoDelMensaje => a !== null) : [];
}

/**
 * Lo que viaja como texto cuando la persona sólo adjuntó (sin escribir): el
 * micro igual lee cada archivo; el texto queda en el hilo y en la memoria.
 */
export function textoSinPalabras(adjuntos: readonly Pick<AdjuntoDelMensaje, 'nombre'>[]): string {
  if (adjuntos.length === 1) return `Te mando «${adjuntos[0]!.nombre}».`;
  return `Te mando ${adjuntos.length} archivos.`;
}
