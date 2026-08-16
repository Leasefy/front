/**
 * Cargando, falló, vacío y «hay datos» son CUATRO estados, no uno.
 *
 * `useApiData` captura el fallo en su propio estado y **no lo relanza**. O sea:
 * si una pantalla toma sólo los datos del hook, una petición que murió le llega
 * como `[]` — y entonces afirma «todavía no hay nada». Eso no es un vacío: es
 * una pantalla mintiendo con confianza sobre algo que no verificó.
 *
 * Las primitivas para hacerlo bien YA existen (`EstadoDeDatos` ordena los
 * cuatro estados, `FalloDeCarga` clasifica el fallo y decide si reintentar
 * sirve). Lo que faltaba era que alguien las usara: cuando se escribió este
 * test, `EstadoDeDatos` tenía **cero** call sites.
 *
 * Este test es ESTÁTICO a propósito. Montar 60 pantallas con sus providers,
 * permisos y red para comprobar una sola regla cuesta muchísimo más y falla
 * por motivos que no son éste.
 *
 * Las listas de abajo son deuda conocida y **sólo pueden achicarse**. Si
 * agregás una pantalla nueva a alguna, el test falla — que es el punto.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = process.cwd()
const CARPETAS = ['src/app', 'src/components']

/**
 * Toma datos de un hook propio (los de `@/lib/hooks` van todos por useApiData).
 *
 * ⚠️ `import type` NO cuenta: traerse un tipo del archivo de un hook no es
 * pedir datos. Sin esta exclusión el test señalaba a `TopScriptsTable` y a
 * `RecomendacionRail`, que reciben todo por props y no piden nada — y una
 * lista de deuda con falsos positivos adentro enseña a ignorarla.
 */
const USA_HOOK_DE_DATOS = /^import (?!type )[^\n]*from '@\/lib\/hooks/m
/** Pinta algún estado vacío. */
const PINTA_VACIO = /EmptyState|Sin .*aún|No hay/
/**
 * Mira el fallo de alguna forma: lo desestructura del hook, lo pasa como prop
 * o lo compara. Lo que sigue después del nombre es lo que distingue leerlo
 * (`error,` `summaryError:` `error={`) de sólo escribirlo (`console.error(`,
 * `toast.error(`, `catch (error)`), que no es mirarlo.
 *
 * Case-insensitive a propósito: `summaryError` y `errorCrudo` cuentan igual.
 * Con `/\berror\b/` a secas, `costos/page.tsx` figuraba como deuda teniendo el
 * fallo resuelto desde siempre.
 */
const MIRA_EL_ERROR = /(?<!\()\b(?:\w+[eE]rror|error)(?:Crudo)?\b(?!\s*\()|isError/

/**
 * Pantallas que pintan un vacío sin haber mirado si la petición falló.
 * Un error se ve ahí como «no hay nada».
 *
 * **Vacía desde 2026-08-11.** Si volvés a agregar una, el otro test falla; es
 * el punto. Para arreglarla: tomá `errorCrudo` (y `isLoading`) del hook y
 * envolvé el contenido en `<EstadoDeDatos>`. Ver `agenda/page.tsx` y
 * `portafolio/page.tsx`, que fueron las dos primeras.
 */
const VACIO_SIN_MIRAR_EL_ERROR: string[] = []

/**
 * Pantallas que siguen con el `ErrorState` viejo: muestra el mensaje crudo del
 * backend —en inglés— y ofrece «Intentar de nuevo» incluso sobre un 404, que
 * es una promesa falsa. Reemplazo: `<FalloDeCarga>`.
 *
 * Queda una, y a propósito.
 */
const ERROR_STATE_VIEJO = [
  /**
   * `ai/error.tsx` NO es un fallo de carga: es el error boundary de Next para
   * los workspaces de IA. Lo que atrapa es un crash de render —un lookup en un
   * mapa finito contra una clave que el backend no tenía—, sin status HTTP que
   * clasificar, y su salida no es «reintentar la petición» sino `reset()` para
   * volver a renderizar el segmento. Además muestra el `digest`, que es lo
   * único que sirve cuando alguien escribe a soporte.
   *
   * `FalloDeCarga` está hecho para lo otro. Meterlo acá sería usar la
   * herramienta correcta en el problema equivocado.
   */
  'src/app/panel/inmobiliaria/ai/error.tsx',
]

function pantallas(dir: string, encontradas: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      pantallas(ruta, encontradas)
    } else if (entrada.name.endsWith('.tsx') && !entrada.name.includes('.test.')) {
      encontradas.push(ruta)
    }
  }
  return encontradas
}

