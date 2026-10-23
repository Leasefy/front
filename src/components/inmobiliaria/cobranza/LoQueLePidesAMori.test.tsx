import * as React from 'react'
import { act } from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
async function render(el: React.ReactElement) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(el))
}
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})
const boton = (nombre: string) =>
  [...host.querySelectorAll('button')].filter(
    (b) => b.textContent?.trim() === nombre || b.getAttribute('aria-label') === nombre,
  ) as HTMLButtonElement[]
const area = () => host.querySelector('#instrucciones-de-mori') as HTMLTextAreaElement | null
async function escribir(valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(area(), valor)
    area()!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function clic(b: HTMLElement) {
  await act(async () => {
    b.click()
  })
}

const revisar = vi.fn()
const confirmar = vi.fn()
const deshacer = vi.fn()
const VACIO = {
  agencyId: 'a',
  provisionada: true,
  revisionDisponible: true,
  texto: '',
  reglas: [],
  confirmadasEn: null,
  confirmadasPor: null,
  puedeDeshacer: false,
}
let datos: unknown = VACIO
vi.mock('@/lib/hooks/cobranza/use-instrucciones-de-cobranza', () => ({
  useInstruccionesDeCobranza: () => ({ datos, isLoading: false, error: null, recargar: vi.fn(), revisar, confirmar, deshacer }),
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { email: 'carolina@portofino.test' }, agency: { id: 'ag-1' } }) }))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(() => 'aviso-1'), error: vi.fn(), dismiss: vi.fn() }),
}))

import { toast } from 'sonner'
import { LoQueLePidesAMori, grupoDeLaRegla, nReglas, resumenDelCambio } from './LoQueLePidesAMori'

const unCuadro = () => act(async () => await new Promise<void>((ok) => requestAnimationFrame(() => ok())))

