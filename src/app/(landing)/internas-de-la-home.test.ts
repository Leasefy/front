/**
 * Ronda 30 (Nico, 23-10-2026): «no vi el glow up … al dar clic manda al viejo».
 *
 * Las INTERNAS de la home —las páginas a las que lleva el mega menú
 * «Producto»— son el diseño nuevo, servido como páginas estáticas igual que la
 * home (`public/internas/productos/` y `public/internas/para/`, sin React):
 *   - `/productos` (el índice), `/productos/<producto>` (las ocho) y
 *     `/para/<público>` (las cuatro) las sirve `src/middleware.ts`, con la
 *     política de la home; el resto del sitio sigue con la de nonce;
 *   - la página lee la RUTA (`/productos/crm` → crm), no el «#», y sus enlaces
 *     internos son rutas reales del front;
 *   - cada script es un archivo propio o una librería permitida, y cada imagen
 *     y video existe;
 *   - ningún enlace es un «#» muerto, ni va a leasefy.co o a claude.ai, ni lleva
 *     a una pantalla que no existe;
 *   - fuera lo inventado: sin testimonios ni cifras que no se pueden sostener
 *     (como 38438ed44 en las páginas de React, que quedan como respaldo).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import {
  PRODUCTOS_DE_LAS_INTERNAS,
  PUBLICOS_DE_LAS_INTERNAS,
  RUTAS_DE_LAS_INTERNAS,
  TERCEROS_DE_LA_HOME,
  internaDeLaRuta,
  politicaDeLaHome,
} from '@/lib/seguridad/politica-de-contenido'

type Pagina = 'productos' | 'para'
const PAGINAS: Pagina[] = ['productos', 'para']

function leer(p: Pagina) {
  const carpeta = join('public', 'internas', p)
  const html = readFileSync(join(carpeta, 'index.html'), 'utf8')
  const scripts = readdirSync(join(carpeta, 'js')).filter((f) => f.endsWith('.js')).sort()
  const js: Record<string, string> = Object.fromEntries(scripts.map((f) => [f, readFileSync(join(carpeta, 'js', f), 'utf8')]))
  return { carpeta, html, scripts, js, todo: `${html}\n${Object.values(js).join('\n')}` }
}
const DE = { productos: leer('productos'), para: leer('para') }
/**
 * El documento sin pedir nada a la red: happy-dom bajaría las hojas de estilo y los scripts (Google Fonts, las
 * CDN) al parsear. Los `src` de los scripts se leen de `data-src`.
 */
const documento = (html: string): Document =>
  new DOMParser().parseFromString(html.replace(/<link\b[^>]*>/g, '').replace(/<script\b([^>]*)\bsrc=/g, '<script$1data-src='), 'text/html')
const HOME = documento(readFileSync(join('public', 'landing', 'index.html'), 'utf8'))

/** Los datos de las ocho internas de producto, tal como los lee la página. */
type Producto = {
  name: string; h1: string; lead: string; eyebrow: string; grupo: string; portada: string; oscura: string; obj: string
  notas: Array<[number, number, string]>; reco: Array<[string, number[], string]>; clips: Array<[string, number[], string]>
  ficha: Array<[string, string]>
}
function datosDeProductos(): { PROD: Record<string, Producto>; ORDEN: string[] } {
  const w: Record<string, unknown> = {}
  // eslint-disable-next-line no-new-func
  new Function('window', DE.productos.js['01-datos.js'])(w)
  return w as { PROD: Record<string, Producto>; ORDEN: string[] }
}
const { PROD, ORDEN } = datosDeProductos()

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
/** La pantalla existe: la declara el App Router, es la home o es una interna (las dos las sirve el middleware). */
function existeLaPantalla(camino: string): boolean {
  if (camino === '/' || internaDeLaRuta(camino) !== null) return true
  const trozos = camino.split('/')
  return DECLARADAS.some((t) => t.length === trozos.length && t.every((s, i) => s === '*' || s === trozos[i]))
}

