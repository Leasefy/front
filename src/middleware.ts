import { type NextRequest, NextResponse } from 'next/server';
import {
  CABECERA_DEL_NONCE,
  GRUPO_DE_REPORTES_CSP,
  RUTA_DE_REPORTES_CSP,
  cabeceraDeLaPolitica,
  llevaPoliticaDeDocumento,
  modoDeLaPolitica,
  nuevoNonce,
  politicaDeContenido,
} from '@/lib/seguridad/politica-de-contenido';

/**
 * Middleware
 *
 * La autenticación sigue siendo del lado del cliente (ProtectedRoute): esto NO
 * decide quién entra. Lo que hace es ponerle a cada documento su política de
 * contenido (CSP) con un NONCE nuevo por petición (endurecimiento del
 * navegador, 23-09). El nonce viaja:
 *   - en la cabecera de la RESPUESTA (`Content-Security-Policy[-Report-Only]`),
 *     que es la que el navegador aplica;
 *   - en la cabecera de la PETICIÓN (`content-security-policy` + `x-nonce`),
 *     que es de donde Next 15 lo lee para marcar sus propios `<script>` y de
 *     donde el layout raíz lo toma para el script de `next-themes`.
 * Detalle y porqué de cada directiva: `src/lib/seguridad/politica-de-contenido.ts`.
 *
 * Public routes (no auth required) — si algún día se agrega auth acá, estas
 * quedan afuera (sobre todo /invitacion/[token]):
 *   /, /auth, /invitacion/[token], /propiedades, /para/*, /productos/*,
 *   /pricing, /blog, /ayuda, /terminos, /privacidad
 */
export function middleware(request: NextRequest) {
  if (!llevaPoliticaDeDocumento(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const nonce = nuevoNonce();
  const politica = politicaDeContenido(nonce, {
    desarrollo: process.env.NODE_ENV !== 'production',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_AGENT_URL: process.env.NEXT_PUBLIC_AGENT_URL,
    NEXT_PUBLIC_AVALUO_API_URL: process.env.NEXT_PUBLIC_AVALUO_API_URL,
    NEXT_PUBLIC_ADMIN_API_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL,
    NEXT_PUBLIC_AI_API_URL: process.env.NEXT_PUBLIC_AI_API_URL,
  });
  const cabecera = cabeceraDeLaPolitica(modoDeLaPolitica(process.env.CSP_MODO));

  const deLaPeticion = new Headers(request.headers);
  deLaPeticion.set(CABECERA_DEL_NONCE, nonce);
  // Next busca el nonce en `content-security-policy` o en la versión
  // `-report-only` de la PETICIÓN; se le pasa la misma que va a aplicar el
  // navegador. Cualquier valor que haya traído el cliente se pisa.
  deLaPeticion.delete('content-security-policy');
  deLaPeticion.delete('content-security-policy-report-only');
  deLaPeticion.set(cabecera.toLowerCase(), politica);

  const respuesta = NextResponse.next({ request: { headers: deLaPeticion } });
  respuesta.headers.set(cabecera, politica);
  // `report-to` (navegadores nuevos) necesita el grupo declarado; `report-uri`
  // cubre al resto. Mismo destino.
  respuesta.headers.set(
    'Reporting-Endpoints',
    `${GRUPO_DE_REPORTES_CSP}="${RUTA_DE_REPORTES_CSP}"`,
  );
  return respuesta;
}

export const config = {
  matcher: [
    /*
     * Todo menos lo estático (no es un documento y no ejecuta nada con
     * nuestra política): _next/static, _next/image, íconos e imágenes. Los
     * scripts de service worker y el worker del mapa los excluye
     * `llevaPoliticaDeDocumento` arriba.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
