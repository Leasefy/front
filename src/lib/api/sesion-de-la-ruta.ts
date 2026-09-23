/**
 * ¿Quien llama a esta ruta de `src/app/api/**` tiene una sesión de Leasefy?
 *
 * ── Por qué existe (auditoría de seguridad 23-09) ─────────────────────────
 * `/api/inmuebles/desde-enlace` y `/api/inmuebles/imagen-remota` bajan desde
 * NUESTRO servidor la URL que se les pida. Tienen guardia contra SSRF
 * (`traer-url.ts`), pero no pedían sesión: cualquiera en internet podía usarlas
 * de proxy —para esconder su IP detrás de la nuestra, gastar nuestro ancho de
 * banda o tantear la guardia hasta encontrarle un hueco—. Sólo las usa el
 * importador del panel, que siempre tiene sesión.
 *
 * ── Cómo se verifica ──────────────────────────────────────────────────────
 * `getClaims` valida la FIRMA del JWT de Supabase (con las llaves públicas del
 * proyecto, cacheadas; con un proyecto de secreto simétrico cae a preguntarle
 * a Auth). No basta con que el encabezado exista: cualquiera escribe
 * `Authorization: Bearer x`.
 *
 * Un import de 2.800 inmuebles pide miles de fotos con el mismo token, así que
 * un token ya verificado se recuerda hasta que vence (con tope de 5 minutos):
 * no se vuelve a verificar por cada foto.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const RECORDAR_MS = 5 * 60 * 1000;
const MAX_RECORDADOS = 500;

let cliente: SupabaseClient | null = null;
const verificados = new Map<string, number>();

function clienteDeSupabase(): SupabaseClient | null {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !llave) return null;
  cliente = createClient(url, llave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cliente;
}

function tokenDe(req: Request): string | null {
  const encabezado = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(\S+)$/i.exec(encabezado.trim());
  return m ? m[1] : null;
}

/** `true` sólo si el request trae un JWT de Supabase con firma válida y vigente. */
export async function haySesionValida(req: Request): Promise<boolean> {
  const token = tokenDe(req);
  if (!token) return false;

  const ahora = Date.now();
  const hasta = verificados.get(token);
  if (hasta !== undefined) {
    if (hasta > ahora) return true;
    verificados.delete(token);
  }

  const sb = clienteDeSupabase();
  // Sin configuración no se puede verificar nada: se cierra, no se abre.
  if (!sb) return false;

  try {
    const { data, error } = await sb.auth.getClaims(token);
    const exp = data?.claims?.exp;
    if (error || typeof exp !== 'number' || exp * 1000 <= ahora) return false;
    if (verificados.size >= MAX_RECORDADOS) verificados.clear();
    verificados.set(token, Math.min(exp * 1000, ahora + RECORDAR_MS));
    return true;
  } catch {
    return false;
  }
}

/** Sólo para las pruebas: olvida los tokens recordados y el cliente. */
export function _olvidarSesionesVerificadas(): void {
  verificados.clear();
  cliente = null;
}
