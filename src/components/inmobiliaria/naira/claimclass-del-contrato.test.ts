/**
 * 🔴 GUARDIA: LA CLASE, LA CATEGORÍA Y LA CAUSA SALEN DEL CONTRATO, NUNCA DEL TEXTO (Fase 13, plan 13-02; D13-10,
 * FG13-11, UI-SPEC §10.5).
 *
 * Una afirmación de Naira trae su `claimClass` (aritmética / asociación / hipótesis), su sección de salida y su banda de
 * probabilidad en CAMPOS: el linter que las deriva vive en el agente (09-03). El front no puede inferirlas buscando
 * palabras en un texto («porque» ⇒ hipótesis, «probablemente» ⇒ banda): por eso se prohíbe BUSCAR ese vocabulario en el
 * árbol de Naira (una regex, un `RegExp` o una búsqueda de texto con un término del léxico). ESCRIBIRLO no está prohibido:
 * los términos de las bandas del ADR-005 son datos en afirmaciones.ts (P7).
 *
 * `ChipDeAfirmacion` se monta SOLO desde `OracionesCausales`, que es donde vive el fail-closed de una oración sin clase
 * (P11): una superficie que monte el chip directo podría pintar una clase que el contrato no trajo.
 *
 * La copy propia de Naira (es.json) no explica causas ni redacta probabilidades (UI-SPEC §10.5): sin léxico de
 * probabilidad, sin «confianza», sin conectores causales, sin scores, sin actores y sin voseo. Lista blanca: solo la
 * etiqueta de fila «Probabilidad» del bloque de hipótesis (los términos de las bandas no son copy de i18n, P7).
 *
 * Por AST (TypeScript): los comentarios no son nodos, así que esta prosa —o la de cualquier archivo del árbol— no cuenta.
 * Crece sola: recorre las carpetas de Naira.
 *
 * 13-03 la hizo crecer: la carpeta de las páginas ya existe y ninguna raíz puede faltar ([N13:raiz-de-la-superficie]),
 * y el registro de rutas (src/lib/nav/rutas-de-naira.ts) entra al recorrido aunque viva fuera de las raíces.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import es from '@/lib/i18n/locales/es.json'

const RAICES = [
  'src/components/inmobiliaria/naira',
  'src/lib/hooks/naira',
  'src/lib/naira',
  'src/app/panel/inmobiliaria/reportes/naira',
] as const
/** Desde 13-03 la carpeta de las páginas existe: ninguna raíz puede faltar (la ausencia la dice [N13:raiz-de-la-superficie]). */
const RAICES_QUE_PUEDEN_FALTAR: readonly string[] = []
/** Archivos de Naira fuera de sus raíces que se analizan igual (13-03: el registro de rutas, src/lib/nav/). */
const ARCHIVOS_SUELTOS_DE_NAIRA: readonly string[] = ['src/lib/nav/rutas-de-naira.ts']

/** Comparado sin tildes y en minúsculas. Los que empiezan una familia de palabras se buscan como prefijo. */
const LEXICO = [
  'probab',
  'improbab',
  'posiblemente',
  'es posible que',
  'puede que',
  'quiza',
  'tal vez',
  'seguramente',
  'con seguridad',
  'casi seguro',
  'sin duda',
  'indudablemente',
  'es claro que',
  'certeza',
  'imposible',
  'verosimil',
  'plausible',
  'confianza',
  'porque',
  'debido a',
  'causo',
  'provoco',
  'se explica por',
  'a raiz de',
  'probably',
  'likely',
  'because',
] as const
const PREFIJOS: readonly string[] = ['probab', 'improbab', 'quiza', 'verosimil', 'plausible', 'imposible']
const EN_INGLES: readonly string[] = ['probably', 'likely', 'because']

/** Búsquedas de texto que, con un literal del léxico, derivarían una clase de las palabras. */
const BUSQUEDAS = new Set([
  'match',
  'matchAll',
  'test',
  'search',
  'includes',
  'indexOf',
  'lastIndexOf',
  'startsWith',
  'endsWith',
  'replace',
  'replaceAll',
  'split',
])