const REVISION = {
  revisionId: 'rev-1',
  reglas: [
    { id: 'r1', dijo: 'todo pagado en 90 días', entendio: 'Todo pagado a más tardar 90 días después de la llamada.', tipo: 'ultimo_pago_max_dias', dias: 90, porQueNo: null, porQue: null },
    { id: 'r2', dijo: 'No aceptamos efectivo', entendio: 'Mori no acepta pagos en efectivo.', tipo: 'instruccion', dias: null, porQueNo: null, porQue: null },
    { id: 'r3', dijo: 'Perdonen los intereses', entendio: 'Perdonar los intereses de mora.', tipo: 'no_se_puede', dias: null, porQueNo: 'Eso se fija en el acuerdo general.', porQue: 'acuerdo_general' },
  ],
  dudas: [
    {
      id: 'd1',
      reglaId: 'r1',
      pregunta: 'Mori lo entendió desde la llamada. ¿Desde cuándo se cuentan los 90 días?',
      opciones: [
        { etiqueta: 'Desde la llamada', entendio: 'Todo pagado a más tardar 90 días después de la llamada.', dias: 90 },
        { etiqueta: 'En 60 días', entendio: 'Todo pagado a más tardar 60 días después de la llamada.', dias: 60 },
      ],
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  // Cada prueba empieza sin borrador: uno ofrecido esconde el campo (es la única entrada).
  window.sessionStorage.clear()
  datos = VACIO
  revisar.mockResolvedValue(REVISION)
  confirmar.mockResolvedValue({ ...VACIO, reglas: REVISION.reglas.slice(0, 2) })
})

describe('LoQueLePidesAMori', () => {
  it('sin reglas: el editor directo; con la duda sin contestar no se puede guardar', async () => {
    await render(<LoQueLePidesAMori puedeEditar />)
    expect(area()).not.toBeNull()
    await escribir('Todo pagado en 90 días. No aceptamos efectivo. Perdonen los intereses.')
    await clic(boton('Ver cómo lo entiende Mori')[0] as HTMLElement)
    expect(revisar).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('Se cumple siempre')
    expect(host.textContent).toContain('Mori lo sigue al conversar')
    expect(host.textContent).toContain('Se configura en otro lado')
    expect(host.textContent).toContain('Ir a Acuerdos generales')
    expect(host.textContent).toContain('Al guardar, la quitamos de tu texto: «Perdonen los intereses»')
    expect(host.textContent).toContain('Contesta 1 duda para guardar')
    expect(boton('Guardar 2 reglas')[0]?.disabled).toBe(true)
  })

  it('contestar la duda prende «Guardar» y manda la respuesta y lo quitado', async () => {
    await render(<LoQueLePidesAMori puedeEditar />)
    await escribir('Todo pagado en 90 días. No aceptamos efectivo. Perdonen los intereses.')
    await clic(boton('Ver cómo lo entiende Mori')[0] as HTMLElement)
    const enSesenta = [...host.querySelectorAll('[data-testid="duda-d1"] button, [data-testid="duda-d1"] [role="radio"]')].find(
      (b) => b.textContent?.includes('En 60 días'),
    ) as HTMLElement
    await clic(enSesenta)
    expect(host.textContent).toContain('Todo pagado a más tardar 60 días después de la llamada.')
    await clic(boton('Quitar esta regla')[1] as HTMLElement) // la de efectivo
    expect(boton('Guardar 1 regla')[0]?.disabled).toBe(false)
    await clic(boton('Guardar 1 regla')[0] as HTMLElement)
    expect(confirmar).toHaveBeenCalledWith({
      texto: 'Todo pagado en 90 días. No aceptamos efectivo. Perdonen los intereses.',
      revisionId: 'rev-1',
      quitar: ['r2'],
      respuestas: { d1: 1 },
    })
  })

  it('quitar la regla que tiene la duda deja guardar sin contestarla', async () => {
    await render(<LoQueLePidesAMori puedeEditar />)
    await escribir('Todo pagado en 90 días. No aceptamos efectivo. Perdonen los intereses.')
    await clic(boton('Ver cómo lo entiende Mori')[0] as HTMLElement)
    await clic(boton('Quitar esta regla')[0] as HTMLElement) // la de los 90 días, con su duda
    expect(boton('Guardar 1 regla')[0]?.disabled).toBe(false)
    await clic(boton('Guardar 1 regla')[0] as HTMLElement)
    expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ quitar: ['r1'], respuestas: {} }))
  })

  const CLAVE = 'leasefy:mori-borrador:ag-1'
  async function volverALaPantalla() {
    act(() => root.unmount())
    host.remove()
    await render(<LoQueLePidesAMori puedeEditar />)
  }
  const aviso = () => host.querySelector('[data-testid="borrador-sin-guardar"]')

  it('lo escrito sin guardar se ofrece al volver, también la segunda y la tercera vez (sin reglas)', async () => {
    window.sessionStorage.clear()
    await render(<LoQueLePidesAMori puedeEditar />)
    expect(host.querySelector('[data-testid="hoy-sin-reglas"]')?.textContent).toBe(
      'Hoy Mori negocia sólo con los acuerdos generales y la ley.',
    )
    await escribir('La primera cuota máximo en 8 días.')
    await volverALaPantalla()
    expect(aviso()?.textContent).toContain('Tienes un cambio sin guardar: agregaste «La primera cuota máximo en 8 días»')
    expect(window.sessionStorage.getItem(CLAVE)).not.toBeNull()
    // Sin «Retomar», otra vuelta: el borrador sigue ahí.
    await volverALaPantalla()
    expect(aviso()).not.toBeNull()
    expect(window.sessionStorage.getItem(CLAVE)).not.toBeNull()
    // Mientras se ofrece, el aviso es la única entrada: ni el campo ni «Ver cómo lo entiende Mori».
    expect(area()).toBeNull()
    expect(boton('Ver cómo lo entiende Mori').length).toBe(0)
    await clic(boton('Retomar')[0] as HTMLElement)
    expect(area()?.value).toBe('La primera cuota máximo en 8 días.')
    window.sessionStorage.clear()
  })

  it('con reglas: el borrador sobrevive a volver dos veces sin retomarlo, y «Cancelar» lo borra', async () => {
    window.sessionStorage.clear()
    datos = { ...VACIO, texto: 'No aceptamos efectivo.', reglas: [REVISION.reglas[1]], confirmadasEn: '2026-10-22T17:30:00.000Z' }
    window.sessionStorage.setItem(CLAVE, JSON.stringify({ texto: 'No aceptamos efectivo. Tampoco cheques.' }))
    await render(<LoQueLePidesAMori puedeEditar />)
    expect(aviso()?.textContent).toContain('Tienes un cambio sin guardar: agregaste «Tampoco cheques»')
    await volverALaPantalla()
    expect(aviso()).not.toBeNull()
    expect(window.sessionStorage.getItem(CLAVE)).not.toBeNull()
    await volverALaPantalla()
    expect(aviso()).not.toBeNull()
    expect(window.sessionStorage.getItem(CLAVE)).not.toBeNull()
    // «Cambiar las reglas» abriría lo guardado al lado del borrador: no se ofrece.
    expect(boton('Cambiar las reglas').length).toBe(0)

    // Retomar, y luego cancelar con confirmación: se borra.
    await clic(boton('Retomar')[0] as HTMLElement)
    expect(area()?.value).toBe('No aceptamos efectivo. Tampoco cheques.')
    await clic(boton('Cancelar')[0] as HTMLElement)
    const descartar = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Descartar los cambios')
    await clic(descartar as HTMLElement)
    expect(area()).toBeNull()
    expect(window.sessionStorage.getItem(CLAVE)).toBeNull()
    await volverALaPantalla()
    expect(aviso()).toBeNull()
  })

  describe('«Volver a las de antes» en la línea de lo que rige', () => {
    const recien = () => new Date(Date.now() - 60_000).toISOString()
    const vigente = (cambios: Record<string, unknown> = {}) => ({
      ...VACIO,
      texto: 'No aceptamos efectivo.',
      reglas: [REVISION.reglas[1]],
      confirmadasEn: recien(),
      confirmadasPor: 'carolina@portofino.test',
      puedeDeshacer: true,
      ...cambios,
    })

    it('lo ofrece a quien guardó, dentro de los 15 minutos, y no se dispara dos veces', async () => {
      let terminar: (v: unknown) => void = () => {}
      deshacer.mockReturnValue(new Promise((ok) => (terminar = ok)))
      datos = vigente()
      await render(<LoQueLePidesAMori puedeEditar />)
      const enlace = boton('Volver a las de antes')[0] as HTMLButtonElement
      await clic(enlace)
      expect(boton('Volviendo…')[0]?.disabled).toBe(true)
      await clic(boton('Volviendo…')[0] as HTMLElement)
      expect(deshacer).toHaveBeenCalledOnce()
      await act(async () => terminar(VACIO))
    })

    it('no lo ofrece si lo guardó otra persona o si ya pasaron los 15 minutos', async () => {
      datos = vigente({ confirmadasPor: 'otra@portofino.test' })
      await render(<LoQueLePidesAMori puedeEditar />)
      expect(boton('Volver a las de antes').length).toBe(0)
      await volverALaPantalla()
      datos = vigente({ confirmadasEn: new Date(Date.now() - 16 * 60_000).toISOString() })
      await volverALaPantalla()
      expect(boton('Volver a las de antes').length).toBe(0)
      datos = vigente({ puedeDeshacer: false })
      await volverALaPantalla()
      expect(boton('Volver a las de antes').length).toBe(0)
    })

    it('volver atrás no bota el borrador ofrecido, y mientras se ofrece no está «Dejar a Mori sin reglas»', async () => {
      deshacer.mockResolvedValue(VACIO)
      window.sessionStorage.setItem(CLAVE, JSON.stringify({ texto: 'No aceptamos efectivo. Tampoco cheques.' }))
      datos = vigente()
      await render(<LoQueLePidesAMori puedeEditar />)
      expect(aviso()).not.toBeNull()
      expect(boton('Dejar a Mori sin reglas').length).toBe(0)
      await clic(boton('Volver a las de antes')[0] as HTMLElement)
      expect(deshacer).toHaveBeenCalledOnce()
      expect(window.sessionStorage.getItem(CLAVE)).not.toBeNull()
      expect(aviso()).not.toBeNull()
    })
  })

  it('quién guardó: un correo largo se parte (no se sale a 390) y un id interno no se muestra', async () => {
    const base = { ...VACIO, texto: 'No aceptamos efectivo.', reglas: [REVISION.reglas[1]], confirmadasEn: '2026-10-22T17:30:00.000Z' }
    datos = { ...base, confirmadasPor: 'carolina.restrepo@inmobiliariaportofino.com' }
    await render(<LoQueLePidesAMori puedeEditar />)
    const correo = host.querySelector('[data-testid="correo-de-quien-guardo"]') as HTMLElement
    expect(correo.textContent).toBe('carolina.restrepo@inmobiliariaportofino.com')
    expect(correo.className).toContain('[overflow-wrap:anywhere]')
    expect(correo.className).not.toContain('whitespace-nowrap')
    expect(host.textContent).toContain('las guardó carolina.restrepo@inmobiliariaportofino.com')
    await volverALaPantalla()
    datos = { ...base, confirmadasPor: '33333333-3333-4333-8333-333333333333' }
    await volverALaPantalla()
    expect(host.textContent).not.toContain('las guardó')
    expect(host.textContent).not.toContain('33333333')
  })

  it('«Cambiar las reglas» deja el cursor en el campo; cancelar sin cambios no pregunta', async () => {
    datos = { ...VACIO, texto: 'No aceptamos efectivo.', reglas: [REVISION.reglas[1]], confirmadasEn: '2026-10-22T17:30:00.000Z' }
    await render(<LoQueLePidesAMori puedeEditar />)
    await clic(boton('Cambiar las reglas')[0] as HTMLElement)
    await unCuadro()
    expect(document.activeElement).toBe(area())
    // Sólo la lectura de la IA, sin escribir ni contestar nada: «Cancelar» cierra sin preguntar.
    await clic(boton('Ver cómo lo entiende Mori')[0] as HTMLElement)
    await clic(boton('Cancelar')[0] as HTMLElement)
    expect(document.body.textContent).not.toContain('¿Descartar')
    expect(area()).toBeNull()
  })

  it('los avisos de «Listo» no se apilan y se cierran al salir de la pantalla', async () => {
    const guardarUna = async () => {
      await escribir('Todo pagado en 90 días. No aceptamos efectivo. Perdonen los intereses.')
      await clic(boton('Ver cómo lo entiende Mori')[0] as HTMLElement)
      await clic(boton('Quitar esta regla')[0] as HTMLElement) // la que tiene la duda
      await clic(boton('Guardar 1 regla')[0] as HTMLElement)
    }
    await render(<LoQueLePidesAMori puedeEditar />)
    await guardarUna()
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.dismiss).not.toHaveBeenCalled()
    await guardarUna()
    expect(toast.dismiss).toHaveBeenCalledWith('aviso-1') // el primero se cierra antes de abrir el segundo
    const antes = (toast.dismiss as unknown as { mock: { calls: unknown[] } }).mock.calls.length
    await volverALaPantalla()
    expect((toast.dismiss as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(antes + 1)
  })

  it('el aviso del borrador dice qué cambió', () => {
    expect(resumenDelCambio('No aceptamos efectivo. Tampoco cheques.', 'No aceptamos efectivo.')).toBe('agregaste «Tampoco cheques»')
    expect(resumenDelCambio('No aceptamos efectivo.', 'No aceptamos efectivo. Tampoco cheques.')).toBe('quitaste «Tampoco cheques»')
    expect(resumenDelCambio('Primera cuota en 10 días.', 'Primera cuota en 8 días.')).toBe('escribiste «Primera cuota en 10 días»')
    expect(resumenDelCambio('No aceptamos efectivo', 'No aceptamos efectivo.')).toBeNull()
    expect(
      resumenDelCambio('Tampoco cheques. Ni transferencias de terceros. Ni consignaciones en otra cuenta.', ''),
    ).toBe('agregaste «Tampoco cheques. Ni transferencias de terceros…»')
  })

  it('con reglas: lo primero es lo que rige, con desde cuándo y quién; el texto se abre con «Cambiar»', async () => {
    datos = {
      ...VACIO,
      texto: 'No aceptamos efectivo.',
      reglas: [REVISION.reglas[1]],
      confirmadasEn: '2026-10-22T17:30:00.000Z',
      confirmadasPor: 'carolina@portofino.test',
    }
    await render(<LoQueLePidesAMori puedeEditar />)
    expect(area()).toBeNull()
    expect(host.textContent).toContain('Rige desde el 22 de octubre de 2026 · las guardaste tú')
    expect(host.querySelector('[data-testid="vigente-r2"]')?.textContent).toBe('Mori no acepta pagos en efectivo.')
    await clic(boton('Cambiar las reglas')[0] as HTMLElement)
    expect(area()?.value).toBe('No aceptamos efectivo.')
    expect(boton('Cancelar').length).toBe(1)
    // Escribir y cancelar pregunta antes de botar lo escrito.
    await escribir('No aceptamos efectivo. Tampoco cheques.')
    await clic(boton('Cancelar')[0] as HTMLElement)
    expect(document.body.textContent).toContain('¿Descartar lo que escribiste?')
    expect(area()?.value).toBe('No aceptamos efectivo. Tampoco cheques.')
  })

  it('sin la migración lo dice y no deja revisar', async () => {
    datos = { ...VACIO, provisionada: false }
    await render(<LoQueLePidesAMori puedeEditar />)
    expect(host.querySelector('[data-testid="instrucciones-sin-migrar"]')).not.toBeNull()
    expect(boton('Ver cómo lo entiende Mori')[0]?.disabled).toBe(true)
  })

  it('los grupos y el número de reglas', () => {
    expect(grupoDeLaRegla(REVISION.reglas[0] as never)).toBe('sistema')
    expect(grupoDeLaRegla(REVISION.reglas[2] as never)).toBe('otro_lado')
    expect(nReglas(1)).toBe('1 regla')
    expect(nReglas(4)).toBe('4 reglas')
  })
})
