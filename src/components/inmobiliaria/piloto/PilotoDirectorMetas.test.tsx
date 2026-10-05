/**
 * Las metas del director (fase 1, decisión 11) con dobles de la API.
 *
 *  1. Las cinco metas con línea base, objetivo, cómo va hoy, la mini serie y
 *     su estado.
 *  2. 🔴 Horas ahorradas dice SIEMPRE «estimado».
 *  3. Aceptar / ajustar / pausar: SÓLO un administrador; los botones dependen
 *     del estado de la meta.
 *  4. El 422 de «ajustar» se lee debajo del campo, con la frase del micro.
 *  5. El historial va plegado.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toasts } = vi.hoisted(() => ({ toasts: [] as Array<[string, string]> }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toasts.push(['success', m]),
    error: (m: string) => toasts.push(['error', m]),
  },
}))

import { PilotoDirectorMetas } from './PilotoDirectorMetas'
import { normalizarMetas, type ResultadoDeMeta } from '@/lib/api/piloto-director'
import type { LecturaDelDirector } from '@/lib/hooks/piloto/use-piloto-director'
import type { DirectorMetas } from '@/lib/api/piloto-director'

const serie = (valores: number[]) => valores.map((valor, i) => ({ fecha: `2026-09-${String(i + 1).padStart(2, '0')}`, valor }))

const CINCO = normalizarMetas({
  encendido: true,
  metas: [
    {
      id: 'm-1', metrica: 'recaudo_a_tiempo', nombre: 'Recaudo a tiempo', estado: 'propuesta', direccion: 'subir',
      unidad: 'porcentaje', lineaBase: 0.84, objetivo: 0.88, actual: 0.86, desde: '2026-09-29', hasta: '2026-12-28',
      estimada: false, porQue: 'Tu mediana de los últimos 90 días es 84 %.', serie: serie([0.83, 0.85, 0.86]),
      historial: [{ en: '2026-09-29T10:00:00.000Z', quien: 'Piloto', que: 'propuso', objetivo: 0.88 }],
    },
    {
      id: 'm-2', metrica: 'mora_30', nombre: 'Mora de más de 30 días', estado: 'activa', direccion: 'bajar',
      unidad: 'porcentaje', lineaBase: 0.12, objetivo: 0.1, actual: 0.11, hasta: '2026-12-28', serie: [], historial: [],
    },
    {
      id: 'm-3', metrica: 'dias_vacancia', nombre: 'Días de vacancia', estado: 'pausada', direccion: 'bajar',
      unidad: 'dias', lineaBase: 38, objetivo: 30, actual: 36, serie: [], historial: [],
    },
    {
      id: 'm-4', metrica: 'renovacion', nombre: 'Renovación', estado: 'cumplida', direccion: 'subir',
      unidad: 'porcentaje', lineaBase: 0.6, objetivo: 0.65, actual: 0.67, serie: [], historial: [],
    },
    {
      // Sin la bandera: la pantalla igual dice «estimado».
      id: 'm-5', metrica: 'horas_ahorradas', nombre: 'Horas ahorradas', estado: 'activa', direccion: 'subir',
      unidad: 'horas', lineaBase: 20, objetivo: 40, actual: 26, serie: [], historial: [],
    },
  ],
})

function lectura(extra: Partial<LecturaDelDirector<DirectorMetas>> = {}): LecturaDelDirector<DirectorMetas> {
  return { data: CINCO, isLoading: false, error: null, notAvailable: false, refetch: vi.fn(async () => {}), ...extra }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  toasts.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(
  { isAdmin = true, onActuar = vi.fn(async (): Promise<ResultadoDeMeta> => ({ ok: false, status: 500, error: 'x' })), l = lectura() } = {},
) {
  act(() => {
    root.render(<PilotoDirectorMetas lectura={l} isAdmin={isAdmin} enVuelo={null} onActuar={onActuar} />)
  })
  return { onActuar }
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`)
const boton = (testid: string) => q(testid) as HTMLButtonElement | null

/** Escribe en un <input> controlado de React (dispara su onChange). */
function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, valor)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('PilotoDirectorMetas — lo que se ve', () => {
  it('las cinco metas, con línea base, objetivo y cómo va hoy en su unidad', () => {
    render()
    expect(container.querySelectorAll('[data-testid^="piloto-director-meta-"][data-testid$="-lineaBase"]')).toHaveLength(5)
    expect(q('piloto-director-meta-recaudo_a_tiempo-lineaBase')?.textContent).toMatch(/^84\s?%$/)
    expect(q('piloto-director-meta-recaudo_a_tiempo-objetivo')?.textContent).toMatch(/^88\s?%$/)
    expect(q('piloto-director-meta-recaudo_a_tiempo-actual')?.textContent).toMatch(/^86\s?%$/)
    expect(q('piloto-director-meta-dias_vacancia-objetivo')?.textContent).toBe('30 días')
    expect(q('piloto-director-meta-horas_ahorradas-actual')?.textContent).toBe('26 h')
    expect(q('piloto-director-meta-recaudo_a_tiempo')?.textContent).toContain('inmobiliaria.piloto.director.metas.estado.propuesta')
    expect(q('piloto-director-meta-recaudo_a_tiempo')?.textContent).toContain('Tu mediana de los últimos 90 días es 84 %.')
  })

  it('la mini serie se dibuja cuando hay al menos dos puntos', () => {
    render()
    expect(q('piloto-director-meta-serie-recaudo_a_tiempo')?.tagName.toLowerCase()).toBe('svg')
    expect(q('piloto-director-meta-serie-mora_30')).toBeNull()
  })

  it('🔴 horas ahorradas dice «estimado» siempre (y ninguna otra meta lo dice)', () => {
    render()
    expect(q('piloto-director-meta-estimado-horas_ahorradas')?.textContent).toBe('inmobiliaria.piloto.director.metas.estimado')
    expect(q('piloto-director-meta-horas_ahorradas')?.textContent).toContain('inmobiliaria.piloto.director.metas.estimadoPorQue')
    expect(container.querySelectorAll('[data-testid^="piloto-director-meta-estimado-"]')).toHaveLength(1)
  })

  it('el historial va plegado, con quién y qué', () => {
    render()
    const h = q('piloto-director-meta-historial-recaudo_a_tiempo') as HTMLDetailsElement
    expect(h.tagName).toBe('DETAILS')
    expect(h.open).toBe(false)
    expect(h.textContent).toContain('Piloto')
    expect(h.textContent).toContain('inmobiliaria.piloto.director.metas.hito.propuso')
  })

  it('🔴 dice cuántas metas propone DE VERDAD y cuáles faltan por falta de historia (no «cinco»)', () => {
    render({ l: lectura({ data: { ...CINCO, sinMeta: [{ metrica: 'renovacion', nombre: 'Renovación' }, { metrica: 'pqrs_en_plazo', nombre: 'PQRS en plazo' }] } }) })
    const texto = q('piloto-director-metas-que-es')?.textContent ?? ''
    expect(texto).toContain(`inmobiliaria.piloto.director.metas.queEsVarias(${CINCO.metas.length})`)
    expect(texto).toContain('inmobiliaria.piloto.director.metas.sinHistoria(renovación y PQRS en plazo)')
    render({ l: lectura({ data: { ...CINCO, metas: CINCO.metas.slice(0, 1), sinMeta: [] } }) })
    expect(q('piloto-director-metas-que-es')?.textContent).toBe('inmobiliaria.piloto.director.metas.queEsUna')
  })

  it('apagado, sin fuente, error y vacío se dicen cada uno a su manera', () => {
    render({ l: lectura({ data: { encendido: false, metas: [] } }) })
    expect(q('piloto-director-metas-apagado')).not.toBeNull()
    render({ l: lectura({ data: null, notAvailable: true }) })
    expect(q('piloto-director-metas-sin-fuente')).not.toBeNull()
    render({ l: lectura({ data: null, error: new Error('503') }) })
    expect(q('fallo-de-carga')).not.toBeNull()
    render({ l: lectura({ data: { encendido: true, metas: [] } }) })
    expect(q('piloto-director-metas-vacia')).not.toBeNull()
  })
})

