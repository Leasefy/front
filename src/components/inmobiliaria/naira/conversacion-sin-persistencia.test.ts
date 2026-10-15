/**
 * 🔴 GUARDIA: LA CONVERSACIÓN CON NAIRA NO SE GUARDA, NO SE LOGUEA Y NO SABE QUIÉN PREGUNTA (Fase 13, plan 13-06; D13-13,
 * FG13-16, B-5, D13-6).
 *
 * Vigila que ninguna pantalla de Naira toque el almacenamiento del navegador (la pregunta es texto libre que puede traer
 * datos de terceros; el agente tampoco la guarda, 🔔 C2 de 9.5); que los archivos de la conversación no escriban en la
 * consola, no reusen el chat beta que persiste en `localStorage` (useBetaChat) —salvo UserBubble, que solo pinta el texto—,
 * no lean datos del usuario de la sesión («quién preguntó» no existe) y no decidan el simulado (la guarda única vive en el
 * cliente de 13-01).
 *
 * Por AST (TypeScript): los comentarios no son nodos, así que la prosa que explica una regla no la rompe. Crece sola:
 * recorre las carpetas de Naira y la carpeta de la pestaña Preguntar; una pantalla nueva queda vista sin editar este archivo.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const RAICES_DE_NAIRA = [
  'src/components/inmobiliaria/naira',
  'src/lib/hooks/naira',
  'src/lib/naira',
  'src/app/panel/inmobiliaria/reportes/naira',
] as const
const ARCHIVOS_SUELTOS_DE_NAIRA: readonly string[] = ['src/lib/nav/rutas-de-naira.ts']
const CARPETA_DE_PREGUNTAR = 'src/app/panel/inmobiliaria/reportes/naira/preguntar'
const ARCHIVOS_FIJOS_DE_LA_CONVERSACION = [
  'src/lib/naira/conversacion.ts',
  'src/lib/hooks/naira/use-naira-conversacion.ts',
  'src/components/inmobiliaria/naira/RespuestaDeNaira.tsx',
  'src/components/inmobiliaria/naira/CompositorDePregunta.tsx',
] as const

type Regla = 'sin-storage' | 'sin-consola' | 'sin-chat-beta' | 'sin-persona' | 'sin-simulado'

const STORAGE = new Set(['localStorage', 'sessionStorage', 'indexedDB'])
const PERSONA = new Set(['user', 'email', 'avatar', 'avatarUrl', 'fullName', 'displayName'])
const PERMITIDO_DE_BETA = '@/components/beta/UserBubble'
const CHAT_BETA = ['@/lib/hooks/useBetaChat', '@/lib/api/ai-hub-chat']
const SIMULADO = ['@/lib/data/mock-naira', '@/lib/api/config']

function noTestsBajo(dir: string): string[] {
  const salida: string[] = []
  const absoluta = join(process.cwd(), dir)
  if (!existsSync(absoluta)) return salida
  const recorrer = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const ruta = join(d, e.name)
      if (e.isDirectory()) recorrer(ruta)
      else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) salida.push(relative(process.cwd(), ruta).split('\\').join('/'))
    }
  }
  recorrer(absoluta)
  return salida
}

function archivosDeNaira(): string[] {
  const salida = RAICES_DE_NAIRA.flatMap(noTestsBajo)
  for (const s of ARCHIVOS_SUELTOS_DE_NAIRA) if (existsSync(join(process.cwd(), s))) salida.push(s)
  return [...new Set(salida)].sort()
}

function archivosDeLaConversacion(): string[] {
  return [...new Set([...ARCHIVOS_FIJOS_DE_LA_CONVERSACION, ...noTestsBajo(CARPETA_DE_PREGUNTAR)])].sort()
}

/** Las violaciones de `reglas` en una fuente: `regla · archivo:línea · texto`. PURA (se usa igual con sondas). */
function detectar(fuente: string, nombre: string, reglas: readonly Regla[]): string[] {
  const sf = ts.createSourceFile(nombre, fuente, ts.ScriptTarget.Latest, true, nombre.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const salida: string[] = []
  const marcar = (regla: Regla, n: ts.Node) => {
    const linea = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
    salida.push(regla + ' · ' + nombre + ':' + linea + ' · ' + n.getText(sf).slice(0, 80))
  }
  const visitar = (n: ts.Node) => {
    if (ts.isIdentifier(n)) {
      const t = n.text
      if (reglas.includes('sin-storage') && STORAGE.has(t)) marcar('sin-storage', n)
      if (reglas.includes('sin-consola') && t === 'console') marcar('sin-consola', n)
      if (reglas.includes('sin-chat-beta') && t === 'useBetaChat') marcar('sin-chat-beta', n)
      if (reglas.includes('sin-persona') && (PERSONA.has(t) || t.startsWith('askedBy') || t.startsWith('asked_by'))) marcar('sin-persona', n)
      if (reglas.includes('sin-simulado') && t === 'isMockMode') marcar('sin-simulado', n)
    }
    if (reglas.includes('sin-storage') && ts.isPropertyAccessExpression(n) && n.name.text === 'cookie' && n.expression.getText(sf) === 'document') {
      marcar('sin-storage', n)
    }
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const desde = n.moduleSpecifier.text
      if (reglas.includes('sin-chat-beta') && (CHAT_BETA.includes(desde) || (desde.startsWith('@/components/beta/') && desde !== PERMITIDO_DE_BETA))) {
        marcar('sin-chat-beta', n)
      }
      if (reglas.includes('sin-simulado') && SIMULADO.includes(desde)) marcar('sin-simulado', n)
    }
    ts.forEachChild(n, visitar)
  }
  visitar(sf)
  return salida
}

