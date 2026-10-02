import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { Envelope, Tag } from '@phosphor-icons/react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { updateSettings, estado } = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  estado: { settings: {} as Record<string, boolean>, errorCrudo: null as unknown },
}))

vi.mock('@/lib/hooks/useSettings', () => ({
  useNotificationSettings: () => ({
    settings: estado.settings,
    isLoading: false,
    errorCrudo: estado.errorCrudo,
    refresh: vi.fn(),
    updateSettings,
  }),
}))
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from '@/components/ui/toast'
vi.mock('@/components/estado/EstadoDeDatos', () => ({
  EstadoDeDatos: ({ error, children }: { error: unknown; children: React.ReactNode }) =>
    error ? <p data-testid="fallo">fallo</p> : <>{children}</>,
}))

import { SeccionNotificacionesDeCuenta, type FilaDeNotificacion } from './SeccionNotificacionesDeCuenta'

const FILAS: FilaDeNotificacion[] = [
  {
    id: 'correos',
    claves: ['emailApplications', 'emailVisits', 'emailContracts', 'emailMessages'],
    icono: Envelope,
    titulo: 'Correos de tu arriendo',
    descripcion: 'Postulaciones, visitas, contratos y mensajes',
  },
  { id: 'marketing', claves: ['emailMarketing'], icono: Tag, titulo: 'Ofertas', descripcion: 'Lo nuevo' },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  estado.settings = { emailApplications: false, emailVisits: true, emailContracts: false, emailMessages: false, emailMarketing: false }
  estado.errorCrudo = null
  updateSettings.mockResolvedValue(undefined)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

const interruptores = () => [...container.querySelectorAll<HTMLButtonElement>('[role="switch"]')]

describe('SeccionNotificacionesDeCuenta', () => {
  it('una fila de varias banderas se ve prendida si alguna lo está', async () => {
    await act(async () => root.render(<SeccionNotificacionesDeCuenta filas={FILAS} />))
    const [correos, marketing] = interruptores()
    expect(correos?.getAttribute('aria-checked')).toBe('true')
    expect(marketing?.getAttribute('aria-checked')).toBe('false')
  })

  it('al tocarla escribe TODAS sus banderas juntas, en una sola llamada', async () => {
    await act(async () => root.render(<SeccionNotificacionesDeCuenta filas={FILAS} />))
    await act(async () => interruptores()[0]!.click())
    expect(updateSettings).toHaveBeenCalledTimes(1)
    expect(updateSettings).toHaveBeenCalledWith({
      emailApplications: false,
      emailVisits: false,
      emailContracts: false,
      emailMessages: false,
    })
  })

  it('si no se pudo leer lo guardado, no muestra perillas', async () => {
    estado.errorCrudo = new Error('500')
    await act(async () => root.render(<SeccionNotificacionesDeCuenta filas={FILAS} />))
    expect(interruptores()).toHaveLength(0)
    expect(container.querySelector('[data-testid="fallo"]')).not.toBeNull()
  })
})

/** 02-10-2026 · Sistema de errores: el fallo al guardar pasa por el traductor. */
describe('SeccionNotificacionesDeCuenta — fallo al guardar', () => {
  function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
    return Object.assign(new Error(String(cuerpo.message ?? '')), { name: 'ApiError', status, code: cuerpo.code, detalle: cuerpo })
  }

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    updateSettings.mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await act(async () => root.render(<SeccionNotificacionesDeCuenta filas={FILAS} />))
    await act(async () => interruptores()[1]!.click())
    const texto = String(vi.mocked(toast.error).mock.calls[0][0])
    expect(texto).toMatch(/^No pudimos guardar tu preferencia: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
  })

  it('un 400 dice lo que mandó el back', async () => {
    updateSettings.mockRejectedValue(errorDelBack(400, { code: 'DATOS_INVALIDOS', message: 'Esa preferencia no existe.' }))
    await act(async () => root.render(<SeccionNotificacionesDeCuenta filas={FILAS} />))
    await act(async () => interruptores()[1]!.click())
    expect(toast.error).toHaveBeenCalledWith('Esa preferencia no existe.')
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    updateSettings.mockRejectedValue(new TypeError('Failed to fetch'))
    await act(async () => root.render(<SeccionNotificacionesDeCuenta filas={FILAS} />))
    await act(async () => interruptores()[1]!.click())
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toMatch(/conexión/)
  })
})
