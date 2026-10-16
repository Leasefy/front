/**
 * 🔴 GUARDIA B-5 DE NAIRA: NINGUNA PERSONA, NINGÚN ACTOR, NINGUNA LATENCIA (Fase 13, plan 13-02; D13-11, FG13-13,
 * UI-SPEC §9).
 *
 * La regla (counsel pendiente, finalidad `naira_desempeno_empleados`): la UI de Naira no asocia un acto, un caso, un
 * tiempo ni un resultado a una persona del equipo. Nada de quién escribió, quién aprobó, quién propuso, quién borró ni
 * quién preguntó; nada del ranking de agentes (`AgenteLeaderboard`) ni de la traza de un caso (`TrazaCaso`); ninguna
 * vista de latencia.
 *
 * Por qué por AST (TypeScript) y no con una regex sobre el texto: los comentarios NO son nodos del árbol, así que la prosa
 * que explica que un campo NO se pinta no es una violación, y un acceso al campo (`x.userId`) sí lo es. Se miran los
 * identificadores (que EMPIEZAN por un prohibido: así caen `approvedByUserId` y `askedByUserId`) y todo string, template
 * o texto JSX que lo CONTENGA (así cae el import de `…/TrazaCaso`).
 *
 * Crece sola: recorre las carpetas de Naira, así que todo archivo que agreguen 13-03..13-07 bajo esas raíces entra sin
 * que nadie lo liste. Agrandar `PROHIBIDOS` está permitido; achicarlo, no.
 *
 * 13-03 la hizo crecer: la carpeta de las páginas ya existe y ninguna raíz puede faltar ([N13:raiz-de-la-superficie]),
 * y el registro de rutas (src/lib/nav/rutas-de-naira.ts) entra al recorrido aunque viva fuera de las raíces.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'

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

const PROHIBIDOS = ['userId', 'actorId', 'approvedBy', 'proposedBy', 'erasedBy', 'askedBy', 'AgenteLeaderboard', 'TrazaCaso'] as const
/** Sin mayúsculas: `latencia`, `latency`, `Latencia…`. */
const LATENCIA = 'latenc'

/**
 * P3 (Nico, 15-10-2026: «Sí, por persona, con transparencia ("Qué dice Naira de mí" + autorización del empleado)»;
 * concepto B-5 §3-§5): la ÚNICA superficie de Naira que nombra a una persona es su ficha, que la persona ve siempre y el
 * dueño, el admin o el gerente solo si ella autorizó. Fuera de estos archivos la regla sigue igual.
 */
const FICHA_POR_PERSONA: readonly string[] = [
  'src/app/panel/inmobiliaria/reportes/naira/de-mi/',
  'src/lib/hooks/naira/use-naira-ficha.ts',
  'src/components/inmobiliaria/naira/AutorizacionDeGestion.tsx',
]
function esLaFichaPorPersona(ruta: string): boolean {
  return FICHA_POR_PERSONA.some((p) => ruta.startsWith(p))
}

/** Todo `.ts`/`.tsx` no-test bajo las raíces (rutas relativas al repo). */
function archivosDelArbol(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name)
      if (e.isDirectory()) recorrer(ruta)
      else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.') && !esLaFichaPorPersona(relative(process.cwd(), ruta).split('\\').join('/')))
        salida.push(relative(process.cwd(), ruta).split('\\').join('/'))
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

/** El texto de un nodo si es un identificador o un literal de texto; si no, null. */
function textoDelNodo(n: ts.Node): { readonly tipo: 'identificador' | 'texto'; readonly valor: string } | null {
  if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) return { tipo: 'identificador', valor: n.text }
  if (
    ts.isStringLiteral(n) ||
    ts.isNoSubstitutionTemplateLiteral(n) ||
    ts.isTemplateHead(n) ||
    ts.isTemplateMiddle(n) ||
    ts.isTemplateTail(n) ||
    ts.isJsxText(n)
  ) {
    return { tipo: 'texto', valor: n.text }
  }
  return null
}

