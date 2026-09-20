/**
 * 🔴 EL GUARDIÁN DE «¿ESTO SÍ ESTÁ CONECTADO?» (Nico, 18-09-2026).
 *
 * ── Cómo nació ─────────────────────────────────────────────────────────────
 *
 * El 18-09 di por buena una auditoría que decía «los 20 controladores y los 38
 * endpoints nuevos tienen consumidor en el front». Era falsa, y la forma de
 * contar era el error: **conté archivos, no verbos.** Un controlador con cuatro
 * métodos usados y cuatro muertos pasaba entero el filtro.
 *
 * Contando por verbo aparecieron, uno tras otro, agujeros que el producto
 * sentía como «esto no está conectado»:
 *
 *   · `publicar`, `despublicar`, `revision`, `guardarCuenta` — publicar un
 *     inmueble en un portal era imposible en todo el producto.
 *   · `crearRequisito`, `borrarRequisito` — «los requisitos los define cada
 *     inmobiliaria» (F-05) no se podía cumplir.
 *   · `tomarReclamo` — dos personas podían contestarle al mismo candidato.
 *
 * Los tres los encontró Nico abriendo pantallas, no una prueba.
 *
 * ── Qué asegura este test ──────────────────────────────────────────────────
 *
 * Que la lista no crezca. No exige que sea cero —hay 171 verbos sin consumidor
 * hoy y algunos son legítimos (un servicio que sólo usa otro servicio, o una
 * pieza que espera su pantalla)—, pero sí que agregar un método nuevo al
 * cliente sin usarlo en ninguna parte deje de ser gratis y silencioso.
 *
 * Si este test falla al agregar algo: o lo usas, o subes el techo A PROPÓSITO
 * dejando dicho por qué. Lo que no vale es no enterarse.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = join(process.cwd(), 'src')

/**
 * El techo de hoy: 171 verbos sin un solo consumidor, de 774.
 *
 * Baja este número cada vez que conectes uno. Subirlo es una decisión, no un
 * accidente: escribe acá por qué.
 */
const TECHO = 171

function archivos(dir: string, acc: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) {
      archivos(ruta, acc)
    } else if (/\.(ts|tsx)$/.test(nombre)) {
      acc.push(ruta)
    }
  }
  return acc
}

const TODOS = archivos(RAIZ)

/** Los clientes: `export const xxxApi = { ... }`. */
function apisConSusVerbos(): Map<string, string[]> {
  const mapa = new Map<string, string[]>()
  for (const f of TODOS) {
    if (!f.includes('/lib/api/')) continue
    if (f.includes('.test.') || f.includes('.types.')) continue
    const s = readFileSync(f, 'utf8')
    const re = /export const (\w*[Aa]pi)\s*=\s*\{/g
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) {
      const resto = s.slice(m.index + m[0].length)
      const fin = /^\}/m.exec(resto)
      const cuerpo = fin ? resto.slice(0, fin.index) : resto
      const verbos = [...cuerpo.matchAll(/^ {2}(?:async )?(\w+)\s*[:(]/gm)].map(
        (v) => v[1],
      )
      if (verbos.length > 0) mapa.set(m[1], [...new Set(verbos)])
    }
  }
  return mapa
}

/** Todo el código que NO es el cliente ni una prueba: ahí se usa o no se usa. */
function elRestoDelCodigo(): string {
  return TODOS.filter((f) => !f.includes('/lib/api/') && !f.includes('.test.'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')
}

describe('lo que el back ofrece y nadie usa', () => {
  const apis = apisConSusVerbos()
  const resto = elRestoDelCodigo()

  const huerfanos: { api: string; verbo: string }[] = []
  for (const [api, verbos] of apis) {
    for (const verbo of verbos) {
      if (!resto.includes(`${api}.${verbo}`)) huerfanos.push({ api, verbo })
    }
  }

  it('encuentra los clientes (si no, este test dejó de probar algo)', () => {
    expect(apis.size).toBeGreaterThan(20)
    const verbos = [...apis.values()].reduce((n, v) => n + v.length, 0)
    expect(verbos).toBeGreaterThan(500)
  })

  it('🔴 la lista de verbos sin consumidor NO crece', () => {
    // Al fallar, esto imprime cuáles son: la lista es la lista de trabajo.
    const detalle = huerfanos
      .map((h) => `${h.api}.${h.verbo}`)
      .sort()
      .join('\n')
    expect(
      huerfanos.length,
      // Jest no, Vitest sí acepta el mensaje — y acá vale la pena:
      `Verbos sin un solo consumidor: ${huerfanos.length} (techo ${TECHO}).\n${detalle}`,
    ).toBeLessThanOrEqual(TECHO)
  })

  it('los que ya conectamos hoy siguen conectados', () => {
    // Los seis que estaban muertos y se conectaron el 18-09 de noche. Si
    // alguno vuelve a quedar sin consumidor, es que se borró su pantalla.
    const conectados = [
      'publicacionApi.publicar',
      'publicacionApi.despublicar',
      'publicacionApi.revision',
      'publicacionApi.guardarCuenta',
      'postulacionesApi.crearRequisito',
      'postulacionesApi.borrarRequisito',
      'postulacionesApi.tomarReclamo',
    ]
    const sueltos = conectados.filter((c) => !resto.includes(c))
    expect(sueltos).toEqual([])
  })
})
