/**
 * Ronda 30 (Nico, 23-10-2026): «la de producto en vivo debe ser la landing
 * principal y esa es la que debe tener el mega menú al dar hover en productos
 * y esa mostrar las opciones… para inmobiliarias, propietarios, inquilinos
 * etc… y al dar clic lleva a cada interna».
 *
 * La home (`/es`, `/en`) es la landing 2: la página estática de
 * `public/landing/index.html`, servida tal cual por `src/middleware.ts` con su
 * propia política de contenido. Esto cuida que:
 *   - `/es` y `/en` la sirvan, con la política de la home (y el resto del
 *     sitio siga con la de nonce);
 *   - cada script sea un archivo propio o una librería permitida, y cada
 *     imagen exista;
 *   - ningún enlace sea un «#» muerto ni lleve a una pantalla que no existe;
 *   - el mega menú de «Producto» tenga las mismas opciones y rutas que el del
 *     front (`LandingHeaderV2`) más las páginas por público (`/para/*`), y se
 *     abra con el mouse, al tocar y con el teclado.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { RUTA_DE_LA_HOME, TERCEROS_DE_LA_HOME, politicaDeLaHome } from '@/lib/seguridad/politica-de-contenido'

const CARPETA = 'public/landing'
const HTML = readFileSync(join(CARPETA, 'index.html'), 'utf8')
// `en.js` (el diccionario del inglés) no va en la página: lo carga idioma.js sólo cuando la página va en inglés.
const SCRIPTS_PROPIOS = readdirSync(join(CARPETA, 'js')).filter((f) => f.endsWith('.js') && f !== 'en.js')
const JS = SCRIPTS_PROPIOS.map((f) => readFileSync(join(CARPETA, 'js', f), 'utf8')).join('\n')
const MEGA_MENU_JS = readFileSync(join(CARPETA, 'js', '08-mega-menu.js'), 'utf8')
const CABECERA_V2 = readFileSync('src/components/landing-v2/LandingHeaderV2.tsx', 'utf8')

function documento(): Document {
  return new DOMParser().parseFromString(HTML, 'text/html')
}

/** Las rutas que el App Router declara (mismo criterio del guardián de enlaces). */
function rutasDeclaradas(d: string, prefijo = '', out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (!statSync(p).isDirectory()) {
      if (e === 'page.tsx' || e === 'route.ts') out.push(prefijo === '' ? '/' : prefijo)
      continue
    }
    if (e.startsWith('_')) continue
    const seg = /^\(.*\)$/.test(e) ? '' : /^\[.*\]$/.test(e) ? '/*' : `/${e}`
    rutasDeclaradas(p, prefijo + seg, out)
  }
  return out
}
const DECLARADAS = rutasDeclaradas('src/app').map((r) => r.split('/'))
function existeLaPantalla(camino: string): boolean {
  const trozos = camino.split('/')
  return DECLARADAS.some((t) => t.length === trozos.length && t.every((s, i) => s === '*' || s === trozos[i]))
}

/** Lo que muestra el mega menú: el sistema, los agentes AI (como en el front) y para quién es. */
const SISTEMA = [
  ['/productos/crm', 'CRM inmobiliario', 'Tu comercial de punta a punta'],
  ['/productos/erp', 'ERP de arriendos', 'La plata en orden, sola'],
] as const
const AGENTES = [
  ['/productos/cobranza', 'Cobranza', 'La mora se persigue sola'],
  ['/productos/inquilino', 'Estudio del inquilino', 'Verificación en minutos'],
  ['/productos/avaluos', 'Avalúos', 'El precio correcto'],
  ['/productos/conciliacion', 'Conciliación', 'Cuadre contra el banco'],
  ['/productos/matching', 'Matching', 'Opciones el mismo día'],
  ['/productos/asegurabilidad', 'Asegurabilidad', 'Contratos protegidos'],
] as const
const PUBLICO = [
  ['/para/inmobiliarias', 'Inmobiliarias'],
  ['/para/propietarios', 'Propietarios'],
  ['/para/inquilinos', 'Inquilinos'],
  ['/para/agentes', 'Agentes inmobiliarios'],
] as const

afterEach(() => vi.unstubAllEnvs())

