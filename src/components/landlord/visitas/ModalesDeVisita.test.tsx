import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 02-10-2026 · Agendar y reprogramar una visita (panel del propietario) con el
 * sistema de errores: la fecha se ataja antes de mandar con la frase del back,
 * un 400 va a SU campo con el foco, un 5xx dice «de nuestro lado» con la
 * referencia y sólo la falta de respuesta habla de la conexión. Antes el hook
 * devolvía `false` y el modal decía «Error al agendar visita».
 */

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: (d: string) => d }),
}))

vi.mock('@/components/ui/dialog', async (original) => {
  const real = await original<typeof import('@/components/ui/dialog')>()
  const Caja = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    ...real,
    Dialog: Caja,
    DialogContent: Caja,
    DialogHeader: Caja,
    DialogTitle: Caja,
    DialogDescription: Caja,
    DialogFooter: Caja,
    DialogSection: Caja,
  }
})

// El Select de Radix no se deja manejar en happy-dom: uno mínimo con la misma API.
vi.mock('@/components/ui', async (original) => {
  const real = await original<typeof import('@/components/ui')>()
  const Ctx = React.createContext<(v: string) => void>(() => undefined)
  return {
    ...real,
    Select: ({ onValueChange, children }: { onValueChange: (v: string) => void; children?: React.ReactNode }) => (
      <Ctx.Provider value={onValueChange}>{children}</Ctx.Provider>
    ),
    SelectTrigger: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...rest}>
        {children}
      </button>
    ),
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => {
      const elegir = React.useContext(Ctx)
      return (
        <button type="button" data-opcion={value} onClick={() => elegir(value)}>
          {children}
        </button>
      )
    },
  }
})

import { ApiError } from '@/lib/api/client'
import { ScheduleModal, RescheduleModal, MENSAJE_SIN_PERMISO_PARA_AGENDAR } from './ModalesDeVisita'
import type { Visit } from '@/lib/types/visit'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  toast.success.mockClear()
  toast.error.mockClear()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(el: Element) {
  await act(async () => {
    ;(el as HTMLElement).click()
    await Promise.resolve()
  })
}

function boton(texto: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)!
}

const TOPE_FECHA = 'La fecha de la visita debe estar entre el año 2000 y el 2100.'

function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
  return new ApiError(status, (cuerpo.message as string | string[]) ?? '', cuerpo.code as string | undefined, cuerpo)
}

describe('ScheduleModal — agendar una visita', () => {
  async function llenarYAgendar(
    onCreate: (propertyId: string, date: string, time: string, notes?: string) => Promise<void>,
    fecha = '2026-11-20',
  ) {
    const onClose = vi.fn()
    act(() => {
      root.render(<ScheduleModal onClose={onClose} properties={[{ id: 'p1', title: 'Apto 101' }]} onCreate={onCreate} />)
    })
    escribir(container.querySelector('#agendar-fecha') as HTMLInputElement, fecha)
    await clic(container.querySelector('[data-opcion="10:00"]')!)
    await clic(container.querySelector('[data-opcion="p1"]')!)
    await clic(boton('landlord.visits.scheduleConfirm'))
    return onClose
  }

  it('🔴 una fecha fuera de rango se ataja ANTES de mandar, con la frase del back', async () => {
    const onCreate = vi.fn()
    await llenarYAgendar(onCreate, '2200-01-01')
    expect(onCreate).not.toHaveBeenCalled()
    expect(container.querySelector('#agendar-fecha-error')?.textContent).toBe(TOPE_FECHA)
    expect(container.querySelector('#agendar-fecha')?.getAttribute('aria-invalid')).toBe('true')
  })

  it('🔴 un 400 con campos pinta el error en su campo, le da el foco y no hay toast', async () => {
    const onCreate = vi.fn().mockRejectedValue(
      errorDelBack(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [TOPE_FECHA],
        campos: [{ campo: 'date', regla: 'fecha', mensaje: TOPE_FECHA }],
      }),
    )
    const onClose = await llenarYAgendar(onCreate)
    expect(onCreate).toHaveBeenCalledWith('p1', '2026-11-20', '10:00', undefined)
    expect(container.querySelector('#agendar-fecha-error')?.textContent).toBe(TOPE_FECHA)
    expect(document.activeElement?.id).toBe('agendar-fecha')
    expect(toast.error).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    const onCreate = vi.fn().mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    const onClose = await llenarYAgendar(onCreate)
    const texto = String(toast.error.mock.calls[0][0])
    expect(texto).toMatch(/^No pudimos agendar la visita: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    const onCreate = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await llenarYAgendar(onCreate)
    expect(String(toast.error.mock.calls[0][0])).toMatch(/conexión/)
  })

  it('el 403 del back (sólo inquilinos piden visitas) se dice con frase propia, que dice qué hacer', async () => {
    const onCreate = vi.fn().mockRejectedValue(
      errorDelBack(403, {
        statusCode: 403,
        message: 'Esto es sólo para cuentas de inquilino, y la tuya es de propietario.',
      }),
    )
    await llenarYAgendar(onCreate)
    expect(toast.error).toHaveBeenCalledWith(MENSAJE_SIN_PERMISO_PARA_AGENDAR)
  })

  it('si sale bien, avisa y cierra', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    const onClose = await llenarYAgendar(onCreate)
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('RescheduleModal — reprogramar una visita', () => {
  const VISITA = {
    id: 'v1',
    candidateName: 'Ana Pérez',
    requestedDate: '2026-11-10',
    requestedTime: '10:00',
  } as unknown as Visit

  async function reprogramar(onConfirm: (date: string, time: string) => Promise<void>) {
    const onClose = vi.fn()
    act(() => {
      root.render(<RescheduleModal visit={VISITA} onConfirm={onConfirm} onClose={onClose} />)
    })
    escribir(container.querySelector('#reprogramar-fecha') as HTMLInputElement, '2026-11-25')
    escribir(container.querySelector('#reprogramar-hora') as HTMLInputElement, '15:00')
    await clic(boton('landlord.visits.rescheduleConfirm'))
    return onClose
  }

  it('🔴 un 400 en newDate va al campo de la fecha y el modal queda abierto', async () => {
    const onConfirm = vi.fn().mockRejectedValue(
      errorDelBack(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [TOPE_FECHA],
        campos: [{ campo: 'newDate', regla: 'fecha', mensaje: TOPE_FECHA }],
      }),
    )
    const onClose = await reprogramar(onConfirm)
    expect(container.querySelector('#reprogramar-fecha-error')?.textContent).toBe(TOPE_FECHA)
    expect(document.activeElement?.id).toBe('reprogramar-fecha')
    expect(onClose).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('un 5xx va al toast con la referencia', async () => {
    const onConfirm = vi.fn().mockRejectedValue(
      errorDelBack(502, { statusCode: 500, code: 'ERROR_INTERNO', referencia: 'beef0001' }),
    )
    await reprogramar(onConfirm)
    expect(String(toast.error.mock.calls[0][0])).toMatch(/reprogramar la visita: algo falló de nuestro lado/)
  })

  it('si sale bien, cierra', async () => {
    const onClose = await reprogramar(vi.fn().mockResolvedValue(undefined))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