/** La única hoja de copy de Naira que puede decir «Probabilidad» (la etiqueta de fila del bloque de hipótesis). */
const CLAVE_DE_LA_ETIQUETA = 'inmobiliaria.ai.naira.hipotesis.probabilidad'

/** Copy prohibida además del léxico (sin tildes y en minúsculas). */
const COPY_PROHIBIDA = ['estoy aprendiendo', 'score', 'puntaje', 'indice de salud', '/100', 'quien cerro', 'cerrado por', 'aprobado por']
/** Voseo: se compara CON tildes (sin ellas, «intenta» sería «intentá»). */
const VOSEO = ['tenés', 'podés', 'querés', 'sabés', 'confirmás', 'revisá', 'mirá', 'fijate', 'escribí', 'probá', 'volvé', 'intentá']

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/** Un término del léxico al comienzo de una palabra (y, si no es un prefijo, también al final). */
function patronDe(termino: string, esPrefijo: boolean): RegExp {
  return new RegExp('(?<!\\p{L})' + escapar(termino) + (esPrefijo ? '' : '(?!\\p{L})'), 'u')
}

const PATRONES = LEXICO.map((termino) => ({ termino, patron: patronDe(termino, PREFIJOS.includes(termino)) }))
const PATRONES_DE_COPY = [
  ...PATRONES.filter((p) => !EN_INGLES.includes(p.termino)),
  ...COPY_PROHIBIDA.map((termino) => ({ termino, patron: patronDe(termino, false) })),
]

function terminosEn(texto: string, patrones: readonly { termino: string; patron: RegExp }[]): string[] {
  const t = sinTildes(texto)
  return patrones.filter((p) => p.patron.test(t)).map((p) => p.termino)
}

function archivosDelArbol(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name)
      if (e.isDirectory()) recorrer(ruta)
      else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) salida.push(relative(process.cwd(), ruta).split('\\').join('/'))
    }
  }
  for (const raiz of RAICES) {
    const absoluta = join(process.cwd(), raiz)
    // Una raíz ausente no tira acá (sería un error de carga, no un rojo con nombre): la acusa
    // [N13:raiz-de-la-superficie], salvo las de RAICES_QUE_PUEDEN_FALTAR.
    if (!existsSync(absoluta)) continue
    recorrer(absoluta)
  }
  for (const suelto of ARCHIVOS_SUELTOS_DE_NAIRA) {
    if (existsSync(join(process.cwd(), suelto))) salida.push(suelto)
  }
  return salida.sort()
}

function arbolDe(nombre: string, fuente: string): ts.SourceFile {
  return ts.createSourceFile(nombre, fuente, ts.ScriptTarget.Latest, true, nombre.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
}

/** El texto de un argumento literal (string, template sin sustituciones o regex), o null. */
function literalDe(n: ts.Node): string | null {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text
  if (n.kind === ts.SyntaxKind.RegularExpressionLiteral) return n.getText()
  if (ts.isTemplateExpression(n)) return n.getText()
  return null
}

/** `archivo:línea término` por cada regex, `RegExp` o búsqueda de texto con vocabulario de probabilidad o de causa. */
function busquedasDeLexico(nombre: string, fuente: string): string[] {
  const sf = arbolDe(nombre, fuente)
  const salida: string[] = []
  const marcar = (n: ts.Node, texto: string) => {
    const linea = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
    for (const termino of terminosEn(texto, PATRONES)) salida.push(nombre + ':' + linea + ' ' + termino)
  }
  const visitar = (n: ts.Node) => {
    if (n.kind === ts.SyntaxKind.RegularExpressionLiteral) marcar(n, n.getText(sf))
    if ((ts.isCallExpression(n) || ts.isNewExpression(n)) && ts.isIdentifier(n.expression) && n.expression.text === 'RegExp') {
      for (const a of n.arguments ?? []) {
        const texto = literalDe(a)
        if (texto !== null) marcar(a, texto)
      }
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && BUSQUEDAS.has(n.expression.name.text)) {
      for (const a of n.arguments) {
        const texto = literalDe(a)
        if (texto !== null) marcar(a, texto)
      }
    }
    ts.forEachChild(n, visitar)
  }
  visitar(sf)
  return [...new Set(salida)]
}

/** Qué archivos montan un elemento JSX con ese nombre y cuáles llevan un atributo JSX con ese nombre. */
function jsxDe(archivos: readonly string[]): { readonly conChip: string[]; readonly conAtributo: string[] } {
  const conChip = new Set<string>()
  const conAtributo = new Set<string>()
  for (const a of archivos) {
    if (!a.endsWith('.tsx')) continue
    const sf = arbolDe(a, readFileSync(join(process.cwd(), a), 'utf8'))
    const visitar = (n: ts.Node) => {
      if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText(sf) === 'ChipDeAfirmacion') conChip.add(a)
      if (ts.isJsxAttribute(n) && n.name.getText(sf) === 'data-claim-class') conAtributo.add(a)
      ts.forEachChild(n, visitar)
    }
    visitar(sf)
  }
  return { conChip: [...conChip].sort(), conAtributo: [...conAtributo].sort() }
}

