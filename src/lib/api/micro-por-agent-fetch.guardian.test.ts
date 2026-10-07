/**
 * 🔴 ARREGLOS-4 (03-10-2026) · Al micro de agentes se le habla con `agentFetch`.
 *
 * PRUEBAS-RESTO apagó el micro con el back sano: el Piloto ya decía «el
 * asistente no está disponible» (F3, `agentFetch` → 503 del servicio
 * `asistente`), pero ~45 llamadas seguían con `fetch` crudo +
 * `agentAuthHeaders()` —la conciliación, el cotizador, mantenimiento, el
 * buscador, el chat…— y ahí la caída subía como «Failed to fetch»: «Revisa tu
 * conexión» a alguien con internet. Tampoco reintentaban ante un token vencido.
 * Nico eligió la A (PRUEBAS-RESTO Q1): todas pasan a `agentFetch`.
 *
 * El barrido lee el AST (no el texto: un comentario que diga `fetch()` no
 * cuenta) de cada archivo que habla con el micro (`NEXT_PUBLIC_AGENT_URL`,
 * `agentAuthHeaders`) y no deja un `fetch(…)` / `globalThis.fetch(…)` /
 * `window.fetch(…)` fuera de las excepciones DECLARADAS, cada una con su porqué.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const SRC = 'src'

/** Los que hablan con el micro sin `agentFetch`, a propósito. */
const EXCEPCIONES: Readonly<Record<string, string>> = {
  'src/lib/api/agent-fetch.ts': 'es `agentFetch` mismo',
  'src/lib/api/agent-auth.ts': 'sólo arma el encabezado (su comentario de uso nombra `fetch`)',
  'src/app/arco/ArcoFormClient.tsx': 'pública: el titular de los datos pide ARCO sin sesión',
  'src/app/arco/verify/[token]/page.tsx': 'pública: verificación por enlace, sin sesión',
  'src/lib/api/funnel.service.ts': 'pública: la preaprobación del embudo, sin sesión',
  'src/lib/admin/agent-api.ts': 'el /admin de Leasefy usa SU token (`getAdminToken`), no el de la inmobiliaria',
  'src/lib/chat/senales.ts':
    '`keepalive` al cerrar la pestaña, sin pantalla que avisar: un reintento de 3 s por 401 no sobrevive al cierre',
  'src/lib/context/PermissionsContext.tsx':
    'sin token en memoria pide SIN `Authorization` (las pruebas E2E y el instante después de salir) y su fallo ya es «sin verificar» con reintento',
}

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) {
      if (e === 'node_modules' || e === 'generated') continue
      archivos(p, out)
    } else if (/\.(ts|tsx)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p) && !p.endsWith('.d.ts')) out.push(p)
  }
  return out
}

const HABLA_CON_EL_MICRO = /NEXT_PUBLIC_AGENT_URL|agentAuthHeaders/

function fetchesCrudos(archivo: string, texto: string): number[] {
  const sf = ts.createSourceFile(
    archivo,
    texto,
    ts.ScriptTarget.Latest,
    true,
    archivo.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const lineas: number[] = []
  const visitar = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText(sf)
      if (callee === 'fetch' || callee === 'globalThis.fetch' || callee === 'window.fetch') {
        lineas.push(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1)
      }
    }
    ts.forEachChild(n, visitar)
  }
  visitar(sf)
  return lineas
}

describe('🔴 el micro de agentes se llama con agentFetch', () => {
  const todos = archivos(SRC)

  it('ningún archivo que habla con el micro usa fetch crudo (fuera de las excepciones declaradas)', () => {
    const malos: string[] = []
    for (const f of todos) {
      if (f in EXCEPCIONES) continue
      const texto = readFileSync(f, 'utf8')
      if (!HABLA_CON_EL_MICRO.test(texto)) continue
      for (const l of fetchesCrudos(f, texto)) malos.push(`${f}:${l}`)
    }
    expect(
      malos,
      `Estas llamadas al micro van con fetch crudo: con el micro caído dicen «Revisa tu conexión»\n` +
        `y no reintentan con un token vencido. Usa agentFetch (src/lib/api/agent-fetch.ts).\n\n  ${malos.join('\n  ')}\n`,
    ).toEqual([])
  })

  it('las excepciones existen y siguen hablando con el micro (si no, sobran)', () => {
    const sobran = Object.keys(EXCEPCIONES).filter((f) => {
      try {
        return !HABLA_CON_EL_MICRO.test(readFileSync(f, 'utf8'))
      } catch {
        return true
      }
    })
    expect(sobran, `Sácalas de EXCEPCIONES:\n  ${sobran.join('\n  ')}\n`).toEqual([])
  })
})
