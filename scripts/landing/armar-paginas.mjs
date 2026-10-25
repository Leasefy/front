#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   Arma las páginas de la landing estática, UNA por dirección e idioma, listas
   para buscadores y rastreadores de IA (Nico 24-10-2026: «optimiza toda la
   landing para SEO, para que podamos aparecer en todo lado»; skill seo-experto).

     node scripts/landing/armar-paginas.mjs            → escribe public/paginas/<idioma>/…
     node scripts/landing/armar-paginas.mjs --revisar  → sale 1 si alguna quedó vieja (lo usa la prueba)

   Las fuentes no cambian: public/landing/index.html y public/internas/{productos,para}/index.html
   (y sus scripts). Cada página armada es su fuente con:
     - <head> propio: título, descripción, canonical, hreflang (es-CO / en / x-default), Open Graph,
       Twitter y JSON-LD (scripts/landing/paginas-seo.mjs);
     - el contenido de SU vista ya en el HTML (cada producto; cada público sólo con lo suyo) y los
       menús de productos llenos, para quien no ejecuta JavaScript;
     - en /en, el inglés ya aplicado (el mismo diccionario y la misma regla de public/landing/js/idioma.js);
     - los enlaces internos con el prefijo de idioma (sin pasar por la redirección).
   Los scripts de la página siguen corriendo igual encima (vuelven a pintar la vista con lo mismo).
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { Window } from 'happy-dom';
import { PAGINAS, IDIOMAS, HREFLANG, LOCALE_OG, IMAGEN_OG, TEXTOS, urlDe, datosEstructurados } from './paginas-seo.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (r) => readFileSync(join(RAIZ, r), 'utf8');
const REVISAR = process.argv.includes('--revisar');

/* Las rutas públicas del front (src/lib/idioma/idioma.ts): esas llevan prefijo de idioma. */
const PUBLICAS = ['/propiedades', '/i', '/productos', '/contacto', '/avaluo', '/ayuda', '/terminos', '/privacidad', '/blog', '/para', '/pricing', '/verificar-calificacion'];
const esPublica = (camino) => camino === '/' || camino === '' || PUBLICAS.some((p) => camino === p || camino.startsWith(`${p}/`));

function documento(html, url) {
  const w = new Window({
    url,
    settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true, disableIframePageLoading: true, disableComputedStyleRendering: true },
  });
  const doc = new w.DOMParser().parseFromString(html, 'text/html');
  return { w, doc };
}

/* Un «navegador» mínimo para correr los scripts de la página sin animaciones (gsap & cía. no hacen nada). */
function caja(doc, url) {
  const u = new URL(url);
  const nada = new Proxy(function () {}, { get: (_, k) => (k === Symbol.toPrimitive ? () => 0 : nada), apply: () => nada, construct: () => nada });
  const sb = {
    document: doc,
    location: { pathname: u.pathname, hash: '', search: '', href: url, origin: u.origin },
    localStorage: { getItem: () => null, setItem() {} },
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    history: { pushState() {}, replaceState() {} },
    addEventListener() {}, removeEventListener() {},
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1, getComputedStyle: () => ({}),
    gsap: nada, ScrollTrigger: nada, Lenis: nada, Motion: nada, navigator: { userAgent: 'armar-paginas' },
  };
  sb.window = sb; sb.self = sb;
  vm.createContext(sb);
  return sb;
}
const correr = (sb, ruta) => { try { vm.runInContext(leer(ruta), sb, { filename: ruta }); } catch (e) { /* lo de animar falla sin navegador: lo que importa ya quedó definido */ } };

/* El inglés: el diccionario y la regla de idioma.js, aplicados al documento de salida. */
function traducir(doc, url) {
  const sb = caja(doc, url);
  correr(sb, 'public/landing/js/en.js');
  correr(sb, 'public/landing/js/idioma.js');
  if (!sb.LFI) throw new Error('idioma.js no definió LFI');
  sb.LFI.aplicar(doc.body);
  /* idioma.js esconde la página mientras traduce: aquí ya está traducida */
  doc.documentElement.classList.remove('lf-traduciendo', 'lf-en');
  if (!doc.documentElement.getAttribute('class')) doc.documentElement.removeAttribute('class');
  for (const st of doc.head.querySelectorAll('style')) if (st.textContent.includes('.lf-traduciendo body')) st.remove();
}

