/**
 * La conciliación bancaria se hace en UN solo lugar.
 *
 * ── Por qué hace falta un test ─────────────────────────────────────────────
 *
 * Eran dos pantallas sobre el mismo trabajo y con backends distintos:
 * `/cobros/extracto-bancario` contra el monolito (extracto CSV/Excel de
 * cualquier banco → cobros con saldo → RECIBO DE CAJA → lote de seguros) y
 * `/conciliacion/movimientos` contra el micro (taxonomía, sugerencias,
 * reverse). Medido antes de unificarlas: 6 filas en `movimientos_bancarios`
 * del ERP contra 0 en `agent.bank_movements` del micro. La del agente estaba
 * mirando una tabla vacía.
 *
 * Lo que este test cuida no es el nombre de la ruta: es que no vuelvan a ser
 * dos. Agregar un `href` a `/panel/inmobiliaria/cobros/extracto-bancario`
 * compila, pasa `tsc` y se ve bien — la redirección lo lleva al workspace y
 * nadie nota nada… hasta que alguien recrea la carpeta y volvemos al principio.
 *
 * Y cuida lo que NO se puede perder en la mudanza: el recibo de caja, la carga
 * de Excel y el lote de seguros. Los tres viven en `<ExtractoBancario />`, y
 * `<ExtractoBancario />` tiene que estar montado en la pantalla que quedó.
 *
 * Estático a propósito: son rutas en strings, que es justo lo que el compilador
 * no mira.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

import { CONCILIACION_EN_UN_SOLO_LUGAR } from './conciliacion-en-un-solo-lugar'

const RAIZ = join(process.cwd(), 'src')

const DESTINO = '/panel/inmobiliaria/conciliacion/movimientos'
const RUTA_VIEJA = 'panel/inmobiliaria/cobros/extracto-bancario'

/** Los únicos a los que les toca nombrar la ruta vieja: el que redirige, y este test. */
const PUEDEN_NOMBRARLA = new Set([
  'lib/nav/conciliacion-en-un-solo-lugar.data.mjs',
  'lib/nav/conciliacion-en-un-solo-lugar.test.ts',
])

function archivosDeCodigo(dir: string, encontrados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      archivosDeCodigo(ruta, encontrados)
    } else if (/\.(tsx?|mjs|json)$/.test(entrada.name)) {
      encontrados.push(ruta)
    }
  }
  return encontrados
}

describe('la conciliación bancaria en un solo lugar', () => {
  it('nadie enlaza ya a /cobros/extracto-bancario', () => {
    const culpables = archivosDeCodigo(RAIZ)
      // Separadores a '/': `relative` devuelve '\' en Windows y la allowlist
      // está escrita con '/', así que sin normalizar el test se acusaría A SÍ
      // MISMO. Mismo criterio que `una-sola-seccion-de-inmuebles.test.ts`.
      .map((ruta) => ({
        ruta: relative(RAIZ, ruta).replace(/\\/g, '/'),
        texto: readFileSync(ruta, 'utf8'),
      }))
      .filter(({ ruta }) => !PUEDEN_NOMBRARLA.has(ruta))
      .filter(({ texto }) => texto.includes(RUTA_VIEJA))
      .map(({ ruta }) => ruta)

    expect(culpables).toEqual([])
  })

  it('la ruta vieja redirige, con sus sub-rutas', () => {
    const fuentes = CONCILIACION_EN_UN_SOLO_LUGAR.map((r) => r.source)
    // El orden NO es cosmético: `:path*` matchea también cero segmentos, así
    // que si fuera primera se comería la URL pelada y Next le colgaría un
    // `?path=` (el destino no usa `:path`). La exacta va adelante.
    expect(fuentes).toEqual([
      '/panel/inmobiliaria/cobros/extracto-bancario',
      '/panel/inmobiliaria/cobros/extracto-bancario/:path*',
    ])
    for (const r of CONCILIACION_EN_UN_SOLO_LUGAR) {
      expect(r.destination).toBe(DESTINO)
      // 307, no 301: un permanente lo cachea el navegador para siempre.
      expect(r.permanent).toBe(false)
    }
  })

  it('la redirección está cableada en next.config.mjs', () => {
    // La tabla puede estar impecable y no estar enchufada: el config es el
    // único lugar donde Next la mira, y no lo cubre ningún otro test.
    const config = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8')
    expect(config).toContain('conciliacion-en-un-solo-lugar.data.mjs')
    expect(config).toContain('...CONCILIACION_EN_UN_SOLO_LUGAR_DATA')
  })

  it('la carpeta vieja ya no existe — la redirección es la única puerta', () => {
    expect(existsSync(join(RAIZ, 'app/panel/inmobiliaria/cobros/extracto-bancario'))).toBe(false)
    expect(
      existsSync(join(RAIZ, 'app/panel/inmobiliaria/conciliacion/movimientos/page.tsx')),
    ).toBe(true)
  })

  it('la pantalla que quedó monta el extracto del ERP, que es el que emite el recibo', () => {
    // Lo que no se puede perder: recibo de caja, carga de Excel y lote de
    // seguros. Los tres son `<ExtractoBancario />`; si alguien lo desmonta,
    // la pantalla sigue compilando y la plata deja de conciliarse.
    const pagina = readFileSync(
      join(RAIZ, 'app/panel/inmobiliaria/conciliacion/movimientos/page.tsx'),
      'utf8',
    )
    expect(pagina).toContain("from '@/components/cobros/extracto-bancario/ExtractoBancario'")
    expect(pagina).toMatch(/<ExtractoBancario\b/)
    // El ancla con la que la Sala enlaza «Subir extracto del banco».
    expect(pagina).toContain('idDeCarga="upload"')
  })

  it('el extracto del ERP conserva el recibo, el Excel y el lote de seguros', () => {
    const extracto = readFileSync(
      join(RAIZ, 'components/cobros/extracto-bancario/ExtractoBancario.tsx'),
      'utf8',
    )
    // Conciliar emite un recibo de caja y lo dice por su número.
    expect(extracto).toContain('conciliacionBancariaApi.conciliar(')
    expect(extracto).toMatch(/Recibo N\.º \$\{r\.recibo\.numero\}/)
    // El lote de seguros.
    expect(extracto).toContain('conciliacionBancariaApi.conciliarSeguros()')
    // La carga del archivo (CSV **y** Excel) vive en `<CargarExtracto />`.
    expect(extracto).toContain('<CargarExtracto')

    const cargar = readFileSync(
      join(RAIZ, 'components/cobros/extracto-bancario/CargarExtracto.tsx'),
      'utf8',
    )
    expect(cargar).toContain('parseSpreadsheetFile')
  })

  it('lo del micro no se borró: sigue montado debajo', () => {
    const pagina = readFileSync(
      join(RAIZ, 'app/panel/inmobiliaria/conciliacion/movimientos/page.tsx'),
      'utf8',
    )
    expect(pagina).toMatch(/<ConciliacionDelAgente\b/)

    const agente = readFileSync(
      join(RAIZ, 'components/inmobiliaria/ai/ConciliacionDelAgente.tsx'),
      'utf8',
    )
    // Taxonomía de excepciones, sugerencias y reverse: las tres siguen ahí.
    expect(agente).toContain('useConciliacionQueue')
    expect(agente).toContain('reverseMatch')
    expect(agente).toContain('confirmMatch')
    expect(agente).toContain('rejectMatch')
    // Y el ingest hacia el micro, que es su única puerta de entrada.
    expect(agente).toContain('ingestStatement')
  })
})
