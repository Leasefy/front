#!/usr/bin/env node
/**
 * 🔴 GUARDIÁN: identificadores LIBRES en el build de producción.
 *
 * Se corre DESPUÉS de `pnpm build`:
 *
 *     node scripts/variables-libres-del-build.mjs            # lee .next/static/chunks
 *     node scripts/variables-libres-del-build.mjs <carpeta>  # otra carpeta de chunks
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * QA 22-09 (P0, commit 64a4a4aa): la lista de Propietarios se caía ENTERA en
 * producción con `ReferenceError: propietarios is not defined`. El código
 * fuente estaba bien: el minificador de SWC (Next 14.2.35) metió en línea el
 * cierre `cuantos` de `conteosDePropietarios`, renombró los parámetros sólo en
 * la PRIMERA llamada y dejó `propietarios` y `filtros` como variables libres en
 * las otras tres. En `next dev` no pasa, `tsc` no lo ve, las pruebas no lo ven:
 * sólo existe en el JavaScript que va a producción.
 *
 * Un identificador que el chunk USA sin declararlo y que no es un global del
 * navegador es exactamente esa huella. Este script parsea cada chunk, pide al
 * analizador de alcance lo que «atraviesa» el alcance global y falla si
 * aparece un nombre que no está en la lista de permitidos.
 *
 * ── La lista de permitidos ─────────────────────────────────────────────────
 *
 * Globales del navegador + los que el barrido del 22-09 encontró en librerías
 * (detección de entorno: `Deno`, `Bun`, `ActiveXObject`; APIs que no están en
 * Node: `IDBCursor`, `PublicKeyCredential`…). Un nombre nuevo que sea legítimo
 * se AGREGA acá con su motivo; lo que no se hace es silenciarlo en bloque.
 *
 * ── Lo que NO mira, dicho como número ──────────────────────────────────────
 *
 * Nombres de 1–2 letras (los del minificador y el runtime de webpack) no se
 * juzgan. Y un chunk que no se puede parsear NO se da por bueno: se cuenta y
 * hace fallar el guardián, porque un barrido que no leyó un archivo no puede
 * decir que está limpio.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// espree y eslint-scope vienen con eslint (pnpm no los sube a la raíz).
const requerir = createRequire(import.meta.url);
const desdeEslint = createRequire(requerir.resolve('eslint/package.json'));
const espree = desdeEslint('espree');
const escope = desdeEslint('eslint-scope');

/** Globales del navegador (y del runtime de Next/webpack) que un chunk usa sin declarar. */
const GLOBALES_DEL_NAVEGADOR = [
  'window', 'document', 'navigator', 'location', 'self', 'globalThis', 'localStorage', 'sessionStorage',
  'fetch', 'Headers', 'Request', 'Response', 'FormData', 'URL', 'URLSearchParams', 'Blob', 'File', 'FileReader',
  'HTMLElement', 'Element', 'Node', 'NodeFilter', 'Event', 'CustomEvent', 'MutationObserver', 'ResizeObserver',
  'IntersectionObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia',
  'history', 'screen', 'performance', 'crypto', 'indexedDB', 'Image', 'Audio', 'XMLHttpRequest', 'WebSocket',
  'Worker', 'alert', 'confirm', 'prompt', 'open', 'close', 'print', 'scrollTo', 'scrollBy', 'innerWidth',
  'innerHeight', 'devicePixelRatio', 'caches', 'Notification', 'ServiceWorkerRegistration', 'DOMParser',
  'HTMLCanvasElement', 'CanvasRenderingContext2D', 'OffscreenCanvas', 'ImageData', 'createImageBitmap',
  'AbortController', 'AbortSignal', 'TextEncoder', 'TextDecoder', 'ReadableStream', 'WritableStream',
  'console', 'queueMicrotask', 'structuredClone', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'webpackChunk_N_E', '__webpack_require__', 'process', 'module', 'exports', 'require', 'define', 'global',
  'Buffer', '__dirname', '__filename', 'importScripts', 'postMessage', 'chrome', 'Intl', 'WebAssembly',
  'arguments', 'undefined', 'NaN', 'Infinity', 'eval', 'SVGElement', 'HTMLInputElement', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'TouchEvent', 'DragEvent', 'ClipboardEvent', 'DataTransfer', 'Range',
  'Selection', 'getSelection', 'visualViewport', 'origin', 'top', 'parent', 'frames', 'name', 'status',
  'external', 'MSApp', 'opera', 'InstallTrigger', 'safari', 'CSS', 'DOMRect', 'DOMMatrix', 'Path2D',
  'HTMLImageElement', 'HTMLVideoElement', 'HTMLAnchorElement', 'ShadowRoot', 'Document', 'Text', 'Comment',
  'DocumentFragment', 'HTMLIFrameElement', 'HTMLTemplateElement', 'HTMLFormElement', 'HTMLSelectElement',
  'HTMLTextAreaElement', 'HTMLButtonElement', 'ErrorEvent', 'PromiseRejectionEvent', 'BroadcastChannel',
  'MessageChannel', 'MessagePort', 'EventSource', 'EventTarget', 'StorageEvent', 'PerformanceObserver',
  'requestIdleCallback', 'cancelIdleCallback', 'trustedTypes', 'Symbol', 'Reflect', 'Proxy', 'BigInt',
  'addEventListener', 'removeEventListener', 'reportError', 'FileList', 'ImageBitmap', 'VideoFrame',
  'WheelEvent', 'Window', 'WorkerGlobalScope', 'XMLSerializer', 'PushSubscription', 'PublicKeyCredential',
  'IDBCursor', 'IDBDatabase', 'IDBIndex', 'IDBObjectStore', 'IDBRequest', 'IDBTransaction',
];

