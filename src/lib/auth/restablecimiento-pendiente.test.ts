/**
 * 🔴 Nico, 29-09: pidió el código del correo, fue a buscarlo y al volver la
 * pantalla estaba otra vez en «Verificación de seguridad» (la página se montó
 * de nuevo y olvidó el paso). Escribió el código del correo en las casillas de
 * la app y le dijo «Código incorrecto». El paso pendiente tiene que sobrevivir
 * a que la página se monte de nuevo.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  VIGENCIA_DEL_RESTABLECIMIENTO_MS,
  leerRestablecimientoPendiente,
  marcarRestablecimientoPendiente,
  olvidarRestablecimientoPendiente,
} from './restablecimiento-pendiente'

const USUARIO = 'u-1'
const AHORA = Date.UTC(2026, 8, 29, 17, 17, 31)

beforeEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('el restablecimiento pendiente del segundo factor', () => {
  it('lo que se marca se lee después (otra montada de la página)', () => {
    marcarRestablecimientoPendiente(USUARIO, AHORA + 60_000, AHORA)
    expect(leerRestablecimientoPendiente(USUARIO, AHORA + 5_000)).toEqual({
      usuarioId: USUARIO,
      pedidoEn: AHORA,
      reenviarDesde: AHORA + 60_000,
    })
  })

  it('vence con el código (10 minutos) y no es de otra persona', () => {
    marcarRestablecimientoPendiente(USUARIO, AHORA + 60_000, AHORA)
    expect(leerRestablecimientoPendiente(USUARIO, AHORA + VIGENCIA_DEL_RESTABLECIMIENTO_MS + 1)).toBeNull()
    expect(leerRestablecimientoPendiente('otra', AHORA + 5_000)).toBeNull()
  })

  it('olvidar lo borra', () => {
    marcarRestablecimientoPendiente(USUARIO, AHORA + 60_000, AHORA)
    olvidarRestablecimientoPendiente()
    expect(leerRestablecimientoPendiente(USUARIO, AHORA + 5_000)).toBeNull()
  })

  it('sin almacenamiento (privado, bloqueado) no rompe: sólo no recuerda', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('bloqueado')
      },
    })
    try {
      expect(() => marcarRestablecimientoPendiente(USUARIO, AHORA, AHORA)).not.toThrow()
      expect(leerRestablecimientoPendiente(USUARIO, AHORA)).toBeNull()
      expect(() => olvidarRestablecimientoPendiente()).not.toThrow()
    } finally {
      if (original) Object.defineProperty(window, 'sessionStorage', original)
    }
  })

  it('basura en el almacenamiento se ignora', () => {
    window.sessionStorage.setItem('leasefy:segundo-factor:restablecimiento', '{no es json')
    expect(leerRestablecimientoPendiente(USUARIO, AHORA)).toBeNull()
  })
})
