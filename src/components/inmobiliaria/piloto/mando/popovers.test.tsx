/**
 * Los orbes que reaccionan (Nico, 05-10-2026 19:30, ajustado a las 21:48 y
 * 21:55): pasar el puntero o el foco del teclado NO abre nada, el elemento
 * reacciona; el CLIC abre el panel y otro clic o Esc lo cierran (sin volver a
 * abrirse); en la tripulación hay UN solo panel. El botón del agente usa las
 * MISMAS llamadas de Autonomía, dice el error en palabras, se apaga para quien
 * no puede y no ejecuta en la muestra.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
void React

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
const toast = vi.hoisted(() => ({ info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock('sonner', () => ({ toast }))
const api = vi.hoisted(() => ({ putPilotoGobierno: vi.fn(), fetchPilotoGobierno: vi.fn() }))
vi.mock('@/lib/api/piloto', async (original) => ({ ...(await original<object>()), ...api }))
// La confirmación de Automático tiene sus pruebas (`ConfirmarAutomatico.test.tsx`): aquí, un doble que dice si se abrió.
vi.mock('@/components/inmobiliaria/piloto/ConfirmarAutomatico', () => ({
  pideSegundoFactor: () => false,
  ConfirmarAutomatico: (p: { abierto: boolean; quien: string }) => (p.abierto ? <div data-testid="confirmar-automatico">{p.quien}</div> : null),
}))
vi.mock('@/components/inmobiliaria/piloto/PilotoAutonomia', () => ({ AGENTES_NO_DISPONIBLES: new Set(['retencion']) }))

import { AuthContext } from '@/lib/auth/auth-context'
import type { UsePilotoAutonomiaResult } from '@/lib/hooks/piloto/use-piloto-autonomia'

import type { MiembroDeLaTripulacion } from './calculos'
import { controlDeLaMuestra, useControlDeAgentes, type ControlDeAgentes } from './control-de-agentes'
import { indicadoresDelMando } from './indicadores'
import { crearMuestra } from './muestra'
import { OrbeDelPilotoConPopover, TripulanteConPopover } from './popovers'
import { Tripulacion } from './DireccionCabina'
import type { DatosDelMando, Pieza } from './tipos'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.clearAllMocks()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const laura: MiembroDeLaTripulacion = {
  agente: 'cobranza',
  modo: 'copiloto',
  corre: true,
  actua: true,
  porQueNoCorre: null,
  efectoReal: 'Laura prepara cada llamada y te la deja con un clic.',
  ultimo: { id: 'x', at: new Date(Date.now() - 3_600_000).toISOString(), agente: 'cobranza', tipo: 'llamada', titulo: 'Laura llamó a Camila Ejemplo' },
  trabajando: false,
}

function control(p: Partial<ControlDeAgentes> = {}): ControlDeAgentes {
  return {
    esMuestra: false,
    puedeCambiar: true,
    porQueNo: null,
    ocupado: null,
    error: null,
    sePuedeEncender: () => ({ si: true, porQueNo: null }),
    tieneModo: () => true,
    alAbrir: vi.fn(),
    encender: vi.fn(async () => undefined),
    cambiarModo: vi.fn(async () => undefined),
    ...p,
  }
}

/** React arma `onPointerEnter` con `pointerover` (desde fuera del elemento). */
function entraElPuntero(el: Element) {
  const Ctor = (globalThis.PointerEvent ?? MouseEvent) as typeof MouseEvent
  const e = new Ctor('pointerover', { bubbles: true, cancelable: true, relatedTarget: document.body } as MouseEventInit)
  Object.defineProperty(e, 'pointerType', { value: 'mouse' })
  act(() => {
    el.dispatchEvent(e)
  })
}

const popover = (testid: string) => document.body.querySelector(`[data-testid="${testid}"]`)
const disparador = (testid: string) => container.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement

describe('la tarjeta de un agente', () => {
  it('al pasar el puntero NO abre: la tarjeta reacciona; el clic abre con lo que hace, su modo, lo último y lo de hoy', () => {
    act(() => root.render(<TripulanteConPopover m={laura} pilotoEncendido accionesHoy={8} control={control()} />))
    const tarjeta = disparador('tripulante-cobranza')
    entraElPuntero(tarjeta)
    expect(popover('popover-agente-cobranza')).toBeNull()
    expect(tarjeta.getAttribute('data-despierto')).toBe('true')
    act(() => tarjeta.click())
    const p = popover('popover-agente-cobranza')
    expect(p).not.toBeNull()
    expect(p?.getAttribute('aria-label')).toContain('Laura')
    const texto = p?.textContent ?? ''
    expect(texto).toContain('Qué hace')
    expect(texto).toContain('Su modo · Copiloto')
    expect(texto).toContain('Laura prepara cada llamada')
    expect(texto).toContain('Laura llamó a Camila Ejemplo')
    expect(texto).toContain('8 acciones')
  })

  it('el foco del teclado tampoco abre; otro clic cierra; Esc cierra y NO se vuelve a abrir', () => {
    act(() => root.render(<TripulanteConPopover m={laura} pilotoEncendido accionesHoy={null} control={control()} />))
    const tarjeta = disparador('tripulante-cobranza')
    act(() => tarjeta.focus())
    expect(popover('popover-agente-cobranza')).toBeNull()
    expect(tarjeta.getAttribute('data-despierto')).toBe('true')
    act(() => tarjeta.click())
    expect(popover('popover-agente-cobranza')).not.toBeNull()
    // Sin dato de hoy, no se dice nada de hoy.
    expect(popover('popover-agente-cobranza')?.textContent).not.toContain('acciones')
    act(() => tarjeta.click())
    expect(popover('popover-agente-cobranza')).toBeNull()
    act(() => tarjeta.click())
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    // Radix devuelve el foco a la tarjeta: antes eso lo volvía a abrir.
    act(() => tarjeta.focus())
    expect(popover('popover-agente-cobranza')).toBeNull()
  })

  it('«Desactivar» y el modo llaman al control; el error se dice en palabras', () => {
    const c = control({ error: { agente: 'cobranza', mensaje: 'No se pudo apagar el agente. Intenta de nuevo.' } })
    act(() => root.render(<TripulanteConPopover m={laura} pilotoEncendido accionesHoy={null} control={c} />))
    act(() => disparador('tripulante-cobranza').click())
    const cta = popover('popover-agente-cobranza-cta') as HTMLButtonElement
    expect(cta.textContent).toContain('Desactivar')
    act(() => cta.click())
    expect(c.encender).toHaveBeenCalledWith('cobranza', 'Laura', false)
    const radio = [...document.body.querySelectorAll('[role="radio"]')].find((r) => r.textContent === 'Manual') as HTMLElement
    act(() => radio.click())
    expect(c.cambiarModo).toHaveBeenCalledWith('cobranza', 'Laura', 'sombra')
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('No se pudo apagar el agente')
  })

  it('para quien no puede cambiar agentes: el botón y el modo apagados, con el porqué', () => {
    const c = control({ puedeCambiar: false, porQueNo: 'Sólo un administrador de tu inmobiliaria puede activarlo, apagarlo o cambiarle el modo.' })
    act(() => root.render(<TripulanteConPopover m={laura} pilotoEncendido accionesHoy={null} control={c} />))
    act(() => disparador('tripulante-cobranza').click())
    const cta = popover('popover-agente-cobranza-cta') as HTMLButtonElement
    expect(cta.disabled).toBe(true)
    expect(popover('popover-agente-cobranza')?.textContent).toContain('Sólo un administrador')
    act(() => cta.click())
    expect(c.encender).not.toHaveBeenCalled()
  })

  it('apagado por Leasefy: «Activar» apagado y dice por qué', () => {
    const vinci = { ...laura, agente: 'retencion', corre: false, actua: false, porQueNoCorre: 'Leasefy lo tiene apagado por ahora.' }
    const c = control({ sePuedeEncender: () => ({ si: false, porQueNo: 'Apagado por ahora: lo prende Leasefy.' }) })
    act(() => root.render(<TripulanteConPopover m={vinci} pilotoEncendido accionesHoy={null} control={c} />))
    act(() => disparador('tripulante-retencion').click())
    const cta = popover('popover-agente-retencion-cta') as HTMLButtonElement
    expect(cta.textContent).toContain('Activar')
    expect(cta.disabled).toBe(true)
    expect(popover('popover-agente-retencion')?.textContent).toContain('lo prende Leasefy')
  })

  it('en la muestra el botón no ejecuta: avisa que es la muestra', async () => {
    act(() => root.render(<TripulanteConPopover m={laura} pilotoEncendido accionesHoy={null} control={controlDeLaMuestra()} />))
    act(() => disparador('tripulante-cobranza').click())
    await act(async () => (popover('popover-agente-cobranza-cta') as HTMLButtonElement).click())
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Es la muestra'))
    expect(api.putPilotoGobierno).not.toHaveBeenCalled()
  })
})

