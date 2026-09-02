/**
 * Detectar el tipo de una imagen por su firma de bytes (magic number).
 *
 * ── Por qué esto existe ───────────────────────────────────────────────────
 * `imagen-remota` confiaba en el `Content-Type` que manda el origen, y hay
 * CDNs reales (T-0036: `portofinopr.arrendasoft.co`) que sirven JPEGs
 * genuinos rotulados `application/octet-stream`. El header lo controla el
 * origen; los primeros bytes del archivo, no. Por eso la decisión de qué es
 * una imagen tiene que salir de ahí.
 *
 * Sólo reconoce lo que el back acepta en `POST /properties/:id/images`
 * (jpg/png/webp, ver `src/lib/api/property-photos.ts`). No hay que ensanchar
 * el conjunto: un GIF que la firma detecte pero el back rechace es un fallo
 * más adelante en el flujo, no uno resuelto acá.
 */

export type TipoDeImagenDetectado = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Devuelve el tipo MIME real de `bytes` según su firma, o `null` si no
 * coincide con ninguna firma reconocida (incluye cuerpo vacío o truncado).
 *
 * Sólo mira el prefijo de cada firma — nunca hace falta más que los primeros
 * 12 bytes, así que quien llama puede pasar un prefijo acotado del cuerpo en
 * vez de bufferearlo entero.
 */
export function detectarTipoDeImagenPorFirma(bytes: Uint8Array): TipoDeImagenDetectado | null {
  if (esJpeg(bytes)) return 'image/jpeg';
  if (esPng(bytes)) return 'image/png';
  if (esWebp(bytes)) return 'image/webp';
  return null;
}

function esJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function esPng(bytes: Uint8Array): boolean {
  if (bytes.length < FIRMA_PNG.length) return false;
  return FIRMA_PNG.every((byte, i) => bytes[i] === byte);
}

function esWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  // 'RIFF' en 0-3, tamaño en 4-7 (no importa), 'WEBP' en 8-11.
  const esRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const esWebpMarca = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return esRiff && esWebpMarca;
}