/** `archivo:línea token` por cada identificador o texto que nombra a una persona, un actor o una latencia. */
function hallazgos(nombre: string, fuente: string): { readonly persona: string[]; readonly latencia: string[] } {
  const sf = arbolDe(nombre, fuente)
  const persona: string[] = []
  const latencia: string[] = []
  const visitar = (n: ts.Node) => {
    const t = textoDelNodo(n)
    if (t !== null) {
      const linea = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
      const choca =
        t.tipo === 'identificador' ? PROHIBIDOS.some((p) => t.valor.startsWith(p)) : PROHIBIDOS.some((p) => t.valor.includes(p))
      if (choca) persona.push(nombre + ':' + linea + ' ' + t.valor.trim().slice(0, 80))
      if (t.valor.toLowerCase().includes(LATENCIA)) latencia.push(nombre + ':' + linea + ' ' + t.valor.trim().slice(0, 80))
    }
    ts.forEachChild(n, visitar)
  }
  visitar(sf)
  return { persona, latencia }
}

function leer(diccionario: unknown, clave: string): unknown {
  return clave.split('.').reduce<unknown>((a, p) => {
    if (a !== null && typeof a === 'object' && Object.hasOwn(a, p)) return (a as Record<string, unknown>)[p]
    return undefined
  }, diccionario)
}

/** Las hojas de copy de Naira: su namespace, su intro y las claves de navegación `naira*`. */
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

describe('B-5 en la superficie de Naira', () => {
  it('[N13:b5-sin-persona] ningún identificador, string ni texto JSX del árbol de Naira nombra a una persona o un actor', () => {
    const encontrados = archivosDelArbol().flatMap((a) => hallazgos(a, readFileSync(join(process.cwd(), a), 'utf8')).persona)
    expect(encontrados, 'B-5: la UI de Naira no lee actores ni personas del equipo:\n' + encontrados.join('\n')).toEqual([])
  })

  it('[N13:sin-latencia] ni el código ni la copy de Naira tienen una vista de latencia', () => {
    const enCodigo = archivosDelArbol().flatMap((a) => hallazgos(a, readFileSync(join(process.cwd(), a), 'utf8')).latencia)
    expect(enCodigo, 'latencia en el código de Naira:\n' + enCodigo.join('\n')).toEqual([])
    const enCopy: string[] = []
    for (const [idioma, diccionario] of [['es', es], ['en', en]] as const) {
      for (const [clave, texto] of hojasDeNaira(diccionario)) {
        const t = texto.toLowerCase()
        if (t.includes('latencia') || t.includes('latency')) enCopy.push(idioma + ':' + clave)
      }
    }
    expect(enCopy, 'latencia en la copy de Naira:\n' + enCopy.join('\n')).toEqual([])
  })

  it('[N13:control-positivo] el recorrido ve el árbol y el detector marca accesos reales, no la prosa', () => {
    const arbol = archivosDelArbol()
    expect(arbol.filter((a) => a.startsWith('src/components/inmobiliaria/naira/')).length).toBeGreaterThanOrEqual(10)
    expect(arbol.filter((a) => a.startsWith('src/lib/naira/')).length).toBeGreaterThanOrEqual(1)
    expect(arbol.filter((a) => a.startsWith('src/lib/hooks/naira/')).length).toBeGreaterThanOrEqual(1)
    expect(arbol.filter((a) => a.startsWith('src/app/panel/inmobiliaria/reportes/naira/')).length).toBeGreaterThanOrEqual(1)
    expect(arbol.filter((a) => a.startsWith('src/lib/hooks/naira/')).length).toBeGreaterThanOrEqual(3)

    const marcados: [string, string][] = [
      ['sintetico.ts', 'const x = item.writtenBy.userId'],
      ['sintetico.ts', "import { TrazaCaso } from '@/components/inmobiliaria/ai/TrazaCaso'"],
      ['sintetico.ts', 'const approvedByUserId = 1'],
      ['sintetico.tsx', "export const C = () => <p>{'userId'}</p>"],
    ]
    for (const [nombre, fuente] of marcados) expect(hallazgos(nombre, fuente).persona.length, fuente).toBeGreaterThan(0)

    const prosa = '// no se pinta userId\n/* proposedBy */\nexport const a = 1\n'
    expect(hallazgos('prosa.ts', prosa)).toEqual({ persona: [], latencia: [] })
    expect(hallazgos('latencia.ts', 'export const latenciaDeAprobacion = 0').latencia.length).toBeGreaterThan(0)
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
