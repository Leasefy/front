/**
 * El producto TUTEA. Nada de voseo rioplatense.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El 2026-09-07 se tuteó el producto entero: Leasefy se usa en Colombia y
 * «vos» no se habla acá. Pero el tuteo se aplicó a lo que había ese día y
 * nada impidió que volviera a entrar: el 19-09, contando las pantallas con
 * acciones masivas, apareció «Marcá los pendientes que van juntos al banco» y,
 * tirando del hilo, **cuarenta y cuatro frases más** repartidas en los dos
 * repos. Contabilidad estaba escrita casi entera en rioplatense, y había
 * frases con las dos formas mezcladas en el mismo renglón:
 *
 *   «Tu búsqueda trajo 3 personas… **Mirá** en «Todos» o **busca** otra cosa.»
 *   «**Compará** los postulados asegurables y **elige tú** quién vive…»
 *
 * Un inquilino colombiano leyendo «No tenés contratos en ninguna
 * inmobiliaria» no entiende mal la frase: entiende que el producto no es de
 * acá.
 *
 * ── Qué vigila, y qué no ────────────────────────────────────────────────────
 *
 * Sólo las formas donde el voseo es INEQUÍVOCO:
 *
 *   · imperativos de verbos en -ar («marcá», «usá», «mirá»). El tuteo escribe
 *     «marca» y el pretérito de primera persona «marqué»: ninguno choca.
 *   · presentes con -és («podés», «tenés», «querés»).
 *   · enclíticos sin tilde que el voseo deja llanos («avisale», «pedile»,
 *     «quitala»), que en tuteo llevan tilde («avísale», «pídele», «quítala»).
 *
 * NO vigila «escribí», «elegí», «subí» ni «pedí»: en tuteo esas mismas letras
 * son el pretérito de primera persona —«ya la subí», «definí mis
 * condiciones»— y el test acusaría frases correctas. Ésas se cazan leyendo.
 *
 * Se saltan los COMENTARIOS: ahí viven las citas textuales de la gente y las
 * notas de quien escribió el archivo, y ninguna de las dos la lee un usuario.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = process.cwd()
const CARPETAS = ['src/app', 'src/components', 'src/lib']

/** Imperativos de -ar: «marcá» nunca es otra cosa que voseo. */
const IMPERATIVOS_EN_AR = [
  'marcá', 'usá', 'mirá', 'dejá', 'guardá', 'cargá', 'probá', 'anulá', 'compará',
  'revisá', 'verificá', 'importá', 'quitá', 'buscá', 'creá', 'editá', 'borrá',
  'descargá', 'cerrá', 'empezá', 'mandá', 'llená', 'aprobá', 'activá', 'asigná',
  'copiá', 'publicá', 'sumá', 'tocá', 'filtrá', 'agregá', 'ingresá', 'seleccioná',
  'confirmá', 'sembrá', 'recargá', 'declará', 'cambiá', 'avisá', 'contá',
  'esperá', 'firmá', 'generá', 'llamá', 'pagá', 'pasá', 'prestá', 'terminá',
  'tomá', 'trabajá', 'validá', 'andá', 'estás seguro de que querés',
  'armá', 'arreglá', 'ajustá', 'aplicá', 'apagá', 'calculá', 'chequeá', 'conectá',
  'consultá', 'controlá', 'cortá', 'descartá', 'enviá', 'escaneá', 'exportá',
  'grabá', 'intentá', 'modificá', 'mostrá', 'nombrá', 'notificá', 'ordená',
  'organizá', 'pegá', 'preguntá', 'presioná', 'reintentá', 'renová', 'reportá',
  'separá', 'señalá', 'solucioná', 'anotá', 'apuntá', 'bajá', 'completá',
  'comprobá', 'contactá', 'desactivá', 'duplicá', 'entregá', 'liquidá',
  'numerá', 'programá', 'rechazá', 'registrá', 'renombrá', 'reservá',
  'restablecé', 'revertí', 'sincronizá', 'trasladá', 'verificá',
]

