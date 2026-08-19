import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  evaluarInactividad,
  registrarActividad,
  ultimaActividad,
  limpiarActividad,
  hayCierrePorInactividad,
  topeDeInactividadMs,
  minutosDeInactividad,
  CLAVE_ULTIMA_ACTIVIDAD,
  AVISO_MS,
} from './idle-timeout'

/**
 * La regla del cierre por inactividad. Casi todos los casos de acá son
 * NEGATIVOS: cerrarle la sesión a alguien que estaba trabajando es mucho peor
 * que dejarla abierta un minuto de más, así que lo que hay que blindar es que
 * no eche a nadie de menos.
 */

const MIN = 60_000

beforeEach(() => {
  localStorage.clear()
  limpiarActividad()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('evaluarInactividad', () => {
  const TOPE = 10 * MIN

  it('está activa si recién hubo actividad', () => {
    expect(evaluarInactividad(0, 0, TOPE)).toEqual({ fase: 'activa' })
  })

  it('sigue activa a falta de más de un minuto', () => {
    // Inactivo hace 8 min sobre un tope de 10 → faltan 2 min, sin aviso.
    expect(evaluarInactividad(8 * MIN, 0, TOPE)).toEqual({ fase: 'activa' })
  })

  it('avisa exactamente cuando falta un minuto', () => {
    expect(evaluarInactividad(9 * MIN, 0, TOPE)).toEqual({
      fase: 'aviso',
      segundosRestantes: 60,
    })
  })

  // Un aviso que arranca en 59 se lee como si ya hubiera empezado a correr
  // antes de aparecer.
  it('la cuenta arranca en 60, no en 59', () => {
    const estado = evaluarInactividad(9 * MIN + 1, 0, TOPE)
    expect(estado).toMatchObject({ fase: 'aviso' })
    expect((estado as { segundosRestantes: number }).segundosRestantes).toBe(60)
  })

  it('la cuenta baja junto con el reloj', () => {
    const a30 = evaluarInactividad(9 * MIN + 30_000, 0, TOPE)
    expect(a30).toEqual({ fase: 'aviso', segundosRestantes: 30 })
    const a1 = evaluarInactividad(10 * MIN - 1000, 0, TOPE)
    expect(a1).toEqual({ fase: 'aviso', segundosRestantes: 1 })
  })

  it('vence al llegar al tope', () => {
    expect(evaluarInactividad(10 * MIN, 0, TOPE)).toEqual({ fase: 'vencida' })
  })

  /**
   * La notebook suspendida. Un contador de ticks creería que pasaron dos
   * minutos; la resta de timestamps sabe que pasaron dos horas.
   */
  it('vence tras un salto grande de reloj (máquina suspendida)', () => {
    expect(evaluarInactividad(2 * 60 * MIN, 0, TOPE)).toEqual({ fase: 'vencida' })
  })

  it('apagado (tope 0) nunca vence, por más inactividad que haya', () => {
    expect(evaluarInactividad(365 * 24 * 60 * MIN, 0, 0)).toEqual({
      fase: 'activa',
    })
  })

  it('respeta una ventana de aviso distinta', () => {
    expect(evaluarInactividad(TOPE - 5000, 0, TOPE, 10_000)).toEqual({
      fase: 'aviso',
      segundosRestantes: 5,
    })
  })
})

describe('configuración', () => {
  it('sin la variable, la función está apagada', () => {
    expect(hayCierrePorInactividad()).toBe(false)
    expect(topeDeInactividadMs()).toBe(0)
  })

  it('con 10 minutos, el tope son 600000 ms', () => {
    vi.stubEnv('NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES', '10')
    expect(minutosDeInactividad()).toBe(10)
    expect(topeDeInactividadMs()).toBe(10 * MIN)
    expect(hayCierrePorInactividad()).toBe(true)
  })

  /**
   * Un typo en el .env no puede convertirse en una expulsión masiva: cualquier
   * valor ilegible apaga la función, nunca la deja en "tope de 0 minutos".
   */
  it.each(['', '0', 'diez', '-5', 'NaN'])(
    'un valor inválido (%p) apaga la función',
    (valor) => {
      vi.stubEnv('NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES', valor)
      expect(hayCierrePorInactividad()).toBe(false)
    },
  )
})

describe('marca de actividad', () => {
  it('registrarActividad persiste el instante', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-18T12:00:00Z'))

    registrarActividad(true)

    expect(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)).toBe(
      String(Date.parse('2026-08-18T12:00:00Z')),
    )
  })

  /**
   * Sin freno, mover el mouse escribiría cientos de veces por segundo — y cada
   * escritura despierta el evento `storage` en TODAS las otras pestañas.
   */
  it('no reescribe en ráfaga: el segundo registro seguido no persiste', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    registrarActividad(true)

    vi.setSystemTime(1_000_500)
    registrarActividad()

    expect(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)).toBe('1000000')
  })

  /**
   * El botón «Continuar» DEBE poder escribir aunque caiga dentro del freno: si
   * no se persiste, las otras pestañas no se enteran y el aviso reaparece.
   */
  it('forzar saltea el freno', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    registrarActividad(true)

    vi.setSystemTime(1_000_500)
    registrarActividad(true)

    expect(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)).toBe('1000500')
  })

  it('la marca se comparte entre pestañas (misma clave de localStorage)', () => {
    // Lo que "escribió la otra pestaña".
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, '1234567')
    expect(ultimaActividad()).toBe(1234567)
  })

  /**
   * Recién llegado NO es lo mismo que inactivo hace horas: arrancar en 0
   * cerraría la sesión apenas carga la app.
   */
  it('sin marca todavía, la última actividad es "ahora"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5_000_000)
    expect(ultimaActividad()).toBe(5_000_000)
  })

  it.each(['', 'ayer', '-1', '0'])(
    'una marca ilegible (%p) se lee como "ahora"',
    (valor) => {
      vi.useFakeTimers()
      vi.setSystemTime(5_000_000)
      localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, valor)
      expect(ultimaActividad()).toBe(5_000_000)
    },
  )

  /**
   * Una marca del futuro sólo sale de un reloj que se movió hacia atrás.
   * Tomarla literal dejaría al usuario "inactivo" por horas sin motivo.
   */
  it('una marca del futuro se acota a "ahora"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, '9999999999')
    expect(ultimaActividad()).toBe(1_000_000)
  })

  it('limpiarActividad borra la marca', () => {
    registrarActividad(true)
    limpiarActividad()
    expect(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)).toBeNull()
  })
})

describe('el recorrido completo con un tope de 10 minutos', () => {
  const TOPE = 10 * MIN

  it('trabajar, quedarse quieto, avisar y cerrar', () => {
    const t0 = 1_000_000

    // Trabajando: cada acción corre la marca.
    expect(evaluarInactividad(t0 + 3 * MIN, t0 + 3 * MIN, TOPE).fase).toBe('activa')

    // Se levanta del escritorio a t0+3min. A los 9 min de eso, aviso.
    const ultima = t0 + 3 * MIN
    expect(evaluarInactividad(ultima + 9 * MIN, ultima, TOPE)).toEqual({
      fase: 'aviso',
      segundosRestantes: 60,
    })

    // Aprieta «Continuar» a falta de 20 s → la marca salta a ese instante.
    const continuo = ultima + 9 * MIN + 40_000
    expect(evaluarInactividad(continuo, continuo, TOPE).fase).toBe('activa')

    // Si NO hubiera apretado, al minuto exacto se cierra.
    expect(evaluarInactividad(ultima + 10 * MIN, ultima, TOPE)).toEqual({
      fase: 'vencida',
    })
  })

  it('la ventana de aviso es de 60 s de punta a punta', () => {
    expect(AVISO_MS).toBe(60_000)
  })
})
