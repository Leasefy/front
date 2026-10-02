/**
 * 🔴 El correo de otra inmobiliaria en Configuración (02-10-2026, Nico).
 *
 * El back responde 409 `CORREO_DE_OTRA_INMOBILIARIA` con un mensaje en
 * español que no dice de quién es el correo. Esta prueba fija que el front lo
 * MUESTRA tal cual con el manejo de errores que ya existe: `apiClient` (real)
 * convierte el cuerpo en un `ApiError` con ese `message`, y `guardar` de
 * `SeccionPerfil` lo pinta como descripción del aviso rojo y relanza, para que
 * el formulario se quede en modo edición con lo escrito.
 *
 * `ConfigPerfilAgencia` es un doble acá a propósito: otro trabajo lo está
 * editando, y lo que se prueba es el camino del error, no el formulario.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  refetch: vi.fn(),
  resultado: { error: null as unknown },
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: h.toastSuccess, error: h.toastError, info: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useInmobiliariaConfig: () => ({
    config: {
      agency: { id: 'ag-1', name: 'Andina', email: 'hola@andina.co', nit: '900123456-7', memberRole: 'ADMIN' },
    },
    isLoading: false,
    errorCrudo: null,
    refetch: h.refetch,
  }),
}))
vi.mock('@/components/estado/EstadoDeDatos', () => ({
  EstadoDeDatos: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('./piezas', () => ({ EsqueletoDeSeccion: () => null, VacioDeSeccion: () => null }))
vi.mock('@/components/inmobiliaria/ConfigPenalidadDeTerminacion', () => ({ ConfigPenalidadDeTerminacion: () => null }))
vi.mock('@/components/inmobiliaria/ConfigCicloDeVidaDelContrato', () => ({ ConfigCicloDeVidaDelContrato: () => null }))
vi.mock('@/components/inmobiliaria', () => ({
  // El doble del formulario: guarda el correo y, como el de verdad, se traga
  // el error relanzado (se queda en modo edición).
  ConfigPerfilAgencia: ({ onSave }: { onSave: (p: { email: string }) => Promise<void> }) => (
    <button
      type="button"
      onClick={() => {
        onSave({ email: 'hola@valle.co' }).catch((e: unknown) => {
          h.resultado.error = e
        })
      }}
    >
      Guardar correo
    </button>
  ),
  ConfigExtractoMensual: () => null,
  ConfigRenovacionAutomatica: () => null,
  ConfigTasaDeRecaudo: () => null,
}))

import { SeccionPerfil } from './SeccionPerfil'
import { setAccessToken } from '@/lib/api/client'

const MENSAJE =
  'Ese correo ya lo usa otra inmobiliaria en Leasefy. Usa un correo de la tuya: el de la empresa o el de alguien de tu equipo.'

let host: HTMLDivElement
let root: Root
const fetchFalso = vi.fn()

beforeEach(() => {
  h.toastError.mockReset()
  h.toastSuccess.mockReset()
  h.refetch.mockReset()
  h.resultado.error = null
  fetchFalso.mockReset()
  vi.stubGlobal('fetch', fetchFalso)
  // La sesión ya respondió (si no, `apiClient` espera al AuthProvider).
  setAccessToken('token-de-prueba')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

async function guardarCorreo() {
  await act(async () => {
    root.render(<SeccionPerfil />)
  })
  const boton = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Guardar correo')!
  await act(async () => {
    boton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

describe('SeccionPerfil — el correo de otra inmobiliaria', () => {
  it('el 409 del back se ve tal cual en el aviso rojo, y el formulario recibe el error', async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 409,
          code: 'CORREO_DE_OTRA_INMOBILIARIA',
          message: MENSAJE,
          timestamp: '2026-10-02T05:00:00.000Z',
          path: '/inmobiliaria/agency',
        }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      ),
    )

    await guardarCorreo()

    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/inmobiliaria\/agency$/)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toEqual({ email: 'hola@valle.co' })

    expect(h.toastError).toHaveBeenCalledWith('Error al guardar configuración', { description: MENSAJE })
    expect(h.toastSuccess).not.toHaveBeenCalled()
    expect(h.refetch).not.toHaveBeenCalled()
    // Relanzado con su `code`, para quien quiera marcar el campo.
    expect(h.resultado.error).toMatchObject({ status: 409, code: 'CORREO_DE_OTRA_INMOBILIARIA', message: MENSAJE })
  })
})