describe('la home es la landing 2 (Ronda 30, Nico)', () => {
  it('/es y /en sirven la página estática de la landing 2, ya armada para buscadores en su idioma', () => {
    for (const idioma of ['es', 'en']) {
      const r = middleware(new NextRequest(`https://leasefy.co/${idioma}`))
      // SEO (24-10): la armada desde la fuente (scripts/landing/armar-paginas.mjs), con su título, canonical e inglés
      expect(r.headers.get('x-middleware-rewrite')).toBe(`https://leasefy.co/paginas/${idioma}/index.html`)
      expect(existsSync(join('public', 'paginas', idioma, 'index.html'))).toBe(true)
    }
    expect(RUTA_DE_LA_HOME).toBe('/landing/index.html')
    // `/` sin idioma sigue yendo primero a /es o /en, como el resto de lo público.
    const sinIdioma = middleware(new NextRequest('https://leasefy.co/', { headers: { 'accept-language': 'es-CO' } }))
    expect(sinIdioma.headers.get('location')).toBe('https://leasefy.co/es')
  })

  it('la home lleva su propia política: abre sólo sus CDN y Google Fonts; el resto sigue con nonce', () => {
    vi.stubEnv('CSP_MODO', 'obligatoria')
    const home = middleware(new NextRequest('https://leasefy.co/es')).headers.get('Content-Security-Policy') ?? ''
    expect(home).toBe(politicaDeLaHome({ desarrollo: true, soloReporte: false }))
    const script = /script-src ([^;]+)/.exec(home)?.[1] ?? ''
    expect(script.split(' ')).toEqual(["'self'", ...TERCEROS_DE_LA_HOME.scripts, "'report-sample'"])
    expect(script).not.toContain("'unsafe-inline'")
    expect(script).not.toMatch(/(^| )https:( |$)/)
    expect(home).toContain('style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com')
    expect(home).toContain('font-src \'self\' data: https://fonts.gstatic.com')
    expect(home).toContain("connect-src 'self';")
    expect(home).toContain("frame-ancestors 'self'")

    const otra = middleware(new NextRequest('https://leasefy.co/es/propiedades')).headers.get('Content-Security-Policy') ?? ''
    expect(otra).toContain("'strict-dynamic'")
    expect(otra).toMatch(/'nonce-[^']+'/)
    expect(otra).not.toContain('cdnjs.cloudflare.com')
    expect(otra).not.toContain('fonts.gstatic.com')
  })

  it('es un documento completo en español, con su título y sin scripts en línea', () => {
    expect(HTML.startsWith('<!doctype html>')).toBe(true)
    const d = documento()
    expect(d.documentElement.getAttribute('lang')).toBe('es')
    expect(d.title).toBe('Leasefy — El sistema operativo inteligente para inmobiliarias')
    expect(d.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(/^CRM, ERP y agentes AI/)
    const scripts = [...d.querySelectorAll('script')]
    expect(scripts.length).toBeGreaterThan(8)
    for (const s of scripts) {
      const src = s.getAttribute('src')
      expect(src, `script en línea: ${s.textContent?.slice(0, 60)}`).toBeTruthy()
      if (src!.startsWith('/landing/js/')) expect(existsSync(join('public', src!)), src!).toBe(true)
      else expect(TERCEROS_DE_LA_HOME.scripts.some((p) => src!.startsWith(p)), src!).toBe(true)
    }
    for (const f of SCRIPTS_PROPIOS) expect(HTML).toContain(`<script src="/landing/js/${f}"></script>`)
  })

  it('cada imagen que pide la página existe en public/landing/img', () => {
    const pedidas = new Set([...`${HTML}\n${JS}`.matchAll(/\/landing\/img\/[^"' )]+\.(?:webp|jpg|png)/g)].map((m) => m[0]))
    expect(pedidas.size).toBeGreaterThan(20)
    for (const img of pedidas) expect(existsSync(join('public', img)), img).toBe(true)
    // La franja del marketplace NO trae inmuebles escritos a mano (Nico 24-10: conectada con producción):
    // la llena conexion.js con lo publicado, de /api/vitrina-de-la-home.
    expect(JS).not.toMatch(/var VIT = \[/)
    expect(readFileSync(join(CARPETA, 'js', 'conexion.js'), 'utf8')).toContain('/api/vitrina-de-la-home')
    // Nada relativo: la página se sirve en /es, no en /landing/.
    expect(`${HTML}\n${JS}`).not.toMatch(/["']img\//)
  })

  it('ningún enlace es un «#» muerto ni lleva a una pantalla que no existe', () => {
    const d = documento()
    const enlaces = [...d.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!)
    // Los que arma el JS (la vitrina de inmuebles).
    for (const m of JS.matchAll(/href="([^"]+)"/g)) enlaces.push(m[1])
    expect(enlaces.length).toBeGreaterThan(40)
    for (const href of enlaces) {
      expect(href, 'enlace vacío').not.toBe('#')
      expect(href, `${href}: a producción en vez de a la ruta del front`).not.toMatch(/^https?:\/\/(www\.)?leasefy\.co/)
      if (href.startsWith('#')) expect(d.getElementById(href.slice(1)), `${href}: no hay sección con ese id`).not.toBeNull()
      else if (href.startsWith('/')) expect(existeLaPantalla(href.split(/[?#]/)[0].replace(/\/+$/, '') || '/'), href).toBe(true)
      else expect(href).toMatch(/^mailto:hola@leasefy\.co$/)
    }
    // Lo que pidió Nico: entrar, crear cuenta, publicar, el marketplace y el contacto llevan al front.
    const barra = [...d.querySelectorAll('.hdr a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')])
    expect(barra).toEqual(
      expect.arrayContaining([
        ['Marketplace', '/propiedades'],
        ['Avalúos', '/avaluo'],
        ['Contacto', '/contacto'],
        ['Publicar gratis', '/publica'],
        ['Entrar', '/auth'],
        ['Crear cuenta', '/auth?mode=register'],
      ]),
    )
    expect(enlaces).toContain('mailto:hola@leasefy.co')
  })

  it('el mega menú de «Producto» tiene las opciones y rutas del front, más las páginas por público', () => {
    const d = documento()
    const btn = d.getElementById('pmBtn')!
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(btn.getAttribute('aria-controls')).toBe('pmPanel')
    expect(btn.textContent?.trim()).toBe('Producto')
    const panel = d.getElementById('pmPanel')!
    const opciones = [...panel.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.querySelector('b')?.textContent ?? a.textContent])
    expect(opciones).toEqual([
      ...SISTEMA.map(([h, t]) => [h, t]),
      ...AGENTES.map(([h, t]) => [h, t]),
      ...PUBLICO.map(([h, t]) => [h, t]),
      ['#producto', 'Visión general en el home ↓'],
    ])
    // Los mismos textos del mega menú del front: título y la línea de debajo.
    for (const [href, titulo, linea] of [...SISTEMA, ...AGENTES]) {
      expect(CABECERA_V2, `${href} ya no está en el mega menú del front`).toContain(`href={enlace("${href}")}`)
      expect(CABECERA_V2).toContain(`tx("${titulo}"`)
      expect(CABECERA_V2).toContain(`tx("${linea}"`)
      expect(panel.querySelector(`a[href="${href}"]`)?.textContent).toContain(linea)
    }
    for (const [href] of PUBLICO) expect(existeLaPantalla(href), href).toBe(true)
    // En el celular, el mismo menú dentro de «Menú».
    const movil = d.getElementById('pmM')!
    expect(movil.hasAttribute('hidden')).toBe(true)
    expect(d.getElementById('pmMBtn')?.getAttribute('aria-controls')).toBe('pmM')
    expect([...movil.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(opciones.map(([h]) => h))
  })
})

describe('el mega menú se abre con el mouse, al tocar y con el teclado', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const d = documento()
    d.querySelectorAll('script').forEach((s) => s.remove())
    document.documentElement.className = ''
    document.body.innerHTML = d.body.innerHTML
    // eslint-disable-next-line no-new-func
    new Function(MEGA_MENU_JS)()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  const btn = () => document.getElementById('pmBtn') as HTMLButtonElement
  const pm = () => document.getElementById('pm') as HTMLElement
  const abierto = () => btn().getAttribute('aria-expanded') === 'true' && pm().classList.contains('pm-abierto')
  const puntero = (tipo: string, pointerType: string) => {
    const e = new Event(tipo)
    Object.defineProperty(e, 'pointerType', { value: pointerType })
    return e
  }
  const tecla = (key: string) => new KeyboardEvent('keydown', { key, bubbles: true })

  it('al pasar el mouse abre y al salir cierra; un clic lo deja fijo', () => {
    pm().dispatchEvent(puntero('pointerenter', 'mouse'))
    expect(abierto()).toBe(true)
    pm().dispatchEvent(puntero('pointerleave', 'mouse'))
    vi.advanceTimersByTime(200)
    expect(abierto()).toBe(false)

    pm().dispatchEvent(puntero('pointerenter', 'mouse'))
    btn().click()
    pm().dispatchEvent(puntero('pointerleave', 'mouse'))
    vi.advanceTimersByTime(200)
    expect(abierto()).toBe(true)
  })

  it('al tocar (sin mouse) abre y cierra con el botón', () => {
    pm().dispatchEvent(puntero('pointerenter', 'touch'))
    expect(abierto()).toBe(false)
    btn().click()
    expect(abierto()).toBe(true)
    btn().click()
    expect(abierto()).toBe(false)
  })

  it('con el teclado: flecha abajo entra a la primera opción y Escape cierra y devuelve el foco', () => {
    btn().focus()
    btn().dispatchEvent(tecla('ArrowDown'))
    vi.runAllTimers()
    expect(abierto()).toBe(true)
    expect(document.activeElement?.getAttribute('href')).toBe('/productos/crm')
    document.activeElement!.dispatchEvent(tecla('Escape'))
    expect(abierto()).toBe(false)
    expect(document.activeElement).toBe(btn())
  })

  it('una opción lleva a su página y cierra el menú', () => {
    btn().click()
    const crm = document.querySelector('#pmPanel a[href="/productos/crm"]') as HTMLAnchorElement
    crm.addEventListener('click', (e) => e.preventDefault())
    crm.click()
    expect(abierto()).toBe(false)
  })

  it('en el celular «Producto» despliega las opciones dentro del menú', () => {
    const mBtn = document.getElementById('pmMBtn') as HTMLButtonElement
    const lista = document.getElementById('pmM') as HTMLElement
    mBtn.click()
    expect(lista.hasAttribute('hidden')).toBe(false)
    expect(mBtn.getAttribute('aria-expanded')).toBe('true')
    mBtn.click()
    expect(lista.hasAttribute('hidden')).toBe(true)
  })
})
