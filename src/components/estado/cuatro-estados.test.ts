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

/** Toma datos de un hook propio (los de `@/lib/hooks` van todos por useApiData). */
const USA_HOOK_DE_DATOS = /from '@\/lib\/hooks/
/** Pinta algún estado vacío. */
const PINTA_VACIO = /EmptyState|Sin .*aún|No hay/
/** Mira el fallo de alguna forma. */
const MIRA_EL_ERROR = /\berror\b|isError/

/**
 * Pantallas que pintan un vacío sin haber mirado si la petición falló.
 * Un error se ve ahí como «no hay nada».
 *
 * Para sacar una de la lista: tomá `error` (y `isLoading`) del hook y envolvé
 * el contenido en `<EstadoDeDatos>`. Ver `agenda/page.tsx` y
 * `portafolio/page.tsx`, que fueron las dos primeras.
 */
const VACIO_SIN_MIRAR_EL_ERROR = [
  'src/app/inquilino/guardados/page.tsx',
  'src/app/inquilino/pagos/page.tsx',
  'src/app/inquilino/para-ti/page.tsx',
  'src/app/panel/inmobiliaria/ai/asegurabilidad/[quoteId]/RecomendacionRail.tsx',
  'src/app/panel/inmobiliaria/ai/asegurabilidad/costos/page.tsx',
  'src/components/tenant/RecommendedProperties.tsx',
  'src/components/messages/MessagesWidget.tsx',
  'src/components/lease/LeaseExpandableItem.tsx',
  'src/components/inmobiliaria/cotizador/WizardStep3Config.tsx',
  'src/components/inmobiliaria/cobranza/TopScriptsTable.tsx',
  'src/components/inmobiliaria/cobranza/CobranzaAnaliticaResumen.tsx',
]

/**
 * Pantallas que siguen con el `ErrorState` viejo: muestra el mensaje crudo del
 * backend —en inglés— y ofrece «Intentar de nuevo» incluso sobre un 404, que
 * es una promesa falsa. Reemplazo: `<FalloDeCarga>`.
 */
const ERROR_STATE_VIEJO = [
  'src/app/inquilino/arriendo/page.tsx',
  'src/app/inquilino/aprobacion/page.tsx',
  'src/app/panel/inmobiliaria/inmuebles/page.tsx',
  'src/app/panel/inmobiliaria/inmuebles/[id]/candidatos/page.tsx',
  'src/app/panel/inmobiliaria/dashboard/page.tsx',
  'src/app/panel/inmobiliaria/cobros/page.tsx',
  'src/app/panel/inmobiliaria/ai/error.tsx',
  'src/app/panel/inmobiliaria/ai/cobranza/llamadas/page.tsx',
  'src/app/panel/inmobiliaria/renovaciones/page.tsx',
  'src/app/panel/(landlord)/leases/page.tsx',
  'src/app/panel/(landlord)/contratos/page.tsx',
  'src/components/inmobiliaria/ai/lessons/ChatLessonsPanel.tsx',
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
      return /\bErrorState\b/.test(readFileSync(archivo, 'utf8'))
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
