/**
 * "Mi tope de arriendo" — the result of the free document study (T-0193).
 *
 * What is protected here is not markup, it is the rules of the experience:
 *  · the figure is the back's `canonMaximoCop`, verbatim, framed as "the range
 *    where you have better chances of being accepted" — never as insurer backing
 *  · no verified income → never a number, never "$0"
 *  · a deposit condition is never shown (Ley 820 art. 16)
 *  · no insurer / payment wording in any state
 *  · empty state teaches the path BEFORE asking for data
 *  · expired and failed studies each have their own way out
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { hookMock } = vi.hoisted(() => ({ hookMock: vi.fn() }))

vi.mock('@/lib/hooks/use-estudio-de-canon', () => ({
  useEstudioDeCanon: () => hookMock(),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: 'es' }),
  useOptionalI18n: () => ({ t: (key: string) => key, locale: 'es' }),
}))

import AprobacionPage from './page'
import type { EstudioDeCanon, ResultadoDelEstudio } from '@/lib/api/estudio-de-canon.types'

let container: HTMLDivElement
let root: Root

const RESULTADO: ResultadoDelEstudio = {
  canonMaximoCop: 2_450_000,
  ingresoVerificadoCop: 7_500_000,
  letra: 'B',
  puntaje: 71,
  veredicto: 'FACIL',
  condiciones: [],
  explicacion: ['Tu ingreso se verificó con tu extracto.'],
  revisiones: [],
  conHistorial: false,
}

function futuro(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString()
}

function estudio(parcial: Partial<EstudioDeCanon>): EstudioDeCanon {
  return {
    id: 'e1',
    status: 'COMPLETED',
    creadoEl: null,
    terminadoEl: null,
    venceEl: futuro(150),
    documentos: [],
    faltan: [],
    resultado: RESULTADO,
    error: null,
    ...parcial,
  }
}

function montar(
  estado: Partial<{ estudio: EstudioDeCanon | null; isLoading: boolean; error: string | null }> = {},
) {
  hookMock.mockReturnValue({ estudio: null, isLoading: false, error: null, refetch: vi.fn(), setEstudio: vi.fn(), ...estado })
  act(() => {
    root.render(<AprobacionPage />)
  })
}

const q = (sel: string) => container.querySelector(sel) as HTMLElement | null
const texto = () => container.textContent ?? ''
const hrefs = () => Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  hookMock.mockReset()
  window.sessionStorage.clear()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('/inquilino/aprobacion — el resultado del estudio', () => {
  it('cargando: esqueleto con aria-busy', () => {
    montar({ isLoading: true })
    expect(q('[data-testid="aprobacion-cargando"]')?.getAttribute('aria-busy')).toBe('true')
  })

  it('error de red: pantalla de fallo con reintento, no un vacío', () => {
    montar({ error: 'Sin conexión' })
    expect(q('[data-testid="estudio-vacio"]')).toBeNull()
    expect(texto()).toContain('Sin conexión')
  })

  describe('listo', () => {
    it('muestra el tope del back tal cual, enmarcado como rango y no como respaldo', () => {
      montar({ estudio: estudio({}) })
      const resultado = q('[data-testid="resultado-del-estudio"]')!
      expect(resultado.textContent).toMatch(/2\.450\.000/)
      expect(resultado.textContent).toMatch(/mejores posibilidades de que te acepten/i)
      expect(resultado.textContent).toMatch(/gu[ií]a, no una promesa/i)
    })

    it('muestra la letra y el puntaje del buró con salida a Mi calificación', () => {
      montar({ estudio: estudio({}) })
      expect(q('[data-testid="calificacion-del-estudio"]')?.textContent).toContain('B · 71/100')
      expect(hrefs()).toContain('/inquilino/calificacion')
    })

    it('las condiciones del buró se listan', () => {
      montar({ estudio: estudio({ resultado: { ...RESULTADO, condiciones: ['Un codeudor con ingresos comprobables'] } }) })
      expect(q('[data-testid="condiciones-del-estudio"]')?.textContent).toContain('Un codeudor con ingresos comprobables')
    })

    it('un depósito NUNCA se muestra como condición (Ley 820 art. 16)', () => {
      montar({
        estudio: estudio({
          resultado: { ...RESULTADO, condiciones: ['Depósito adicional de un mes', 'Un fiador'] },
        }),
      })
      const condiciones = q('[data-testid="condiciones-del-estudio"]')!.textContent ?? ''
      expect(condiciones).toContain('Un fiador')
      expect(texto()).not.toMatch(/dep[oó]sito/i)
    })

    it('sin condiciones, la sección no aparece', () => {
      montar({ estudio: estudio({}) })
      expect(q('[data-testid="condiciones-del-estudio"]')).toBeNull()
    })

    it('las revisiones (identidad / documento alterado) se dicen, no se esconden', () => {
      montar({
        estudio: estudio({
          resultado: { ...RESULTADO, revisiones: [{ codigo: 'IDENTIDAD', texto: 'El nombre del extracto no coincide con tu cédula.' }] },
        }),
      })
      expect(q('[data-testid="revisiones-del-estudio"]')?.textContent).toContain('no coincide con tu cédula')
    })

    it('la explicación del buró se ofrece como detalle', () => {
      montar({ estudio: estudio({}) })
      expect(q('[data-testid="explicacion-del-estudio"]')?.textContent).toContain('Tu ingreso se verificó')
    })

    it('muestra hasta cuándo vale el estudio y no pinta la línea si venceEl es null', () => {
      montar({ estudio: estudio({ venceEl: futuro(150) }) })
      expect(q('[data-testid="vigencia-del-estudio"]')?.textContent).toMatch(/Vigente hasta/)
      act(() => root.unmount())
      root = createRoot(container)
      montar({ estudio: estudio({ venceEl: null }) })
      expect(q('[data-testid="vigencia-del-estudio"]')).toBeNull()
    })

    it('lleva al catálogo filtrado y a las postulaciones', () => {
      montar({ estudio: estudio({}) })
      expect(hrefs()).toEqual(expect.arrayContaining(['/inquilino/para-ti', '/inquilino/aplicaciones']))
    })
  })

  describe('sin ingreso verificado', () => {
    it('canonMaximoCop null: dice que no se pudo verificar y NO pinta ningún número', () => {
      montar({ estudio: estudio({ resultado: { ...RESULTADO, canonMaximoCop: null, veredicto: 'REVISAR' } }) })
      expect(q('[data-testid="estudio-sin-ingreso"]')).not.toBeNull()
      expect(q('[data-testid="resultado-del-estudio"]')).toBeNull()
      expect(texto()).toMatch(/no pudimos verificar tu ingreso/i)
      expect(texto()).not.toMatch(/\$\s?0\b/)
      expect(hrefs()).toContain('/aprobacion?repetir=1')
    })

    it('un estudio terminado sin resultado tampoco inventa un número', () => {
      montar({ estudio: estudio({ resultado: null }) })
      expect(q('[data-testid="estudio-sin-ingreso"]')).not.toBeNull()
    })
  })

  describe('vencido', () => {
    it('pasada la vigencia no se presenta el tope como vigente y ofrece repetir', () => {
      montar({ estudio: estudio({ venceEl: futuro(-3) }) })
      expect(q('[data-testid="estudio-vencido"]')).not.toBeNull()
      expect(q('[data-testid="resultado-del-estudio"]')).toBeNull()
      expect(texto()).not.toMatch(/2\.450\.000/)
      expect(hrefs()).toContain('/aprobacion?repetir=1')
    })
  })

  describe('en proceso / borrador / fallido', () => {
    it('en proceso: tranquiliza y dice que puede volver o recargar', () => {
      montar({ estudio: estudio({ status: 'PROCESSING', resultado: null, venceEl: null }) })
      expect(q('[data-testid="estudio-en-proceso"]')?.textContent).toMatch(/recargar la página/i)
    })

    it('borrador: ofrece continuar el estudio', () => {
      montar({ estudio: estudio({ status: 'DRAFT', resultado: null, venceEl: null }) })
      expect(q('[data-testid="estudio-borrador"]')).not.toBeNull()
      expect(hrefs()).toContain('/aprobacion')
    })

    it('fallido: muestra el mensaje del back y ofrece intentar de nuevo', () => {
      montar({
        estudio: estudio({
          status: 'FAILED',
          resultado: null,
          venceEl: null,
          error: {
            codigo: 'EXTRACTO_ILEGIBLE',
            mensaje: 'No pudimos leer tu extracto bancario.',
            documentoConError: 'extracto_bancario',
            accion: 'REEMPLAZAR_DOCUMENTO',
            reintentosRestantes: 3,
          },
        }),
      })
      expect(q('[data-testid="estudio-fallido"]')?.textContent).toContain('No pudimos leer tu extracto bancario.')
      expect(hrefs()).toContain('/aprobacion')
    })
  })

  describe('sin estudio', () => {
    it('enseña el camino ANTES de pedir datos y lleva a /aprobacion', () => {
      montar({ estudio: null })
      expect(q('[data-testid="estudio-vacio"]')).not.toBeNull()
      expect(texto()).toMatch(/Subes tus documentos/)
      expect(hrefs()).toContain('/aprobacion')
    })
  })

  describe('reglas de producto', () => {
    const estados: Array<[string, Partial<EstudioDeCanon> | null]> = [
      ['sin estudio', null],
      ['listo', {}],
      ['sin ingreso', { resultado: { ...RESULTADO, canonMaximoCop: null } }],
      ['vencido', { venceEl: futuro(-3) }],
      ['en proceso', { status: 'PROCESSING', resultado: null }],
      ['borrador', { status: 'DRAFT', resultado: null }],
      ['fallido', { status: 'FAILED', resultado: null, error: { codigo: 'ESTUDIO_FALLIDO', mensaje: 'No pudimos terminar.', documentoConError: null, accion: 'REINTENTAR', reintentosRestantes: 3 } }],
    ]
    it.each(estados)('«%s» no habla de aseguradoras, aseguradoras con nombre, pagos ni depósitos', (_nombre, parcial) => {
      montar({ estudio: parcial === null ? null : estudio(parcial) })
      expect(texto()).not.toMatch(/asegurador|sura\b|mapfre|fianly|fianli|wompi|dep[oó]sito|asegurabilidad/i)
    })

    it('no queda ninguna pieza del flujo de pago o de la validación por WhatsApp', () => {
      montar({ estudio: estudio({ status: 'PROCESSING', resultado: null }) })
      expect(q('[data-testid="validacion-por-whatsapp"]')).toBeNull()
      expect(texto()).not.toMatch(/whatsapp/i)
    })
  })
})