const reescritura = (url: string) => middleware(new NextRequest(`https://leasefy.co${url}`)).headers.get('x-middleware-rewrite')
const politica = (url: string) => middleware(new NextRequest(`https://leasefy.co${url}`)).headers.get('Content-Security-Policy') ?? ''

afterEach(() => vi.unstubAllEnvs())

describe('las internas de la home se sirven estáticas (Ronda 30, Nico)', () => {
  it('/productos, sus ocho internas y las cuatro por público sirven su página; lo demás sigue en React', () => {
    for (const idioma of ['es', 'en']) {
      expect(reescritura(`/${idioma}/productos`)).toBe(`https://leasefy.co${RUTAS_DE_LAS_INTERNAS.productos}`)
      for (const s of PRODUCTOS_DE_LAS_INTERNAS) expect(reescritura(`/${idioma}/productos/${s}`)).toBe(`https://leasefy.co${RUTAS_DE_LAS_INTERNAS.productos}`)
      for (const s of PUBLICOS_DE_LAS_INTERNAS) expect(reescritura(`/${idioma}/para/${s}`)).toBe(`https://leasefy.co${RUTAS_DE_LAS_INTERNAS.para}`)
    }
    expect(RUTAS_DE_LAS_INTERNAS).toEqual({ productos: '/internas/productos/index.html', para: '/internas/para/index.html' })
    // Lo que no es una interna no se toca.
    expect(reescritura('/es/productos/otro')).toBe('https://leasefy.co/productos/otro')
    expect(reescritura('/es/para')).toBe('https://leasefy.co/para')
    expect(reescritura('/es/propiedades')).toBe('https://leasefy.co/propiedades')
    // Sin idioma, primero a /es o /en, como el resto de lo público.
    const sinIdioma = middleware(new NextRequest('https://leasefy.co/productos/crm', { headers: { 'accept-language': 'es-CO' } }))
    expect(sinIdioma.headers.get('location')).toBe('https://leasefy.co/es/productos/crm')
  })

  it('son las mismas del mega menú de la home y las mismas que tenían página en React (que queda de respaldo)', () => {
    const delMenu = [...HOME.querySelectorAll('#pmPanel a')].map((a) => a.getAttribute('href')!).filter((h) => h.startsWith('/'))
    expect(delMenu.length).toBe(12)
    for (const h of delMenu) expect(internaDeLaRuta(h), h).not.toBeNull()
    expect(readdirSync('src/app/(landing)/productos').sort()).toEqual([...PRODUCTOS_DE_LAS_INTERNAS].sort())
    expect(readdirSync('src/app/para').filter((e) => statSync(join('src/app/para', e)).isDirectory()).sort()).toEqual([...PUBLICOS_DE_LAS_INTERNAS].sort())
    for (const s of PRODUCTOS_DE_LAS_INTERNAS) expect(existsSync(`src/app/(landing)/productos/${s}/page.tsx`), s).toBe(true)
    for (const s of PUBLICOS_DE_LAS_INTERNAS) expect(existsSync(`src/app/para/${s}/page.tsx`), s).toBe(true)
    expect(ORDEN).toEqual([...PRODUCTOS_DE_LAS_INTERNAS])
  })

  it('llevan la política de la home (sólo sus CDN y Google Fonts); el resto sigue con nonce', () => {
    vi.stubEnv('CSP_MODO', 'obligatoria')
    const deLaHome = politicaDeLaHome({ desarrollo: true, soloReporte: false })
    for (const url of ['/es/productos', '/es/productos/crm', '/en/productos/asegurabilidad', '/es/para/inmobiliarias', '/en/para/agentes']) {
      expect(politica(url), url).toBe(deLaHome)
    }
    for (const url of ['/es/productos/otro', '/es/para', '/es/propiedades', '/es/contacto']) {
      const p = politica(url)
      expect(p, url).toContain("'strict-dynamic'")
      expect(p, url).toMatch(/'nonce-[^']+'/)
      expect(p, url).not.toContain('cdnjs.cloudflare.com')
    }
  })

  it.each(PAGINAS)('%s: documento completo en español, con título y sin scripts en línea', (p) => {
    const { html, scripts } = DE[p]
    expect(html.startsWith('<!doctype html>')).toBe(true)
    const d = documento(html)
    expect(d.documentElement.getAttribute('lang')).toBe('es')
    // Siempre en claro, como la home (no trae oscuro) y todo lo público del front.
    expect(d.documentElement.getAttribute('data-theme')).toBe('light')
    expect(d.title).toMatch(/ \| Leasefy$/)
    expect(d.querySelector('meta[name="viewport"]')).not.toBeNull()
    expect(d.querySelector('meta[name="description"]')?.getAttribute('content')?.length).toBeGreaterThan(40)
    const enLaPagina = [...d.querySelectorAll('script')]
    // Los propios, las cuatro librerías (GSAP, ScrollTrigger, Lenis y Motion) y los dos del idioma de la home
    // (/landing/js/idioma.js e idioma-aplicar.js: el inglés, Nico 23-10).
    expect(enLaPagina.length).toBe(scripts.length + 4 + 2)
    for (const s of enLaPagina) {
      const src = s.getAttribute('data-src')
      expect(src, `script en línea: ${s.textContent?.slice(0, 60)}`).toBeTruthy()
      if (src!.startsWith(`/internas/${p}/js/`) || src!.startsWith('/landing/js/idioma')) expect(existsSync(join('public', src!)), src!).toBe(true)
      else expect(TERCEROS_DE_LA_HOME.scripts.some((t) => src!.startsWith(t)), src!).toBe(true)
    }
    for (const f of scripts) expect(html).toContain(`<script src="/internas/${p}/js/${f}"></script>`)
  })
})

