/**
 * El paso a paso de `/auth/mfa-enroll` (Nico, 30-09-2026: «EXPLIQUEMOSLE, QUE
 * DEBE HACER»). Lo que se prueba acá es lo que la persona necesita para no
 * perderse y lo que evita el rebote que vio Nico:
 *   · los tres pasos se ven y se sabe en cuál va;
 *   · los enlaces a las tiendas son los OFICIALES;
 *   · el QR y la clave (con copiar) aparecen al continuar;
 *   · el sexto dígito envía UNA vez, por el SDK (no por HTTP);
 *   · los errores salen en español;
 *   · nunca aparece «Desactivar» (la tarjeta de Configuración).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { challengeMock, verifyMock } = vi.hoisted(() => ({
  challengeMock: vi.fn(),
  verifyMock: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'token-aal1',
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: { challenge: challengeMock, verify: verifyMock } } }),
}))

import { ActivarSegundoFactorPasoAPaso, APPS_RECOMENDADAS } from './ActivarSegundoFactorPasoAPaso'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

let container: HTMLDivElement
let root: Root
let fetchMock: ReturnType<typeof vi.fn>
let factoresDeLaCuenta: Array<{ id: string; factor_type: string; status: string }>

function respuesta(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response
}

beforeEach(() => {
  factoresDeLaCuenta = []
  challengeMock.mockReset().mockResolvedValue({ data: { id: 'ch1' }, error: null })
  verifyMock.mockReset().mockResolvedValue({ data: { access_token: 'token-aal2' }, error: null })
  fetchMock = vi.fn(async (url: string) => {
    const u = String(url)
    if (u.endsWith('/user')) return respuesta({ factors: factoresDeLaCuenta })
    if (u.endsWith('/factors')) {
      return respuesta({
        id: 'f-nuevo',
        totp: { qr_code: '<svg/>', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Leasefy?secret=JBSWY3DPEHPK3PXP' },
      })
    }
    return respuesta({})
  })
  vi.stubGlobal('fetch', fetchMock)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const props = () => ({ onActivado: vi.fn(), onYaTeniaFactor: vi.fn() })

async function montar(p: ReturnType<typeof props> & { sinEncabezado?: boolean } = props()) {
  await act(async () => {
    root.render(<ActivarSegundoFactorPasoAPaso {...p} />)
  })
  return p
}

function porTestId(id: string) {
  return container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
}

async function clic(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** Escribe en la primera casilla: las casillas reparten los dígitos solas. */
async function escribirCodigo(codigo: string) {
  const primera = porTestId('casilla-0') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(primera, codigo)
    primera.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function irAlPasoDelCodigo() {
  await clic(porTestId('ya-tengo-la-app'))
  await clic(porTestId('ya-lo-agregue'))
}

describe('<ActivarSegundoFactorPasoAPaso>', () => {
  it('muestra los tres pasos, explica por qué y arranca en «Descarga la app»', async () => {
    await montar()
    const texto = container.textContent ?? ''
    expect(texto).toContain('Activa tu segundo factor')
    // Nico, 30-09: el porqué va corto («es muy largo»), pero sigue diciendo
    // que es por la plata que maneja el rol.
    expect(texto).toContain('Tu rol maneja plata')
    expect(porTestId('indicador-app')?.getAttribute('aria-current')).toBe('step')
    expect(porTestId('indicador-escanear')?.textContent).toContain('Escanea el código')
    expect(porTestId('indicador-codigo')?.textContent).toContain('Escribe el código')
    expect(texto).toContain('Paso 1 de 3')
    expect(texto).toContain('Sirve cualquier app de códigos')
    // Qué hacer si cambia de celular: el flujo que YA existe, sin inventar otro.
    expect(texto).toContain('No tengo la app de autenticación')
  })

  it('con `sinEncabezado` (dentro del panel) no repite el porqué: lo pone la tarjeta que la monta', async () => {
    await montar({ ...props(), sinEncabezado: true })
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('Activa tu segundo factor')
    expect(texto).not.toContain('Tu rol maneja plata')
    expect(container.querySelector('h1')).toBeNull()
    // Los pasos siguen intactos.
    expect(porTestId('indicador-app')?.getAttribute('aria-current')).toBe('step')
    expect(texto).toContain('Paso 1 de 3')
  })

  it('enlaza las fichas OFICIALES de App Store y Google Play de cada app, en otra pestaña', async () => {
    await montar()
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(
      expect.arrayContaining([
        'https://apps.apple.com/app/google-authenticator/id388497605',
        'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
        'https://apps.apple.com/app/microsoft-authenticator/id983156458',
        'https://play.google.com/store/apps/details?id=com.azure.authenticator',
      ]),
    )
    for (const a of container.querySelectorAll('a[target="_blank"]')) {
      expect(a.getAttribute('rel')).toContain('noopener')
    }
    expect(APPS_RECOMENDADAS.map((a) => a.nombre)).toEqual([
      'Google Authenticator',
      'Microsoft Authenticator',
    ])
  })

  it('al continuar crea el factor por HTTP y muestra el QR y la clave, con copiar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await montar()

    await clic(porTestId('ya-tengo-la-app'))

    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith('/factors'))).toBe(true)
    expect(porTestId('indicador-escanear')?.getAttribute('aria-current')).toBe('step')
    expect(porTestId('qr-del-segundo-factor')?.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)

    // En escritorio la clave va plegada; se abre a pedido.
    const abrirClave = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Escribe la clave a mano'),
    )
    await clic(abrirClave ?? null)
    expect(porTestId('clave-del-segundo-factor')?.textContent).toBe('JBSW Y3DP EHPK 3PXP')

    await clic(porTestId('copiar-clave'))
    // Se copia la clave cruda, sin los espacios de lectura.
    expect(writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP')
    expect(porTestId('copiar-clave')?.textContent).toContain('Copiada')
  })

  it('🔴 el sexto dígito verifica UNA vez y por el SDK (no por HTTP); un clic mientras tanto no reenvía', async () => {
    let soltar: (v: unknown) => void = () => {}
    verifyMock.mockReturnValueOnce(new Promise((r) => (soltar = r)))
    const p = await montar()
    await irAlPasoDelCodigo()

    await escribirCodigo('123456')
    // Mientras verifica: un clic en el botón no manda otra verificación.
    await clic(porTestId('activar-segundo-factor'))

    expect(challengeMock).toHaveBeenCalledTimes(1)
    expect(challengeMock).toHaveBeenCalledWith({ factorId: 'f-nuevo' })
    expect(verifyMock).toHaveBeenCalledTimes(1)
    expect(verifyMock).toHaveBeenCalledWith({ factorId: 'f-nuevo', challengeId: 'ch1', code: '123456' })
    // Nada por HTTP crudo: eso dejaba la sesión en aal1 y causaba el rebote.
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.endsWith('/challenge') || u.endsWith('/verify'))).toBe(false)

    await act(async () => {
      soltar({ data: { access_token: 'token-aal2' }, error: null })
    })

    expect(p.onActivado).toHaveBeenCalledTimes(1)
    expect(p.onActivado).toHaveBeenCalledWith('f-nuevo')
    expect(porTestId('segundo-factor-listo')?.textContent).toContain('Tu cuenta quedó protegida')
    expect(container.textContent).not.toContain('Desactivar')
  })

  it('un código malo se explica en español, limpia las casillas y deja intentar con el siguiente', async () => {
    verifyMock.mockResolvedValueOnce({
      data: null,
      error: { status: 422, code: 'mfa_verification_failed', message: 'Invalid TOTP code entered' },
    })
    const p = await montar()
    await irAlPasoDelCodigo()

    await escribirCodigo('000000')

    const alerta = porTestId('error-del-codigo')
    expect(alerta?.getAttribute('role')).toBe('alert')
    expect(alerta?.textContent).toContain('Código incorrecto')
    expect(alerta?.textContent).not.toMatch(/invalid|error \d{3}/i)
    expect((porTestId('casilla-0') as HTMLInputElement).value).toBe('')
    expect(p.onActivado).not.toHaveBeenCalled()

    await escribirCodigo('654321')
    expect(verifyMock).toHaveBeenCalledTimes(2)
    expect(p.onActivado).toHaveBeenCalledTimes(1)
  })

  it('si crear el factor falla, lo dice en español y se queda en el paso 1', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith('/user')) return respuesta({ factors: [] })
      return respuesta({ error_code: 'over_request_rate_limit', msg: 'Too many requests' }, false, 429)
    })
    await montar()
    await clic(porTestId('ya-tengo-la-app'))

    expect(porTestId('error-al-preparar')?.textContent).toContain('Demasiados intentos seguidos')
    expect(porTestId('paso-descargar')).not.toBeNull()
  })

  it('si la cuenta YA tenía un factor verificado, avisa y no crea otro', async () => {
    factoresDeLaCuenta = [{ id: 'f-viejo', factor_type: 'totp', status: 'verified' }]
    const p = await montar()
    await act(async () => {
      await Promise.resolve()
    })
    expect(p.onYaTeniaFactor).toHaveBeenCalledTimes(1)

    await clic(porTestId('ya-tengo-la-app'))
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith('/factors'))).toBe(false)
  })

  it('si se va a mitad de camino, el factor sin verificar no queda colgado', async () => {
    await montar()
    await clic(porTestId('ya-tengo-la-app'))

    await act(async () => root.unmount())
    root = createRoot(container)

    const borrado = fetchMock.mock.calls.find(
      (c) => String(c[0]).endsWith('/factors/f-nuevo') && (c[1] as RequestInit)?.method === 'DELETE',
    )
    expect(borrado).toBeTruthy()
  })
})
