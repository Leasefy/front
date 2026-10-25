/**
 * Las páginas de la landing estática YA ARMADAS para buscadores (SEO, Nico 24-10-2026: «optimiza toda la landing
 * para SEO, para que podamos aparecer en todo lado»; skill seo-experto). Las arma `scripts/landing/armar-paginas.mjs`
 * desde public/landing y public/internas; el middleware sirve éstas. Si alguien cambia una fuente (o sus textos SEO)
 * y no las vuelve a armar, esta prueba lo dice.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { PAGINAS, IDIOMAS, TEXTOS, urlDe } from '../../../scripts/landing/paginas-seo.mjs'
import { paginaArmada } from '@/lib/seguridad/politica-de-contenido'

const TEXTOS_DE = TEXTOS as Record<string, Record<string, string[]>>
const leer = (idioma: string, salida: string) => readFileSync(join('public', 'paginas', idioma, salida), 'utf8')

describe('las páginas armadas de la landing', () => {
  it('están al día con sus fuentes (si falla: node scripts/landing/armar-paginas.mjs)', () => {
    const r = spawnSync(process.execPath, ['scripts/landing/armar-paginas.mjs', '--revisar'], { encoding: 'utf8' })
    expect(r.stdout + r.stderr).toContain('páginas al día')
    expect(r.status).toBe(0)
  }, 60000)

  it('el middleware sirve cada una en su dirección', () => {
    for (const idioma of IDIOMAS) for (const p of PAGINAS) {
      expect(paginaArmada(p.ruta, idioma as 'es' | 'en')).toBe(`/paginas/${idioma}/${p.salida}`)
    }
  })

  it.each(IDIOMAS.flatMap((i) => PAGINAS.map((p) => [i, p.ruta, p.salida] as const)))(
    '%s%s: su título, canonical, hreflang, JSON-LD y un solo <h1>, en su idioma',
    (idioma, ruta, salida) => {
      const html = leer(idioma, salida)
      const [titulo, descripcion] = TEXTOS_DE[ruta][idioma]
      expect(html).toContain(`<html lang="${idioma}"`)
      expect(html).toContain(`<title>${titulo.replace(/&/g, '&amp;')}</title>`)
      expect(html).toContain(`<meta name="description" content="${descripcion.replace(/"/g, '&quot;')}">`)
      expect(html).toContain(`<link rel="canonical" href="${urlDe(idioma, ruta)}">`)
      for (const [hl, i] of [['es-CO', 'es'], ['en', 'en'], ['x-default', 'es']]) {
        expect(html).toContain(`<link rel="alternate" hreflang="${hl}" href="${urlDe(i, ruta)}">`)
      }
      const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)
      expect(ld).not.toBeNull()
      const tipos = JSON.parse(ld![1])['@graph'].map((n: { '@type': string }) => n['@type'])
      expect(tipos).toEqual(expect.arrayContaining(['Organization', 'WebSite', 'WebPage']))
      const cuerpo = html.slice(html.indexOf('<body'))
      expect(cuerpo.match(/<h1\b/g)?.length).toBe(1)
      // nada de la clase que esconde la página mientras traduce: ya viene en su idioma
      expect(html).not.toContain('lf-traduciendo')
      // los enlaces internos públicos ya llevan su prefijo (sin pasar por la redirección)
      expect(cuerpo).not.toMatch(/href="\/(productos|para|propiedades|avaluo|contacto)(\/|")/)
    },
  )
})
