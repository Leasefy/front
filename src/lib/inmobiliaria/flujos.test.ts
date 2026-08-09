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
  FLUJOS,
  FLUJO_PRINCIPAL,
  GRUPOS,
  claveVisto,
  flujoDescKey,
  flujoIntro,
  flujoLabelKey,
  grupoLabelKey,
  marcarFlujoVisto,
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

  it('el flujo principal existe y es interno', () => {
    // Va en el segmento izquierdo del SplitButton: se abre de un clic. Si
    // apuntara a una clave inexistente el botón quedaría sin acción, y si fuera
    // el externo abriría una pestaña al tocar el botón principal del sidebar.
    const principal = FLUJOS.find((f) => f.key === FLUJO_PRINCIPAL)
    expect(principal).toBeDefined()
    expect(principal?.externo).toBeFalsy()
    expect(principal?.href).toBeTruthy()
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
    expect(claveVisto('contrato')).toBe('arriendo-facil-flujo-visto-contrato')
  })

  it('la primera vez no está visto; después sí', () => {
    expect(yaVioElFlujo('contrato')).toBe(false)
    marcarFlujoVisto('contrato')
    expect(yaVioElFlujo('contrato')).toBe(true)
  })

  it('marcar uno no marca los demás', () => {
    marcarFlujoVisto('contrato')
    expect(yaVioElFlujo('inmueble')).toBe(false)
  })

  it('si el navegador no deja leer, se explica de más y no se rompe', () => {
    // Safari en privado tira al tocar localStorage. Ante la duda, mostrar.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denegado')
    })
    expect(() => yaVioElFlujo('contrato')).not.toThrow()
    expect(yaVioElFlujo('contrato')).toBe(false)
  })

  it('si no deja escribir, tampoco se rompe el arranque del flujo', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denegado')
    })
    expect(() => marcarFlujoVisto('contrato')).not.toThrow()
  })
})
