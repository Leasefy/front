/**
 * 02-10-2026 · Las fotos de una solicitud de mantenimiento.
 *
 * 🔴 EL DEFECTO QUE CIERRA: el formulario guardaba `URL.createObjectURL(file)`
 * en `photoUrls` y eso viajaba al back. Un `blob:` sólo lo abre la pestaña que
 * lo creó: nadie más podía ver esas fotos. Ahora el formulario entrega los
 * ARCHIVOS (la página los sube después de crear la solicitud) y la vista
 * previa local nunca sale del navegador.
 *
 * También: lo que el back no aceptaría (tipo, peso) no entra, con el motivo
 * bajo las fotos, antes de mandar nada.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Consignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))
vi.mock('@/components/ui/cajon', () => ({
  CajonCuerpo: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CajonPie: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))
// La salida de framer no termina en happy-dom: se prueba quién se monta.
vi.mock('framer-motion', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})
// Los RadioCard de Cadence (Radix) no se eligen con un clic en happy-dom:
// cada opción es un botón.
vi.mock('@leasefy/cadence', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  const Elegir = React.createContext<(v: string) => void>(() => {})
  return {
    ...original,
    RadioCardGroup: ({
      children,
      onValueChange,
    }: {
      children?: React.ReactNode
      onValueChange: (v: string) => void
    }) => <Elegir.Provider value={onValueChange}>{children}</Elegir.Provider>,
    RadioCard: function Opcion({ value }: { value: string }) {
      const elegir = React.useContext(Elegir)
      return (
        <button type="button" data-testid={`opcion-${value}`} onClick={() => elegir(value)}>
          {value}
        </button>
      )
    },
  }
})

import { MantenimientoForm, type MantenimientoFormData } from './MantenimientoForm'
import { MENSAJES_DEL_MANTENIMIENTO, MAX_FOTOS_AL_CREAR } from '@/lib/mantenimiento/limites-del-mantenimiento'

const CONSIGNACION = {
  id: 'cons-1',
  propertyId: 'prop-1',
  propertyTitle: 'Apto 402 — Laureles',
  propertyAddress: 'Cra 76 #34-12',
} as Consignacion

let container: HTMLDivElement
let root: Root
let creadas: string[]
const crearUrl = vi.fn()
const liberarUrl = vi.fn()

beforeEach(() => {
  creadas = []
  crearUrl.mockReset().mockImplementation(() => {
    const u = `blob:http://localhost:3001/${creadas.length + 1}`
    creadas.push(u)
    return u
  })
  liberarUrl.mockReset()
  URL.createObjectURL = crearUrl as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = liberarUrl as unknown as typeof URL.revokeObjectURL
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar() {
  const onSubmit = vi.fn<(d: MantenimientoFormData) => void>()
  act(() => {
    root.render(
      <MantenimientoForm
        consignaciones={[CONSIGNACION]}
        preselectedConsignacionId="cons-1"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
  })
  return { onSubmit }
}

const $ = <T extends HTMLElement>(sel: string) => container.querySelector(sel) as T
const $$ = (sel: string) => Array.from(container.querySelectorAll(sel))

const foto = (nombre: string, tipo = 'image/jpeg', peso = 2048) =>
  new File([new Uint8Array(peso)], nombre, { type: tipo })

async function elegir(...archivos: File[]) {
  const input = $<HTMLInputElement>('[data-testid="mantenimiento-foto-input"]')
  Object.defineProperty(input, 'files', { configurable: true, value: archivos })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function escribir(sel: string, valor: string) {
  const el = $<HTMLInputElement | HTMLTextAreaElement>(sel)
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function llenarYCrear() {
  await act(async () => {
    $<HTMLButtonElement>('[data-testid="opcion-plumbing"]').click()
  })
  await act(async () => {
    $<HTMLButtonElement>('[data-testid="opcion-medium"]').click()
  })
  await escribir('#mantenimiento-title', 'Gotera en el baño')
  await escribir('textarea', 'El techo del baño gotea cuando llueve fuerte.')
  await act(async () => {
    $<HTMLFormElement>('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('MantenimientoForm — las fotos', () => {
  it('🔴 entrega los ARCHIVOS y nunca una URL `blob:`', async () => {
    const { onSubmit } = montar()
    const a = foto('gotera.jpg')
    const b = foto('techo.png', 'image/png')
    await elegir(a, b)
    expect($$('[data-testid="mantenimiento-foto"]')).toHaveLength(2)

    await llenarYCrear()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const enviado = onSubmit.mock.calls[0][0]
    expect(enviado.fotos).toEqual([a, b])
    expect('photoUrls' in enviado).toBe(false)
    // Ni un rastro de la vista previa local en lo que sale del formulario.
    expect(JSON.stringify(enviado)).not.toContain('blob:')
  })

  it('sin fotos no manda la clave', async () => {
    const { onSubmit } = montar()
    await llenarYCrear()
    expect(onSubmit.mock.calls[0][0].fotos).toBeUndefined()
  })

  it('🔴 lo que el back no aceptaría no entra y el motivo sale bajo las fotos', async () => {
    montar()
    await elegir(
      foto('plano.pdf', 'application/pdf'),
      foto('enorme.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1),
      foto('bien.webp', 'image/webp'),
    )
    // Sólo entra la que sirve.
    expect($$('[data-testid="mantenimiento-foto"]')).toHaveLength(1)
    const error = $('#mantenimiento-photoUrls-error')?.textContent ?? ''
    expect(error).toContain(`«plano.pdf»: ${MENSAJES_DEL_MANTENIMIENTO.fotoTipo}`)
    expect(error).toContain(`«enorme.jpg»: ${MENSAJES_DEL_MANTENIMIENTO.fotoPesada}`)
    expect($('[data-testid="mantenimiento-foto-input"]').getAttribute('aria-invalid')).toBe('true')

    // Una elección buena después borra el aviso.
    await elegir(foto('otra.jpg'))
    expect($('#mantenimiento-photoUrls-error')?.textContent ?? '').toBe('')
  })

  it(`no pasa de ${MAX_FOTOS_AL_CREAR} fotos, y lo dice`, async () => {
    montar()
    await elegir(...Array.from({ length: MAX_FOTOS_AL_CREAR + 1 }, (_, i) => foto(`f${i}.jpg`)))
    expect($$('[data-testid="mantenimiento-foto"]')).toHaveLength(MAX_FOTOS_AL_CREAR)
    expect($('#mantenimiento-photoUrls-error')?.textContent).toContain(
      `hasta ${MAX_FOTOS_AL_CREAR} fotos`,
    )
    // Lleno: ya no se ofrece agregar otra.
    expect($('[data-testid="mantenimiento-foto-input"]')).toBeNull()
  })

  it('quitar una foto la saca y libera su vista previa', async () => {
    montar()
    await elegir(foto('a.jpg'), foto('b.jpg'))
    const antes = [...creadas]
    await act(async () => {
      $<HTMLButtonElement>('[aria-label="Quitar la foto 1"]').click()
    })
    expect($$('[data-testid="mantenimiento-foto"]')).toHaveLength(1)
    for (const u of antes) expect(liberarUrl).toHaveBeenCalledWith(u)
  })

  it('al cerrar el formulario se liberan las vistas previas', async () => {
    montar()
    await elegir(foto('a.jpg'))
    const vivas = [...creadas]
    act(() => root.unmount())
    for (const u of vivas) expect(liberarUrl).toHaveBeenCalledWith(u)
    // Que el `afterEach` no desmonte dos veces.
    root = createRoot(container)
  })
})
