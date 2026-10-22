/**
 * El puente con la app de iOS/Android (`lib/app-nativa`). En el navegador no hace
 * nada; dentro de la app (aquí, con un `window.Capacitor` falso que anota cada
 * llamada nativa) descarga, abre enlaces, pide avisos y entra con Google.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ patch: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { patch: api.patch } }))

const supabase = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithIdToken: vi.fn(),
  updateUser: vi.fn(),
}))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ auth: supabase }) }))

import { esLaApp, plataformaDeLaApp, plataformaPorElUserAgent } from './puente'
import { instalarAbrirYDescargar, nombreDeArchivoSeguro } from './abrir-y-descargar'
import { entrarConAppleEnLaApp, entrarConGoogleEnLaApp, hayUnaEntradaConGoogleEnCurso, rutaDelRegresoDeLaApp } from './entrar'
import { esTokenDeFcm, registrarAvisosEnLaApp } from './avisos'
import { manejarBotonAtras, rutaInternaDeLeasefy } from './navegacion'
import { asociacionDeAndroid, asociacionDeApple, huellasDeAndroid } from './enlaces-de-la-app'

type Llamada = { plugin: string; metodo: string; opciones: Record<string, unknown> }

/** Un `window.Capacitor` como el que inyecta la app. `respuestas` decide qué contesta cada método. */
function simularLaApp(plataforma: 'ios' | 'android', respuestas: Record<string, (o: Record<string, unknown>) => unknown> = {}) {
  const llamadas: Llamada[] = []
  const escuchas: { plugin: string; evento: string; alOir: (d: unknown) => void }[] = []
  ;(window as unknown as { Capacitor: unknown }).Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => plataforma,
    nativePromise: async (plugin: string, metodo: string, opciones: Record<string, unknown> = {}) => {
      llamadas.push({ plugin, metodo, opciones })
      const r = respuestas[`${plugin}.${metodo}`]
      return r ? r(opciones) : {}
    },
    addListener: (plugin: string, evento: string, alOir: (d: unknown) => void) => {
      const escucha = { plugin, evento, alOir }
      escuchas.push(escucha)
      return { remove: () => escuchas.splice(escuchas.indexOf(escucha), 1) }
    },
  }
  const emitir = (plugin: string, evento: string, datos: unknown) =>
    escuchas.filter((e) => e.plugin === plugin && e.evento === evento).forEach((e) => e.alOir(datos))
  return { llamadas, emitir, escuchas }
}

const esperar = () => new Promise((r) => setTimeout(r, 0))
async function hasta(condicion: () => boolean) {
  for (let i = 0; i < 50 && !condicion(); i++) await new Promise((r) => setTimeout(r, 5))
}

afterEach(() => {
  delete (window as unknown as { Capacitor?: unknown }).Capacitor
  vi.restoreAllMocks()
  api.patch.mockReset()
  Object.values(supabase).forEach((f) => f.mockReset())
  document.body.innerHTML = ''
})

describe('puente', () => {
  it('en el navegador no es la app', () => {
    expect(esLaApp()).toBe(false)
    expect(plataformaDeLaApp()).toBeNull()
  })

  it('reconoce la app y su plataforma', () => {
    simularLaApp('android')
    expect(esLaApp()).toBe(true)
    expect(plataformaDeLaApp()).toBe('android')
  })

  it('en el servidor la reconoce por el user-agent (LeasefyApp/1)', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LeasefyApp/1'
    const android = 'Mozilla/5.0 (Linux; Android 16; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 LeasefyApp/1'
    expect(plataformaPorElUserAgent(iphone)).toBe('ios')
    expect(plataformaPorElUserAgent(android)).toBe('android')
    expect(plataformaPorElUserAgent('Mozilla/5.0 (iPhone) Safari/604.1')).toBeNull()
    expect(plataformaPorElUserAgent(null)).toBeNull()
  })
})