describe('la tripulación: un solo panel y las tarjetas iguales', () => {
  const lista = <T,>(data: T): Pieza<T> => ({ data, isLoading: false, error: null, notAvailable: false })
  function datos(): DatosDelMando {
    const m = crearMuestra(Date.now())
    return {
      fuente: 'muestra',
      limiteDeActividad: 50,
      pulso: lista(m.pulso),
      bandeja: lista({ items: m.bandeja.items, total: m.bandeja.total, porPrioridad: m.bandeja.porPrioridad }),
      actividad: lista(m.actividad),
      briefing: lista(m.briefing),
      flota: lista(m.flota),
      hoy: lista(m.hoy),
      metas: lista(m.metas),
    }
  }
  const paneles = () => document.body.querySelectorAll('[data-testid^="popover-agente-"][role="dialog"]').length

  it('abrir otro agente cierra el primero: nunca dos paneles', () => {
    const d = datos()
    const ind = indicadoresDelMando(d, Date.now())
    act(() => root.render(<Tripulacion ind={ind} datos={d} acciones={{ abrirItem: vi.fn(), abrirAlerta: vi.fn(), agentes: control() }} />))
    const tarjetas = [...container.querySelectorAll('[data-testid^="tripulante-"]')] as HTMLButtonElement[]
    act(() => tarjetas[0]?.click())
    expect(paneles()).toBe(1)
    act(() => tarjetas[1]?.click())
    expect(paneles()).toBe(1)
    expect(document.body.querySelector(`[data-testid="popover-agente-${tarjetas[1]?.dataset.testid?.replace('tripulante-', '')}"]`)).not.toBeNull()
  })

  it('cada tarjeta: el nombre ENTERO (nunca cortado), el modo con su «hace…» y UNA línea de lo último con «…»', () => {
    const d = datos()
    const ind = indicadoresDelMando(d, Date.now())
    act(() => root.render(<Tripulacion ind={ind} datos={d} acciones={{ abrirItem: vi.fn(), abrirAlerta: vi.fn() }} />))
    expect(container.querySelector('[data-testid="tripulacion"]')?.className).toContain('auto-rows-fr')
    const tarjetas = [...container.querySelectorAll('[data-testid^="tripulante-"]')]
    expect(tarjetas.length).toBeGreaterThan(10)
    for (const t of tarjetas) {
      const filas = [...t.querySelectorAll('[data-fila]')].map((f) => f.getAttribute('data-fila'))
      expect(filas).toEqual(['nombre', 'modo', 'ultimo'])
      // El nombre no se corta (main, 22:20: «Facturación y c…» era una regresión).
      const nombre = t.querySelector('[data-fila="nombre"]') as HTMLElement
      expect(nombre.className).not.toMatch(/truncate|line-clamp/)
      // Lo último: una sola línea con «…».
      expect(t.querySelector('[data-fila="ultimo"]')?.className).toContain('truncate')
    }
    // Los nombres largos, enteros.
    const texto = container.textContent ?? ''
    expect(texto).toContain('Facturación y caja')
    expect(texto).toContain('Evaluación de candidatos')
  })
})

describe('el control: las MISMAS llamadas de Autonomía', () => {
  function autonomia(setModo = vi.fn(async () => ({ ok: true }))): UsePilotoAutonomiaResult {
    return {
      rows: [{ agente: 'cobranza', modo: 'copiloto', modosDisponibles: ['sombra', 'copiloto', 'autonomo'], valla: [], t323: false, efectoReal: null, gobierna: true, corre: true, porQueNoCorre: null }],
      totalRoster: 1,
      isLoading: false,
      error: null,
      busyAgente: null,
      setModo,
      refetch: vi.fn(async () => undefined),
    }
  }

  let visto: ReturnType<typeof useControlDeAgentes> | null = null
  function Arnes({ a, refrescar, isAdmin = true }: { a: UsePilotoAutonomiaResult; refrescar: () => Promise<void>; isAdmin?: boolean }) {
    visto = useControlDeAgentes({ autonomia: a, refrescarFlota: refrescar, pilotoActivo: true, isAdmin })
    return <>{visto.dialogo}</>
  }
  const conAuth = (hijo: React.ReactNode) => (
    <AuthContext.Provider value={{ agency: { id: 'agencia-1' } } as never}>{hijo}</AuthContext.Provider>
  )

  it('Activar / Desactivar va por `putPilotoGobierno` y refresca la flota', async () => {
    api.putPilotoGobierno.mockResolvedValue({ ok: true, data: { agentes: [], llavesFinas: [] } })
    const refrescar = vi.fn(async () => undefined)
    act(() => root.render(conAuth(<Arnes a={autonomia()} refrescar={refrescar} />)))
    await act(async () => visto?.control.encender('cobranza', 'Laura', false))
    expect(api.putPilotoGobierno).toHaveBeenCalledWith('agencia-1', 'cobranza', false)
    expect(refrescar).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
  })

  it('un fallo se dice en palabras (no un código) y queda en la tarjeta', async () => {
    api.putPilotoGobierno.mockResolvedValue({ ok: false, error: '403', fallo: { status: 403, code: 'FORBIDDEN', message: 'No tienes permiso.' } })
    act(() => root.render(conAuth(<Arnes a={autonomia()} refrescar={vi.fn(async () => undefined)} />)))
    await act(async () => visto?.control.encender('cobranza', 'Laura', true))
    expect(visto?.control.error?.agente).toBe('cobranza')
    expect(visto?.control.error?.mensaje).not.toMatch(/^403$/)
    expect(toast.error).toHaveBeenCalled()
  })

  it('bajar de modo es directo; subir a Automático pide la confirmación de Autonomía', async () => {
    const setModo = vi.fn(async () => ({ ok: true }))
    act(() => root.render(conAuth(<Arnes a={autonomia(setModo)} refrescar={vi.fn(async () => undefined)} />)))
    await act(async () => visto?.control.cambiarModo('cobranza', 'Laura', 'sombra'))
    expect(setModo).toHaveBeenCalledWith('cobranza', 'sombra')
    await act(async () => visto?.control.cambiarModo('cobranza', 'Laura', 'autonomo'))
    expect(setModo).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="confirmar-automatico"]')?.textContent).toBe('Laura')
  })

  it('sin ser administrador: no puede cambiar y dice por qué', () => {
    act(() => root.render(conAuth(<Arnes a={autonomia()} refrescar={vi.fn(async () => undefined)} isAdmin={false} />)))
    expect(visto?.control.puedeCambiar).toBe(false)
    expect(visto?.control.porQueNo).toMatch(/administrador/)
  })
})

