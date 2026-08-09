/**
 * Los flujos que se pueden empezar desde el botón «Nuevo».
 *
 * Lo que se protege acá es lo que rompe callado:
 *  · que ninguna ruta apunte a una pantalla retirada o con parámetro dinámico
 *  · que la explicación se muestre UNA vez y no en cada clic
 *  · que el prefijo legacy de localStorage no se renombre sin querer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import es from '../i18n/locales/es.json'
import en from '../i18n/locales/en.json'
import {
  CLAVE_ULTIMO,
  FLUJOS,
  FLUJO_INICIAL,
  GRUPOS,
  claveVisto,
  flujoDescKey,
  flujoIntro,
  flujoLabelKey,
  grupoLabelKey,
  marcarFlujoVisto,
  recordarUltimoFlujo,
  ultimoFlujoUsado,
  yaVioElFlujo,
} from './flujos'

describe('FLUJOS', () => {
  it('no repite claves', () => {
    const keys = FLUJOS.map((f) => f.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('cada flujo cae en un grupo conocido', () => {
    for (const f of FLUJOS) expect(GRUPOS).toContain(f.grupo)
  })

  it('los grupos cubren todos los flujos (ninguno queda invisible)', () => {
    // El menú dibuja por grupo: un flujo con un grupo fuera de GRUPOS existiría
    // en la lista y no se mostraría nunca.
    const cubiertos = FLUJOS.filter((f) => GRUPOS.includes(f.grupo))
    expect(cubiertos).toHaveLength(FLUJOS.length)
  })

  it('ninguna ruta interna lleva un parámetro dinámico', () => {
    for (const f of FLUJOS) {
      if (f.href) expect(f.href).not.toMatch(/\[|\]/)
    }
  })

  it('las rutas internas cuelgan del panel de inmobiliaria', () => {
    for (const f of FLUJOS) {
      if (f.externo) continue
      expect(f.href).toMatch(/^\/panel\/inmobiliaria\//)
    }
  })

  it('el flujo de arranque existe y es interno', () => {
    // Va en el segmento izquierdo del SplitButton la primera vez: se abre de un
    // clic. Si apuntara a una clave inexistente el botón quedaría sin acción, y
    // si fuera el externo abriría una pestaña al tocar el botón del sidebar.
    const inicial = FLUJOS.find((f) => f.key === FLUJO_INICIAL)
    expect(inicial).toBeDefined()
    expect(inicial?.externo).toBeFalsy()
    expect(inicial?.href).toBeTruthy()
  })

  it('el único flujo sin href propio es el externo', () => {
    // `avaluo` vive en el front del micro y su URL se resuelve en runtime; si
    // algún otro quedara sin href, el ítem no llevaría a ningún lado.
    const sinHref = FLUJOS.filter((f) => !f.href)
    expect(sinHref.map((f) => f.key)).toEqual(['avaluo'])
    expect(sinHref.every((f) => f.externo)).toBe(true)
  })

  it('todo flujo externo se abre en pestaña nueva y no al revés', () => {
    for (const f of FLUJOS) {
      if (f.externo) expect(f.href).toBe('')
    }
  })

  it('ninguna ruta necesita un parámetro de consulta', () => {
    // El lanzador solo ofrece lo que se puede empezar EN FRÍO. Una ruta con
    // `?algo=` no se puede abrir desde acá: no hay de dónde sacar el valor.
    for (const f of FLUJOS) expect(f.href).not.toContain('?')
  })

  it('no ofrece preparar contrato: exige una postulación previa', () => {
    // Estuvo un rato y llevaba a una pantalla de error. `/contratos/nuevo` lee
    // `?applicationId=` y sin él muestra "Falta el parámetro applicationId".
    // Se llega desde un candidato aceptado (paso 10 → 11), no desde el sidebar.
    expect(FLUJOS.map((f) => f.href)).not.toContain('/panel/inmobiliaria/contratos/nuevo')
  })
})

describe('flujoIntro', () => {
  it('arma tres pasos y las claves del bloque', () => {
    const c = flujoIntro('consignacion')
    expect(c.pasos).toHaveLength(3)
    expect(c.titulo).toBe('inmobiliaria.nuevo.flujos.consignacion.intro.titulo')
    expect(c.pasos[2]).toBe('inmobiliaria.nuevo.flujos.consignacion.intro.paso3')
  })
})

describe('el copy de cada flujo existe en los dos idiomas', () => {
  // Las claves se derivan de FLUJOS: agregar un flujo genera nueve claves sin
  // que nadie las escriba. Sin este test, el ítem nuevo saldría en el menú
  // mostrando la ruta cruda de la clave.
  const claves = [
    ...GRUPOS.map(grupoLabelKey),
    ...FLUJOS.flatMap((f) => {
      const intro = flujoIntro(f.key)
      return [
        flujoLabelKey(f.key),
        flujoDescKey(f.key),
        intro.titulo,
        intro.resumen,
        intro.necesitas,
        ...intro.pasos,
      ]
    }),
    ...[
      'boton',
      'aria',
      'intro.queVasAHacer',
      'intro.necesitasTitulo',
      'intro.empezar',
      'intro.ahoraNo',
      'intro.soloPrimeraVez',
      'intro.nuevaPestana',
    ].map((c) => `inmobiliaria.nuevo.${c}`),
  ]

  const leer = (d: unknown, c: string) =>
    c.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], d)
  const existe = (d: unknown, c: string) => {
    const v = leer(d, c)
    return typeof v === 'string' && v.length > 0
  }

  it('los 6 flujos aportan 8 claves cada uno', () => {
    expect(claves.length).toBe(GRUPOS.length + FLUJOS.length * 8 + 8)
  })

  it('todas están en español', () => {
    expect(claves.filter((c) => !existe(es, c))).toEqual([])
  })

  it('todas están en inglés', () => {
    expect(claves.filter((c) => !existe(en, c))).toEqual([])
  })

  it('el inglés no es el español copiado', () => {
    const identicas = claves.filter((c) => leer(es, c) === leer(en, c))
    expect(identicas.length).toBeLessThan(claves.length * 0.15)
  })
})

describe('recordar que ya se explicó', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('usa el prefijo legacy — renombrarlo perdería lo guardado', () => {
    // `arriendo-facil-` es anterior al rebrand y hay datos reales con él.
    expect(claveVisto('asegurabilidad')).toBe('arriendo-facil-flujo-visto-asegurabilidad')
  })

  it('la primera vez no está visto; después sí', () => {
    expect(yaVioElFlujo('asegurabilidad')).toBe(false)
    marcarFlujoVisto('asegurabilidad')
    expect(yaVioElFlujo('asegurabilidad')).toBe(true)
  })

  it('marcar uno no marca los demás', () => {
    marcarFlujoVisto('asegurabilidad')
    expect(yaVioElFlujo('inmueble')).toBe(false)
  })

  it('si el navegador no deja leer, se explica de más y no se rompe', () => {
    // Safari en privado tira al tocar localStorage. Ante la duda, mostrar.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denegado')
    })
    expect(() => yaVioElFlujo('asegurabilidad')).not.toThrow()
    expect(yaVioElFlujo('asegurabilidad')).toBe(false)
  })

  it('si no deja escribir, tampoco se rompe el arranque del flujo', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denegado')
    })
    expect(() => marcarFlujoVisto('asegurabilidad')).not.toThrow()
  })
})

describe('el segmento principal recuerda el último flujo', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('sin historia devuelve null y el botón cae al de arranque', () => {
    expect(ultimoFlujoUsado()).toBeNull()
  })

  it('devuelve lo último abierto', () => {
    recordarUltimoFlujo('asegurabilidad')
    expect(ultimoFlujoUsado()).toBe('asegurabilidad')
    recordarUltimoFlujo('inmueble')
    expect(ultimoFlujoUsado()).toBe('inmueble')
  })

  it('ignora una clave de un flujo que ya no existe', () => {
    // Si se borra un flujo, el valor guardado queda huérfano y el segmento
    // principal se quedaría sin destino.
    window.localStorage.setItem(CLAVE_ULTIMO, 'flujo-que-se-borro')
    expect(ultimoFlujoUsado()).toBeNull()
  })

  it('usa el prefijo legacy, como el resto', () => {
    expect(CLAVE_ULTIMO).toMatch(/^arriendo-facil-/)
  })

  it('si el navegador no deja leer, cae al de arranque sin romperse', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denegado')
    })
    expect(() => ultimoFlujoUsado()).not.toThrow()
    expect(ultimoFlujoUsado()).toBeNull()
  })
})
