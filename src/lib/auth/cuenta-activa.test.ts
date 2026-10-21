import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  cabecerasDeLaCuenta,
  cabecerasParaLaRuta,
  cuentaEnPantalla,
  fijarCuentasDeLaSesion,
  guardarCuenta,
  leerCuentaGuardada,
  leerCuentasDeLaPersona,
  opcionesDeCuenta,
  portalDeLaRuta,
  tieneElPapelDeLaRuta,
  tieneVariasCuentas,
  ultimaCuentaValida,
  type CuentasDeLaPersona,
} from './cuenta-activa'
import { inicioDeLaPersona } from './role-routes'

/**
 * «Cambiar de cuenta» (Nico, 21-10-2026): una persona, un correo, varios
 * papeles. La cuenta de cada petición sale de la pantalla; la última usada
 * decide a dónde entra.
 */

const ANA: CuentasDeLaPersona = {
  rolDeRegistro: 'TENANT',
  inquilino: true,
  propietario: true,
  inmobiliarias: [
    { id: 'alfa', nombre: 'Alfa Inmobiliaria', rol: 'ADMIN', nombreEnLaInmobiliaria: null },
    { id: 'beta', nombre: 'Beta', rol: 'COORDINADOR', nombreEnLaInmobiliaria: 'Ana R.' },
  ],
}
const SOLO_INQUILINO: CuentasDeLaPersona = { rolDeRegistro: 'TENANT', inquilino: true, propietario: false, inmobiliarias: [] }

beforeEach(() => window.localStorage.clear())
afterEach(() => fijarCuentasDeLaSesion(null, null))

describe('leerCuentasDeLaPersona', () => {
  it('lo de un back anterior (sin el campo) o raro es «no se sabe»', () => {
    expect(leerCuentasDeLaPersona(undefined)).toBeNull()
    expect(leerCuentasDeLaPersona({ inquilino: 'sí' })).toBeNull()
  })
  it('limpia nombres vacíos y filas sin id', () => {
    expect(
      leerCuentasDeLaPersona({
        rolDeRegistro: 'AGENT',
        inquilino: false,
        propietario: false,
        inmobiliarias: [{ id: 'a', nombre: '  ', rol: 'ADMIN' }, { nombre: 'sin id' }],
      }),
    ).toEqual({
      rolDeRegistro: 'AGENT',
      inquilino: false,
      propietario: false,
      inmobiliarias: [{ id: 'a', nombre: null, rol: 'ADMIN', nombreEnLaInmobiliaria: null }],
    })
  })
})

describe('opcionesDeCuenta', () => {
  it('todas en un solo lugar: cada inmobiliaria con su cargo, después inquilino y propietario', () => {
    expect(opcionesDeCuenta(ANA).map((o) => [o.clave, o.titulo, o.detalle])).toEqual([
      ['inmobiliaria:alfa', 'Alfa Inmobiliaria', 'Inmobiliaria · Administrador'],
      ['inmobiliaria:beta', 'Beta', 'Inmobiliaria · Coordinador'],
      ['inquilino', 'Inquilino', 'Arriendo, pagos y contratos'],
      ['propietario', 'Propietario', 'Inmuebles, giros y certificados'],
    ])
    expect(tieneVariasCuentas(ANA)).toBe(true)
  })
  it('con una sola cuenta no hay nada que cambiar', () => {
    expect(tieneVariasCuentas(SOLO_INQUILINO)).toBe(false)
    expect(tieneVariasCuentas(null)).toBe(false)
  })
  it('la cuenta de inmobiliaria que todavía crea la suya cuenta como inmobiliaria', () => {
    const c: CuentasDeLaPersona = { rolDeRegistro: 'AGENT', inquilino: true, propietario: false, inmobiliarias: [] }
    expect(opcionesDeCuenta(c).map((o) => o.clave)).toEqual(['inmobiliaria:', 'inquilino'])
  })
})

