/**
 * 🔴 GUARDIA: NAIRA VIVE DENTRO DEL MECANISMO DE WORKSPACES, SIN SECCIÓN PARALELA (Fase 13, plan 13-03; FG13-7,
 * FG13-19, D13-1′, D13-3).
 *
 * El criterio 1 del ROADMAP («dentro del AI Hub existente, sin página nueva ni sección paralela») se lee sobre la
 * arquitectura de hoy (R13-1: el hub de tarjetas murió): Naira es un módulo N2 de «Agentes IA» con su workspace
 * registrado, sus dos puertas (la fila con `agente: 'naira'` y el `AGENT_WORKSPACES` con el mismo `basePath`), su
 * intro y su fila en el buscador; no hay una carpeta `naira` en otro lado del App Router y nadie de afuera monta sus
 * componentes ni sus hooks.
 *
 * Por qué hace falta aunque existan los guardianes de arquitectura-del-panel.test.ts: aquéllos miran que cada fila
 * tenga su página y su workspace, pero no que NO haya una segunda entrada de Naira fuera de su base, y
 * agency-nav-filter.test.ts usa su propio fixture (FG13-19): una fila de Naira mal armada no lo pone rojo.
 *
 * Cómo crece: `PESTANAS_DEL_CONTRATO` y `ACCION_POR_RUTA` ya traen las cinco pestañas y las tres fichas del §3.1 del
 * CONTEXT; 13-04..13-07 agregan su pestaña, su clave y su página sin editar este archivo. Marcador [N13:*] en el
 * TÍTULO; los mensajes de `expect` listan a los infractores.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, posix, relative } from 'node:path'

import { Compass } from '@phosphor-icons/react'
import { describe, expect, it } from 'vitest'

import { AGENT_INTROS } from '@/components/tour/AgentIntroModal'
import { ACCIONES_DE_NAIRA } from '@/lib/api/naira/contrato'
import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'

import {
  ARQUITECTURA_DEL_PANEL,
  RUTAS_FUERA_DEL_SIDEBAR,
  grupoDelModulo,
  moduloDeLaRuta,
  modulosDelPanel,
  pestanasDelModulo,
} from './arquitectura-del-panel'
import { AGENT_WORKSPACES, findAgentWorkspace } from './agentWorkspaceNav'
import { RUTA_DE_NAIRA, rutaDeLaSenal } from './rutas-de-naira'

/** (segmento bajo RUTA_DE_NAIRA, acción del módulo `naira`, clave de `inmobiliaria.ai.naira.tabs.*`), en el orden de UI-SPEC §2.3. */
const PESTANAS_DEL_CONTRATO = [
  ['', 'briefing-view', 'briefing'],
  ['seguimiento', 'open-loops-view', 'seguimiento'],
  ['aprobaciones', 'action-view', 'aprobaciones'],
  ['preguntar', 'conversation-ask', 'preguntar'],
  ['memoria', 'memory-view', 'memoria'],
  // P3 (Nico, 15-10-2026): «Qué dice Naira de mí», la de cada persona.
  ['de-mi', 'notify-preferences-edit', 'deMi'],
] as const

/** La acción de lectura de cada ruta del workspace (pantallas y fichas N4), relativa a RUTA_DE_NAIRA. */
const ACCION_POR_RUTA: Readonly<Record<string, string>> = {
  '': 'briefing-view',
  'senales/[promocionId]': 'signal-view',
  seguimiento: 'open-loops-view',
  'seguimiento/[loopId]': 'open-loops-view',
  aprobaciones: 'action-view',
  'aprobaciones/[proposalId]': 'action-view',
  preguntar: 'conversation-ask',
  memoria: 'memory-view',
  // P3: «Qué dice Naira de mí».
  'de-mi': 'notify-preferences-edit',
}