describe('descargas y enlaces', () => {
  it('fuera de la app no instala nada', () => {
    const abrir = window.open
    const quitar = instalarAbrirYDescargar()
    expect(window.open).toBe(abrir)
    quitar()
  })

  it('el nombre del archivo sirve en el celular y lleva su extensión', () => {
    expect(nombreDeArchivoSeguro('Contrato 12/2026: Pérez', 'application/pdf')).toBe('2026 Pérez.pdf')
    expect(nombreDeArchivoSeguro('inquilinos.xlsx', 'application/octet-stream')).toBe('inquilinos.xlsx')
    expect(nombreDeArchivoSeguro('', 'text/csv')).toBe('documento-de-leasefy.csv')
    expect(nombreDeArchivoSeguro(undefined, undefined)).toBe('documento-de-leasefy')
  })

  it('un <a download> con un blob se guarda y abre la hoja de compartir (aunque la pantalla revoque el blob)', async () => {
    const app = simularLaApp('ios', { 'Filesystem.writeFile': () => ({ uri: 'file:///cache/descargas/1/Recibo.pdf' }) })
    const quitar = instalarAbrirYDescargar()
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Recibo'
    a.click()
    URL.revokeObjectURL(url) // lo que hacen las pantallas justo después
    await hasta(() => app.llamadas.some((l) => l.plugin === 'Share'))
    const escrito = app.llamadas.find((l) => l.metodo === 'writeFile')!
    expect(escrito.plugin).toBe('Filesystem')
    expect(escrito.opciones.directory).toBe('CACHE')
    expect(String(escrito.opciones.path)).toMatch(/^descargas\/\d+\/Recibo\.pdf$/)
    expect(typeof escrito.opciones.data).toBe('string')
    const compartido = app.llamadas.find((l) => l.plugin === 'Share')!
    expect(compartido.opciones.files).toEqual(['file:///cache/descargas/1/Recibo.pdf'])
    quitar()
  })

  it('la pestaña que se abre vacía y se llena después del await abre el destino en el navegador de la app', async () => {
    const app = simularLaApp('ios')
    const quitar = instalarAbrirYDescargar()
    const ventana = window.open('', '_blank')
    expect(ventana).not.toBeNull()
    ventana!.location.href = 'https://checkout.wompi.co/l/abc123'
    await hasta(() => app.llamadas.some((l) => l.plugin === 'Browser'))
    const abierto = app.llamadas.find((l) => l.plugin === 'Browser')!
    expect(abierto.metodo).toBe('open')
    expect(abierto.opciones.url).toBe('https://checkout.wompi.co/l/abc123')
    quitar()
  })

  it('cerrar la pestaña antes de llenarla no abre nada', async () => {
    const app = simularLaApp('android')
    const quitar = instalarAbrirYDescargar()
    const ventana = window.open('about:blank', '_blank')!
    ventana.close()
    ventana.location.href = 'https://checkout.wompi.co/l/abc123'
    await esperar()
    expect(app.llamadas.some((l) => l.plugin === 'Browser')).toBe(false)
    quitar()
  })

  it('un enlace externo con target=_blank se abre en el navegador de la app, no en Safari', async () => {
    const app = simularLaApp('ios')
    const quitar = instalarAbrirYDescargar()
    document.body.innerHTML = '<a id="externo" href="https://www.youtube.com/watch?v=1" target="_blank">ver</a>'
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    document.getElementById('externo')!.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(true)
    await hasta(() => app.llamadas.some((l) => l.plugin === 'Browser'))
    expect(app.llamadas.find((l) => l.plugin === 'Browser')!.opciones.url).toBe('https://www.youtube.com/watch?v=1')
    quitar()
  })

  it('un enlace interno sin target sigue su camino normal', () => {
    simularLaApp('ios')
    const quitar = instalarAbrirYDescargar()
    document.body.innerHTML = '<a id="interno" href="/panel/inmobiliaria">ir</a>'
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    document.getElementById('interno')!.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)
    quitar()
  })

  it('al cerrar el navegador de la app (después de pagar) la pantalla recupera el foco', () => {
    const app = simularLaApp('ios')
    const quitar = instalarAbrirYDescargar()
    const alFoco = vi.fn()
    window.addEventListener('focus', alFoco)
    app.emitir('Browser', 'browserFinished', {})
    expect(alFoco).toHaveBeenCalled()
    window.removeEventListener('focus', alFoco)
    quitar()
  })
})