describe('la cuenta de cada pantalla', () => {
  it('el portal sale de la ruta', () => {
    expect(portalDeLaRuta('/inquilino/pagos')).toBe('inquilino')
    expect(portalDeLaRuta('/panel/inmobiliaria/contratos')).toBe('inmobiliaria')
    expect(portalDeLaRuta('/panel/estado-de-cuenta')).toBe('propietario')
    expect(portalDeLaRuta('/propiedades')).toBeNull()
    expect(portalDeLaRuta('/inquilinos')).toBeNull()
  })
  it('sólo entra por papel a lo que tiene', () => {
    expect(tieneElPapelDeLaRuta('/inquilino', ANA)).toBe(true)
    expect(tieneElPapelDeLaRuta('/panel', SOLO_INQUILINO)).toBe(false)
    expect(tieneElPapelDeLaRuta('/inquilino', null)).toBe(false)
  })
  it('en el panel abre la última inmobiliaria que usó; si ya no es suya, la más vieja', () => {
    expect(cuentaEnPantalla('/panel/inmobiliaria', ANA, { tipo: 'inquilino', inmobiliariaId: 'beta' })).toEqual({
      tipo: 'inmobiliaria',
      inmobiliariaId: 'beta',
    })
    expect(cuentaEnPantalla('/panel/inmobiliaria', ANA, { tipo: 'inmobiliaria', inmobiliariaId: 'ya-no' })).toEqual({
      tipo: 'inmobiliaria',
      inmobiliariaId: 'alfa',
    })
  })
})

describe('cabeceras de cada petición', () => {
  it('🔴 en el portal del inquilino pide como inquilino (nunca la cartera de la inmobiliaria)', () => {
    expect(cabecerasParaLaRuta('/inquilino/contratos', ANA, null)).toEqual({ 'x-inmobiliaria': 'alfa', 'x-cuenta': 'inquilino' })
  })
  it('en el panel de la inmobiliaria: sólo cuál (el panel queda como antes)', () => {
    expect(cabecerasParaLaRuta('/panel/inmobiliaria', ANA, { tipo: 'inmobiliaria', inmobiliariaId: 'beta' })).toEqual({
      'x-inmobiliaria': 'beta',
    })
  })
  it('fuera de los portales sólo la inmobiliaria (el arranque trae la misma que mostrará el panel)', () => {
    expect(cabecerasParaLaRuta('/auth/post-login', ANA, { tipo: 'inquilino', inmobiliariaId: 'beta' })).toEqual({
      'x-inmobiliaria': 'beta',
    })
  })
  it('con una sola cuenta, o sin saberlas: nada, exactamente como antes', () => {
    expect(cabecerasParaLaRuta('/inquilino', SOLO_INQUILINO, null)).toEqual({})
    expect(cabecerasParaLaRuta('/inquilino', null, null)).toEqual({})
  })
  it('un portal que no es suyo no pide esa cuenta (el back respondería 403)', () => {
    const c: CuentasDeLaPersona = { ...ANA, propietario: false }
    expect(cabecerasParaLaRuta('/panel', c, null)).toEqual({ 'x-inmobiliaria': 'alfa' })
  })
  it('el cliente HTTP las arma con la ruta del navegador y la sesión fijada', () => {
    expect(cabecerasDeLaCuenta()).toEqual({})
    fijarCuentasDeLaSesion('u-1', ANA)
    window.history.pushState({}, '', '/inquilino/pagos')
    expect(cabecerasDeLaCuenta()['x-cuenta']).toBe('inquilino')
    window.history.pushState({}, '', '/')
  })
})

describe('la última cuenta que usó', () => {
  it('es de ESA persona: otra cuenta en el mismo navegador no la hereda', () => {
    guardarCuenta('u-1', { tipo: 'inquilino' })
    expect(leerCuentaGuardada('u-1')?.tipo).toBe('inquilino')
    expect(leerCuentaGuardada('u-2')).toBeNull()
  })
  it('al pasar a inquilino conserva la inmobiliaria: al volver abre la misma', () => {
    guardarCuenta('u-1', { tipo: 'inmobiliaria', inmobiliariaId: 'beta' })
    guardarCuenta('u-1', { tipo: 'inquilino' })
    expect(leerCuentaGuardada('u-1')).toEqual({ tipo: 'inquilino', inmobiliariaId: 'beta' })
  })
  it('una que ya no tiene no vale', () => {
    expect(ultimaCuentaValida(SOLO_INQUILINO, { tipo: 'propietario' })).toBeNull()
    expect(ultimaCuentaValida(ANA, { tipo: 'propietario' })).toEqual({ tipo: 'propietario' })
  })
  it('🔴 al entrar va a la última que usó; sin ella, al inicio del rol con que se registró', () => {
    const user = { role: 'tenant' }
    expect(inicioDeLaPersona(user, null, { tipo: 'propietario' })).toBe('/panel')
    expect(inicioDeLaPersona(user, 'ADMIN', { tipo: 'inmobiliaria', inmobiliariaId: 'alfa' })).toBe('/panel/inmobiliaria/piloto')
    expect(inicioDeLaPersona(user, null, null)).toBe('/inquilino')
    expect(inicioDeLaPersona({ role: 'agency' }, null, { tipo: 'inquilino' })).toBe('/inquilino')
  })
})
