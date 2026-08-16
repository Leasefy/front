/**
 * Guardia de las claves del recorrido de inmobiliaria.
 *
 * Las claves de los 11 pasos se derivan de `PASOS_RECORRIDO`, así que agregar
 * un paso genera dos claves nuevas sin que nadie las escriba a mano. Este test
 * las resuelve contra los dos diccionarios: sin él, un paso nuevo saldría con
 * la clave cruda en pantalla (`inmobiliaria.recorrido.pasos.x.label`) y eso
 * pasa una revisión visual rápida sin que salte.
 *
 * Hermano de `claves-aprobacion.test.ts`, que cubre el lado del inquilino.
 */

import { describe, it, expect } from 'vitest'

import es from './locales/es.json'
import en from './locales/en.json'
import { PASOS_RECORRIDO } from '../recorrido/pasos'

const NS = 'inmobiliaria.recorrido'

/** Claves sueltas que usan los componentes del recorrido. */
const CLAVES_PLANAS = [
  'titulo',
  'subtitulo',
  'pasoDe',
  'teToca',
  'esperandoAlInquilino',
  'sigue',
  'verPaso',
  'sinPantalla',
  'cambioDeManos',
  'actorInquilino',
  'actorInmobiliaria',
  'verdict.evaluada',
  'verdict.revision',
  'bandeja.titulo',
  'bandeja.desc',
  'bandeja.vacioTitulo',
  'bandeja.vacioDesc',
  'bandeja.errorTitulo',
  'bandeja.errorDesc',
  'bandeja.reintentar',
  'bandeja.colCandidato',
  'bandeja.colRef',
  'bandeja.colNivel',
  'bandeja.colPuntaje',
  'bandeja.colEstado',
  'bandeja.colLlego',
  'bandeja.escalada',
  'bandeja.sinResolver',
  'bandeja.comoFunciona',
  'bandeja.niveles',
  'bandeja.verCandidatos',
  'bandeja.sinNombre',
].map((c) => `${NS}.${c}`)

const CLAVES_DE_PASOS = PASOS_RECORRIDO.flatMap((p) => [p.labelKey, p.descKey])

const TODAS = [...CLAVES_PLANAS, ...CLAVES_DE_PASOS]

function leer(diccionario: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], diccionario)
}

function existe(diccionario: unknown, clave: string): boolean {
  const v = leer(diccionario, clave)
  return typeof v === 'string' && v.length > 0
}

describe('las claves del recorrido existen en los dos idiomas', () => {
  it('los 11 pasos aportan 22 claves', () => {
    expect(CLAVES_DE_PASOS).toHaveLength(22)
  })

  it('todas están en español', () => {
    expect(TODAS.filter((c) => !existe(es, c))).toEqual([])
  })

  it('todas están en inglés', () => {
    expect(TODAS.filter((c) => !existe(en, c))).toEqual([])
  })

  it('el inglés no es el español copiado', () => {
    // Sin esto, pegar el bloque español en en.json pasaría los dos tests de arriba.
    //
    // El umbral era `< TODAS.length * 0.15`. Medido: hoy hay CERO claves
    // iguales entre los dos idiomas, así que ese 15% no cubría ningún caso
    // real — era margen para dejar hasta 8 sin traducir sin que saltara nada.
    // Probado en el bloque de Avalúos: pegando 6 de 50 (12%) el test pasaba.
    //
    // Si algún día una clave es legítimamente igual en los dos (un nombre
    // propio), que este test la nombre acá en vez de esconderla en un %.
    const identicas = TODAS.filter((c) => leer(es, c) === leer(en, c))
    expect(identicas).toEqual([])
  })

  it('la clave de progreso interpola los dos números', () => {
    for (const d of [es, en]) {
      const v = leer(d, `${NS}.pasoDe`) as string
      expect(v).toContain('{{n}}')
      expect(v).toContain('{{total}}')
    }
  })
})
