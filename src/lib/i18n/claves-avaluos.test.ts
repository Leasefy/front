/**
 * Guardia de las claves de Avalúos.
 *
 * El Resumen (`/panel/inmobiliaria/inmuebles/avaluos`) tenía su copy hardcodeado
 * mientras las mismas claves existían en los dos diccionarios con textos MÁS
 * VIEJOS y distintos: era la única pantalla del workspace que se quedaba en
 * español al cambiar de idioma, y había dos versiones sueltas de una frase
 * revisada legalmente sin nada que las mantuviera iguales.
 *
 * Migrado el copy al diccionario, este test es lo que impide que vuelva a
 * pasar: una clave nueva que alguien agregue sólo en `es.json` sale en pantalla
 * como `inmobiliaria.ai.workspace.pages.avaluos.loQueSea` para quien use la
 * app en inglés, y eso pasa una revisión visual rápida sin que salte.
 *
 * Hermano de `claves-recorrido.test.ts` y `claves-aprobacion.test.ts`.
 */

import { describe, it, expect } from 'vitest'

import es from './locales/es.json'
import en from './locales/en.json'

const NS = 'inmobiliaria.ai.workspace.pages.avaluos'

/** Todo lo que consume la Sala (page.tsx). */
const CLAVES_SALA = [
  'salaTitulo',
  'salaDesc',
  'solicitarTitle',
  'solicitarCta',
  'solicitarUnavailable',
  'desconectadoTitulo',
  'directoDetalle',
  'abriendoAsistente',
  'linkCta',
  'linkDetalle',
  'generandoLink',
  'linkListoDetalle',
  'linkAria',
  'copiarLink',
  'abrirAhora',
  'errorCopiar',
  'errorSolicitar',
  'listaTitulo',
  'queEs',
  'queSon',
  'vacioTitulo',
  'vacioDesc',
  'sinNombre',
  'conteoUno',
  'conteo',
  'col.estado',
  'col.propietario',
  'col.valor',
  'col.creado',
  'firmaNota',
  'comoFunciona.title',
]

/** Los cinco estados del ciclo de vida del certificado, tal como los expone el micro. */
const CLAVES_ESTADOS = ['borrador', 'enRevision', 'firmado', 'rechazado', 'entregado'].map(
  (e) => `estados.${e}`,
)

/** Los cuatro pasos de «¿Cómo funciona?», título y descripción cada uno. */
const CLAVES_PASOS = [1, 2, 3, 4].flatMap((n) => [
  `comoFunciona.step${n}.title`,
  `comoFunciona.step${n}.desc`,
])

/** Lo que consumen la cola y la ficha del caso. */
const CLAVES_COLA = [
  'colaTitle',
  'colaDesc',
  'colaKpiLabel',
  'colaEmptyTitle',
  'colaEmptyHint',
  'casoColaLabel',
]

const TODAS = [...CLAVES_SALA, ...CLAVES_ESTADOS, ...CLAVES_PASOS, ...CLAVES_COLA].map(
  (c) => `${NS}.${c}`,
)

/** Genéricas que la Sala también usa; viven fuera del namespace. */
const CLAVES_COMUNES = ['common.all', 'common.previous', 'common.next', 'common.copied']

function leer(diccionario: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], diccionario)
}

function existe(diccionario: unknown, clave: string): boolean {
  const v = leer(diccionario, clave)
  return typeof v === 'string' && v.length > 0
}

describe('las claves de Avalúos existen en los dos idiomas', () => {
  it('todas están en español', () => {
    expect([...TODAS, ...CLAVES_COMUNES].filter((c) => !existe(es, c))).toEqual([])
  })

  it('todas están en inglés', () => {
    expect([...TODAS, ...CLAVES_COMUNES].filter((c) => !existe(en, c))).toEqual([])
  })

  it('ninguna clave quedó sin traducir', () => {
    // Sin esto, pegar el español en en.json pasaría los dos de arriba.
    //
    // Los tests hermanos toleran hasta un 15% de coincidencias, y ese margen
    // no sirve acá: probé pegando 6 de las 50 (12%) y pasaba. Hoy este bloque
    // tiene CERO strings iguales entre los dos idiomas, así que la guardia
    // puede ser exacta — y si algún día una clave es legítimamente igual en
    // los dos (un nombre propio), que este test lo obligue a decirlo acá.
    const identicas = TODAS.filter((c) => leer(es, c) === leer(en, c))
    expect(identicas).toEqual([])
  })

  it('el conteo interpola el número', () => {
    for (const d of [es, en]) {
      expect(leer(d, `${NS}.conteo`) as string).toContain('{{n}}')
    }
  })

  it('el bloque no arrastra claves que ya nadie lee', () => {
    // `eyebrow`, `misSolicitudes`, `solicitarDetalle`, `solicitarProximamente` y
    // el bloque `estado` (detectado/sugerido/…, que es el vocabulario de
    // work-items, no el del certificado) quedaron huérfanos cuando la Sala pasó
    // a hardcodear su copy. Se borraron en la migración; que no vuelvan.
    const bloque = leer(es, NS) as Record<string, unknown>
    const declaradas = new Set(
      [...CLAVES_SALA, ...CLAVES_ESTADOS, ...CLAVES_PASOS, ...CLAVES_COLA].map(
        (c) => c.split('.')[0],
      ),
    )
    expect(Object.keys(bloque).filter((k) => !declaradas.has(k))).toEqual([])
  })

  it('ningún texto del bloque está duplicado', () => {
    // Dos claves con la MISMA frase es la señal de que alguien va a editar una
    // sola y dejar la otra vieja — que es exactamente cómo empezó este lío.
    // Excepción legítima: `solicitarCta` titula la tarjeta y su botón.
    for (const [idioma, d] of [
      ['es', es],
      ['en', en],
    ] as const) {
      const bloque = leer(d, NS) as Record<string, unknown>
      const textos = Object.values(bloque).filter((v): v is string => typeof v === 'string')
      const repetidos = textos.filter((v, i) => textos.indexOf(v) !== i)
      expect(repetidos, `duplicados en ${idioma}`).toEqual([])
    }
  })
})
