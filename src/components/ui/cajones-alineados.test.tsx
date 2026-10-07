/**
 * El contenido de todo cajón va alineado al padding del cajón.
 *
 * Nico (03-10-2026), sobre «Invitaciones al portal»: «mira este drawer por
 * dentro, cómo está de feo, y no respeta pegando bien el contenido a los
 * paddings, revisa que todos los que tengamos estén bien». La regla está en
 * DESIGN.md §Drawers, «Contenido alineado al padding».
 *
 * ── Qué mira ───────────────────────────────────────────────────────────────
 *
 * Es estático a propósito, como `modales-alineados`: montar ~60 cajones con sus
 * providers, permisos y datos para medir tres distancias cuesta muchísimo más y
 * falla por motivos que no son éste. La medición de verdad (en el navegador,
 * con `getBoundingClientRect`) se hizo una vez para todos; esto cuida que no
 * vuelvan las dos formas en que se rompía:
 *
 * 1. una `<Table>` dentro del cuerpo de un cajón SIN `<SheetTable>` (la «caja
 *    metida»: el texto corrido 16 px y la cabecera gris como otra tarjeta);
 * 2. un relleno lateral inventado en las bandas del cajón (`px-4` en
 *    `SheetBody`, `p-5` en `CajonPie`…). Un cuerpo `p-0` vale sólo si el
 *    archivo devuelve el padding del cajón (`RELLENO_DEL_CAJON` o `px-6`/`mx-6`).
 *
 * No ve una tabla que dibuja OTRO componente dentro del cuerpo: eso lo cubre la
 * medición en el navegador (memory/archivos/pruebas/cajones/).
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'

import { SheetTable, RELLENO_DEL_CAJON, FILA_ANCHA_DE_LA_CABECERA } from '@/components/ui/sheet'

const RAIZ = join(process.cwd(), 'src')

/** Las primitivas mismas (y su doble de prueba) no son call sites. */
const PRIMITIVAS = new Set([
  'components/ui/sheet.tsx',
  'components/ui/cajon.tsx',
  'components/ui/drawer.tsx',
  'components/ui/responsive-dialog.tsx',
  'components/ui/sheet-test-stub.tsx',
])

/**
 * Cajones que legítimamente se salen de la regla, uno por uno y con motivo:
 * una excepción sin nombre es la puerta por la que vuelve el desorden.
 */
const RELLENO_JUSTIFICADO: Record<string, string> = {
  'components/layout/MobileNavSheet.tsx':
    'Menú de navegación: cada fila es una pastilla con su resaltado redondeado 12 px adentro ' +
    '(`px-3` en el cuerpo); el ícono de cada fila queda en la línea del título (12 + 12).',
  'components/inmobiliaria/consignacion/ElegirInmuebleDrawer.tsx':
    'Lista de selección: el resaltado redondeado de cada fila va 12 px adentro (`px-3` en el ' +
    'cuerpo) y la miniatura queda en la línea del título (12 + 12).',
  'components/inmobiliaria/piloto/PilotoDocumento.tsx':
    'Visor de un documento (sub-cajón pegado a `PilotoCajon`): el cuerpo es la mesa `bg-bg` sobre ' +
    'la que se apoya el papel, con su margen; no hay texto suelto que alinear con el título.',
}

const TABLA_JUSTIFICADA: Record<string, string> = {
  'components/inmobiliaria/InvitacionesPendientes.tsx':
    'Ya va a sangre con `-mx-6` y `pl-6`/`pr-6` a mano (QA-INQ-FRONT, 03-10-2026). Cuando pase a ' +
    '`<SheetTable>`, sale de esta lista.',
}

function archivosTsx(dir: string, encontrados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) archivosTsx(ruta, encontrados)
    else if (entrada.name.endsWith('.tsx') && !entrada.name.includes('.test.')) encontrados.push(ruta)
  }
  return encontrados
}

const rel = (p: string) => relative(RAIZ, p).replace(/\\/g, '/')

