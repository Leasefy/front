/**
 * page.test.tsx — /aprobacion, the free document study (T-0193).
 *
 * Covers the wizard states of the frozen contract (§3.1 A): consent required
 * before the study exists, required documents before "iniciar", the processing
 * screen, COMPLETED → result screen, FAILED → retry, and every error code with
 * user-facing copy (429 daily limit, 410, consent missing, invalid file, missing
 * documents). Also pins the product rules: no insurers, no payment, no deposit.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const pushMock = vi.fn()
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: replaceMock }),
}))

let mockUser: { role: string } | null = null
let mockSesion = { isAuthenticated: false, needsOnboarding: false, perfilElegido: null as string | null }
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: mockUser, isLoading: false, ...mockSesion }),
}))

const { pedirLaCuentaMock, ventanaDeCuentaOpcionesMock } = vi.hoisted(() => ({
  pedirLaCuentaMock: vi.fn(),
  ventanaDeCuentaOpcionesMock: vi.fn(),
}))
vi.mock('@/components/marketplace/CuentaParaPublicar', () => ({
  useVentanaDeCuenta: (opciones: unknown) => {
    ventanaDeCuentaOpcionesMock(opciones)
    return { abrir: pedirLaCuentaMock, ventana: null }
  },
}))

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return {
    ...real,
    apiClient: {
      ...real.apiClient,
      get: vi.fn().mockResolvedValue({ title: 'Autorización', text: 'Texto legal de la calificación.' }),
    },
  }
})

const { actual, crear, subirDocumento, iniciar, reintentar } = vi.hoisted(() => ({
  reintentar: vi.fn(),
  actual: vi.fn(),
  crear: vi.fn(),
  subirDocumento: vi.fn(),
  iniciar: vi.fn(),
}))
vi.mock('@/lib/api/estudio-de-canon.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/estudio-de-canon.service')>(
    '@/lib/api/estudio-de-canon.service',
  )
  return { ...real, estudioDeCanonApi: { actual, crear, subirDocumento, iniciar, reintentar } }
})

import AprobacionPage from './page'
import { EstudioDeCanonError } from '@/lib/api/estudio-de-canon.service'
import type { EstudioDeCanon } from '@/lib/api/estudio-de-canon.types'

let container: HTMLDivElement
let root: Root

function estudio(parcial: Partial<EstudioDeCanon> = {}): EstudioDeCanon {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'DRAFT',
    creadoEl: null,
    terminadoEl: null,
    venceEl: null,
    documentos: [],
    faltan: ['cedula', 'extracto_bancario'],
    resultado: null,
    error: null,
    ...parcial,
  }
}

function errorDelEstudio(parcial: Partial<NonNullable<EstudioDeCanon['error']>> = {}): NonNullable<EstudioDeCanon['error']> {
  return {
    codigo: 'ESTUDIO_FALLIDO',
    mensaje: 'No pudimos terminar.',
    documentoConError: null,
    accion: 'REINTENTAR',
    reintentosRestantes: 3,
    ...parcial,
  }
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

async function montar(url = '/aprobacion') {
  window.history.pushState({}, '', url)
  await act(async () => {
    root.render(<AprobacionPage />)
  })
  await flush()
}

const q = (sel: string) => container.querySelector(sel) as HTMLElement | null

async function elegirArchivo(tipo: string, file: File) {
  const input = q(`[data-testid="archivo-${tipo}"]`) as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await flush()
}

const pdf = (nombre = 'doc.pdf') => new File(['contenido'], nombre, { type: 'application/pdf' })

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockUser = { role: 'tenant' }
  mockSesion = { isAuthenticated: true, needsOnboarding: false, perfilElegido: null }
  for (const m of [pushMock, replaceMock, pedirLaCuentaMock, ventanaDeCuentaOpcionesMock, actual, crear, subirDocumento, iniciar, reintentar]) {
    m.mockReset()
  }
  actual.mockResolvedValue(null)
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('<AprobacionPage> — sin sesión / rol', () => {
  it('sin sesión: no llama al back y ofrece crear la cuenta encima', async () => {
    mockUser = null
    mockSesion = { isAuthenticated: false, needsOnboarding: false, perfilElegido: null }
    await montar()
    expect(actual).not.toHaveBeenCalled()
    expect(q('[data-testid="vista-sin-cuenta"]')).not.toBeNull()
    await act(async () => {
      q('[data-testid="crear-cuenta-para-el-estudio"]')!.click()
    })
    expect(pedirLaCuentaMock).toHaveBeenCalledTimes(1)
    expect(ventanaDeCuentaOpcionesMock.mock.calls.at(-1)?.[0]).toMatchObject({ destino: '/aprobacion', rol: 'tenant' })
  })

  it('cuenta recién creada sin perfil: va al onboarding con regreso a esta pantalla', async () => {
    mockSesion = { isAuthenticated: true, needsOnboarding: true, perfilElegido: 'tenant' }
    await montar()
    // The mocked router is a new object per render, so the effect may re-run.
    expect(replaceMock).toHaveBeenCalled()
    expect(String(replaceMock.mock.calls.at(-1)?.[0])).toContain('aprobacion')
  })

  it('un rol que no es inquilino no consulta ni ve el estudio', async () => {
    mockUser = { role: 'agency' }
    await montar()
    expect(actual).not.toHaveBeenCalled()
    expect(q('[data-testid="vista-no-inquilino"]')).not.toBeNull()
  })
})

describe('<AprobacionPage> — paso 1: autorización', () => {
  it('sin estudio: "Continuar" queda apagado hasta marcar la autorización y no se crea nada', async () => {
    await montar()
    const boton = container.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(crear).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Paso 1 de 3')
  })

  it('al marcar y continuar crea el estudio y pasa a los documentos', async () => {
    crear.mockResolvedValue(estudio())
    await montar()
    await act(async () => {
      q('#consent')!.click()
    })
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()
    expect(crear).toHaveBeenCalledTimes(1)
    expect(q('[data-testid="vista-documentos"]')).not.toBeNull()
  })

  it('permite leer el texto legal de la autorización', async () => {
    await montar()
    expect(q('[data-testid="texto-legal"]')).toBeNull()
    const leer = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Leer el texto')!
    await act(async () => {
      leer.click()
    })
    expect(q('[data-testid="texto-legal"]')?.textContent).toContain('Texto legal de la calificación.')
  })

  it('429 ESTUDIO_LIMITE_DIARIO: dice que vuelva mañana', async () => {
    crear.mockRejectedValue(
      new EstudioDeCanonError(429, 'Hoy ya hiciste el máximo de estudios permitidos. Vuelve mañana y lo intentamos de nuevo.', 'ESTUDIO_LIMITE_DIARIO'),
    )
    await montar()
    await act(async () => {
      q('#consent')!.click()
    })
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()
    expect(q('[data-testid="error-general"]')?.textContent).toMatch(/mañana/i)
    expect(q('[data-testid="vista-documentos"]')).toBeNull()
  })

  it('410 PRESCORING_DESACTIVADO: muestra el mensaje que lleva a Mi calificación', async () => {
    crear.mockRejectedValue(
      new EstudioDeCanonError(410, 'El estudio anterior ya no está disponible. Calcula tu tope gratis en Mi calificación.', 'PRESCORING_DESACTIVADO'),
    )
    await montar()
    await act(async () => {
      q('#consent')!.click()
    })
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()
    expect(q('[data-testid="error-general"]')?.textContent).toContain('Mi calificación')
  })

  it('AUTORIZACION_REQUERIDA del back: se muestra el aviso y no se avanza', async () => {
    crear.mockRejectedValue(
      new EstudioDeCanonError(400, 'Para empezar necesitamos tu autorización. Márcala y vuelve a intentarlo.', 'AUTORIZACION_REQUERIDA'),
    )
    await montar()
    await act(async () => {
      q('#consent')!.click()
    })
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()
    expect(q('[data-testid="error-general"]')?.textContent).toMatch(/autorización/i)
  })
})

describe('<AprobacionPage> — paso 2: documentos', () => {
  it('"Estudiar mis documentos" exige cédula y extracto; nómina y certificación son opcionales', async () => {
    actual.mockResolvedValue(estudio())
    await montar()
    const boton = q('[data-testid="iniciar-estudio"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(q('[data-testid="casilla-cedula"]')?.textContent).toContain('Obligatorio')
    expect(q('[data-testid="casilla-nomina"]')?.textContent).toContain('Opcional')
    expect(q('[data-testid="casilla-certificacion_laboral"]')?.textContent).toContain('Opcional')
  })

  it('sube el archivo elegido a su tipo y marca la casilla como recibida', async () => {
    actual.mockResolvedValue(estudio())
    subirDocumento.mockResolvedValue(estudio({ documentos: [{ tipo: 'cedula' }], faltan: ['extracto_bancario'] }))
    await montar()
    const archivo = pdf('cedula.pdf')
    await elegirArchivo('cedula', archivo)
    expect(subirDocumento).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', 'cedula', archivo)
    expect(q('[data-testid="subido-cedula"]')).not.toBeNull()
    expect((q('[data-testid="iniciar-estudio"]') as HTMLButtonElement).disabled).toBe(true)
  })

  it('con los dos obligatorios subidos habilita el inicio y pasa a procesando', async () => {
    actual.mockResolvedValue(
      estudio({ documentos: [{ tipo: 'cedula' }, { tipo: 'extracto_bancario' }], faltan: [] }),
    )
    iniciar.mockResolvedValue(
      estudio({ status: 'PROCESSING', documentos: [{ tipo: 'cedula' }, { tipo: 'extracto_bancario' }], faltan: [] }),
    )
    await montar()
    const boton = q('[data-testid="iniciar-estudio"]') as HTMLButtonElement
    expect(boton.disabled).toBe(false)
    await act(async () => {
      boton.click()
    })
    await flush()
    expect(iniciar).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111')
    expect(q('[data-testid="vista-procesando"]')).not.toBeNull()
  })

  it('un archivo inválido (ARCHIVO_INVALIDO) muestra el mensaje del back en su casilla', async () => {
    actual.mockResolvedValue(estudio())
    subirDocumento.mockRejectedValue(new EstudioDeCanonError(400, 'El archivo está dañado.', 'ARCHIVO_INVALIDO'))
    await montar()
    await elegirArchivo('extracto_bancario', pdf())
    expect(q('[data-testid="casilla-extracto_bancario"]')?.textContent).toContain('El archivo está dañado.')
  })

  it('un archivo de más de 10 MB o de otro tipo se rechaza sin llamar al back', async () => {
    actual.mockResolvedValue(estudio())
    await montar()
    await elegirArchivo('cedula', new File(['x'], 'virus.exe', { type: 'application/x-msdownload' }))
    expect(q('[data-testid="casilla-cedula"]')?.textContent).toContain('PDF o una imagen')
    const grande = new File(['x'], 'grande.pdf', { type: 'application/pdf' })
    Object.defineProperty(grande, 'size', { value: 11 * 1024 * 1024 })
    await elegirArchivo('cedula', grande)
    expect(q('[data-testid="casilla-cedula"]')?.textContent).toContain('10 MB')
    expect(subirDocumento).not.toHaveBeenCalled()
  })

  it('DOCUMENTOS_FALTANTES resalta las casillas que faltan', async () => {
    actual.mockResolvedValue(
      estudio({ documentos: [{ tipo: 'cedula' }, { tipo: 'extracto_bancario' }], faltan: [] }),
    )
    iniciar.mockRejectedValue(
      new EstudioDeCanonError(400, 'Faltan documentos: sube tu cédula y tu extracto bancario para continuar.', 'DOCUMENTOS_FALTANTES', ['extracto_bancario']),
    )
    await montar()
    await act(async () => {
      ;(q('[data-testid="iniciar-estudio"]') as HTMLButtonElement).click()
    })
    await flush()
    expect(q('[data-testid="casilla-extracto_bancario"]')?.textContent).toContain('obligatorio')
    expect(q('[data-testid="error-general"]')?.textContent).toMatch(/faltan documentos/i)
  })

  it('503 con el agente caído: el estudio sigue en borrador y se puede reintentar', async () => {
    actual.mockResolvedValue(
      estudio({ documentos: [{ tipo: 'cedula' }, { tipo: 'extracto_bancario' }], faltan: [] }),
    )
    iniciar.mockRejectedValue(new EstudioDeCanonError(503, 'El servicio no está disponible en este momento. Tus documentos quedaron guardados: reintenta en un momento.', 'SERVICIO_NO_DISPONIBLE'))
    await montar()
    await act(async () => {
      ;(q('[data-testid="iniciar-estudio"]') as HTMLButtonElement).click()
    })
    await flush()
    expect(q('[data-testid="vista-documentos"]')).not.toBeNull()
    expect(q('[data-testid="error-general"]')?.textContent).toMatch(/reintenta/i)
    expect((q('[data-testid="iniciar-estudio"]') as HTMLButtonElement).disabled).toBe(false)
  })

  it('ESTUDIO_NO_ENCONTRADO vuelve al comienzo', async () => {
    actual.mockResolvedValue(estudio())
    subirDocumento.mockRejectedValue(new EstudioDeCanonError(404, 'No encontramos ese estudio. Puedes empezar uno nuevo.', 'ESTUDIO_NO_ENCONTRADO'))
    await montar()
    await elegirArchivo('cedula', pdf())
    expect(q('[data-testid="vista-documentos"]')).toBeNull()
    expect(container.querySelector('#consent')).not.toBeNull()
  })
})

describe('<AprobacionPage> — procesando / resultado / fallo', () => {
  it('PROCESSING: pantalla de espera con salida a Mi tope', async () => {
    actual.mockResolvedValue(estudio({ status: 'PROCESSING' }))
    await montar()
    expect(q('[data-testid="vista-procesando"]')).not.toBeNull()
    expect(container.querySelector('a[href="/inquilino/aprobacion"]')).not.toBeNull()
  })

  it('COMPLETED: lleva al resultado en /inquilino/aprobacion', async () => {
    actual.mockResolvedValue(estudio({ status: 'COMPLETED' }))
    await montar()
    expect(replaceMock).toHaveBeenCalledWith('/inquilino/aprobacion')
  })

  it('COMPLETED con ?repetir=1: permite empezar otro estudio', async () => {
    actual.mockResolvedValue(estudio({ status: 'COMPLETED' }))
    await montar('/aprobacion?repetir=1')
    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.querySelector('#consent')).not.toBeNull()
  })

  it('FAILED: muestra el mensaje del back y ofrece reintentar con los mismos documentos', async () => {
    actual.mockResolvedValue(
      estudio({ status: 'FAILED', error: errorDelEstudio({ codigo: 'ESTUDIO_NO_ARRANCO', mensaje: 'No pudimos iniciar el estudio de tus documentos. Intenta de nuevo.' }) }),
    )
    await montar()
    expect(q('[data-testid="vista-fallido"]')?.textContent).toContain('No pudimos iniciar el estudio')
    expect(q('[data-testid="documento-con-error"]')).toBeNull()
    expect(q('[data-testid="reintentar-estudio"]')?.textContent).toContain('mismos documentos')
    expect(q('[data-testid="reintentos-restantes"]')?.textContent).toBe('Te quedan 3 reintentos.')
  })

  it('FAILED con documento culpable: lo marca, deja reemplazarlo y reintenta con el archivo nuevo', async () => {
    const fallido = estudio({
      status: 'FAILED',
      documentos: [{ tipo: 'cedula' }, { tipo: 'extracto_bancario' }],
      faltan: [],
      error: errorDelEstudio({
        codigo: 'CEDULA_ILEGIBLE',
        mensaje: 'No pudimos leer tu cédula.',
        documentoConError: 'cedula',
        accion: 'REEMPLAZAR_DOCUMENTO',
        reintentosRestantes: 2,
      }),
    })
    actual.mockResolvedValue(fallido)
    subirDocumento.mockResolvedValue(fallido)
    reintentar.mockResolvedValue({ ...fallido, status: 'PROCESSING', error: null })
    await montar()
    expect(q('[data-testid="documento-con-error"]')?.textContent).toContain('Este archivo es el que dio el problema')
    expect(q('[data-testid="casilla-cedula"]')).not.toBeNull()
    expect(q('[data-testid="casilla-extracto_bancario"]')).toBeNull()
    expect(q('[data-testid="reintentos-restantes"]')?.textContent).toBe('Te quedan 2 reintentos.')

    await elegirArchivo('cedula', pdf('cedula-nueva.pdf'))
    expect(subirDocumento).toHaveBeenCalledWith(fallido.id, 'cedula', expect.any(File))
    expect(reintentar).not.toHaveBeenCalled() // uploading does not restart anything
    expect(q('[data-testid="reintentar-estudio"]')?.textContent).toContain('archivo nuevo')

    await act(async () => {
      q('[data-testid="reintentar-estudio"]')!.click()
    })
    await flush()
    expect(reintentar).toHaveBeenCalledWith(fallido.id)
    expect(q('[data-testid="vista-procesando"]')).not.toBeNull()
  })

  it('FAILED sin reintentos: no ofrece reintentar, ofrece empezar un estudio nuevo', async () => {
    actual.mockResolvedValue(
      estudio({ status: 'FAILED', error: errorDelEstudio({ reintentosRestantes: 0 }) }),
    )
    await montar()
    expect(q('[data-testid="reintentar-estudio"]')).toBeNull()
    expect(q('[data-testid="sin-reintentos"]')).not.toBeNull()
    await act(async () => {
      q('[data-testid="empezar-estudio-nuevo"]')!.click()
    })
    expect(container.querySelector('#consent')).not.toBeNull()
    expect(q('[data-testid="vista-fallido"]')).toBeNull()
  })

  it('409 ESTUDIO_SIN_REINTENTOS al reintentar: pasa a "empezar un estudio nuevo"', async () => {
    actual.mockResolvedValue(estudio({ status: 'FAILED', error: errorDelEstudio() }))
    reintentar.mockRejectedValue(
      new EstudioDeCanonError(409, 'Ya usaste todos los reintentos de este estudio.', 'ESTUDIO_SIN_REINTENTOS'),
    )
    await montar()
    await act(async () => {
      q('[data-testid="reintentar-estudio"]')!.click()
    })
    await flush()
    expect(q('[data-testid="reintentar-estudio"]')).toBeNull()
    expect(q('[data-testid="empezar-estudio-nuevo"]')).not.toBeNull()
  })

  it('409 ESTUDIO_NO_REINTENTABLE al reintentar: vuelve a leer el estudio', async () => {
    actual.mockResolvedValue(estudio({ status: 'FAILED', error: errorDelEstudio() }))
    reintentar.mockRejectedValue(new EstudioDeCanonError(409, 'ya no se puede', 'ESTUDIO_NO_REINTENTABLE'))
    await montar()
    expect(actual).toHaveBeenCalledTimes(1)
    await act(async () => {
      q('[data-testid="reintentar-estudio"]')!.click()
    })
    await flush()
    expect(actual).toHaveBeenCalledTimes(2)
    expect(q('[data-testid="error-general"]')?.textContent).toContain('ya no se puede')
  })

  it('503 al reintentar: dice el error y deja volver a apretar', async () => {
    actual.mockResolvedValue(estudio({ status: 'FAILED', error: errorDelEstudio() }))
    reintentar.mockRejectedValue(new EstudioDeCanonError(503, 'El servicio no está disponible. Reintenta en un momento.', 'SERVICIO_NO_DISPONIBLE'))
    await montar()
    await act(async () => {
      q('[data-testid="reintentar-estudio"]')!.click()
    })
    await flush()
    expect(q('[data-testid="error-general"]')?.textContent).toContain('Reintenta')
    expect((q('[data-testid="reintentar-estudio"]') as HTMLButtonElement).disabled).toBe(false)
  })

  describe('T-0198: enfriamiento del reintento', () => {
    const AHORA = new Date('2026-10-29T15:00:00.000Z')
    const DESDE = new Date(AHORA.getTime() + 10 * 60_000).toISOString()

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      vi.setSystemTime(AHORA)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    async function avanzar(ms: number) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
      })
    }
    async function montarConTiempoFalso() {
      window.history.pushState({}, '', '/aprobacion')
      await act(async () => {
        root.render(<AprobacionPage />)
      })
      await avanzar(0)
    }
    const boton = () => q('[data-testid="reintentar-estudio"]') as HTMLButtonElement

    it('SERVICIO_NO_DISPONIBLE: dice que hay problemas, no culpa un documento y bloquea "Reintentar" hasta la hora', async () => {
      actual.mockResolvedValue(
        estudio({
          status: 'FAILED',
          error: errorDelEstudio({
            codigo: 'SERVICIO_NO_DISPONIBLE',
            mensaje: 'Estamos teniendo problemas con el sistema. Intenta de nuevo en 10 minutos.',
            documentoConError: 'cedula',
            reintentarDesde: DESDE,
          }),
        }),
      )
      await montarConTiempoFalso()
      expect(q('[data-testid="vista-fallido"]')!.textContent).toContain(
        'Estamos teniendo problemas con el sistema. Intenta de nuevo en 10 minutos.',
      )
      expect(q('[data-testid="documento-con-error"]')).toBeNull()
      expect(boton().disabled).toBe(true)
      expect(q('[data-testid="reintentar-desde"]')!.textContent).toMatch(/Podrás intentarlo de nuevo a las \d{2}:\d{2}/)
      expect(vi.getTimerCount()).toBe(1)

      await avanzar(10 * 60_000 - 1)
      expect(boton().disabled).toBe(true)
      await avanzar(1)
      expect(boton().disabled).toBe(false)
      expect(q('[data-testid="reintentar-desde"]')).toBeNull()
      // One timer, no polling: nothing else was scheduled and /actual was read once.
      expect(vi.getTimerCount()).toBe(0)
      expect(actual).toHaveBeenCalledTimes(1)
    })

    it('cualquier código con reintentarDesde futuro bloquea; con uno pasado o ausente no', async () => {
      actual.mockResolvedValue(
        estudio({ status: 'FAILED', error: errorDelEstudio({ codigo: 'ESTUDIO_FALLIDO', reintentarDesde: DESDE }) }),
      )
      await montarConTiempoFalso()
      expect(boton().disabled).toBe(true)
      act(() => root.unmount())
      expect(vi.getTimerCount()).toBe(0)
      root = createRoot(container)

      actual.mockResolvedValue(
        estudio({
          status: 'FAILED',
          error: errorDelEstudio({ reintentarDesde: new Date(AHORA.getTime() - 1000).toISOString() }),
        }),
      )
      await montarConTiempoFalso()
      expect(boton().disabled).toBe(false)
      expect(q('[data-testid="reintentar-desde"]')).toBeNull()
    })

    it('409 REINTENTO_MUY_PRONTO: deja el botón apagado hasta el instante devuelto y luego lo reabre', async () => {
      actual.mockResolvedValue(estudio({ status: 'FAILED', error: errorDelEstudio() }))
      reintentar.mockRejectedValue(
        new EstudioDeCanonError(409, 'Aún no puedes reintentar.', 'REINTENTO_MUY_PRONTO', undefined, DESDE),
      )
      await montarConTiempoFalso()
      expect(boton().disabled).toBe(false)
      await act(async () => {
        boton().click()
      })
      await avanzar(0)
      expect(boton().disabled).toBe(true)
      expect(q('[data-testid="reintentar-desde"]')).not.toBeNull()
      expect(reintentar).toHaveBeenCalledTimes(1)

      await avanzar(10 * 60_000)
      expect(boton().disabled).toBe(false)
    })
  })

  it('PROCESSING: dice que puede tardar unos minutos y que se puede volver o recargar', async () => {
    actual.mockResolvedValue(estudio({ status: 'PROCESSING' }))
    await montar()
    const t = q('[data-testid="vista-procesando"]')?.textContent ?? ''
    expect(t).toContain('unos minutos')
    expect(t).toMatch(/recargar/i)
  })
})

describe('<AprobacionPage> — reglas de producto', () => {
  it('con el inmueble en curso (paso 2 de la ficha) muestra el inmueble y los pasos del arriendo', async () => {
    window.sessionStorage.setItem(
      'leasefy:arriendo-en-curso',
      JSON.stringify({
        propertyId: 'p1',
        titulo: 'Apto en Chapinero',
        ciudad: 'Bogotá',
        tipo: 'apartamento',
        foto: null,
        canon: 2_000_000,
        ingresoTotal: 7_000_000,
        canonMaximo: 2_300_000,
        guardadoEn: Date.now(),
      }),
    )
    await montar('/aprobacion?paso=2')
    expect(q('[data-testid="paso-2-de-3"]')).not.toBeNull()
    expect(q('[data-testid="inmueble-del-paso-2"]')?.textContent).toContain('Apto en Chapinero')
    window.sessionStorage.clear()
  })

  it.each(['autorizar', 'documentos', 'procesando', 'fallido'] as const)(
    'la vista "%s" no habla de aseguradoras, pagos ni depósitos',
    async (vista) => {
      const estados = {
        autorizar: null,
        documentos: estudio(),
        procesando: estudio({ status: 'PROCESSING' }),
        fallido: estudio({ status: 'FAILED', error: errorDelEstudio({ codigo: 'ESTUDIO_FALLIDO', mensaje: 'No pudimos terminar.' }) }),
      }
      actual.mockResolvedValue(estados[vista])
      await montar()
      expect(container.textContent ?? '').not.toMatch(/asegurador|sura\b|mapfre|fianly|fianli|wompi|dep[oó]sito|pagar|pagas/i)
    },
  )
})