function leer(diccionario: unknown, clave: string): unknown {
  return clave.split('.').reduce<unknown>((a, p) => {
    if (a !== null && typeof a === 'object' && Object.hasOwn(a, p)) return (a as Record<string, unknown>)[p]
    return undefined
  }, diccionario)
}

function hojasDeNaira(diccionario: unknown): Map<string, string> {
  const salida = new Map<string, string>()
  const bajar = (nodo: unknown, ruta: string) => {
    if (typeof nodo === 'string') salida.set(ruta, nodo)
    else if (nodo !== null && typeof nodo === 'object') for (const [k, v] of Object.entries(nodo)) bajar(v, ruta + '.' + k)
  }
  for (const ns of ['inmobiliaria.ai.naira', 'inmobiliaria.ai.intro.naira']) bajar(leer(diccionario, ns), ns)
  const nav = leer(diccionario, 'inmobiliaria.ai.nav')
  if (nav !== null && typeof nav === 'object') {
    for (const [k, v] of Object.entries(nav)) if (k.startsWith('naira')) bajar(v, 'inmobiliaria.ai.nav.' + k)
  }
  return salida
}

/** Lo prohibido que dice una hoja de copy de Naira (vacío = limpia). */
function copyProhibida(clave: string, texto: string): string[] {
  const salida: string[] = []
  if (!(clave === CLAVE_DE_LA_ETIQUETA && texto === 'Probabilidad')) salida.push(...terminosEn(texto, PATRONES_DE_COPY))
  if (/(?<!\p{L})(OWNER|OPERATOR)(?!\p{L})/u.test(texto)) salida.push('rol del agente')
  const minuscula = texto.toLowerCase()
  for (const v of VOSEO) if (new RegExp('(?<!\\p{L})' + escapar(v) + '(?!\\p{L})', 'u').test(minuscula)) salida.push('voseo: ' + v)
  return salida
}