/** Las carpetas de Naira: sus componentes y hooks solo se importan desde acá. */
const RAICES_DE_NAIRA = [
  'src/components/inmobiliaria/naira',
  'src/lib/hooks/naira',
  'src/lib/naira',
  'src/lib/api/naira',
  'src/app/panel/inmobiliaria/reportes/naira',
] as const
/** Lo que nadie de afuera puede montar. */
const PROPIAS_DE_NAIRA = ['src/components/inmobiliaria/naira', 'src/lib/hooks/naira'] as const

const CARPETA_DE_NAIRA = 'src/app/panel/inmobiliaria/reportes/naira'
const RAIZ = process.cwd()

function rel(abs: string): string {
  return relative(RAIZ, abs).split('\\').join('/')
}

function leer(diccionario: unknown, clave: string): unknown {
  return clave.split('.').reduce<unknown>((a, p) => {
    if (a !== null && typeof a === 'object' && Object.hasOwn(a, p)) return (a as Record<string, unknown>)[p]
    return undefined
  }, diccionario)
}

/** Todas las carpetas bajo `dir` (rutas relativas al repo). */
function carpetas(dir: string, salida: string[] = []): string[] {
  for (const e of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
    if (!e.isDirectory()) continue
    const hija = dir + '/' + e.name
    salida.push(hija)
    carpetas(hija, salida)
  }
  return salida
}

/** Todos los archivos bajo `dir` que cumplen `filtro` (rutas relativas al repo). */
function archivos(dir: string, filtro: (nombre: string) => boolean, salida: string[] = []): string[] {
  for (const e of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
    const ruta = dir + '/' + e.name
    if (e.isDirectory()) archivos(ruta, filtro, salida)
    else if (filtro(e.name)) salida.push(ruta)
  }
  return salida
}

// El `from` va partido para que este archivo no se lea a sí mismo como un importador.
const DESDE = 'fr' + 'om'
const PATRONES_DE_IMPORT = [
  new RegExp('\\b' + DESDE + '\\s+[\'"]([^\'"]+)[\'"]', 'g'),
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /^\s*import\s+['"]([^'"]+)['"]/gm,
]

/** El destino de un import, como ruta relativa al repo sin extensión; null si es un paquete. */
function resolver(importador: string, especificador: string): string | null {
  if (especificador.startsWith('@/')) return 'src/' + especificador.slice(2)
  if (especificador.startsWith('.')) return posix.normalize(posix.join(posix.dirname(importador), especificador))
  return null
}

function dentroDe(ruta: string, raiz: string): boolean {
  return ruta === raiz || ruta.startsWith(raiz + '/')
}

/** Los importadores de algo de Naira que viven fuera de las raíces de Naira. */
function infractores(fuentes: readonly { readonly ruta: string; readonly fuente: string }[]): string[] {
  const salida: string[] = []
  for (const { ruta, fuente } of fuentes) {
    if (RAICES_DE_NAIRA.some((r) => dentroDe(ruta, r))) continue
    for (const patron of PATRONES_DE_IMPORT) {
      for (const m of fuente.matchAll(patron)) {
        const destino = resolver(ruta, m[1] ?? '')
        if (destino !== null && PROPIAS_DE_NAIRA.some((r) => dentroDe(destino, r))) salida.push(ruta + ' → ' + m[1])
      }
    }
  }
  return [...new Set(salida)].sort()
}

/** Los importadores de `@/components/inmobiliaria/naira/…` (cualquiera, de adentro o de afuera). */
function importadoresDeComponentes(fuentes: readonly { readonly ruta: string; readonly fuente: string }[]): string[] {
  return fuentes
    .filter(({ ruta, fuente }) =>
      PATRONES_DE_IMPORT.some((patron) =>
        [...fuente.matchAll(patron)].some((m) => {
          const destino = resolver(ruta, m[1] ?? '')
          return destino !== null && dentroDe(destino, 'src/components/inmobiliaria/naira') && !dentroDe(ruta, 'src/components/inmobiliaria/naira')
        }),
      ),
    )
    .map(({ ruta }) => ruta)
}