describe('PilotoDirectorMetas — permisos por rol', () => {
  it('quien no es administrador ve las metas pero ningún botón, y por qué', () => {
    render({ isAdmin: false })
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(q('piloto-director-metas-solo-admin')?.textContent).toContain('inmobiliaria.piloto.director.metas.soloAdmin')
  })

  it('el administrador: propuesta → aceptar/ajustar; activa → ajustar/pausar; pausada → reactivar; cumplida → nada', () => {
    render()
    expect(boton('piloto-director-meta-aceptar-recaudo_a_tiempo')).not.toBeNull()
    expect(boton('piloto-director-meta-ajustar-recaudo_a_tiempo')).not.toBeNull()
    expect(boton('piloto-director-meta-pausar-recaudo_a_tiempo')).toBeNull()

    expect(boton('piloto-director-meta-aceptar-mora_30')).toBeNull()
    expect(boton('piloto-director-meta-pausar-mora_30')).not.toBeNull()

    expect(boton('piloto-director-meta-aceptar-dias_vacancia')?.textContent).toBe('inmobiliaria.piloto.director.metas.reactivar')

    expect(boton('piloto-director-meta-aceptar-renovacion')).toBeNull()
    expect(boton('piloto-director-meta-ajustar-renovacion')).toBeNull()
  })

  it('aceptar llama al micro y avisa', async () => {
    const onActuar = vi.fn(async (): Promise<ResultadoDeMeta> => ({ ok: true, meta: CINCO.metas[0]! }))
    render({ onActuar })
    await act(async () => boton('piloto-director-meta-aceptar-recaudo_a_tiempo')!.click())
    expect(onActuar).toHaveBeenCalledWith('m-1', 'aceptar', undefined)
    expect(toasts).toEqual([['success', 'inmobiliaria.piloto.director.metas.toast.aceptar(Recaudo a tiempo)']])
  })
})