describe('claimClass, categoría y causa salen del contrato', () => {
  it('[N13:claimclass-del-contrato] ningún archivo del árbol de Naira busca vocabulario de probabilidad o de causa en un texto', () => {
    const encontrados = archivosDelArbol().flatMap((a) => busquedasDeLexico(a, readFileSync(join(process.cwd(), a), 'utf8')))
    expect(
      encontrados,
      'La clase, la categoría y la causa salen de CAMPOS del contrato, nunca de palabras del texto:\n' + encontrados.join('\n'),
    ).toEqual([])
  })

  it('[N13:chip-solo-desde-oraciones] el chip de clase se monta solo desde OracionesCausales', () => {
    const { conChip, conAtributo } = jsxDe(archivosDelArbol())
    expect(conChip).toEqual(['src/components/inmobiliaria/naira/OracionesCausales.tsx'])
    const permitidos = [
      'src/components/inmobiliaria/naira/ChipDeAfirmacion.tsx',
      'src/components/inmobiliaria/naira/' + 'OracionesCausales.tsx',
    ]
    for (const a of conAtributo) expect(permitidos, a).toContain(a)
  })

  it('[N13:copy-sin-lexico] la copy de Naira en es.json no redacta probabilidades, no explica causas y tutea', () => {
    const malas: string[] = []
    for (const [clave, texto] of hojasDeNaira(es)) {
      const encontrado = copyProhibida(clave, texto)
      if (encontrado.length > 0) malas.push(clave + ' → ' + encontrado.join(', ') + ' · «' + texto + '»')
    }
    expect(malas, 'Copy prohibida en inmobiliaria.ai.naira (UI-SPEC §10.5):\n' + malas.join('\n')).toEqual([])
  })

  it('[N13:control-positivo] los detectores marcan lo prohibido, dejan pasar lo legítimo y el recorrido ve el árbol', () => {
    const marcadas = [
      "export const f = (t: string) => /porque|probablemente/.test(t)",
      "export const r = new RegExp('quizás')",
      "export const f = (t: string) => t.includes('debido a')",
      'export const f = (t: string) => t.match(/tal vez/)',
      "export const f = (t: string) => t.startsWith('Seguramente')",
    ]
    for (const fuente of marcadas) expect(busquedasDeLexico('sintetico.ts', fuente).length, fuente).toBeGreaterThan(0)
    const legitimas = [
      'export const f = (x: string) => /^\\d{4}-\\d{2}-\\d{2}$/.test(x)',
      "export const f = (s: 'atencion') => SECCIONES_VOTABLES.includes(s)",
      "export const f = (x: string) => x.split(',')",
    ]
    for (const fuente of legitimas) expect(busquedasDeLexico('sintetico.ts', fuente), fuente).toEqual([])

    expect(copyProhibida('inmobiliaria.ai.naira.x', 'Es posible que suba porque bajó').length).toBeGreaterThan(0)
    expect(copyProhibida('inmobiliaria.ai.naira.x', '¿Lo confirmás?').length).toBeGreaterThan(0)
    expect(copyProhibida(CLAVE_DE_LA_ETIQUETA, 'Probabilidad')).toEqual([])
    expect(copyProhibida('inmobiliaria.ai.naira.otra', 'Probabilidad').length).toBeGreaterThan(0)
    expect(copyProhibida('inmobiliaria.ai.naira.x', 'Intenta de nuevo.')).toEqual([])

    const arbol = archivosDelArbol()
    expect(arbol.length).toBeGreaterThanOrEqual(10)
    expect(jsxDe(arbol).conChip).toContain('src/components/inmobiliaria/naira/OracionesCausales.tsx')
    expect(arbol.filter((a) => a.startsWith('src/app/panel/inmobiliaria/reportes/naira/')).length).toBeGreaterThanOrEqual(1)
    expect(arbol.filter((a) => a.startsWith('src/lib/hooks/naira/')).length).toBeGreaterThanOrEqual(3)
  })

  it('[N13:raiz-de-la-superficie] existen todas las raíces de Naira (las páginas incluidas) y sus archivos sueltos', () => {
    const faltan = RAICES.filter((r) => !RAICES_QUE_PUEDEN_FALTAR.includes(r) && !existsSync(join(process.cwd(), r)))
    expect(faltan, 'raíces de Naira que no existen (la guardia no las estaría mirando):\n' + faltan.join('\n')).toEqual([])
    expect(RAICES_QUE_PUEDEN_FALTAR).not.toContain('src/app/panel/inmobiliaria/reportes/naira')
    const sueltosQueFaltan = ARCHIVOS_SUELTOS_DE_NAIRA.filter((a) => !existsSync(join(process.cwd(), a)))
    expect(sueltosQueFaltan).toEqual([])
    expect(archivosDelArbol()).toEqual(expect.arrayContaining([...ARCHIVOS_SUELTOS_DE_NAIRA]))
  })
})
