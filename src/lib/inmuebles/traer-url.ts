/**
 * Traer una URL que escribió el usuario, desde el servidor.
 *
 * ── Por qué tiene guardia ────────────────────────────────────────────────
 * La URL la escribe una inmobiliaria, y quien pide es NUESTRO servidor. Sin
 * control, `http://169.254.169.254/latest/meta-data/` devuelve las credenciales
 * de la instancia, y `http://localhost:3000/...` alcanza servicios internos que
 * desde afuera no se ven. Eso es SSRF, y es la razón de este archivo.
 *
 * Tres cosas hay que mirar, no una:
 *  1. El esquema (sólo http/https — `file://` lee el disco del servidor).
 *  2. A qué IP resuelve el nombre, no cómo se escribe. `interno.example.com`
 *     puede apuntar a 10.0.0.5, y se ve igual de público que cualquier otro.
 *  3. **Cada redirección.** Un host público puede responder 302 hacia
 *     169.254.169.254. Por eso `redirect: 'manual'` y se revalida salto a
 *     salto: seguir redirecciones automáticamente saltea la guardia.
 *
 * Y dos límites, porque la respuesta también es de afuera: un tope de bytes
 * (una URL puede servir un archivo infinito) y un tope de tiempo.
 */

import { lookup } from 'node:dns/promises';

export const MAX_REDIRECCIONES = 3;
export const TIMEOUT_MS = 12_000;

/** Lo que salió mal, en términos que la pantalla pueda mostrar. */
export type MotivoDeFallo =
  | 'url_invalida'
  | 'esquema_no_permitido'
  | 'destino_privado'
  | 'demasiadas_redirecciones'
  | 'no_responde'
  | 'respuesta_con_error'
  | 'tipo_inesperado'
  | 'demasiado_grande';

export class FalloAlTraer extends Error {
  constructor(
    readonly motivo: MotivoDeFallo,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'FalloAlTraer';
  }
}

/**
 * ¿Esta IP es de una red que no debería alcanzarse desde acá?
 *
 * Exportada porque es la única parte con reglas puras, y las reglas de red se
 * verifican mejor con una tabla que con un servidor de prueba.
 */
export function esDireccionPrivada(ip: string): boolean {
  // IPv4 mapeada en IPv6: ::ffff:10.0.0.1 es 10.0.0.1.
  const limpia = ip.replace(/^::ffff:/i, '').toLowerCase();

  if (/^\d+\.\d+\.\d+\.\d+$/.test(limpia)) {
    const [a, b] = limpia.split('.').map(Number);
    if (a === 0) return true; // 0.0.0.0/8 — "esta red"
    if (a === 10) return true; // privada
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local: el metadata de la nube
    if (a === 172 && b >= 16 && b <= 31) return true; // privada
    if (a === 192 && b === 168) return true; // privada
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast y reservadas
    return false;
  }

  if (limpia === '::' || limpia === '::1') return true; // sin especificar / loopback
  if (/^f[cd]/.test(limpia)) return true; // fc00::/7 — unique local
  if (/^fe[89ab]/.test(limpia)) return true; // fe80::/10 — link-local

  return false;
}

/** Valida el esquema y que el host no resuelva a una red interna. */
async function revisarDestino(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FalloAlTraer('esquema_no_permitido', `Sólo se pueden leer enlaces http o https.`);
  }

  // El host puede venir ya como IP literal, o como nombre. En los dos casos
  // lo que importa es a dónde apunta.
  let direcciones: { address: string }[];
  try {
    direcciones = await lookup(url.hostname, { all: true });
  } catch {
    throw new FalloAlTraer('no_responde', `No se pudo resolver ${url.hostname}.`);
  }

  if (direcciones.some((d) => esDireccionPrivada(d.address))) {
    throw new FalloAlTraer('destino_privado', `${url.hostname} apunta a una red interna.`);
  }
}

interface OpcionesDeTraida {
  /** Tope de bytes. Se corta la lectura al pasarlo, no se descarta después. */
  maxBytes: number;
  /** Prefijos de content-type aceptados, ej. ['text/html'] o ['image/']. */
  tiposAceptados: string[];
}

export interface RespuestaTraida {
  bytes: Uint8Array;
  contentType: string;
  /** La URL final después de las redirecciones. */
  urlFinal: string;
}

/**
 * Trae una URL revalidando cada redirección, con tope de bytes y de tiempo.
 * Lanza `FalloAlTraer` con un motivo legible; nunca devuelve algo a medias.
 */
export async function traerConGuardia(
  urlCruda: string,
  { maxBytes, tiposAceptados }: OpcionesDeTraida,
): Promise<RespuestaTraida> {
  let url: URL;
  try {
    url = new URL(urlCruda);
  } catch {
    throw new FalloAlTraer('url_invalida', `«${urlCruda}» no es un enlace válido.`);
  }

  let respuesta: Response | null = null;

  for (let salto = 0; salto <= MAX_REDIRECCIONES; salto++) {
    await revisarDestino(url);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          // Sin User-Agent muchos sitios devuelven 403. Se identifica de
          // frente: es un lector, no un navegador disfrazado.
          'User-Agent': 'LeasefyImportador/1.0 (+https://leasefy.co)',
          Accept: tiposAceptados.includes('text/html')
            ? 'text/html,application/xhtml+xml'
            : 'image/*',
          'Accept-Language': 'es-CO,es;q=0.9',
        },
      });
    } catch {
      throw new FalloAlTraer('no_responde', `${url.hostname} no respondió a tiempo.`);
    }

    const ubicacion = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && ubicacion) {
      // `new URL(ubicacion, url)` resuelve las redirecciones relativas.
      try {
        url = new URL(ubicacion, url);
      } catch {
        throw new FalloAlTraer('url_invalida', `La redirección apuntaba a «${ubicacion}».`);
      }
      continue;
    }

    respuesta = res;
    break;
  }

  if (!respuesta) {
    throw new FalloAlTraer(
      'demasiadas_redirecciones',
      `El enlace rebotó más de ${MAX_REDIRECCIONES} veces.`,
    );
  }

  if (!respuesta.ok) {
    throw new FalloAlTraer(
      'respuesta_con_error',
      `La página respondió ${respuesta.status}.`,
    );
  }

  const contentType = respuesta.headers.get('content-type') ?? '';
  if (!tiposAceptados.some((tipo) => contentType.toLowerCase().includes(tipo))) {
    throw new FalloAlTraer(
      'tipo_inesperado',
      `El enlace devolvió «${contentType || 'sin tipo'}».`,
    );
  }

  // Se corta EN la lectura. Mirar `content-length` no alcanza: es un dato que
  // manda el otro lado y puede faltar o mentir.
  const bytes = await leerHastaElTope(respuesta, maxBytes);
  return { bytes, contentType, urlFinal: url.toString() };
}

async function leerHastaElTope(res: Response, maxBytes: number): Promise<Uint8Array> {
  const cuerpo = res.body;
  if (!cuerpo) return new Uint8Array();

  const partes: Uint8Array[] = [];
  let total = 0;
  const lector = cuerpo.getReader();

  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        throw new FalloAlTraer(
          'demasiado_grande',
          `El contenido pasa de ${Math.round(maxBytes / 1024 / 1024)} MB.`,
        );
      }
      partes.push(value);
    }
  } finally {
    lector.releaseLock();
    // Cortar la descarga si salimos por el tope.
    await cuerpo.cancel().catch(() => {});
  }

  const juntas = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    juntas.set(parte, offset);
    offset += parte.length;
  }
  return juntas;
}