const CAJONES = archivosTsx(RAIZ)
  .filter((p) => !PRIMITIVAS.has(rel(p)))
  .filter((p) => /from ['"]@\/components\/ui\/(sheet|cajon)['"]/.test(readFileSync(p, 'utf8')))

/**
 * Lee la etiqueta de apertura que empieza en `inicio` (`<Nombre …>`) y devuelve
 * el texto de sus atributos de PRIMER nivel: lo que va entre llaves (otro JSX en
 * `leading={…}`, una función) no cuenta como atributo de esta etiqueta.
 */
function atributosDeLaEtiqueta(fuente: string, inicio: number): { primerNivel: string; fin: number } {
  let profundidad = 0
  let comilla: string | null = null
  let primerNivel = ''
  for (let i = inicio; i < fuente.length; i++) {
    const c = fuente[i]
    if (comilla) {
      if (c === comilla) comilla = null
      if (profundidad === 0) primerNivel += c
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      comilla = c
      if (profundidad === 0) primerNivel += c
      continue
    }
    if (c === '{') {
      profundidad++
      // El valor de `className={…}` sí es de esta etiqueta: se guarda entero.
      if (profundidad === 1 && /className=$/.test(primerNivel)) {
        let d = 1
        let j = i + 1
        for (; j < fuente.length && d > 0; j++) {
          if (fuente[j] === '{') d++
          else if (fuente[j] === '}') d--
        }
        primerNivel += fuente.slice(i, j)
        i = j - 1
        profundidad = 0
      }
      continue
    }
    if (c === '}') {
      profundidad--
      continue
    }
    if (profundidad === 0) {
      if (c === '>') return { primerNivel, fin: i }
      primerNivel += c
    }
  }
  return { primerNivel, fin: fuente.length }
}

const BANDAS = ['SheetBody', 'CajonCuerpo', 'SheetHeader', 'CajonCabecera', 'SheetFooter', 'CajonPie']

/** Clases de relleno o margen LATERAL (o `p-N`, que también lo es) en el className de una banda. */
function rellenosLaterales(primerNivel: string): string[] {
  const m = primerNivel.match(/className=(\{[\s\S]*\}|"[^"]*"|'[^']*')/)
  if (!m) return []
  return [...m[1].matchAll(/(?<![\w:[-])!?-?(?:p|px|pl|pr|mx|ml|mr)-[\w.[\]]+/g)].map((x) => x[0])
}

const esCero = (clase: string) => /^!?(p|px)-0$/.test(clase)

describe('cajones — contenido alineado al padding (DESIGN.md §Drawers)', () => {
  it('encuentra los cajones (si no, el barrido se rompió y la prueba no prueba nada)', () => {
    expect(CAJONES.length).toBeGreaterThanOrEqual(40)
  })

  it('ninguna banda del cajón trae un relleno lateral inventado', () => {
    const infractores: string[] = []
    for (const ruta of CAJONES) {
      const nombre = rel(ruta)
      if (nombre in RELLENO_JUSTIFICADO) continue
      const fuente = readFileSync(ruta, 'utf8')
      const devuelveElPadding = /RELLENO_DEL_CAJON|(?<![\w-])(px-6|mx-6)\b/.test(fuente)
      for (const banda of BANDAS) {
        for (const m of fuente.matchAll(new RegExp(`<${banda}(?=[\\s>/])`, 'g'))) {
          const { primerNivel } = atributosDeLaEtiqueta(fuente, (m.index ?? 0) + banda.length + 1)
          const linea = fuente.slice(0, m.index).split('\n').length
          for (const clase of rellenosLaterales(primerNivel)) {
            if (esCero(clase) && (banda === 'SheetBody' || banda === 'CajonCuerpo')) {
              if (!devuelveElPadding) infractores.push(`${nombre}:${linea} <${banda} ${clase}> sin devolver el padding en las filas`)
              continue
            }
            infractores.push(`${nombre}:${linea} <${banda}> ${clase}`)
          }
        }
      }
    }
    expect(
      infractores,
      'El padding lateral del cajón lo ponen sus bandas (24 px). Un cuerpo a sangre (`p-0`) devuelve ' +
        'el padding con `RELLENO_DEL_CAJON`; si de verdad no corresponde, agrégalo a RELLENO_JUSTIFICADO con el motivo.',
    ).toEqual([])
  })

  it('una tabla dentro del cuerpo de un cajón va en <SheetTable> (a sangre, sin caja)', () => {
    const infractores: string[] = []
    for (const ruta of CAJONES) {
      const nombre = rel(ruta)
      if (nombre in TABLA_JUSTIFICADA) continue
      const fuente = readFileSync(ruta, 'utf8')
      for (const m of fuente.matchAll(/<(SheetBody|CajonCuerpo)(?=[\s>])/g)) {
        const desde = m.index ?? 0
        const cierre = fuente.indexOf(`</${m[1]}>`, desde)
        if (cierre < 0) continue
        const cuerpo = fuente.slice(desde, cierre)
        for (const t of cuerpo.matchAll(/<Table(?=[\s>])/g)) {
          const antes = cuerpo.slice(0, t.index)
          const abiertas = (antes.match(/<SheetTable(?=[\s>])/g) ?? []).length - (antes.match(/<\/SheetTable>/g) ?? []).length
          if (abiertas <= 0) infractores.push(`${nombre}:${fuente.slice(0, desde + (t.index ?? 0)).split('\n').length}`)
        }
      }
    }
    expect(
      infractores,
      'Envuelve la tabla en <SheetTable> (de @/components/ui/sheet): la cabecera y las filas tocan los bordes ' +
        'del cajón y el primer texto queda en la línea del título. Nada de `rounded border` alrededor.',
    ).toEqual([])
  })

  it('las excepciones siguen existiendo (una excepción de un archivo borrado se limpia)', () => {
    const nombres = new Set(CAJONES.map(rel))
    for (const nombre of [...Object.keys(RELLENO_JUSTIFICADO), ...Object.keys(TABLA_JUSTIFICADA)]) {
      expect(nombres.has(nombre), `${nombre} ya no arma un cajón: quítalo de las excepciones`).toBe(true)
    }
  })
})

describe('SheetTable — la tabla a sangre', () => {
  it('se come el padding del cuerpo y se lo devuelve a la primera y la última celda', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(
      <SheetTable className="mt-2">
        <table>
          <tbody>
            <tr>
              <td>Cuenta</td>
              <td>Débito</td>
            </tr>
          </tbody>
        </table>
      </SheetTable>,
    )
    const caja = container.querySelector('[data-sheet-table]') as HTMLElement
    expect(caja).not.toBeNull()
    const clases = caja.className.split(/\s+/)
    expect(clases).toContain('-mx-6')
    expect(clases).toContain('[&_tr>*:first-child]:pl-6')
    expect(clases).toContain('[&_tr>*:last-child]:pr-6')
    expect(clases).toContain('mt-2')
    // Sin marco: la tabla a sangre no es otra tarjeta.
    expect(caja.className).not.toMatch(/\b(rounded|border)\b/)
  })

  it('el padding que devuelve es el mismo de las bandas del cajón (24 px)', () => {
    expect(RELLENO_DEL_CAJON).toBe('px-6')
    // El hueco de la ✕ en la cabecera (72 px) menos el padding (24 px) = 48 px que recupera la fila ancha.
    expect(FILA_ANCHA_DE_LA_CABECERA).toBe('group-data-[close=true]/sheet:-mr-12')
  })
})

describe('la ✕ del cajón termina en el padding', () => {
  // Nico (03-10-2026): el contenido termina en el padding derecho, que es el
  // borde de la ✕. Cadence la deja en `right-4` (16 px); el adaptador la pasa
  // a `right-6` (24 px) y agranda el hueco de la cabecera en los mismos 8 px
  // para que un título largo no se meta debajo. Los modales no pasan por acá.
  const fuente = readFileSync(join(RAIZ, 'components/ui/sheet.tsx'), 'utf8')

  it('la ✕ va en right-6 (24 px), después de la clase de Cadence para que la pise', () => {
    expect(fuente).toMatch(/const ASPA_EN_EL_PADDING = "right-6"/)
    expect(fuente).toMatch(/cn\(ASPA_DE_CIERRE, sheetCloseClassName, ASPA_EN_EL_PADDING\)/)
  })

  it('la cabecera le reserva 24 + 36 (la ✕) + 12 de aire = 72 px', () => {
    expect(fuente).toMatch(/const HUECO_DE_LA_ASPA = "group-data-\[close=true\]\/sheet:pr-\[72px\]"/)
    expect(fuente).toMatch(/<DSSheetHeader ref=\{ref\} className=\{cn\(HUECO_DE_LA_ASPA, className\)\}/)
  })
})