describe('PilotoDirectorMetas — ajustar', () => {
  it('el campo se abre en la unidad que se lee (88, no 0,88) y manda la del micro (0,9)', async () => {
    const onActuar = vi.fn(async (): Promise<ResultadoDeMeta> => ({ ok: true, meta: CINCO.metas[0]! }))
    render({ onActuar })
    await act(async () => boton('piloto-director-meta-ajustar-recaudo_a_tiempo')!.click())
    const campo = q('piloto-director-meta-campo-recaudo_a_tiempo') as HTMLInputElement
    expect(campo.value).toBe('88')
    await act(async () => escribir(campo, '90'))
    await act(async () => boton('piloto-director-meta-guardar-recaudo_a_tiempo')!.click())
    expect(onActuar).toHaveBeenCalledWith('m-1', 'ajustar', 0.9)
    expect(q('piloto-director-meta-form-recaudo_a_tiempo')).toBeNull()
  })

  it('🔴 el 422 se lee debajo del campo, con la frase del micro', async () => {
    const onActuar = vi.fn(
      async (): Promise<ResultadoDeMeta> => ({
        ok: false,
        status: 422,
        error: 'objetivo_invalido',
        mensaje: 'El recaudo a tiempo no puede pasar del 100 %.',
      }),
    )
    render({ onActuar })
    await act(async () => boton('piloto-director-meta-ajustar-recaudo_a_tiempo')!.click())
    await act(async () => escribir(q('piloto-director-meta-campo-recaudo_a_tiempo') as HTMLInputElement, '120'))
    await act(async () => boton('piloto-director-meta-guardar-recaudo_a_tiempo')!.click())
    expect(onActuar).toHaveBeenCalledWith('m-1', 'ajustar', 1.2)
    const error = q('piloto-director-meta-error-recaudo_a_tiempo')
    expect(error?.getAttribute('role')).toBe('alert')
    expect(error?.textContent).toBe('El recaudo a tiempo no puede pasar del 100 %.')
    // El formulario sigue abierto para corregir; no hubo toast que se va.
    expect(q('piloto-director-meta-form-recaudo_a_tiempo')).not.toBeNull()
    expect(toasts).toEqual([])
  })

  it('algo que no es un número no sale al micro', async () => {
    const { onActuar } = render()
    await act(async () => boton('piloto-director-meta-ajustar-mora_30')!.click())
    await act(async () => escribir(q('piloto-director-meta-campo-mora_30') as HTMLInputElement, 'mucho'))
    await act(async () => boton('piloto-director-meta-guardar-mora_30')!.click())
    expect(onActuar).not.toHaveBeenCalled()
    expect(q('piloto-director-meta-error-mora_30')?.textContent).toBe('inmobiliaria.piloto.director.metas.escribeUnNumero')
  })

  it('un 403 dice que sólo un administrador puede', async () => {
    const onActuar = vi.fn(async (): Promise<ResultadoDeMeta> => ({ ok: false, status: 403, error: 'solo_admin' }))
    render({ onActuar })
    await act(async () => boton('piloto-director-meta-pausar-mora_30')!.click())
    expect(toasts).toEqual([['error', 'inmobiliaria.piloto.director.metas.soloAdmin']])
  })
})
