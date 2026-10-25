/**
 * TOTP (RFC 6238) sobre HOTP (RFC 4226) con WebCrypto: SHA-1, 6 dígitos y
 * ventana de 30 s, que es lo que usan Supabase Auth y las apps de
 * autenticación. Sin dependencias.
 *
 * Existe sólo para el mock del segundo factor en entornos que no son
 * producción (`mock-del-segundo-factor.ts`).
 */

const ALFABETO_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Base32 de RFC 4648; tolera espacios, minúsculas y el relleno «=». */
export function decodificarBase32(texto: string): Uint8Array {
  const limpio = texto.replace(/[\s=]+/g, '').toUpperCase();
  const salida: number[] = [];
  let acumulado = 0;
  let bits = 0;
  for (const letra of limpio) {
    const valor = ALFABETO_BASE32.indexOf(letra);
    if (valor < 0) throw new Error('La clave no es base32 válida');
    acumulado = (acumulado << 5) | valor;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      salida.push((acumulado >> bits) & 0xff);
      acumulado &= (1 << bits) - 1;
    }
  }
  return Uint8Array.from(salida);
}

/** HOTP: el código de `digitos` dígitos para un contador. */
export async function codigoHotp(
  clave: Uint8Array,
  contador: number,
  digitos = 6,
): Promise<string> {
  const mensaje = new ArrayBuffer(8);
  const vista = new DataView(mensaje);
  vista.setUint32(0, Math.floor(contador / 2 ** 32));
  vista.setUint32(4, contador >>> 0);
  const llave = await crypto.subtle.importKey(
    'raw',
    clave as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', llave, mensaje));
  const desplazamiento = hmac[hmac.length - 1]! & 0x0f;
  const binario =
    ((hmac[desplazamiento]! & 0x7f) << 24) |
    (hmac[desplazamiento + 1]! << 16) |
    (hmac[desplazamiento + 2]! << 8) |
    hmac[desplazamiento + 3]!;
  return String(binario % 10 ** digitos).padStart(digitos, '0');
}

export interface OpcionesDelTotp {
  digitos?: number;
  /** Largo de la ventana, en segundos. */
  paso?: number;
}

/** TOTP: el código vigente en `instanteMs` para una clave base32. */
export async function codigoTotp(
  claveBase32: string,
  instanteMs: number = Date.now(),
  { digitos = 6, paso = 30 }: OpcionesDelTotp = {},
): Promise<string> {
  const contador = Math.floor(instanteMs / 1000 / paso);
  return codigoHotp(decodificarBase32(claveBase32), contador, digitos);
}
