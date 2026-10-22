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
import {
  CABECERA_DEL_IDIOMA,
  COOKIE_DEL_IDIOMA,
  conIdioma,
  esRutaPublica,
  idiomaParaLaVisita,
  separarIdioma,
} from '@/lib/idioma/idioma';
import { plataformaPorElUserAgent } from '@/lib/app-nativa/puente';

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
/**
 * La app de iOS/Android abre leasefy.co (`/`). Quien abre la app viene a trabajar o a
 * pagar, no a ver la portada: la portada de la app es `/auth/post-login`, que sin
 * sesión lleva a entrar y con sesión al inicio de la persona (la última cuenta que
 * usó). Sólo la portada; el resto de la parte pública (marketplace, ayuda) se ve igual.
 */
const PORTADAS = new Set(['/', '/es', '/en']);
const INICIO_DE_LA_APP = '/auth/post-login';

export function middleware(request: NextRequest) {
  if (PORTADAS.has(request.nextUrl.pathname) && plataformaPorElUserAgent(request.headers.get('user-agent'))) {
    const destino = request.nextUrl.clone();
    destino.pathname = INICIO_DE_LA_APP;
    destino.search = '';
    return NextResponse.redirect(destino);
  }

  /*
   * El idioma de la parte pública (Nico, 16-10-2026): `/es/...` y `/en/...`.
   *   - Lo público SIN prefijo se manda al idioma de la persona: el que eligió
   *     antes (cookie) o, la primera vez, el de su navegador.
   *   - Con prefijo, se reescribe a la ruta de siempre (las páginas no se
   *     mueven) y la página sabe su idioma por `x-idioma`. Navegar en un idioma
   *     lo deja recordado.
   */
  const { idioma, ruta } = separarIdioma(request.nextUrl.pathname);
  const publica = esRutaPublica(ruta);
  if (!idioma && publica) {
    const destino = request.nextUrl.clone();
    destino.pathname = conIdioma(
      ruta,
      idiomaParaLaVisita(request.cookies.get(COOKIE_DEL_IDIOMA)?.value, request.headers.get('accept-language')),
    );
    return NextResponse.redirect(destino);
  }
  const reescrita = idioma && publica ? request.nextUrl.clone() : null;
  if (reescrita) reescrita.pathname = ruta;

  const deLaPeticion = new Headers(request.headers);
  // Nadie de afuera dice en qué idioma va la página.
  deLaPeticion.delete(CABECERA_DEL_IDIOMA);
  if (reescrita && idioma) deLaPeticion.set(CABECERA_DEL_IDIOMA, idioma);
  const seguir = () =>
    reescrita
      ? NextResponse.rewrite(reescrita, { request: { headers: deLaPeticion } })
      : NextResponse.next({ request: { headers: deLaPeticion } });
  const recordar = (respuesta: NextResponse) => {
    if (reescrita && idioma && request.cookies.get(COOKIE_DEL_IDIOMA)?.value !== idioma) {
      respuesta.cookies.set(COOKIE_DEL_IDIOMA, idioma, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    }
    return respuesta;
  };

  if (!llevaPoliticaDeDocumento(ruta)) {
    return recordar(seguir());
  }

  const nonce = nuevoNonce();
  const modo = modoDeLaPolitica(process.env.CSP_MODO);
  const politica = politicaDeContenido(nonce, {
    desarrollo: process.env.NODE_ENV !== 'production',
    // En sólo-reporte `upgrade-insecure-requests` no aplica y ensucia la consola.
    soloReporte: modo === 'reporte',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_AGENT_URL: process.env.NEXT_PUBLIC_AGENT_URL,
    NEXT_PUBLIC_AVALUO_API_URL: process.env.NEXT_PUBLIC_AVALUO_API_URL,
    NEXT_PUBLIC_ADMIN_API_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL,
    NEXT_PUBLIC_AI_API_URL: process.env.NEXT_PUBLIC_AI_API_URL,
  });
  const cabecera = cabeceraDeLaPolitica(modo);

  deLaPeticion.set(CABECERA_DEL_NONCE, nonce);
  // Next busca el nonce en `content-security-policy` o en la versión
  // `-report-only` de la PETICIÓN; se le pasa la misma que va a aplicar el
  // navegador. Cualquier valor que haya traído el cliente se pisa.
  deLaPeticion.delete('content-security-policy');
  deLaPeticion.delete('content-security-policy-report-only');
  deLaPeticion.set(cabecera.toLowerCase(), politica);

  const respuesta = seguir();
  respuesta.headers.set(cabecera, politica);
  // `report-to` (navegadores nuevos) necesita el grupo declarado; `report-uri`
  // cubre al resto. Mismo destino.
  respuesta.headers.set(
    'Reporting-Endpoints',
    `${GRUPO_DE_REPORTES_CSP}="${RUTA_DE_REPORTES_CSP}"`,
  );
  return recordar(respuesta);
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
