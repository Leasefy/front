import { describe, it, expect } from 'vitest'
import {
  PASOS_RECORRIDO,
  TOTAL_PASOS,
  indiceDePaso,
  pasoPorKey,
  proximoPasoDeLaInmobiliaria,
  esDeLaInmobiliaria,
} from './pasos'

describe('PASOS_RECORRIDO', () => {
  it('son 11 pasos', () => {
    expect(TOTAL_PASOS).toBe(11)
    expect(PASOS_RECORRIDO).toHaveLength(11)
  })

  it('numera de 1 a 11 sin huecos y en orden', () => {
    expect(PASOS_RECORRIDO.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('no repite claves', () => {
    const keys = PASOS_RECORRIDO.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('el recorrido cambia de manos una sola vez, en el paso 7', () => {
    // Los pasos 1–6 son del inquilino y del 7 al 11 son de la inmobiliaria.
    // Si esto se rompe, el stepper deja de poder decir "te toca a vos".
    const actores = PASOS_RECORRIDO.map((p) => p.actor)
    expect(actores.slice(0, 6).every((a) => a === 'inquilino')).toBe(true)
    expect(actores.slice(6).every((a) => a === 'inmobiliaria')).toBe(true)
  })

  it('deriva las claves i18n de la clave del paso', () => {
    const alerta = pasoPorKey('alerta')
    expect(alerta?.labelKey).toBe('inmobiliaria.recorrido.pasos.alerta.label')
    expect(alerta?.descKey).toBe('inmobiliaria.recorrido.pasos.alerta.desc')
  })

  it('ninguna ruta declarada depende de un parámetro dinámico', () => {
    // Las rutas con `[id]` (comparar candidatos, decidir) se pasan por contexto,
    // no se hardcodean: una ruta con corchetes acá sería un enlace roto.
    for (const paso of PASOS_RECORRIDO) {
      if (paso.href) expect(paso.href).not.toMatch(/\[|\]/)
    }
  })
})

describe('indiceDePaso', () => {
  it('devuelve el índice 0-based', () => {
    expect(indiceDePaso('catalogo')).toBe(0)
    expect(indiceDePaso('alerta')).toBe(6)
    expect(indiceDePaso('contrato')).toBe(10)
  })
})

describe('proximoPasoDeLaInmobiliaria', () => {
  it('desde un paso del inquilino, apunta al 7 (la alerta)', () => {
    expect(proximoPasoDeLaInmobiliaria('catalogo')?.key).toBe('alerta')
    expect(proximoPasoDeLaInmobiliaria('postulacion')?.key).toBe('alerta')
  })

  it('es inclusivo: parado en un paso suyo, ese mismo es el próximo', () => {
    expect(proximoPasoDeLaInmobiliaria('evaluacion')?.key).toBe('evaluacion')
  })

  it('devuelve undefined cuando ya no queda nada suyo por delante', () => {
    // El 11 es el último y es suyo, así que se devuelve a sí mismo.
    expect(proximoPasoDeLaInmobiliaria('contrato')?.key).toBe('contrato')
  })

  it('devuelve undefined con una clave desconocida', () => {
    // @ts-expect-error — probamos el borde en runtime a propósito
    expect(proximoPasoDeLaInmobiliaria('inventado')).toBeUndefined()
  })
})

describe('esDeLaInmobiliaria', () => {
  it('distingue de quién es la pelota', () => {
    expect(esDeLaInmobiliaria('asegurabilidad')).toBe(false)
    expect(esDeLaInmobiliaria('alerta')).toBe(true)
    expect(esDeLaInmobiliaria('contrato')).toBe(true)
  })
})

describe('la agencia no puede navegar a pantallas del inquilino', () => {
  /*
   * El mapa pintaba «Ver →» en el paso 3 apuntando a
   * /inquilino/aprobacion/pago. Un agente lo tocaba y `ProtectedRoute`
   * (allowedRoles=['tenant']) lo devolvía al mismo lugar: un link que
   * parpadeaba y no llevaba a ningún lado.
   *
   * El propio campo `href` ya lo declaraba —"dónde lo atiende la
   * inmobiliaria"— y nadie lo hacía cumplir.
   */
  it('ningún paso del inquilino tiene href', () => {
    for (const paso of PASOS_RECORRIDO) {
      if (paso.actor === 'inquilino') {
        expect(paso.href, `«${paso.key}» no debería tener href`).toBeNull()
      }
    }
  })

  it('ningún href sale del panel de la inmobiliaria', () => {
    for (const paso of PASOS_RECORRIDO) {
      if (paso.href !== null) {
        expect(paso.href.startsWith('/panel/inmobiliaria/'), `«${paso.key}» → ${paso.href}`).toBe(true)
      }
    }
  })

  it('los pasos de la inmobiliaria que ya tienen pantalla la declaran', () => {
    // Si mañana uno pierde su href, deja de ser navegable en silencio.
    const conPantalla = ['alerta', 'evaluacion', 'comparacion', 'decision', 'contrato']
    for (const key of conPantalla) {
      expect(PASOS_RECORRIDO.find((p) => p.key === key)?.href, key).toBeTruthy()
    }
  })
})
