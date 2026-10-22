/**
 * Descargas y enlaces externos dentro de la app de Leasefy.
 *
 * En la vista web de la app no hay pestañas ni carpeta de descargas: un
 * `<a download>` con un blob no hace nada y `window.open` abre Safari/Chrome con
 * una página sin sesión. Esto se instala UNA vez (sólo en la app) y cubre las ~50
 * pantallas que descargan PDF/Excel y las ~40 que abren pestañas, sin tocarlas:
 *
 *  - Un archivo (blob, data: o `<a download>`) se guarda en la caché de la app y se
 *    abre la hoja de compartir del sistema: ahí está «Guardar en Archivos»,
 *    imprimir, mandarlo por WhatsApp o abrirlo en otra app.
 *  - Un enlace de leasefy.co se abre en la misma vista (con la sesión).
 *  - WhatsApp, teléfono y correo van a su app.
 *  - Cualquier otro (Wompi, documentos firmados, YouTube…) se abre en el navegador
 *    seguro DENTRO de la app; al cerrarlo, la persona vuelve donde estaba.
 */
import { esLaApp, escucharALaApp, llamarALaApp, codigoDelError } from './puente'

const VIDA_DEL_BLOB_MS = 120_000
const blobsPorUrl = new Map<string, Blob>()

/** Hosts que deben abrir su propia app (WhatsApp), no el navegador. */
const HOSTS_DE_APPS = ['wa.me', 'api.whatsapp.com', 'web.whatsapp.com', 'chat.whatsapp.com']
const ESQUEMAS_DEL_SISTEMA = ['tel:', 'mailto:', 'sms:', 'whatsapp:', 'geo:', 'maps:']

const EXTENSION_POR_TIPO: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'text/csv': 'csv',
  'application/zip': 'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'text/plain': 'txt',
  'application/json': 'json',
  'application/xml': 'xml',
  'text/xml': 'xml',
}

/** Un nombre de archivo que sirve en iOS y Android (sin barras ni caracteres raros). */
export function nombreDeArchivoSeguro(nombre: string | null | undefined, tipo: string | undefined): string {
  const limpio = (nombre ?? '')
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f<>:"|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  const base = limpio || 'documento-de-leasefy'
  if (/\.[a-z0-9]{2,5}$/i.test(base)) return base
  const extension = tipo ? EXTENSION_POR_TIPO[tipo.split(';')[0].trim().toLowerCase()] : undefined
  return extension ? `${base}.${extension}` : base
}

function nombreDesdeLaUrl(url: string): string | undefined {
  try {
    const ultimo = new URL(url).pathname.split('/').filter(Boolean).pop()
    return ultimo ? decodeURIComponent(ultimo) : undefined
  } catch {
    return undefined
  }
}

function comoBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onerror = () => rechazar(lector.error ?? new Error('No se pudo leer el archivo.'))
    lector.onload = () => {
      const texto = String(lector.result ?? '')
      resolver(texto.slice(texto.indexOf(',') + 1))
    }
    lector.readAsDataURL(blob)
  })
}

type Aviso = (mensaje: string) => void
let avisarDelFallo: Aviso = () => {}

/** Guarda el archivo en la caché de la app y abre la hoja de compartir del sistema. */
export async function guardarYCompartir(blob: Blob, nombre?: string | null): Promise<void> {
  const nombreFinal = nombreDeArchivoSeguro(nombre, blob.type)
  try {
    const datos = await comoBase64(blob)
    const { uri } = await llamarALaApp<{ uri: string }>('Filesystem', 'writeFile', {
      // Una carpeta por descarga: el archivo conserva su nombre en la hoja de compartir.
      path: `descargas/${Date.now()}/${nombreFinal}`,
      data: datos,
      directory: 'CACHE',
      recursive: true,
    })
    await llamarALaApp('Share', 'share', { title: nombreFinal, files: [uri] })
  } catch (error) {
    // Cerrar la hoja de compartir sin elegir nada no es un error.
    const texto = error instanceof Error ? error.message : String(error)
    if (codigoDelError(error) === 'CANCELADO' || /cancel/i.test(texto)) return
    avisarDelFallo(`No pudimos abrir «${nombreFinal}». Vuelve a intentarlo.`)
  }
}