/** Presentes en -és y los dos irregulares que más se escapan. */
const PRESENTES_VOSEO = ['podés', 'tenés', 'querés', 'sabés', 'debés', 'hacés', 'ponés', 'decís', 'venís', 'sos ']

/**
 * Enclíticos que el voseo deja sin tilde. En tuteo la palabra es esdrújula y
 * la lleva: «avísale», «pídele», «quítala», «decláralo», «cámbiale».
 */
const ENCLITICOS_SIN_TILDE = [
  'avisale', 'avisales', 'pedile', 'pediles', 'decile', 'deciles', 'cambiale',
  'quitala', 'quitalas', 'quitalo', 'quitalos', 'creala', 'crealo', 'declaralo',
  'declarala', 'subilo', 'subila', 'mandale', 'contale', 'dejala', 'dejalo',
  'sacalo', 'sacala', 'miralo', 'mirala', 'usalo', 'usala',
]

const PROHIBIDAS = [...IMPERATIVOS_EN_AR, ...PRESENTES_VOSEO, ...ENCLITICOS_SIN_TILDE]

/**
 * Marca renglón por renglón cuáles son COMENTARIO.
 *
 * 🔴 No alcanza con mirar cómo empieza cada renglón. Un bloque de varios
 * renglones que cita a alguien —«deja el título pegado al tope del orbe, mirá
 * que está como en el centro»— tiene renglones del medio que empiezan por
 * cualquier cosa, y acusarlos sería pedir que se le corrija la gramática a
 * una cita. Por eso se lleva el estado de «voy dentro de un bloque».
 */
function renglonesDeComentario(lineas: readonly string[]): boolean[] {
  const salida: boolean[] = []
  let dentroDeBloque = false
  for (const linea of lineas) {
    if (dentroDeBloque) {
      salida.push(true)
      if (linea.includes('*/')) dentroDeBloque = false
      continue
    }
    const l = linea.trimStart()
    const esDeUnaLinea = l.startsWith('//')
    // `/*` o `{/*` que no cierra en el mismo renglón: empieza un bloque.
    const abre = linea.lastIndexOf('/*')
    if (abre !== -1 && linea.indexOf('*/', abre) === -1) dentroDeBloque = true
    salida.push(esDeUnaLinea || l.startsWith('*') || l.startsWith('/*') || l.startsWith('{/*'))
  }
  return salida
}

function archivos(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') recorrer(ruta)
      } else if (/\.(tsx?|json)$/.test(e.name) && !e.name.includes('.test.')) {
        salida.push(ruta)
      }
    }
  }
  for (const c of CARPETAS) recorrer(join(RAIZ, c))
  return salida
}

describe('el producto tutea', () => {
  it('🔴 ninguna frase que lea un usuario está en voseo', () => {
    const hallazgos: string[] = []
    for (const ruta of archivos()) {
      const texto = readFileSync(ruta, 'utf8')
      // Atajo barato: si el archivo no tiene una sola vocal acentuada de las
      // que nos importan, ni vale la pena partirlo en renglones.
      if (!/[áéí]|avisale|pedile|quitala|creala|subilo/i.test(texto)) continue
      const lineas = texto.split('\n')
      const esComentario = renglonesDeComentario(lineas)
      for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i]
        if (esComentario[i]) continue
        const enMinuscula = linea.toLowerCase()
        for (const mala of PROHIBIDAS) {
          // Frontera de palabra a mano: las tildes rompen `\b` en algunos motores.
          const re = new RegExp(`(^|[^a-záéíóúñ])${mala}(?![a-záéíóúñ])`, 'i')
          if (re.test(enMinuscula)) {
            hallazgos.push(
              `${relative(RAIZ, ruta)}:${i + 1} · «${mala}» → ${linea.trim().slice(0, 110)}`,
            )
            break
          }
        }
      }
    }
    expect(
      hallazgos,
      `Voseo en texto que ve el usuario. El producto tutea (2026-09-07):\n` +
        hallazgos.join('\n'),
    ).toEqual([])
  }, 30_000)
})
