/* eslint-disable */
/**
 * El service worker del inventario sin señal.
 *
 * 🔴 Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la persona
 * que hace el inventario debería poder agregar todo sin señal y, cuando tenga
 * señal, cargarlo».
 *
 * El borrador en IndexedDB ya cubría «entré con señal y la perdí adentro».
 * Este archivo cubre el otro caso: **llegar al apartamento y recién ahí abrir
 * la ficha**. Sin él, Next no tiene de dónde servir el HTML y el navegador
 * muestra su pantalla de «sin conexión» antes de que corra una línea nuestra.
 *
 * Lo que hace, y NADA más que esto:
 *
 *  · La lista de inmuebles, la ficha de un inmueble y la ficha de un contrato
 *    —las tres pantallas desde las que se trabaja el inventario— se guardan al
 *    pasar por ellas (y a propósito, con «Preparar para trabajar sin señal»).
 *    Primero la red, y si la red no está, lo guardado. Primero la red y no al
 *    revés porque una ficha vieja servida con señal disponible sería una
 *    mentira: la copia es la RED DE SEGURIDAD, no la fuente.
 *  · Los archivos de `/_next/static/` (el código de la pantalla) se guardan al
 *    pedirlos. Llevan hash en el nombre, así que un despliegue nuevo pide URLs
 *    nuevas y las viejas quedan sin usarse: por eso se recorta la caja al
 *    tope de abajo.
 *  · Todo lo demás pasa de largo. En particular las llamadas al back: un
 *    inventario que se ve «cargado» con datos viejos es peor que uno vacío.
 *
 * **Versionado**: `VERSION` nombra las cajas. Al activarse, este worker borra
 * toda caja `leasefy-inventario-*` que no sea de su versión, así que subir el
 * número limpia lo de la versión anterior. Para el contenido no hace falta
 * tocar nada: el navegador compara byte a byte este archivo en cada carga y lo
 * reemplaza cuando cambia, el HTML va por red-primero (un despliegue nuevo lo
 * pisa apenas hay señal) y los estáticos llevan el hash del build en la URL.
 */

const VERSION = 'v1';
const PREFIJO = 'leasefy-inventario-';
const CAJA_DE_RUTAS = PREFIJO + 'rutas-' + VERSION;
const CAJA_DE_ESTATICOS = PREFIJO + 'estaticos-' + VERSION;

/**
 * Cuántos archivos de código se guardan. Cada despliegue deja los suyos; sin
 * tope, la caja crece hasta que el navegador desaloja el origen entero —y con
 * él la base donde vive el inventario a medio llenar.
 */
const TOPE_DE_ESTATICOS = 400;

/** Las rutas que se sirven sin señal. Ninguna otra del panel. */
const LISTA = '/panel/inmobiliaria/inmuebles';

/**
 * La ficha del CONTRATO, desde donde también se carga el inventario.
 *
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario». Si el worker no guarda esta página, el
 * botón «Preparar para trabajar sin señal» de la ficha del contrato guarda los
 * datos y la persona igual se queda afuera: sin HTML, el navegador muestra su
 * pantalla de «sin conexión» antes de que corra una línea nuestra.
 *
 * La LISTA de contratos no se guarda, a diferencia de la de inmuebles: esa
 * hospeda «Disponibles sin señal» —lo único que se puede hacer sin red— y la
 * de contratos no tiene nada que mostrar sin el back.
 */
const CONTRATOS = '/panel/inmobiliaria/contratos';

/**
 * Sub-rutas que NO son una ficha. Todas necesitan el back para hacer algo, así
 * que guardarlas sería prometer algo que no se puede cumplir.
 */
const NO_SON_FICHAS = {
  [LISTA]: ['nuevo', 'importar', 'captura', 'avaluos'],
  [CONTRATOS]: ['nuevo', 'migrar', 'conceptos', 'renovaciones', 'aprobar', 'retencion', 'riesgo'],
};

/** `/base/algo` con `algo` que no esté en la lista negra de esa base. */
function esFichaDe(base, pathname) {
  if (!pathname.startsWith(base + '/')) return false;
  const resto = pathname.slice(base.length + 1).split('/');
  return (
    resto.length === 1 && resto[0].length > 0 && NO_SON_FICHAS[base].indexOf(resto[0]) === -1
  );
}

function esRutaGuardable(url) {
  if (url.pathname === LISTA) return true;
  return esFichaDe(LISTA, url.pathname) || esFichaDe(CONTRATOS, url.pathname);
}

function esEstatico(url) {
  return url.pathname.startsWith('/_next/static/');
}

/**
 * Qué hacer con un pedido: `'ruta'` (red primero, caché de respaldo),
 * `'estatico'` (caché primero) o `'nada'` (pasa de largo, sin tocarlo).
 */
function queHacerCon(pedido, origen) {
  if (pedido.method !== 'GET') return 'nada';
  const url = new URL(pedido.url);
  if (url.origin !== origen) return 'nada';
  if (esEstatico(url)) return 'estatico';
  if (pedido.mode === 'navigate' && esRutaGuardable(url)) return 'ruta';
  return 'nada';
}

/** Las cajas que sobran: las de este worker de OTRA versión. */
function cajasQueSobran(nombres) {
  return nombres.filter(
    (n) => n.indexOf(PREFIJO) === 0 && n !== CAJA_DE_RUTAS && n !== CAJA_DE_ESTATICOS,
  );
}

