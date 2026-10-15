/**
 * destinos-del-drill-down — la etiqueta y el gate de cada destino salen de la navegación REAL del panel (D13-7, P8).
 *
 * Si alguien cambia el módulo de una pantalla en arquitectura-del-panel.ts o agentWorkspaceNav.ts, o 13-01 agrega una
 * ruta a sus mapas, este test lo avisa: el enlace de Naira no puede prometer una pantalla con otro nombre ni saltear el
 * gate que la pantalla aplica.
 */

import { describe, expect, it } from 'vitest'

import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'
import { RUTA_DE_LA_METRICA, RUTA_POR_FUENTE } from '@/lib/naira/fuente-a-ruta'
import { AGENT_WORKSPACES } from '@/lib/nav/agentWorkspaceNav'
import { modulosDelPanel, pestanasDelModulo } from '@/lib/nav/arquitectura-del-panel'

import { DESTINOS_DEL_DRILL_DOWN, destinoDeLaRuta } from './destinos-del-drill-down'

interface EntradaDeNavegacion {
  readonly href: string
  readonly module: string | null | undefined
  readonly roles?: readonly string[]
  readonly labelKey?: string
  readonly de: string
}

/** Todas las entradas de navegación del panel: pestañas de cada módulo, ítems de cada workspace y su raíz. */
function entradasDeNavegacion(): EntradaDeNavegacion[] {
  const salida: EntradaDeNavegacion[] = []
  for (const m of modulosDelPanel()) {
    for (const p of pestanasDelModulo(m)) {
      salida.push({ href: p.href, module: p.module, roles: p.roles, labelKey: p.labelKey, de: 'arquitectura:' + m.labelKey })
    }
  }
  for (const w of AGENT_WORKSPACES) {
    for (const item of w.items) {
      salida.push({ href: item.href, module: item.module, roles: item.roles, labelKey: item.labelKey, de: 'workspace:' + w.slug })
    }
    salida.push({ href: w.basePath, module: w.module, roles: w.roles, de: 'workspace-raiz:' + w.slug })
  }
  return salida
}

function leer(diccionario: unknown, clave: string): unknown {
  return clave.split('.').reduce<unknown>((a, p) => {
    if (a !== null && typeof a === 'object' && Object.hasOwn(a, p)) return (a as Record<string, unknown>)[p]
    return undefined
  }, diccionario)
}

const RUTAS_NO_NULAS = new Set(
  [...Object.values(RUTA_DE_LA_METRICA), ...Object.values(RUTA_POR_FUENTE)].filter((r): r is string => typeof r === 'string'),
)

describe('destinos del drill-down', () => {
  it('[N13:destinos-bicondicional] una entrada por cada ruta no nula de los dos mapas de 13-01, y ninguna más', () => {
    expect(RUTAS_NO_NULAS.size).toBeGreaterThan(0)
    expect([...Object.keys(DESTINOS_DEL_DRILL_DOWN)].sort()).toEqual([...RUTAS_NO_NULAS].sort())
  })

  it('[N13:destinos-del-panel] el módulo y los roles son los de la entrada de prefijo más largo, y la etiqueta es la del panel', () => {
    const entradas = entradasDeNavegacion()
    expect(entradas.length).toBeGreaterThan(20)
    for (const [ruta, destino] of Object.entries(DESTINOS_DEL_DRILL_DOWN)) {
      const candidatas = entradas.filter((e) => e.href === ruta || ruta.startsWith(e.href + '/'))
      expect(candidatas.length, ruta + ': sin entrada de navegación').toBeGreaterThan(0)
      const largo = Math.max(...candidatas.map((e) => e.href.length))
      const masLargas = candidatas.filter((e) => e.href.length === largo)
      for (const e of masLargas) {
        expect(e.module, ruta + ' (' + e.de + ')').toBe(destino.modulo)
        expect([...(e.roles ?? [])], ruta + ' (' + e.de + '): los roles no son los del destino').toEqual([...(destino.roles ?? [])])
      }
      const exactas = candidatas.filter((e) => e.href === ruta && typeof e.labelKey === 'string')
      if (exactas.length > 0) {
        expect(
          exactas.map((e) => e.labelKey),
          ruta + ': la etiqueta no es la del panel',
        ).toContain(destino.etiquetaKey)
      }
      for (const [idioma, diccionario] of [['es', es], ['en', en]] as const) {
        const texto = leer(diccionario, destino.etiquetaKey)
        expect(typeof texto === 'string' && texto.trim().length > 0, idioma + ': ' + destino.etiquetaKey).toBe(true)
      }
    }
  })

  it('[N13:sin-href-del-agente] una ruta desconocida u hostil no tiene destino', () => {
    const hostiles = [
      'constructor',
      '__proto__',
      'toString',
      'javascript:alert(1)',
      'https://evil.test',
      '',
      '/panel/inmobiliaria/pagos/cartera/../x',
    ]
    for (const h of hostiles) expect(destinoDeLaRuta(h), h).toBeNull()
  })

  it('[N13:control-positivo] Cartera se abre con el gate de cobros y se llama como en el sidebar', () => {
    expect(destinoDeLaRuta('/panel/inmobiliaria/pagos/cartera')).toEqual({ etiquetaKey: 'inmobiliaria.nav.cartera', modulo: 'cobros' })
  })
})
