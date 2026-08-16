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
  estadoDelFlujo,
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
      // Sin href no hay ruta que validar: la resuelven el micro o el selector.
      if (f.externo || f.selector) continue
      expect(f.href).toMatch(/^\/panel\/inmobiliaria\//)
    }
  })

  it('el flujo principal existe, es interno y arranca en frío', () => {
    // Va en el segmento izquierdo del SplitButton: se abre de un clic. Si
    // apuntara a una clave inexistente el botón quedaría sin acción; si fuera
    // el externo abriría una pestaña al tocar el botón del sidebar; y si
    // tuviera selector, el clic principal abriría un diálogo a preguntar en vez
    // de empezar algo.
    const principal = FLUJOS.find((f) => f.key === FLUJO_PRINCIPAL)
    expect(principal).toBeDefined()
    expect(principal?.externo).toBeFalsy()
    expect(principal?.selector).toBeUndefined()
    expect(principal?.href).toBeTruthy()
  })

  it('el principal es la consignación', () => {
    // No es una preferencia estética: es lo único que se empieza sin venir de
    // ningún contexto previo, y la puerta de entrada del resto —sin inmueble
    // consignado no hay postulación, ni evaluación, ni contrato—. Estuvo un
    // rato mostrando el último flujo abierto y terminó ofreciendo "Nuevo
    // contrato", que es justo el que NO arranca en frío.
    expect(FLUJO_PRINCIPAL).toBe('consignacion')
  })

  it('no se ofrece empezar la evaluación A/B/C/D en frío', () => {
    // La asegurabilidad ("¿lo aseguran o no?") es lo que se consulta desde
    // cero. La evaluación A/B/C/D es POSTERIOR a la postulación y arranca sola
    // cuando la postulación entra; a demanda se vuelve a correr, pero sobre una
    // que ya existe. Ofrecerla acá invierte el orden del negocio — y la
    // pantalla a la que llevaba (`/ai/estudio/nuevo`) ni siquiera guarda: su
    // botón responde "Próximamente: esto creará el estudio…".
    expect(FLUJOS.map((f) => f.href)).not.toContain('/panel/inmobiliaria/ai/estudio/nuevo')
    expect(FLUJOS.map((f) => f.key)).toContain('asegurabilidad')
  })

  it('nadie entra un inmueble sin propietario', () => {
    // Regla de negocio: una inmobiliaria nunca administra un inmueble que no
    // tiene propietario, así que para ella entrar uno es SIEMPRE una
    // consignación. `/propiedades/nueva` no pide propietario —ni comisión, ni
    // agente, ni inventario— y publica igual al catálogo: es el formulario del
    // panel del propietario, y desde acá solo crea una ficha a medias.
    expect(FLUJOS.map((f) => f.href)).not.toContain('/panel/inmobiliaria/inmuebles/nueva')
  })

  it('un flujo sin href resuelve su destino de otra forma, nunca queda mudo', () => {
    // Dos motivos válidos para no tener ruta fija: `avaluo` vive en el front
    // del micro y la resuelve en runtime; `contrato` la arma con el
    // applicationId que elija el selector. Cualquier otro sin href sería un
    // ítem que no lleva a ningún lado.
    for (const f of FLUJOS) {
      if (f.href) continue
      expect(Boolean(f.externo) || Boolean(f.selector)).toBe(true)
    }
  })

  it('un flujo con selector no declara ruta fija', () => {
    // Si tuviera href, `abrir()` podría navegar antes de preguntar y caer en la
    // pantalla que pide el parámetro — el defecto original.
    for (const f of FLUJOS) {
      if (f.selector) expect(f.href).toBe('')
    }
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

  it('nadie apunta directo a /contratos/nuevo', () => {
    // Esa pantalla lee `?applicationId=` y sin él muestra "Falta el parámetro
    // applicationId". El contrato llega por el selector, que la arma con el id
    // elegido; una ruta cruda acá reintroduce el defecto.
    expect(FLUJOS.map((f) => f.href)).not.toContain('/panel/inmobiliaria/contratos/nuevo')
  })

  it('preparar contrato se ofrece, y pasa por el selector', () => {
    const contrato = FLUJOS.find((f) => f.key === 'contrato')
    expect(contrato).toBeDefined()
    expect(contrato?.selector).toBe('postulacion')
  })
})

describe('estadoDelFlujo — negado y no-resuelto no son lo mismo', () => {
  const flujoDe = (key: string) => FLUJOS.find((f) => f.key === key)!
  const asegurabilidad = flujoDe('asegurabilidad') // module: 'cotizador' (agente)
  const consignacion = flujoDe('consignacion') // module: 'portafolio' (monolito)

  const nadie = () => false
  const todos = () => true

  it('con permiso, disponible', () => {
    expect(
      estadoDelFlujo(asegurabilidad, { canAccess: todos, permisosDelAgenteResueltos: true }),
    ).toBe('disponible')
  })

  it('el agente contestó y NO lo tiene → se esconde', () => {
    // Acá sí sabemos: no está en el plan. Ofrecerlo sería llevar a un muro.
    expect(
      estadoDelFlujo(asegurabilidad, { canAccess: nadie, permisosDelAgenteResueltos: true }),
    ).toBe('oculto')
  })

  it('el agente NO contestó → se muestra sin resolver, no se borra', () => {
    // El defecto que esto arregla: con el agente en 401, `cotizador` falla
    // cerrado y la asegurabilidad —el PRIMER paso del recorrido— desaparecía
    // del lanzador sin una palabra. Un paso que desaparece se lee como un paso
    // que no existe.
    expect(
      estadoDelFlujo(asegurabilidad, { canAccess: nadie, permisosDelAgenteResueltos: false }),
    ).toBe('sinResolver')
  })

  it('no resolver el agente no destapa los módulos del monolito', () => {
    // El monolito niega con un payload que sí llegó: ahí un false es un no.
    expect(
      estadoDelFlujo(consignacion, { canAccess: nadie, permisosDelAgenteResueltos: false }),
    ).toBe('oculto')
  })

  it('un flujo sin compuerta está siempre disponible', () => {
    const libre = { ...asegurabilidad, module: null }
    expect(estadoDelFlujo(libre, { canAccess: nadie, permisosDelAgenteResueltos: false })).toBe(
      'disponible',
    )
  })

  it('sin resolver NO concede: nunca devuelve disponible sin canAccess', () => {
    // La garantía que hace que esto no sea un agujero. Lo único que cambia es
    // qué se le dice a la persona; abrir sigue requiriendo permiso.
    for (const flujo of FLUJOS) {
      if (flujo.module === null) continue
      for (const resuelto of [true, false]) {
        expect(
          estadoDelFlujo(flujo, { canAccess: nadie, permisosDelAgenteResueltos: resuelto }),
        ).not.toBe('disponible')
      }
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
      'sinResolver',
    ].map((c) => `inmobiliaria.nuevo.${c}`),
  ]

  const leer = (d: unknown, c: string) =>
    c.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], d)
  const existe = (d: unknown, c: string) => {
    const v = leer(d, c)
    return typeof v === 'string' && v.length > 0
  }

  it('cada flujo aporta 8 claves', () => {
    expect(claves.length).toBe(GRUPOS.length + FLUJOS.length * 8 + 9)
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
    expect(yaVioElFlujo('consignacion')).toBe(false)
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