/**
 * Lo que hay que borrar para que quepan `tope`. Sale lo más viejo, que en una
 * caja del navegador es lo que se guardó primero (el orden de `keys()`).
 */
function estaticosQueSobran(claves, tope) {
  return claves.length <= tope ? [] : claves.slice(0, claves.length - tope);
}

// Estas funciones son las que decide el worker, y son las que se prueban:
// `sw-inventario.test.ts` lee ESTE archivo y las llama con un `self` fingido.
self.__swInventario = {
  VERSION,
  PREFIJO,
  CAJA_DE_RUTAS,
  CAJA_DE_ESTATICOS,
  TOPE_DE_ESTATICOS,
  esRutaGuardable,
  esEstatico,
  queHacerCon,
  cajasQueSobran,
  estaticosQueSobran,
};

// A partir de acá, el cableado con el navegador. En las pruebas `self` no
// tiene `addEventListener` y nada de esto corre.
if (typeof self.addEventListener === 'function') {
  self.addEventListener('install', (evento) => {
    // Sin esto el worker nuevo espera a que se cierren todas las pestañas, y
    // quien está haciendo un inventario no cierra nada en medio del recorrido.
    evento.waitUntil(self.skipWaiting());
  });

  self.addEventListener('activate', (evento) => {
    evento.waitUntil(
      caches
        .keys()
        .then((nombres) => Promise.all(cajasQueSobran(nombres).map((n) => caches.delete(n))))
        .then(() => self.clients.claim()),
    );
  });

  /** Guarda la respuesta sin tocar la que se devuelve (una sola se puede leer). */
  function guardar(caja, pedido, respuesta) {
    if (!respuesta || !respuesta.ok) return respuesta;
    const copia = respuesta.clone();
    caches.open(caja).then((c) => c.put(pedido, copia)).catch(() => {});
    return respuesta;
  }

  async function recortarEstaticos() {
    const caja = await caches.open(CAJA_DE_ESTATICOS);
    const claves = await caja.keys();
    await Promise.all(estaticosQueSobran(claves, TOPE_DE_ESTATICOS).map((k) => caja.delete(k)));
  }

  async function porRuta(pedido) {
    try {
      return guardar(CAJA_DE_RUTAS, pedido, await fetch(pedido));
    } catch (err) {
      // `ignoreVary` a propósito: Next manda `Vary: RSC, Next-Router-…` en las
      // respuestas del app router, y la copia que dejó «Preparar para trabajar
      // sin señal» se pidió con otras cabeceras que la navegación de verdad.
      // Sin esto la copia está guardada y aun así no calza con el pedido.
      // Sólo se busca en la caja de RUTAS, donde nunca entra un payload del
      // router: los pedidos que no son navegación pasan de largo.
      const rutas = await caches.open(CAJA_DE_RUTAS);
      const guardada = await rutas.match(pedido, { ignoreSearch: true, ignoreVary: true });
      if (guardada) return guardada;
      // Decir por qué no hay nada es mejor que el dinosaurio del navegador:
      // el inmueble no se preparó, y eso tiene arreglo la próxima vez.
      return new Response(
        '<!doctype html><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>Sin señal</title>' +
          '<body style="font:16px system-ui;margin:0;padding:2rem;color:#111">' +
          '<h1 style="font-size:1.25rem">Estás sin señal</h1>' +
          '<p>Este inmueble no quedó preparado para trabajar sin señal. ' +
          'Con señal, abrí su ficha y tocá «Preparar para trabajar sin señal».</p>' +
          '</body>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }
  }

  async function porEstatico(pedido) {
    const caja = await caches.open(CAJA_DE_ESTATICOS);
    const guardada = await caja.match(pedido, { ignoreVary: true });
    if (guardada) return guardada;
    const respuesta = await fetch(pedido);
    guardar(CAJA_DE_ESTATICOS, pedido, respuesta);
    return respuesta;
  }

  self.addEventListener('fetch', (evento) => {
    const que = queHacerCon(evento.request, self.location.origin);
    if (que === 'ruta') evento.respondWith(porRuta(evento.request));
    else if (que === 'estatico') evento.respondWith(porEstatico(evento.request));
  });

  /**
   * «Preparar para trabajar sin señal»: la pantalla manda su propia URL y la
   * lista de archivos que cargó. Se guardan acá para que la próxima vez, sin
   * señal, haya de dónde servirlos.
   */
  self.addEventListener('message', (evento) => {
    const datos = evento.data || {};
    if (datos.tipo !== 'preparar') return;
    const responder = (respuesta) => {
      if (evento.ports && evento.ports[0]) evento.ports[0].postMessage(respuesta);
    };
    evento.waitUntil(
      (async () => {
        try {
          const rutas = await caches.open(CAJA_DE_RUTAS);
          await rutas.add(new Request(datos.url, { credentials: 'same-origin' }));
          const estaticos = await caches.open(CAJA_DE_ESTATICOS);
          const urls = (datos.estaticos || []).filter((u) => esEstatico(new URL(u)));
          // Uno por uno y sin cortar: `addAll` es todo-o-nada y un solo
          // archivo que falle dejaría la pantalla sin NADA guardado.
          for (const u of urls) {
            await estaticos.add(u).catch(() => {});
          }
          await recortarEstaticos();
          responder({ ok: true });
        } catch (err) {
          responder({ ok: false, error: String((err && err.message) || err) });
        }
      })(),
    );
  });
}