const TODAS = CARPETAS.flatMap((c) => pantallas(join(RAIZ, c)))

function ruta(absoluta: string) {
  // Normalizamos a '/' para que las allowlists (escritas con '/') matcheen
  // también en Windows, donde `relative` devuelve separadores '\'.
  return relative(RAIZ, absoluta).replace(/\\/g, '/')
}

describe('un error no se pinta como un vacío', () => {
  it('la lista de pantallas que lo hacen no crece', () => {
    const encontradas = TODAS.filter((archivo) => {
      const src = readFileSync(archivo, 'utf8')
      return (
        USA_HOOK_DE_DATOS.test(src) && PINTA_VACIO.test(src) && !MIRA_EL_ERROR.test(src)
      )
    }).map(ruta)

    const nuevas = encontradas.filter((f) => !VACIO_SIN_MIRAR_EL_ERROR.includes(f))
    expect(
      nuevas,
      'Esta pantalla pinta un vacío sin mirar si la petición falló. ' +
        'Tomá `error` del hook y envolvé el contenido en <EstadoDeDatos>.',
    ).toEqual([])
  })

  it('las que ya estaban se van arreglando, no se quedan de adorno', () => {
    // Si arreglás una, sacala de la lista. Este test te avisa.
    const yaArregladas = VACIO_SIN_MIRAR_EL_ERROR.filter((f) => {
      const src = readFileSync(join(RAIZ, f), 'utf8')
      return MIRA_EL_ERROR.test(src)
    })
    expect(
      yaArregladas,
      'Estas ya miran el error: sacalas de VACIO_SIN_MIRAR_EL_ERROR.',
    ).toEqual([])
  })
})

describe('ErrorState viejo', () => {
  it('no se suma ninguna pantalla nueva', () => {
    const encontradas = TODAS.filter((archivo) => {
      if (archivo.endsWith('error-state.tsx') || archivo.endsWith('FalloDeCarga.tsx')) {
        return false
      }
      // USARLO, no nombrarlo. Con `/\bErrorState\b/` a secas quedaban marcadas
      // seis pantallas ya migradas, sólo porque el comentario que explica POR
      // QUÉ se reemplazó menciona el componente viejo. Una lista de deuda que
      // castiga documentar el cambio empuja a borrar la explicación.
      const src = readFileSync(archivo, 'utf8')
      return /<ErrorState[\s/>]/.test(src) || /^import .*\bErrorState\b/m.test(src)
    }).map(ruta)

    const nuevas = encontradas.filter((f) => !ERROR_STATE_VIEJO.includes(f))
    expect(
      nuevas,
      'ErrorState muestra el mensaje crudo del backend y ofrece reintentar ' +
        'sobre un 404. Usá <FalloDeCarga>, que clasifica el fallo.',
    ).toEqual([])
  })
})

describe('las primitivas mantienen lo que las hace correctas', () => {
  const estadoDeDatos = readFileSync(
    join(RAIZ, 'src/components/estado/EstadoDeDatos.tsx'),
    'utf8',
  )
  const falloDeCarga = readFileSync(
    join(RAIZ, 'src/components/estado/FalloDeCarga.tsx'),
    'utf8',
  )

  it('EstadoDeDatos evalúa cargando → falló → vacío, en ese orden', () => {
    const cargando = estadoDeDatos.indexOf('if (cargando)')
    const fallo = estadoDeDatos.indexOf('if (error')
    const vacio = estadoDeDatos.indexOf('if (vacio')

    expect(cargando).toBeGreaterThan(-1)
    expect(fallo).toBeGreaterThan(cargando)
    // Si el vacío se evalúa antes que la carga, la pantalla afirma «no hay
    // nada» durante el medio segundo en que todavía no sabe.
    expect(vacio).toBeGreaterThan(fallo)
  })

  it('FalloDeCarga sólo ofrece reintentar cuando reintentar puede cambiar algo', () => {
    expect(falloDeCarga).toContain('fallo.sePuedeReintentar')
    // Y sobre una sesión vencida ofrece volver a entrar, que sí arregla.
    expect(falloDeCarga).toContain("fallo.tipo === 'sinSesion'")
  })
})
