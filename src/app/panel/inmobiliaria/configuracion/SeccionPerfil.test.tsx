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
  // El doble de la renovación automática: guarda un IPC y se traga el error
  // relanzado, como la sección de verdad (que lo pinta bajo el campo).
  ConfigRenovacionAutomatica: ({ onSave }: { onSave: (p: { ipcVigente: number }) => Promise<void> }) => (
    <button
      type="button"
      onClick={() => {
        onSave({ ipcVigente: 101 }).catch((e: unknown) => {
          h.resultado.error = e
        })
      }}
    >
      Guardar IPC
    </button>
  ),
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
  await pulsar('Guardar correo')
}

async function pulsar(texto: string) {
  await act(async () => {
    root.render(<SeccionPerfil />)
  })
  const boton = [...host.querySelectorAll('button')].find((b) => b.textContent === texto)!
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

    // Por el traductor: el `message` del 409 es el aviso entero (antes iba
    // debajo de un «Error al guardar configuración» fijo).
    expect(h.toastError).toHaveBeenCalledWith(MENSAJE)
    expect(h.toastSuccess).not.toHaveBeenCalled()
    expect(h.refetch).not.toHaveBeenCalled()
    // Relanzado con su `code`, para quien quiera marcar el campo.
    expect(h.resultado.error).toMatchObject({ status: 409, code: 'CORREO_DE_OTRA_INMOBILIARIA', message: MENSAJE })
  })
})

/**
 * 02-10-2026 · tanda 2 del sistema de errores (A6): la regla de oro en el
 * guardado de Configuración.
 */
describe('SeccionPerfil — el guardado dice lo que de verdad pasó', () => {
  it('un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor', referencia: 'a1b2c3d4' }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      ),
    )

    await guardarCorreo()

    expect(h.toastError).toHaveBeenCalledTimes(1)
    const texto = String(h.toastError.mock.calls[0][0])
    expect(texto).toContain('No pudimos guardar la configuración: algo falló de nuestro lado')
    expect(texto).toContain('a1b2c3d4')
    expect(texto).not.toMatch(/conexi/i)
    expect(h.resultado.error).toMatchObject({ status: 500 })
  })

  it('sin respuesta (status 0) sí habla de la conexión', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'))

    await guardarCorreo()

    expect(h.toastError).toHaveBeenCalledTimes(1)
    expect(String(h.toastError.mock.calls[0][0])).toMatch(/conexi/i)
  })

  it('un 400 con campos de los datos de la empresa no sale en el toast: lo pinta el formulario en su campo', async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['El correo puede tener hasta 255 caracteres.'],
          campos: [{ campo: 'email', regla: 'longitud_maxima', mensaje: 'El correo puede tener hasta 255 caracteres.' }],
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    )

    await guardarCorreo()

    expect(h.toastError).not.toHaveBeenCalled()
    expect(h.resultado.error).toMatchObject({ status: 400, code: 'DATOS_INVALIDOS' })
  })
})

/**
 * 02-10-2026 · La renovación automática pinta el 400 del IPC bajo su campo
 * (`ConfigRenovacionAutomatica`): el padre no lo repite en un toast, pero sí
 * avisa lo que no trae campos.
 */
describe('SeccionPerfil — el IPC de la renovación automática', () => {
  const FRASE = 'El IPC vigente debe ser un número entre 0 y 100 %, con hasta dos decimales.'

  it('🔴 un 400 con el campo del IPC no sale en el toast: lo pinta la sección bajo el IPC', async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: [FRASE],
          campos: [{ campo: 'ipcVigente', regla: 'maximo', mensaje: FRASE, valor: 101 }],
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    )

    await pulsar('Guardar IPC')

    expect(JSON.parse(String((fetchFalso.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({ ipcVigente: 101 })
    expect(h.toastError).not.toHaveBeenCalled()
    expect(h.resultado.error).toMatchObject({ status: 400, code: 'DATOS_INVALIDOS' })
  })

  it('un 403 sin campos sí lo avisa el padre, por el traductor', async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 403, code: 'SIN_PERMISO', message: 'Sólo un administrador puede cambiar esto.' }),
        { status: 403, headers: { 'content-type': 'application/json' } },
      ),
    )

    await pulsar('Guardar IPC')

    expect(h.toastError).toHaveBeenCalledTimes(1)
    expect(h.resultado.error).toMatchObject({ status: 403 })
  })
})