/**
 * Libres que el barrido del 22-09 encontró en LIBRERÍAS, con por qué no son el
 * defecto. Lo que se agregue acá lleva su motivo.
 */
const PERMITIDOS_DE_LIBRERIAS = {
  _N_E: 'el runtime de Next nombra así su cola de chunks',
  __REACT_DEVTOOLS_GLOBAL_HOOK__: 'React pregunta si están las devtools',
  __magic__: 'polyfill de globalThis (core-js) — lo define y lo borra en el acto',
  Deno: 'detección de entorno en librerías (typeof Deno)',
  Bun: 'detección de entorno en librerías (typeof Bun)',
  ActiveXObject: 'detección de IE en polyfills',
  Pebble: 'detección de entorno en polyfills',
  RGBColor: 'canvg / jspdf, detección de API vieja',
  IE_SaveFile: 'xlsx: guardado en IE',
  saveAs: 'xlsx: FileSaver si está presente (typeof saveAs)',
  Folder: 'xlsx: API de Adobe ExtendScript (typeof Folder)',
  decrypt_agile: 'xlsx: funciones opcionales de cifrado (typeof …)',
  decrypt_std76: 'xlsx: funciones opcionales de cifrado (typeof …)',
  encrypt_agile: 'xlsx: funciones opcionales de cifrado (typeof …)',
  val: 'xlsx: referencia dentro de un eval de su generador de código',
  value: 'librería de terceros (45356): typeof value en detección',
  Transform: 'librería de streams: typeof Transform',
  // Aparecieron con la subida a Next 15 / React 19 / MapLibre 6 (23-09):
  navigation: 'React 19: Navigation API del navegador (window.navigation), con typeof navigation',
  FontFace: 'MapLibre 6: CSS Font Loading API, con typeof FontFace',
  ResizeObserverEntry: 'MapLibre 6: instanceof ResizeObserverEntry (global del navegador)',
  __nccwpck_require__: 'runtime de Next 15: paquete compilado con ncc, con typeof __nccwpck_require__',
  _N_E_STYLE_LOAD: 'runtime de Next 15: gancho opcional de carga de estilos (typeof _N_E_STYLE_LOAD)',
};

const PERMITIDOS = new Set([
  ...Object.getOwnPropertyNames(globalThis),
  ...GLOBALES_DEL_NAVEGADOR,
  ...Object.keys(PERMITIDOS_DE_LIBRERIAS),
]);

/** Los identificadores libres de UN chunk que no están permitidos. */
export function libresDelChunk(fuente, permitidos = PERMITIDOS) {
  let ast;
  try {
    ast = espree.parse(fuente, { ecmaVersion: 'latest', sourceType: 'script', range: true });
  } catch {
    ast = espree.parse(fuente, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  }
  const alcance = escope.analyze(ast, { ecmaVersion: 2022, sourceType: ast.sourceType ?? 'script' });
  const hallados = [];
  for (const ref of alcance.globalScope.through) {
    const nombre = ref.identifier.name;
    if (nombre.length <= 2 || permitidos.has(nombre)) continue;
    const [a, b] = ref.identifier.range;
    hallados.push({ nombre, contexto: fuente.slice(Math.max(0, a - 80), b + 60).replace(/\s+/g, ' ') });
  }
  return hallados;
}

function archivosJs(carpeta, salida = []) {
  for (const f of fs.readdirSync(carpeta)) {
    const p = path.join(carpeta, f);
    if (fs.statSync(p).isDirectory()) archivosJs(p, salida);
    else if (p.endsWith('.js')) salida.push(p);
  }
  return salida;
}

function main() {
  const carpeta = path.resolve(process.argv[2] ?? '.next/static/chunks');
  if (!fs.existsSync(carpeta)) {
    console.error(`No existe ${carpeta}. Corre \`pnpm build\` primero.`);
    process.exit(2);
  }
  const archivos = archivosJs(carpeta);
  const hallazgos = [];
  const sinLeer = [];
  for (const archivo of archivos) {
    try {
      for (const h of libresDelChunk(fs.readFileSync(archivo, 'utf8'))) {
        hallazgos.push({ archivo: path.relative(carpeta, archivo), ...h });
      }
    } catch (e) {
      sinLeer.push({ archivo: path.relative(carpeta, archivo), error: e.message });
    }
  }

  console.log(`Chunks leídos: ${archivos.length - sinLeer.length} de ${archivos.length}.`);
  for (const s of sinLeer) console.error(`✗ No se pudo leer ${s.archivo}: ${s.error}`);
  for (const h of hallazgos) {
    console.error(`✗ «${h.nombre}» se usa sin declarar en ${h.archivo}\n    …${h.contexto}…`);
  }
  if (hallazgos.length > 0 || sinLeer.length > 0) {
    console.error(
      `\n${hallazgos.length} identificador(es) libre(s) y ${sinLeer.length} chunk(s) sin leer.\n` +
        'Un nombre libre que no es un global del navegador es la huella del ReferenceError de\n' +
        'Propietarios (22-09): el minificador inlineó una función y dejó el nombre original.\n' +
        'Si es de una librería y es legítimo, agrégalo a PERMITIDOS_DE_LIBRERIAS con su motivo.',
    );
    process.exit(1);
  }
  console.log('Sin identificadores libres fuera de la lista de permitidos.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