describe('entrar con Google en la app', () => {
  it('lee el regreso de la app y arma la ruta de la web que canjea (sin la marca)', () => {
    expect(rutaDelRegresoDeLaApp('co.leasefy.app://auth/callback?code=abc&returnUrl=%2Fauth%2Fpost-login')).toBe(
      '/auth/callback?code=abc&returnUrl=%2Fauth%2Fpost-login',
    )
    expect(rutaDelRegresoDeLaApp('https://leasefy.co/auth/callback?app=1&code=abc')).toBe('/auth/callback?code=abc')
    expect(rutaDelRegresoDeLaApp('co.leasefy.app://auth/callback?error=access_denied')).toBe(
      '/auth/callback?error=access_denied',
    )
    expect(rutaDelRegresoDeLaApp('co.leasefy.app://auth/callback')).toBeNull()
    expect(rutaDelRegresoDeLaApp('https://leasefy.co/panel')).toBeNull()
    expect(rutaDelRegresoDeLaApp('no es una url')).toBeNull()
  })

  it('pide la dirección de Google sin redirigir, la abre en la hoja segura y canjea en /auth/callback', async () => {
    const app = simularLaApp('ios', {
      'LeasefyNativo.abrir': () => ({ url: 'co.leasefy.app://auth/callback?code=xyz&returnUrl=%2Fauth%2Fpost-login%3FreturnUrl%3D%252Fpublicar' }),
    })
    supabase.signInWithOAuth.mockResolvedValue({ data: { url: 'https://supabase.example/auth/v1/authorize?provider=google' }, error: null })
    const asignar = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, origin: 'https://leasefy.co', assign: asignar } as Location)

    await entrarConGoogleEnLaApp('/publicar')

    const pedido = supabase.signInWithOAuth.mock.calls[0][0]
    expect(pedido.provider).toBe('google')
    expect(pedido.options.skipBrowserRedirect).toBe(true)
    const vuelta = new URL(pedido.options.redirectTo)
    expect(vuelta.pathname).toBe('/auth/callback')
    expect(vuelta.searchParams.get('app')).toBe('1')
    expect(vuelta.searchParams.get('returnUrl')).toBe('/auth/post-login?returnUrl=%2Fpublicar')
    expect(app.llamadas.find((l) => l.metodo === 'abrir')!.opciones).toMatchObject({
      url: 'https://supabase.example/auth/v1/authorize?provider=google',
      esquema: 'co.leasefy.app',
    })
    expect(asignar).toHaveBeenCalledWith('/auth/callback?code=xyz&returnUrl=%2Fauth%2Fpost-login%3FreturnUrl%3D%252Fpublicar')
    expect(hayUnaEntradaConGoogleEnCurso()).toBe(true)
  })

  it('si la persona cierra la hoja de Google, no es un error y no navega', async () => {
    simularLaApp('android', {
      'LeasefyNativo.abrir': () => {
        throw Object.assign(new Error('cerró'), { code: 'CANCELADO' })
      },
    })
    supabase.signInWithOAuth.mockResolvedValue({ data: { url: 'https://supabase.example/authorize' }, error: null })
    const asignar = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, origin: 'https://leasefy.co', assign: asignar } as Location)
    await expect(entrarConGoogleEnLaApp()).resolves.toBeUndefined()
    expect(asignar).not.toHaveBeenCalled()
    expect(hayUnaEntradaConGoogleEnCurso()).toBe(false)
  })

  it('Apple: manda a Apple el SHA-256 del nonce y a Supabase el nonce crudo', async () => {
    let nonceDeApple = ''
    simularLaApp('ios', {
      'LeasefyNativo.entrarConApple': (o) => {
        nonceDeApple = String(o.nonce)
        return { identityToken: 'token-de-apple', nombre: 'Ana', apellido: 'Gómez' }
      },
    })
    supabase.signInWithIdToken.mockResolvedValue({ error: null })
    supabase.updateUser.mockResolvedValue({ error: null })
    const asignar = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, origin: 'https://leasefy.co', assign: asignar } as Location)

    await entrarConAppleEnLaApp('/inquilino')

    const { provider, token, nonce } = supabase.signInWithIdToken.mock.calls[0][0]
    expect(provider).toBe('apple')
    expect(token).toBe('token-de-apple')
    const huella = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
    const hex = Array.from(new Uint8Array(huella), (b) => b.toString(16).padStart(2, '0')).join('')
    expect(nonceDeApple).toBe(hex)
    expect(supabase.updateUser).toHaveBeenCalledWith({ data: { full_name: 'Ana Gómez', given_name: 'Ana', family_name: 'Gómez' } })
    expect(asignar).toHaveBeenCalledWith('/auth/post-login?returnUrl=%2Finquilino')
  })
})