describe('el orbe del núcleo', () => {
  const lista = <T,>(data: T): Pieza<T> => ({ data, isLoading: false, error: null, notAvailable: false })
  function datos(): DatosDelMando {
    const m = crearMuestra(Date.now())
    return {
      fuente: 'muestra',
      limiteDeActividad: 50,
      pulso: lista(m.pulso),
      bandeja: lista({ items: m.bandeja.items, total: m.bandeja.total, porPrioridad: m.bandeja.porPrioridad }),
      actividad: lista(m.actividad),
      briefing: lista(m.briefing),
      flota: lista(m.flota),
      hoy: lista(m.hoy),
      metas: lista(m.metas),
    }
  }

  it('al pasar el puntero reacciona (los anillos se abren) sin abrir; el clic abre con el modo general, los agentes por modo, lo de ahora y la frase del director; sus botones abren el plan y Autonomía', () => {
    const d = datos()
    const abrirDirector = vi.fn()
    const abrirAutonomia = vi.fn()
    const ind = indicadoresDelMando(d, Date.now())
    act(() => root.render(<OrbeDelPilotoConPopover ind={ind} datos={d} acciones={{ abrirItem: vi.fn(), abrirAlerta: vi.fn(), abrirDirector, abrirAutonomia }} tamano={120} conAnillos />))
    entraElPuntero(disparador('orbe-del-piloto'))
    expect(popover('popover-del-piloto')).toBeNull()
    expect(container.querySelector('[data-despierto="true"]')).not.toBeNull()
    act(() => disparador('orbe-del-piloto').click())
    const p = popover('popover-del-piloto')
    expect(p).not.toBeNull()
    const texto = p?.textContent ?? ''
    expect(texto).toContain('Modo general')
    expect(texto).toContain('Automático')
    expect(texto).toContain('Laura está llamando')
    expect(texto).toContain('Hoy el foco es la cartera de octubre')
    const boton = (nombre: string) => [...(p?.querySelectorAll('button') ?? [])].find((b) => b.textContent === nombre) as HTMLButtonElement
    act(() => boton('Abrir el plan').click())
    expect(abrirDirector).toHaveBeenCalled()
  })

  it('con el teclado: el foco reacciona y Enter abre; sin datos de flota no inventa conteos', () => {
    const d = { ...datos(), flota: { data: null, isLoading: false, error: null, notAvailable: true } }
    const ind = indicadoresDelMando(d, Date.now())
    act(() => root.render(<OrbeDelPilotoConPopover ind={ind} datos={d} acciones={{ abrirItem: vi.fn(), abrirAlerta: vi.fn() }} tamano={120} />))
    act(() => disparador('orbe-del-piloto').focus())
    // El foco reacciona pero no abre; Enter (un clic del teclado) sí.
    expect(popover('popover-del-piloto')).toBeNull()
    act(() => disparador('orbe-del-piloto').click())
    const p = popover('popover-del-piloto')
    expect(p).not.toBeNull()
    expect(p?.textContent).not.toContain('Modo general')
    expect(p?.textContent).not.toContain('Los agentes encendidos')
    // Sin los cajones (la muestra), no hay botones muertos.
    expect(p?.querySelectorAll('button').length).toBe(0)
  })
})