function fuentesDeSrc(): { readonly ruta: string; readonly fuente: string }[] {
  return archivos('src', (n) => /\.tsx?$/.test(n)).map((ruta) => ({ ruta, fuente: readFileSync(join(RAIZ, ruta), 'utf8') }))
}

function paginasDeNaira(): string[] {
  return archivos(CARPETA_DE_NAIRA, (n) => n === 'page.tsx')
}

const agentes = ARQUITECTURA_DEL_PANEL.find((g) => g.key === 'agentes')!

describe('Naira dentro del mecanismo de workspaces, sin sección paralela', { timeout: 60_000 }, () => {
  it('[N13:sin-seccion-paralela] ninguna carpeta, fila, pantalla ni pestaña de Naira fuera de su base', () => {
    const fuera = carpetas('src/app').filter((c) => c.split('/').pop() === 'naira' && c !== CARPETA_DE_NAIRA)
    expect(fuera, 'carpetas «naira» fuera de ' + CARPETA_DE_NAIRA + ':\n' + fuera.join('\n')).toEqual([])

    const conNaira = modulosDelPanel().filter((m) => m.href.includes('/naira'))
    expect(conNaira.map((m) => m.key)).toEqual(['naira'])
    expect(conNaira[0]!.href).toBe(RUTA_DE_NAIRA)

    const reportes = modulosDelPanel().find((m) => m.key === 'reportes')!
    expect((reportes.pantallas ?? []).length).toBe(2)
    expect(pestanasDelModulo(reportes).filter((p) => p.href.includes('/naira'))).toEqual([])

    const pantallas = modulosDelPanel().flatMap((m) => pestanasDelModulo(m))
    const hrefs = [
      ...pantallas.map((p) => p.href),
      ...AGENT_WORKSPACES.flatMap((w) => [w.basePath, ...w.items.map((i) => i.href)]),
    ]
    const sueltas = hrefs.filter((h) => h.includes('/naira') && !h.startsWith(RUTA_DE_NAIRA))
    expect(sueltas, 'rutas de Naira fuera de su base:\n' + sueltas.join('\n')).toEqual([])
    expect(RUTAS_FUERA_DEL_SIDEBAR.filter((r) => r.includes('naira'))).toEqual([])
  })

  it('[N13:fila-de-naira] UNA fila en «Agentes IA», entre Retención y Desempeño IA, gateada por naira', () => {
    const deNaira = agentes.modulos.filter((m) => m.agente === 'naira')
    expect(deNaira.length).toBe(1)
    const fila = deNaira[0]!
    expect(fila.key).toBe('naira')
    expect(fila.labelKey).toBe('inmobiliaria.ai.nav.naira')
    expect(fila.href).toBe(RUTA_DE_NAIRA)
    expect(fila.icon).toBe(Compass)
    expect(fila.module).toBe('naira')
    expect(fila.scope).toBe('general')
    expect(fila.ia).toBeFalsy()
    expect(fila.hintKey).toBe('inmobiliaria.ai.nav.nairaHint')
    const claves = agentes.modulos.map((m) => m.key)
    // 15-10-2026: Retención (Vinci) se mudó a «Agentes IA» en bugs-nico-1 y va antes de Naira.
    expect(claves[claves.indexOf('naira') - 1]).toBe('retencion')
    expect(claves[claves.indexOf('naira') + 1]).toBe('desempeno-ia')

    const otras = ARQUITECTURA_DEL_PANEL.filter((g) => g.key !== 'agentes')
      .flatMap((g) => g.modulos)
      .flatMap((m) => pestanasDelModulo(m))
      .filter((p) => p.agente === 'naira')
    expect(otras.map((p) => p.href)).toEqual([])

    const dueno = moduloDeLaRuta(RUTA_DE_NAIRA)
    expect(dueno?.key).toBe('naira')
    expect(grupoDelModulo(dueno!)?.key).toBe('agentes')
  })

  it('[N13:workspace-de-naira] UN workspace con la misma base, después de Retención, que no secuestra Reportes', () => {
    const deNaira = AGENT_WORKSPACES.filter((w) => w.slug === 'naira')
    expect(deNaira.length).toBe(1)
    const ws = deNaira[0]!
    expect(ws.basePath).toBe(RUTA_DE_NAIRA)
    expect(ws.module).toBe('naira')
    expect(ws.labelKey).toBe('inmobiliaria.ai.nav.naira')
    expect(findAgentWorkspace(RUTA_DE_NAIRA)?.slug).toBe('naira')
    expect(findAgentWorkspace('/panel/inmobiliaria/reportes')).toBeNull()
    expect(findAgentWorkspace('/panel/inmobiliaria/reportes/ia')).toBeNull()
    const slugs = AGENT_WORKSPACES.map((w) => w.slug)
    // 15-10-2026: la sala de Retención (bugs-nico-1) va antes que la de Naira.
    expect(slugs[slugs.indexOf('naira') - 1]).toBe('retencion')
  })

  it('[N13:pestanas-de-naira] las pestañas son las del contrato, en su orden, cada una con su acción', () => {
    const ws = AGENT_WORKSPACES.find((w) => w.slug === 'naira')!
    const primera = ws.items[0]!
    expect(primera.href).toBe(RUTA_DE_NAIRA)
    expect(primera.exact).toBe(true)
    expect(primera.action).toBe('briefing-view')
    expect(primera.labelKey).toBe('inmobiliaria.ai.naira.tabs.briefing')

    const indices: number[] = []
    const segmentos: string[] = []
    for (const item of ws.items) {
      expect(item.module, item.href).toBe('naira')
      expect((ACCIONES_DE_NAIRA as readonly string[]).includes(item.action ?? ''), item.href).toBe(true)
      const segmento = item.href === RUTA_DE_NAIRA ? '' : item.href.slice(RUTA_DE_NAIRA.length + 1)
      const i = PESTANAS_DEL_CONTRATO.findIndex(([s]) => s === segmento)
      expect(i, 'pestaña fuera del contrato: ' + item.href).toBeGreaterThanOrEqual(0)
      const [, accion, clave] = PESTANAS_DEL_CONTRATO[i]!
      expect(item.action, item.href).toBe(accion)
      expect(item.labelKey, item.href).toBe('inmobiliaria.ai.naira.tabs.' + clave)
      indices.push(i)
      segmentos.push(segmento)
    }
    expect(indices, 'el orden de las pestañas no es el del contrato').toEqual([...indices].sort((a, b) => a - b))
    expect(new Set(segmentos).size).toBe(segmentos.length)
  })

  it('[N13:guard-por-accion] cada página de Naira abre con el guard del módulo naira y la acción de su ruta', () => {
    const paginas = paginasDeNaira()
    const rutas = paginas.map((p) => rel(join(RAIZ, dirname(p))).slice(CARPETA_DE_NAIRA.length).replace(/^\//, ''))
    expect(rutas).toEqual(expect.arrayContaining(['', 'senales/[promocionId]']))
    const malas: string[] = []
    paginas.forEach((pagina, i) => {
      const ruta = rutas[i]!
      const m = /<PageGuard\b([^>]*)>/.exec(readFileSync(join(RAIZ, pagina), 'utf8'))
      const atributos = m?.[1] ?? ''
      const accion = /\baction="([^"]+)"/.exec(atributos)?.[1] ?? null
      const esperada = Object.hasOwn(ACCION_POR_RUTA, ruta) ? ACCION_POR_RUTA[ruta] : null
      const accionOk = esperada !== null ? accion === esperada : accion !== null && (ACCIONES_DE_NAIRA as readonly string[]).includes(accion)
      if (!/\bmodule="naira"/.test(atributos) || !accionOk) malas.push(pagina + ' → ' + (m?.[0] ?? '(sin PageGuard)'))
    })
    expect(malas, 'páginas de Naira sin el guard de su acción real:\n' + malas.join('\n')).toEqual([])
  })

  it('[N13:componentes-solo-desde-naira] nadie fuera de Naira importa sus componentes ni sus hooks', () => {
    const encontrados = infractores(fuentesDeSrc())
    expect(encontrados, 'importan componentes u hooks de Naira desde afuera:\n' + encontrados.join('\n')).toEqual([])
  })

  it('[N13:intro-de-naira] UNA presentación con su texto en es y en y una imagen propia que existe', () => {
    const deNaira = AGENT_INTROS.filter((i) => i.slug === 'naira')
    expect(deNaira.length).toBe(1)
    const intro = deNaira[0]!
    expect(intro.id).toBe('naira')
    for (const clave of [intro.titleKey, intro.descriptionKey]) {
      expect(typeof leer(es, clave), 'es ' + clave).toBe('string')
      expect(typeof leer(en, clave), 'en ' + clave).toBe('string')
    }
    expect(existsSync(join(RAIZ, 'public', intro.image)), intro.image).toBe(true)
    expect(AGENT_INTROS.filter((i) => i.image === intro.image).length).toBe(1)
  })

  it('[N13:ficha-del-workspace] la ficha de una señal es del workspace y del módulo de Naira, dentro de «Agentes IA»', () => {
    const ficha = rutaDeLaSenal('00000000-0000-4000-8000-000000000001')
    expect(findAgentWorkspace(ficha)?.slug).toBe('naira')
    const dueno = moduloDeLaRuta(ficha)
    expect(dueno?.key).toBe('naira')
    expect(grupoDelModulo(dueno!)?.labelKey).toBe('inmobiliaria.nav.secAgentes')
  })

  it('[N13:busqueda-de-naira] el buscador tiene UNA fila de Naira bajo «Agentes IA», gateada por naira, antes de Desempeño IA', () => {
    const lineas = readFileSync(join(RAIZ, 'src/lib/search/sources/navigation-source.ts'), 'utf8').split('\n')
    const deNaira = lineas.map((l, i) => [l, i] as const).filter(([l]) => l.includes('/reportes/naira'))
    expect(deNaira.length).toBe(1)
    const [linea, i] = deNaira[0]!
    expect(linea).toContain("title: 'Naira'")
    expect(linea).toContain("context: 'Agentes IA'")
    expect(linea).toContain("permission: { module: 'naira', action: 'view' }")
    const desempeno = lineas.findIndex((l) => l.includes("title: 'Desempeño IA'"))
    expect(desempeno).toBeGreaterThan(-1)
    expect(i).toBeLessThan(desempeno)
  })

  it('[N13:control-positivo] los recorridos ven lo que hay y el escáner acusa un import de afuera', () => {
    expect(carpetas('src/app')).toContain(CARPETA_DE_NAIRA)
    expect(paginasDeNaira().length).toBeGreaterThanOrEqual(2)
    const fuentes = fuentesDeSrc()
    expect(importadoresDeComponentes(fuentes).length).toBeGreaterThanOrEqual(2)
    const sintetico = {
      ruta: 'src/app/panel/inmobiliaria/piloto/x.tsx',
      fuente: 'import { VistaDeNaira } ' + DESDE + " '@/components/inmobiliaria/naira/VistaDeNaira'\n",
    }
    expect(infractores([sintetico])).toEqual(['src/app/panel/inmobiliaria/piloto/x.tsx → @/components/inmobiliaria/naira/VistaDeNaira'])
    const relativo = { ruta: 'src/components/otra/y.tsx', fuente: 'import { useNairaBriefing } ' + DESDE + " '../../lib/hooks/naira/use-naira-briefing'\n" }
    expect(infractores([relativo]).length).toBe(1)
    const deAdentro = { ruta: 'src/app/panel/inmobiliaria/reportes/naira/z.tsx', fuente: sintetico.fuente }
    expect(infractores([deAdentro])).toEqual([])
  })
})