describe('avisos en la app', () => {
  it('distingue un token de FCM de uno de Apple', () => {
    expect(esTokenDeFcm('d1f4' + 'a'.repeat(60))).toBe(false)
    expect(esTokenDeFcm('cXyZ:APA91b' + 'x'.repeat(140))).toBe(true)
  })

  it('sin Firebase no pide permiso ni token', async () => {
    const app = simularLaApp('android', { 'LeasefyNativo.estado': () => ({ firebase: false, plataforma: 'android' }) })
    expect(await registrarAvisosEnLaApp()).toBeNull()
    expect(app.llamadas.some((l) => l.plugin === 'PushNotifications')).toBe(false)
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('con permiso, registra el celular y manda el token al back (el mismo endpoint de la web)', async () => {
    const token = 'cXyZ:APA91b' + 'x'.repeat(140)
    const app = simularLaApp('android', {
      'LeasefyNativo.estado': () => ({ firebase: true, plataforma: 'android' }),
      'PushNotifications.checkPermissions': () => ({ receive: 'prompt' }),
      'PushNotifications.requestPermissions': () => ({ receive: 'granted' }),
      'PushNotifications.register': () => {
        setTimeout(() => app.emitir('PushNotifications', 'registration', { value: token }), 0)
        return {}
      },
    })
    api.patch.mockResolvedValue({})
    expect(await registrarAvisosEnLaApp()).toBe(token)
    expect(api.patch).toHaveBeenCalledWith('/users/me/fcm-token', { fcmToken: token })
  })

  it('si la persona no da permiso, no registra nada', async () => {
    simularLaApp('ios', {
      'LeasefyNativo.estado': () => ({ firebase: true, plataforma: 'ios' }),
      'PushNotifications.checkPermissions': () => ({ receive: 'denied' }),
    })
    expect(await registrarAvisosEnLaApp()).toBeNull()
    expect(api.patch).not.toHaveBeenCalled()
  })
})

describe('navegación en la app', () => {
  beforeEach(() => {
    simularLaApp('android')
  })

  it('las direcciones de leasefy.co se vuelven rutas internas; las de otro sitio no', () => {
    expect(rutaInternaDeLeasefy('https://leasefy.co/inquilino/pagos?mes=10#arriba')).toBe('/inquilino/pagos?mes=10#arriba')
    expect(rutaInternaDeLeasefy('/panel/inmobiliaria/contratos')).toBe('/panel/inmobiliaria/contratos')
    expect(rutaInternaDeLeasefy('https://otro.com/panel')).toBeNull()
    expect(rutaInternaDeLeasefy('//otro.com/panel')).toBeNull()
  })

  it('«atrás» con un cajón abierto lo cierra (Escape) y no vuelve de pantalla', () => {
    document.body.innerHTML = '<div role="dialog" data-state="open"><button id="dentro">x</button></div>'
    document.getElementById('dentro')!.focus()
    const teclas: string[] = []
    document.addEventListener('keydown', (e) => teclas.push(e.key))
    const volver = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    manejarBotonAtras(true)
    expect(teclas).toEqual(['Escape'])
    expect(volver).not.toHaveBeenCalled()
  })

  it('«atrás» sin nada abierto vuelve a la pantalla anterior', () => {
    const volver = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    manejarBotonAtras(true)
    expect(volver).toHaveBeenCalled()
  })
})

describe('enlaces que abren la app', () => {
  it('Apple: la app con el Team ID y el regreso de Google excluido primero', () => {
    const aasa = asociacionDeApple('ABCDE12345')
    const detalle = aasa.applinks.details[0]
    expect(detalle.appIDs).toEqual(['ABCDE12345.co.leasefy.app'])
    expect(detalle.components[0]).toMatchObject({ '/': '/auth/callback', '?': { app: '1' }, exclude: true })
    expect(detalle.components).toContainEqual({ '/': '/invitacion*' })
    expect(aasa.webcredentials.apps).toEqual(['ABCDE12345.co.leasefy.app'])
  })

  it('Android: sólo huellas SHA-256 bien formadas', () => {
    const buena = Array.from({ length: 32 }, () => 'ab').join(':')
    expect(huellasDeAndroid(` ${buena} , no-sirve,`)).toEqual([buena.toUpperCase()])
    expect(huellasDeAndroid(undefined)).toEqual([])
    expect(asociacionDeAndroid([buena])[0].target.package_name).toBe('co.leasefy.app')
  })
})