describe('cada imagen y cada video que piden existen', () => {
  it.each(PAGINAS)('%s: las rutas absolutas existen y ninguna es relativa (la página se sirve en /es/…)', (p) => {
    const pedidas = new Set([...DE[p].todo.matchAll(/\/internas\/(?:productos|para)\/img\/[^"' )]+\.(?:webp|jpg|png|mp4)/g)].map((m) => m[0]))
    expect(pedidas.size).toBeGreaterThan(p === 'productos' ? 2 : 15)
    for (const img of pedidas) expect(existsSync(join('public', img)), img).toBe(true)
    expect(DE[p].todo).not.toMatch(/["'(]img\//)
  })

  it('productos: las capturas, los clips y los objetos 3D que arma el JS con los datos', () => {
    const img = (rel: string) => existsSync(join('public/internas/productos/img', rel))
    expect(DE.productos.js['04-vistas.js']).toContain('function img(src) { return "/internas/productos/img/" + src + ".webp"; }')
    for (const [slug, p] of Object.entries(PROD)) {
      for (const k of [p.portada, p.oscura, ...p.reco.map((r) => r[0])]) expect(img(`${k}.webp`), `${slug}: ${k}`).toBe(true)
      for (const [k] of p.clips) {
        if (k.startsWith('p/')) expect(img(`${k}.webp`), `${slug}: ${k}`).toBe(true)
        else for (const ext of ['webp', 'mp4']) expect(img(`clips/${k}.${ext}`), `${slug}: clips/${k}.${ext}`).toBe(true)
      }
      expect(img(`3d/${p.obj}-voltaje.webp`), `${slug}: ${p.obj}`).toBe(true)
    }
  })
})

describe('ningún enlace es un «#» muerto, ni va a producción o a claude.ai, ni lleva a una pantalla que no existe', () => {
  const idsDeLaHome = new Set([...HOME.querySelectorAll('[id]')].map((e) => e.id))

  it.each(PAGINAS)('%s', (p) => {
    const d = documento(DE[p].html)
    const js = Object.values(DE[p].js).join('\n')
    const ids = new Set([...d.querySelectorAll('[id]')].map((e) => e.id))
    for (const m of js.matchAll(/id="([a-z-]+)"/g)) ids.add(m[1])
    const enlaces = [...d.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!)
    for (const m of js.matchAll(/href="([^"]+)"/g)) {
      // Los que arma el JS con cada producto: '/productos/' + s + '…'
      if (/^\/productos\/' \+ (s|slug) \+ '$/.test(m[1])) for (const s of ORDEN) enlaces.push(`/productos/${s}`)
      else if (!m[1].includes("' +")) enlaces.push(m[1])
    }
    for (const m of js.matchAll(/var DEMO = "([^"]+)", PLANES = "([^"]+)"/g)) enlaces.push(m[1], m[2])
    expect(enlaces.length).toBeGreaterThan(30)
    for (const href of enlaces) {
      expect(href, 'enlace vacío').not.toBe('#')
      expect(href, `${href}: a producción en vez de a la ruta del front`).not.toMatch(/^https?:\/\/(www\.)?leasefy\.co/)
      expect(href, `${href}: a la página de muestra`).not.toContain('claude.ai')
      if (href.startsWith('#')) {
        expect(ids.has(href.slice(1)), `${href}: no hay sección con ese id`).toBe(true)
      } else if (href.startsWith('/')) {
        const [sinAncla, ancla] = href.split('#')
        const limpio = sinAncla.split('?')[0].replace(/\/+$/, '') || '/'
        expect(existeLaPantalla(limpio), href).toBe(true)
        if (ancla && limpio === '/') expect(idsDeLaHome.has(ancla), `${href}: la home no tiene esa sección`).toBe(true)
        if (ancla && limpio === '/productos') expect(ids.has(ancla), `${href}: el índice no tiene esa sección`).toBe(true)
      } else {
        expect(href).toMatch(/^mailto:hola@leasefy\.co$/)
      }
    }
    // La barra lleva al front, como la de la home.
    const barra = [...d.querySelectorAll('.hdr a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')])
    expect(barra).toEqual(
      expect.arrayContaining([
        ['Marketplace', '/propiedades'],
        ['Planes', '/#planes'],
        ['Avalúos', '/avaluo'],
        ['Contacto', '/contacto'],
        ['Publicar gratis', '/publica'],
        ['Entrar', '/auth'],
        ['Crear cuenta', '/auth?mode=register'],
      ]),
    )
    expect(d.querySelector('.hdr .logo')?.getAttribute('href')).toBe('/')
  })

  it('para: las pestañas de público son las rutas /para/<público>', () => {
    const d = documento(DE.para.html)
    const pestañas = [...d.querySelectorAll('.sel-tabs a')].map((a) => [a.getAttribute('href'), a.getAttribute('data-ir')])
    expect(pestañas).toEqual(PUBLICOS_DE_LAS_INTERNAS.map((v) => [`/para/${v}`, v]))
  })
})

describe('fuera lo inventado (como 38438ed44 en las páginas de React)', () => {
  it('para: sin testimonios, y en cada héroe sólo cifras que se pueden sostener', () => {
    const d = documento(DE.para.html)
    expect(d.querySelectorAll('.testi, .t-card, blockquote').length).toBe(0)
    const cifras = (v: string) => [...d.querySelectorAll(`.vista[data-vista="${v}"] .cifras b`)].map((b) => b.textContent)
    expect(cifras('inmobiliarias')).toEqual(['$0', 'Ley 820'])
    expect(cifras('propietarios')).toEqual(['$0', 'Ley 820'])
    expect(cifras('inquilinos')).toEqual(['$0', 'Ley 820'])
    expect(cifras('agentes')).toEqual(['$0', '1 enlace'])
    // El cierre: sin «+200 inmobiliarias», reseñas ni cifras inventadas.
    expect(d.querySelector('#cierre .resena, #cierre .cifras')).toBeNull()
    expect(d.querySelector('#cierre .ceja')?.textContent?.trim()).toBe('Empieza hoy')
    const texto = d.body.textContent ?? ''
    for (const inventado of ['92%', '500+', '10x', '48h', '850+', 'reseñas', 'confían', '+2,500', 'Plataforma #1', '+340', '98%', '2,847', '200+', 'Inmobiliaria Santafé', 'Carolina Mendoza', 'Andrés Pereira', 'Nicolás Martínez', 'game-changer']) {
      expect(texto, inventado).not.toContain(inventado)
    }
    expect(texto, 'una «satisfacción» de 4,8 o 4,9').not.toMatch(/\b4\.[89]\b/)
    expect(texto, '«2x»').not.toMatch(/\b2x\b/)
    // «inmueble» y «enlace» (antes «propiedad» y «link»), como en las páginas de React.
    expect(texto).not.toMatch(/\blink\b/i)
    expect(texto).toContain('Enlace de evaluación')
    expect(DE.para.js['03-pagina.js']).not.toMatch(/testi|carrusel/)
  })

  it('productos: las notas de la portada señalan la pantalla sin prometer cifras; sin jerga', () => {
    for (const [slug, p] of Object.entries(PROD)) {
      for (const [, , nota] of p.notas) expect(nota, `${slug}: ${nota}`).not.toMatch(/\d/)
      if (p.grupo === 'agentes') {
        expect(p.eyebrow).toMatch(/^Agentes IA · 0[1-6]$/)
        expect(p.ficha).toContainEqual(['Incluido en', 'Planes con agentes IA'])
      }
    }
    const datos = DE.productos.js['01-datos.js']
    for (const jerga of ['un solo pipeline', 'mismo pipeline', 'el pipeline solos', 'Tu pipeline', 'El pipeline deja', '"Pipeline"]', 'feedback', 'El match', '["Match"', 'Match automático', 'Match banco', 'Match por referencia', 'agentes AI', 'Agentes AI']) {
      expect(datos, jerga).not.toContain(jerga)
    }
    expect(PROD.crm.lead).toContain('un solo embudo')
    expect(PROD.conciliacion.lead).toContain('El cruce entre extracto y contrato')
  })
})

/*
 * El enrutador de cada página, de verdad: se monta su cuerpo, se corren sus
 * scripts (sin las librerías de animación: la página queda quieta, como con
 * movimiento reducido) y se navega. Cada corrida suelta sus oyentes al final.
 */
const sueltos: Array<() => void> = []
function correr(p: Pagina, url: string) {
  window.history.replaceState(null, '', url)
  const d = documento(DE[p].html)
  d.querySelectorAll('script').forEach((s) => s.remove())
  document.documentElement.className = ''
  document.body.innerHTML = d.body.innerHTML
  const delDocumento = document.addEventListener
  const deLaVentana = window.addEventListener
  document.addEventListener = ((t: string, f: EventListener, o?: AddEventListenerOptions) => {
    sueltos.push(() => document.removeEventListener(t, f, o))
    return delDocumento.call(document, t, f, o)
  }) as typeof document.addEventListener
  window.addEventListener = ((t: string, f: EventListener, o?: AddEventListenerOptions) => {
    sueltos.push(() => window.removeEventListener(t, f, o))
    return deLaVentana.call(window, t, f, o)
  }) as typeof window.addEventListener
  try {
    for (const f of DE[p].scripts.filter((n) => n !== '00-arranque.js')) {
      // eslint-disable-next-line no-new-func
      new Function(DE[p].js[f])()
    }
  } finally {
    document.addEventListener = delDocumento
    window.addEventListener = deLaVentana
  }
}
const clic = (el: Element, extra: MouseEventInit = {}) => {
  const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...extra })
  el.dispatchEvent(e)
  return e
}
const h1 = () => document.querySelector('main h1')?.textContent?.replace(/\s+/g, ' ').trim()

describe('la página lee la RUTA del front, no el «#»', () => {
  afterEach(() => {
    sueltos.splice(0).forEach((f) => f())
    document.body.innerHTML = ''
    window.history.replaceState(null, '', '/')
  })

  it('productos: /es/productos/crm abre el CRM; sus enlaces cambian de interna sin recargar y conservan el idioma', () => {
    correr('productos', '/es/productos/crm')
    expect(h1()).toBe(PROD.crm.h1)
    expect(document.title).toBe('CRM inmobiliario | Leasefy')
    expect(document.querySelector('#despProd a[aria-current="page"]')?.getAttribute('href')).toBe('/productos/crm')

    const erp = document.querySelector('#despProd a[href="/productos/erp"]')!
    expect(clic(erp).defaultPrevented).toBe(true)
    expect(window.location.pathname).toBe('/es/productos/erp')
    expect(h1()).toBe(PROD.erp.h1)

    // Atrás/adelante del navegador.
    window.history.pushState(null, '', '/es/productos')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(h1()).toBe('El sistema operativo inteligente para inmobiliarias')
    expect(document.title).toBe('Productos | Leasefy')
    expect([...document.querySelectorAll('main a.pz')].map((a) => a.getAttribute('href'))).toEqual(ORDEN.map((s) => `/productos/${s}`))

    // Con Ctrl (pestaña nueva) el navegador hace lo suyo.
    const conCtrl = document.querySelector('main a.pz[href="/productos/cobranza"]')!
    window.addEventListener('click', (e) => e.preventDefault(), { once: true })
    const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true })
    let antes: boolean | null = null
    document.addEventListener('click', (ev) => { antes = ev.defaultPrevented }, { once: true })
    conCtrl.dispatchEvent(e)
    expect(antes).toBe(false)
    expect(window.location.pathname).toBe('/es/productos')
  })

  it('productos: un enlace viejo con «#matching» lleva a /productos/matching', () => {
    correr('productos', '/es/productos#matching')
    expect(window.location.pathname).toBe('/es/productos/matching')
    expect(h1()).toBe(PROD.matching.h1)
  })

  it('para: /es/para/propietarios abre propietarios; las pestañas cambian de público y la ruta', () => {
    correr('para', '/es/para/propietarios')
    const visible = () => [...document.querySelectorAll<HTMLElement>('.vista')].filter((v) => !v.hidden).map((v) => v.dataset.vista)
    expect(visible()).toEqual(['propietarios'])
    expect(document.querySelector('.sel-tabs a[aria-current="page"]')?.getAttribute('data-ir')).toBe('propietarios')
    expect(document.getElementById('selRuta')?.textContent).toBe('propietarios')
    expect(document.title).toBe('Para propietarios | Leasefy')

    expect(clic(document.querySelector('.sel-tabs a[data-ir="agentes"]')!).defaultPrevented).toBe(true)
    expect(window.location.pathname).toBe('/es/para/agentes')
    expect(visible()).toEqual(['agentes'])
    expect(document.title).toBe('Para agentes inmobiliarios | Leasefy')

    window.history.pushState(null, '', '/es/para/inquilinos')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(visible()).toEqual(['inquilinos'])
  })

  it('para: un enlace viejo con «#agentes» lleva a /para/agentes', () => {
    correr('para', '/en/para/inmobiliarias#agentes')
    expect(window.location.pathname).toBe('/en/para/agentes')
    expect([...document.querySelectorAll<HTMLElement>('.vista')].filter((v) => !v.hidden).map((v) => v.dataset.vista)).toEqual(['agentes'])
  })
})