/* Las vistas de productos: las mismas funciones de 04-vistas.js (expuestas en window.LF_VISTAS), en una copia de trabajo. */
function vistasDeProductos(fuente, url) {
  const { doc } = documento(fuente, url);
  const sb = caja(doc, url);
  for (const s of ['00-arranque', '01-datos', '02-piezas', '04-vistas']) correr(sb, `public/internas/productos/js/${s}.js`);
  if (!sb.LF_VISTAS) throw new Error('04-vistas.js no expuso LF_VISTAS');
  sb.LF_VISTAS.llenarNav();
  const menus = Object.fromEntries(['despProd', 'menuSub', 'pieProd'].map((id) => [id, doc.getElementById(id)?.innerHTML ?? '']));
  return { V: sb.LF_VISTAS, PROD: sb.PROD, menus };
}

function cabeza(doc, pagina, idioma, extra) {
  const head = doc.head;
  const quitar = [
    'title', 'meta[name="description"]', 'meta[name="robots"]', 'link[rel="canonical"]', 'link[rel="alternate"][hreflang]',
    'meta[property^="og:"]', 'meta[name^="twitter:"]', 'script[type="application/ld+json"]',
  ];
  for (const s of quitar) head.querySelectorAll(s).forEach((n) => n.remove());
  const [titulo, descripcion] = TEXTOS[pagina.ruta][idioma];
  const url = urlDe(idioma, pagina.ruta);
  const otro = idioma === 'es' ? 'en' : 'es';
  const tags = [
    ['title', {}, titulo],
    ['meta', { name: 'description', content: descripcion }],
    ['meta', { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' }],
    ['link', { rel: 'canonical', href: url }],
    ['link', { rel: 'alternate', hreflang: HREFLANG.es, href: urlDe('es', pagina.ruta) }],
    ['link', { rel: 'alternate', hreflang: HREFLANG.en, href: urlDe('en', pagina.ruta) }],
    ['link', { rel: 'alternate', hreflang: 'x-default', href: urlDe('es', pagina.ruta) }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Leasefy' }],
    ['meta', { property: 'og:locale', content: LOCALE_OG[idioma] }],
    ['meta', { property: 'og:locale:alternate', content: LOCALE_OG[otro] }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:title', content: titulo }],
    ['meta', { property: 'og:description', content: descripcion }],
    ['meta', { property: 'og:image', content: IMAGEN_OG }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: titulo }],
    ['meta', { name: 'twitter:description', content: descripcion }],
    ['meta', { name: 'twitter:image', content: IMAGEN_OG }],
  ];
  /* van justo después del viewport (lo primero que lee un buscador) */
  let ancla = head.querySelector('meta[name="viewport"]') || head.querySelector('meta[charset]');
  for (const [tag, attrs, texto] of tags) {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (texto) el.textContent = texto;
    ancla.after(el); ancla = el;
  }
  /* los títulos de las otras vistas de esta misma página, para cuando el script cambia de vista sin recargar */
  const hermanas = PAGINAS.filter((p) => p.fuente === pagina.fuente);
  if (hermanas.length > 1) {
    const seo = doc.createElement('script');
    seo.setAttribute('type', 'application/json');
    seo.setAttribute('id', 'lf-seo');
    seo.textContent = JSON.stringify(Object.fromEntries(hermanas.map((p) => [p.ruta, TEXTOS[p.ruta][idioma]])));
    ancla.after(seo); ancla = seo;
  }
  const ld = doc.createElement('script');
  ld.setAttribute('type', 'application/ld+json');
  ld.textContent = JSON.stringify(datosEstructurados(pagina, idioma, extra));
  ancla.after(ld);
}

/* Las preguntas frecuentes visibles (para el FAQPage): la pregunta del botón y su respuesta. */
function preguntas(doc) {
  return [...doc.querySelectorAll('.faq-it')].map((it) => {
    const q = it.querySelector('.faq-q'), r = it.querySelector('[role="region"], .faq-r, [id^="faq-r"]');
    const limpio = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    return [limpio(q), limpio(r)];
  }).filter(([q, r]) => q && r);
}

/* Enlaces internos de rutas públicas → con prefijo de idioma (sin pasar por la redirección). */
function prefijar(doc, idioma) {
  for (const a of doc.querySelectorAll('a[href^="/"]')) {
    const href = a.getAttribute('href');
    if (/^\/(es|en)(\/|$|#|\?)/.test(href) || href.startsWith('//')) continue;
    const [camino] = href.split(/[?#]/);
    if (!esPublica(camino)) continue;
    const resto = href.slice(camino.length);
    a.setAttribute('href', `/${idioma}${camino === '/' ? '' : camino}${resto}`);
  }
}

function armar(pagina, idioma, cache) {
  const url = urlDe(idioma, pagina.ruta);
  const fuente = cache.fuente[pagina.fuente] ??= leer(pagina.fuente);
  const { doc } = documento(fuente, url);
  const extra = {};
  doc.documentElement.setAttribute('lang', idioma);
  if (pagina.tipo === 'productos' || pagina.tipo === 'producto') {
    const vp = cache.productos ??= vistasDeProductos(fuente, urlDe('es', '/productos'));
    const main = doc.getElementById('vista');
    main.innerHTML = pagina.tipo === 'productos' ? vp.V.indice() : vp.V.producto(vp.PROD[pagina.vista], pagina.vista);
    main.setAttribute('data-armada', pagina.vista);
    for (const [id, html] of Object.entries(vp.menus)) { const el = doc.getElementById(id); if (el) el.innerHTML = html; }
    if (pagina.tipo === 'producto') extra.nombreDelProducto = vp.PROD[pagina.vista].name;
  }
  if (pagina.tipo === 'para') {
    /* sólo el público de esta dirección: un <h1>, su contenido (los otros viven en su propia dirección) */
    for (const v of doc.querySelectorAll('.vista[data-vista]')) {
      if (v.getAttribute('data-vista') === pagina.vista) v.removeAttribute('hidden'); else v.remove();
    }
    for (const a of doc.querySelectorAll('.sel-tabs a[data-ir]')) {
      if (a.getAttribute('data-ir') === pagina.vista) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    const sel = doc.getElementById('selRuta'); if (sel) sel.textContent = pagina.vista;
  }
  if (idioma === 'en') {
    traducir(doc, url);
    if (extra.nombreDelProducto) {
      const sb = caja(documento('<html><body></body></html>', url).doc, url);
      correr(sb, 'public/landing/js/en.js');
      extra.nombreDelProducto = (sb.LF_EN || {})[extra.nombreDelProducto] || extra.nombreDelProducto;
    }
  }
  extra.preguntas = preguntas(doc);
  prefijar(doc, idioma);
  cabeza(doc, pagina, idioma, extra);
  /* idioma.js no la vuelve a esconder para traducir: ya viene en su idioma */
  doc.documentElement.setAttribute('data-armada', idioma);
  return '<!doctype html>\n' + doc.documentElement.outerHTML + '\n';
}

const cache = { fuente: {} };
let viejas = 0, escritas = 0;
for (const idioma of IDIOMAS) {
  for (const pagina of PAGINAS) {
    const html = armar(pagina, idioma, cache);
    const destino = join(RAIZ, 'public', 'paginas', idioma, pagina.salida);
    const antes = existsSync(destino) ? readFileSync(destino, 'utf8') : null;
    if (REVISAR) { if (antes !== html) { viejas++; console.log('vieja:', `public/paginas/${idioma}/${pagina.salida}`); } continue; }
    if (antes !== html) { mkdirSync(dirname(destino), { recursive: true }); writeFileSync(destino, html); escritas++; }
  }
}
if (REVISAR) { console.log(viejas ? `${viejas} páginas viejas: corre node scripts/landing/armar-paginas.mjs` : 'páginas al día'); process.exit(viejas ? 1 : 0); }
console.log(`${PAGINAS.length * IDIOMAS.length} páginas · ${escritas} escritas en public/paginas/`);
