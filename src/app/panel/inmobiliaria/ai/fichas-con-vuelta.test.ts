/**
 * Toda ficha de detalle del workspace de agentes tiene que poder volver.
 *
 * De las 7 fichas del workspace, 3 no tenían NINGUNA salida visible —entre
 * ellas la de un caso de cobranza, que es la más usada—. No es un olvido de
 * una: la ruta dinámica se agrega, el breadcrumb aparece solo, y como
 * *parece* que hay navegación arriba, nadie nota que no hay forma de
 * devolverse. Este test es la red, porque el defecto no rompe nada: la
 * pantalla se ve completa.
 *
 * Es un test ESTÁTICO a propósito. Montar 7 pantallas con sus providers,
 * permisos y hooks de red para comprobar una sola cosa cuesta mucho más y
 * falla por motivos que no son éste.
 *
 * Para una ficha nueva: `<VolverALaLista href={ruta de la lista} label=… />`.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = join(process.cwd(), 'src/app/panel/inmobiliaria/ai')

/** Un segmento dinámico de App Router: `[id]`, `[callId]`… */
const ES_SEGMENTO_DINAMICO = /^\[.+\]$/

/**
 * Formas aceptadas de «acá se sale».
 *
 * `VolverALaLista` es la canónica. Las otras tres son las que ya existían
 * cuando se escribió esto (cada ficha resolvió lo mismo a su manera); se
 * aceptan para no forzar una migración de copy en este cambio, pero no son
 * el patrón a copiar.
 */
const SALIDAS = [
  /VolverALaLista/, // canónica
  /BackButton/, // primitiva del DS, suelta
  /function BackLink\b/, // link a mano (pagos)
  /←\s*\{?\s*t\(/, // flecha + copy traducido (llamadas, cartas)
]

function fichasDeDetalle(dir: string, encontradas: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      fichasDeDetalle(ruta, encontradas)
      continue
    }
    if (!entrada.name.endsWith('Client.tsx')) continue
    // Sólo las que viven DENTRO de un segmento dinámico: ésas son las fichas.
    const padre = dir.split('/').pop() ?? ''
    if (ES_SEGMENTO_DINAMICO.test(padre)) encontradas.push(ruta)
  }
  return encontradas
}

describe('fichas de detalle del workspace de agentes', () => {
  const fichas = fichasDeDetalle(RAIZ)

  it('encuentra las fichas (si no, el glob se rompió y el test no prueba nada)', () => {
    expect(fichas.length).toBeGreaterThanOrEqual(7)
  })

  it.each(fichas.map((f) => [relative(process.cwd(), f), f] as const))(
    '%s ofrece una salida visible',
    (_nombre, ruta) => {
      const fuente = readFileSync(ruta, 'utf8')
      const tieneSalida = SALIDAS.some((re) => re.test(fuente))
      expect(
        tieneSalida,
        'Ninguna forma de volver a la lista. Agregá ' +
          '<VolverALaLista href="…" label={t("inmobiliaria.ai.volverA.…")} /> ' +
          'arriba del <h1>.',
      ).toBe(true)
    },
  )
})
