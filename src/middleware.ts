import { type NextRequest, NextResponse } from 'next/server';
import { esLectorDeVistaPrevia } from '@/lib/seo/lector-de-vista-previa';
import {
  CABECERA_DEL_NONCE,
  GRUPO_DE_REPORTES_CSP,
  RUTA_DE_LA_HOME,
  RUTA_DE_REPORTES_CSP,
  cabeceraDeLaPolitica,
  esDeLaHome,
  internaDeLaRuta,
  llevaPoliticaDeDocumento,
  modoDeLaPolitica,
  nuevoNonce,
  paginaArmada,
  politicaDeContenido,
  politicaDeLaHome,
} from '@/lib/seguridad/politica-de-contenido';
import {
  CABECERA_DEL_IDIOMA,
  COOKIE_DEL_IDIOMA,
  conIdioma,
  esRutaPublica,
  idiomaParaLaVisita,
  separarIdioma,
} from '@/lib/idioma/idioma';
import { destinoEnElDominioPropio, esHostDeLeasefy } from '@/lib/dominio-propio/dominio';
import { slugDelDominio } from '@/lib/dominio-propio/slug-del-dominio';

/** Lo que no es la página ni las fichas, en el dominio de una inmobiliaria, va a Leasefy. */
const ORIGEN_DE_LEASEFY = (process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co').replace(/\/+$/, '');
/** El dominio propio desde el que se está viendo: los enlaces para compartir lo usan (`origenPublico`). */
export const COOKIE_DEL_DOMINIO_PROPIO = 'lf_dominio_propio';

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
export function middleware(request: NextRequest): NextResponse | Promise<NextResponse> {
  /*
   * EL DOMINIO PROPIO (Nico, 31-10-2026: «que la inmobiliaria ponga su propio dominio… para que cuando lo comparta sea
   * ese dominio y no el de leasefy»). Un host que no es de Leasefy se le pregunta al back (con memoria de 5 minutos);
   * si es el de una inmobiliaria, su inicio es su página (`/i/<slug>`), sus fichas pasan tal cual y lo demás va a
   * leasefy.co. Si no es de nadie —o el back no responde— todo sigue como siempre. En los hosts de Leasefy no se
   * pregunta nada y la respuesta sale en el acto, como antes.
   */
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.hostname;
  if (esHostDeLeasefy(host)) return atender(request, host, null);
  return slugDelDominio(host).then((slug) => atender(request, host, slug));
}

function atender(request: NextRequest, host: string, slugDelHost: string | null): NextResponse {
  const enSuDominio = slugDelHost ? destinoEnElDominioPropio(request.nextUrl.pathname, slugDelHost) : null;
  if (enSuDominio?.tipo === 'a-leasefy') {
    return NextResponse.redirect(`${ORIGEN_DE_LEASEFY}${enSuDominio.ruta}${request.nextUrl.search}`);
  }
  if (enSuDominio?.tipo === 'seguir') return NextResponse.next();

  /*
   * El idioma de la parte pública (Nico, 16-10-2026): `/es/...` y `/en/...`.
   *   - Lo público SIN prefijo se manda al idioma de la persona: el que eligió
   *     antes (cookie) o, la primera vez, el de su navegador.
   *   - Con prefijo, se reescribe a la ruta de siempre (las páginas no se
   *     mueven) y la página sabe su idioma por `x-idioma`. Navegar en un idioma
   *     lo deja recordado.
   */
  const separada =
    enSuDominio?.tipo === 'reescribir'
      ? { ruta: enSuDominio.ruta, idioma: 'es' as const }
      : separarIdioma(request.nextUrl.pathname);
  const { ruta } = separada;
  /*
   * 🔴 Nico, 28-10-2026: «sigues sin mostrar la imagen de la url que se comparten de nuestras propiedades, y sí o sí
   * tiene que ir». La ficha (`/propiedades/<id>`) ya trae su `og:image`, pero el enlace que se comparte va SIN idioma
   * y respondía 307 a `/es/…`: el lector de la vista previa (WhatsApp, Facebook, Telegram…) no siempre sigue esa
   * redirección y se quedaba con «leasefy.co» sin foto. A esos lectores se les sirve la página en español ahí mismo,
   * sin redirigir (la ficha existe sólo en español y su canonical ya apunta a `/es/…`).
   */
  const idioma =
    separada.idioma ??
    (esLectorDeVistaPrevia(request.headers.get('user-agent')) && esRutaPublica(ruta) ? ('es' as const) : null);
  /*
   * 🔴 Nico, 27-10-2026: «solo debe haber una landing y es la nueva». `/pricing` (y `/pricing/empresas`) era la
   * página de precios de la landing vieja, con precios viejos: los planes viven en la home, en `#planes`.
   */
  if (ruta === '/pricing' || ruta.startsWith('/pricing/')) {
    const destino = request.nextUrl.clone();
    destino.pathname = conIdioma(
      '/',
      idioma ?? idiomaParaLaVisita(request.cookies.get(COOKIE_DEL_IDIOMA)?.value, request.headers.get('accept-language')),
    );
    destino.search = '';
    destino.hash = 'planes';
    return NextResponse.redirect(destino);
  }
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
  /*
   * Ronda 30 (Nico, 23-10-2026): «la de producto en vivo debe ser la landing
   * principal». La home (`/es`, `/en`) es la página estática de
   * `public/landing/index.html`, servida tal cual (sin React). La home anterior
   * sigue en `/inicio-anterior` por si hay que volver. `/es` y `/en` sirven la
   * misma página: el inglés lo pone `public/landing/js/idioma.js` según el prefijo
   * (Nico 23-10: toda la landing, internas incluidas, en español e inglés).
   */
  /*
   * Ronda 30: también sus internas (`/productos`, `/productos/<producto>` y
   * `/para/<público>`) son páginas estáticas, de `public/internas/`. Las de
   * React siguen en el código como respaldo: para volver a ellas basta quitar
   * esta reescritura.
   */
  /*
   * SEO (Nico 24-10-2026): cada dirección de la landing estática sirve su página ya armada para buscadores
   * (`public/paginas/<idioma>/…`, ver `paginaArmada`); las fuentes de arriba siguen siendo las que se editan.
   */
  if (reescrita && idioma) reescrita.pathname = paginaArmada(ruta, idioma) ?? (ruta === '/' ? RUTA_DE_LA_HOME : (internaDeLaRuta(ruta) ?? ruta));

  const deLaPeticion = new Headers(request.headers);
  // Nadie de afuera dice en qué idioma va la página.
  deLaPeticion.delete(CABECERA_DEL_IDIOMA);
  if (reescrita && idioma) deLaPeticion.set(CABECERA_DEL_IDIOMA, idioma);
  const seguir = () =>
    reescrita
      ? NextResponse.rewrite(reescrita, { request: { headers: deLaPeticion } })
      : NextResponse.next({ request: { headers: deLaPeticion } });
  const recordar = (respuesta: NextResponse) => {
    if (slugDelHost && request.cookies.get(COOKIE_DEL_DOMINIO_PROPIO)?.value !== host) {
      respuesta.cookies.set(COOKIE_DEL_DOMINIO_PROPIO, host, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' });
    }
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
  const entorno = {
    desarrollo: process.env.NODE_ENV !== 'production',
    // En sólo-reporte `upgrade-insecure-requests` no aplica y ensucia la consola.
    soloReporte: modo === 'reporte',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_ASSETS_HOST: process.env.NEXT_PUBLIC_ASSETS_HOST,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_AGENT_URL: process.env.NEXT_PUBLIC_AGENT_URL,
    NEXT_PUBLIC_AVALUO_API_URL: process.env.NEXT_PUBLIC_AVALUO_API_URL,
    NEXT_PUBLIC_ADMIN_API_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL,
    NEXT_PUBLIC_AI_API_URL: process.env.NEXT_PUBLIC_AI_API_URL,
  };
  // La home estática lleva su propia política (sin nonce: no la arma React).
  const politica = esDeLaHome(ruta) ? politicaDeLaHome(entorno) : politicaDeContenido(nonce, entorno);
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

