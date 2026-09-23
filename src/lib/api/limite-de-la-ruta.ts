/**
 * Límite de ritmo por IP para las rutas propias del front (`src/app/api/**`).
 *
 * ── Por qué existe (auditoría de seguridad 23-09) ─────────────────────────
 * El back ya limita sus rutas (`common/limites/` en el back), pero estas no
 * pasan por el back: `/api/geocode/*` gasta la cuota de LocationIQ que
 * pagamos (y su llave vive acá), y `/api/inmuebles/*` baja URLs de afuera
 * desde nuestro servidor. Sin techo, una sola IP podía agotar la cuota del
 * mes o usar el servidor para martillar a un tercero.
 *
 * ── Dónde vive la cuenta, dicho claro ─────────────────────────────────────
 * En la MEMORIA DEL PROCESO, sin dependencias nuevas. En un servidor propio
 * (`next start`) es un solo contador. En Vercel cada instancia de la función
 * tiene el suyo: con N instancias calientes el techo real es hasta N veces
 * éste, y un arranque en frío lo pone en cero. Es un freno contra una ráfaga
 * desde una IP, no una garantía de cupo; si hiciera falta una cuenta global,
 * va a un almacén compartido (el Redis del back, o Upstash).
 *
 * ── De dónde sale la IP ───────────────────────────────────────────────────
 * Misma regla que el back (`TRUST_PROXY_HOPS`, ver `ip-del-cliente.ts` allá):
 * de `X-Forwarded-For` se toma la entrada que está N saltos desde la DERECHA,
 * porque lo de la izquierda lo escribe el cliente. Por defecto 1 en
 * producción, 0 en dev/test. En Vercel el borde REESCRIBE `X-Forwarded-For`
 * con la IP del cliente (una sola entrada), así que 1 es correcto allá. Con 0
 * no hay proxy de confianza y un Route Handler no ve el socket: todas las
 * peticiones cuentan como la misma «IP desconocida».
 */

import { NextResponse } from 'next/server';
import { cuantoEsperar, CODIGO_DEMASIADAS_SOLICITUDES } from './demasiadas-solicitudes';

export interface PoliticaDeLaRuta {
  nombre: string;
  maximo: number;
  ventanaSegundos: number;
}

export const POLITICAS_DE_LAS_RUTAS = {
  /**
   * El asistente de importación ubica ~2 direcciones por segundo (el techo de
   * LocationIQ, `ESPERA_ENTRE_BUSQUEDAS_MS`), o sea ~120 por minuto.
   */
  geocode: { nombre: 'geocode', maximo: 150, ventanaSegundos: 60 },
  /** Leer fichas de otros portales: de a 4 páginas por vez. */
  desdeEnlace: { nombre: 'desde-enlace', maximo: 60, ventanaSegundos: 60 },
  /**
   * Fotos de los enlaces: hasta 40 por inmueble en paralelo durante una
   * importación. Generoso; la ruta ya exige sesión.
   */
  imagenRemota: { nombre: 'imagen-remota', maximo: 900, ventanaSegundos: 60 },
} as const satisfies Record<string, PoliticaDeLaRuta>;

const MAX_CLAVES = 10_000;
const cuentas = new Map<string, { cuenta: number; vence: number }>();

export function saltosDeProxy(env: Record<string, string | undefined> = process.env): number {
  const crudo = env.TRUST_PROXY_HOPS?.trim();
  if (crudo && /^\d+$/.test(crudo)) return Number(crudo);
  return env.NODE_ENV === 'production' ? 1 : 0;
}

/** La IP del cliente con la regla de `TRUST_PROXY_HOPS`, igual que Express. */
export function ipDeLaPeticion(req: Request, saltos: number = saltosDeProxy()): string {
  if (saltos <= 0) return 'desconocida';
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return 'desconocida';
  const entradas = xff.split(',').map((s) => s.trim()).filter(Boolean);
  if (entradas.length === 0) return 'desconocida';
  // Express devuelve la entrada N saltos desde la derecha; si hay menos, la
  // de más a la izquierda (no hay más proxies que contar).
  const ip = entradas[Math.max(0, entradas.length - saltos)];
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/**
 * Cuenta la petición. Devuelve `null` si pasa, o la respuesta 429 lista para
 * devolver (con `Retry-After` y el mismo cuerpo que el 429 del back, para que
 * `client.ts` la lea igual).
 */
export function limitarLaRuta(
  req: Request,
  politica: PoliticaDeLaRuta,
  ahora: number = Date.now(),
): NextResponse | null {
  const clave = `${politica.nombre}:${ipDeLaPeticion(req)}`;
  const ventanaMs = politica.ventanaSegundos * 1000;
  const actual = cuentas.get(clave);

  if (!actual || actual.vence <= ahora) {
    if (cuentas.size >= MAX_CLAVES) {
      for (const [k, v] of cuentas) if (v.vence <= ahora) cuentas.delete(k);
      if (cuentas.size >= MAX_CLAVES) cuentas.clear();
    }
    cuentas.set(clave, { cuenta: 1, vence: ahora + ventanaMs });
    return null;
  }

  actual.cuenta += 1;
  if (actual.cuenta <= politica.maximo) return null;

  const segundos = Math.max(1, Math.ceil((actual.vence - ahora) / 1000));
  return NextResponse.json(
    {
      statusCode: 429,
      code: CODIGO_DEMASIADAS_SOLICITUDES,
      reintentarEnSegundos: segundos,
      message: `Hiciste demasiadas solicitudes seguidas. Espera ${cuantoEsperar(segundos)} y vuelve a intentar.`,
    },
    { status: 429, headers: { 'Retry-After': String(segundos) } },
  );
}

/** Sólo para las pruebas. */
export function _olvidarCuentas(): void {
  cuentas.clear();
}