async function descargarDeLaRed(url: string, nombre?: string | null): Promise<void> {
  try {
    const respuesta = await fetch(url, { credentials: 'include' })
    if (!respuesta.ok) throw new Error(String(respuesta.status))
    const blob = await respuesta.blob()
    await guardarYCompartir(blob, nombre ?? nombreDesdeLaUrl(url))
  } catch {
    // Sin permiso para leerlo desde aquí (CORS) o sin red: que lo muestre el navegador seguro.
    await abrirFuera(url)
  }
}

function esDeLeasefy(url: URL): boolean {
  return url.origin === window.location.origin || url.hostname === 'leasefy.co' || url.hostname === 'www.leasefy.co'
}

/** WhatsApp, teléfono o correo: los abre su app. */
function esDeOtraApp(url: URL): boolean {
  return ESQUEMAS_DEL_SISTEMA.includes(url.protocol) || HOSTS_DE_APPS.includes(url.hostname)
}

/** Abre una dirección que no es de Leasefy: su app o el navegador seguro de la app. */
export async function abrirFuera(direccion: string): Promise<void> {
  let url: URL
  try {
    url = new URL(direccion, window.location.href)
  } catch {
    return
  }
  if (esDeOtraApp(url)) {
    // La app nativa manda estas direcciones al sistema (WhatsApp, Teléfono, Mail).
    window.location.href = url.href
    return
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return
  try {
    await llamarALaApp('Browser', 'open', { url: url.href, presentationStyle: 'popover', toolbarColor: '#ffffff' })
  } catch {
    window.location.href = url.href
  }
}

/** Decide qué hacer con una dirección que la página quiso abrir. */
export function abrirDireccion(direccion: string, nombre?: string | null): void {
  if (!direccion || direccion === 'about:blank') return
  if (direccion.startsWith('blob:')) {
    const blob = blobsPorUrl.get(direccion)
    if (blob) void guardarYCompartir(blob, nombre)
    else void descargarDeLaRed(direccion, nombre)
    return
  }
  if (direccion.startsWith('data:')) {
    void fetch(direccion)
      .then((r) => r.blob())
      .then((blob) => guardarYCompartir(blob, nombre))
    return
  }
  let url: URL
  try {
    url = new URL(direccion, window.location.href)
  } catch {
    return
  }
  if (esDeLeasefy(url)) {
    window.location.assign(url.href)
    return
  }
  void abrirFuera(url.href)
}

/**
 * Lo que devuelve `window.open` en la app. Las pantallas abren una pestaña vacía
 * dentro del clic y le ponen la dirección después del `await`
 * (`ventana.location.href = url`); esta «ventana» recibe esa dirección y la abre
 * como corresponde. `close()` antes de eso cancela.
 */
function ventanaDeLaApp(direccionInicial: string | undefined): Window {
  let cerrada = false
  const abrir = (direccion: string) => {
    if (!cerrada) abrirDireccion(direccion)
    cerrada = true
  }
  const ubicacion = {
    get href() {
      return direccionInicial || 'about:blank'
    },
    set href(valor: string) {
      abrir(String(valor))
    },
    assign: (valor: string) => abrir(String(valor)),
    replace: (valor: string) => abrir(String(valor)),
    toString: () => direccionInicial || 'about:blank',
  }
  const ventana = {
    get location() {
      return ubicacion
    },
    set location(valor: unknown) {
      abrir(String(valor))
    },
    get closed() {
      return cerrada
    },
    close: () => {
      cerrada = true
    },
    focus: () => {},
    blur: () => {},
    postMessage: () => {},
    opener: null,
  }
  return ventana as unknown as Window
}

/** El `<a>` que se tocó (o al que se le hizo `.click()`): ¿lo maneja la app? */
function manejarEnlace(enlace: HTMLAnchorElement): boolean {
  const direccion = enlace.getAttribute('href')
  if (!direccion || direccion.startsWith('#') || direccion.startsWith('javascript:')) return false
  const descarga = enlace.hasAttribute('download')
  const nombre = enlace.getAttribute('download') || undefined
  let url: URL
  try {
    url = new URL(direccion, window.location.href)
  } catch {
    return false
  }
  if (url.protocol === 'blob:' || url.protocol === 'data:') {
    abrirDireccion(url.href, nombre)
    return true
  }
  if (descarga) {
    void descargarDeLaRed(url.href, nombre ?? nombreDesdeLaUrl(url.href))
    return true
  }
  if (esDeOtraApp(url)) return false // la vista nativa ya la manda a su app
  const nuevaPestana = (enlace.getAttribute('target') ?? '').toLowerCase() === '_blank'
  if (esDeLeasefy(url)) {
    if (!nuevaPestana) return false // navegación normal de la página
    window.location.assign(url.href)
    return true
  }
  void abrirFuera(url.href)
  return true
}

/**
 * Instala todo. Devuelve con qué desinstalarlo (para las pruebas y el desmontaje).
 * Fuera de la app no hace nada.
 */
export function instalarAbrirYDescargar(opciones: { avisar?: Aviso } = {}): () => void {
  if (!esLaApp()) return () => {}
  if (opciones.avisar) avisarDelFallo = opciones.avisar

  const crearOriginal = URL.createObjectURL
  const revocarOriginal = URL.revokeObjectURL
  const abrirOriginal = window.open
  const clicOriginal = HTMLAnchorElement.prototype.click

  URL.createObjectURL = function crearConRecuerdo(objeto: Blob | MediaSource): string {
    const url = crearOriginal.call(URL, objeto)
    if (objeto instanceof Blob) blobsPorUrl.set(url, objeto)
    return url
  }
  // Las pantallas revocan el blob justo después del clic; la app lo guarda un rato
  // más porque lo lee después (es asíncrono).
  URL.revokeObjectURL = function revocarDespues(url: string): void {
    window.setTimeout(() => blobsPorUrl.delete(url), VIDA_DEL_BLOB_MS)
    revocarOriginal.call(URL, url)
  }

  window.open = function abrirEnLaApp(direccion?: string | URL): Window | null {
    const texto = direccion === undefined ? '' : String(direccion)
    if (texto && texto !== 'about:blank') {
      abrirDireccion(texto)
    }
    return ventanaDeLaApp(texto || undefined)
  } as typeof window.open

  HTMLAnchorElement.prototype.click = function clicEnLaApp(this: HTMLAnchorElement) {
    if (manejarEnlace(this)) return
    return clicOriginal.call(this)
  }

  const alTocar = (evento: MouseEvent) => {
    if (evento.defaultPrevented || evento.button !== 0) return
    const enlace = (evento.target as Element | null)?.closest?.('a')
    // Sólo se impide la navegación; el onClick de la pantalla sigue corriendo.
    if (enlace && manejarEnlace(enlace as HTMLAnchorElement)) evento.preventDefault()
  }
  document.addEventListener('click', alTocar, true)

  // Al cerrar el navegador seguro (p. ej. después de pagar en Wompi) la pantalla
  // vuelve a preguntar lo que pregunta al recuperar el foco.
  const dejarDeEscuchar = escucharALaApp('Browser', 'browserFinished', () => {
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
  })

  return () => {
    URL.createObjectURL = crearOriginal
    URL.revokeObjectURL = revocarOriginal
    window.open = abrirOriginal
    HTMLAnchorElement.prototype.click = clicOriginal
    document.removeEventListener('click', alTocar, true)
    dejarDeEscuchar()
  }
}