function enDisco(archivos: readonly string[], reglas: readonly Regla[]): string[] {
  return archivos.flatMap((a) => detectar(readFileSync(join(process.cwd(), a), 'utf8'), a, reglas))
}

describe('la conversación con Naira no se guarda, no se loguea y no sabe quién pregunta', () => {
  it('[N13:sin-storage-en-naira] ningún archivo de Naira toca localStorage, sessionStorage, indexedDB ni document.cookie', () => {
    const v = enDisco(archivosDeNaira(), ['sin-storage'])
    expect(v, v.join('\n')).toEqual([])
  })

  it('[N13:pregunta-sin-log] ningún archivo de la conversación escribe en la consola', () => {
    const v = enDisco(archivosDeLaConversacion(), ['sin-consola'])
    expect(v, v.join('\n')).toEqual([])
  })

  it('[N13:sin-chat-beta] la conversación no reusa el chat beta (solo UserBubble)', () => {
    const v = enDisco(archivosDeLaConversacion(), ['sin-chat-beta'])
    expect(v, v.join('\n')).toEqual([])
  })

  it('[N13:b5-sin-quien-pregunta] la conversación no lee datos del usuario de la sesión', () => {
    const v = enDisco(archivosDeLaConversacion(), ['sin-persona'])
    expect(v, v.join('\n')).toEqual([])
  })

  it('[N13:simulado-solo-en-el-cliente] la conversación no importa el simulado ni decide el modo de ejemplo', () => {
    const v = enDisco(archivosDeLaConversacion(), ['sin-simulado'])
    expect(v, v.join('\n')).toEqual([])
  })

  it('[N13:control-positivo] el recorrido ve la conversación y el árbol; los detectores marcan lo prohibido y no lo legítimo', () => {
    const conversacion = archivosDeLaConversacion()
    expect(conversacion.length).toBeGreaterThanOrEqual(7)
    for (const a of [...ARCHIVOS_FIJOS_DE_LA_CONVERSACION, 'page.tsx', 'PreguntarClient.tsx', 'PreguntarView.tsx']) {
      expect(conversacion.some((c) => c.endsWith(a)), a).toBe(true)
    }
    for (const a of conversacion) expect(existsSync(join(process.cwd(), a)), a).toBe(true)
    expect(archivosDeNaira().length).toBeGreaterThanOrEqual(20)
    const TODAS: readonly Regla[] = ['sin-storage', 'sin-consola', 'sin-chat-beta', 'sin-persona', 'sin-simulado']
    const marcadas = [
      "window.sessionStorage.setItem('k', v)",
      "localStorage.getItem('x')",
      "document.cookie = 'a=b'",
      'console.info(pregunta)',
      "import { useBetaChat } from '@/lib/hooks/useBetaChat'",
      "import { AssistantBubble } from '@/components/beta/AssistantBubble'",
      'const { user } = useAuth()',
      'const x = sesion.email',
      "import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'",
    ]
    for (const fuente of marcadas) expect(detectar(fuente, 'sonda.tsx', TODAS).length, fuente).toBeGreaterThan(0)
    const legitimas = [
      '// localStorage y console en un comentario',
      "import { UserBubble } from '@/components/beta/UserBubble'",
      "const m = { role: 'user', content: t }",
      'const { agency } = useAuth()',
    ]
    for (const fuente of legitimas) expect(detectar(fuente, 'sonda.tsx', TODAS), fuente).toEqual([])
  })
})
