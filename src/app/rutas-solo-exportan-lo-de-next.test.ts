/**
 * 🔴 ARREGLOS-4 (03-10-2026) · Un `route.ts` sólo exporta lo que Next conoce.
 *
 * `src/app/api/csp-reporte/route.ts` exportaba además sus ayudantes
 * (`TOPE_DEL_CUERPO`, `sinCredenciales`, `violacionesDelCuerpo`, un tipo). Next
 * lo tolera en `next dev`, pero `next build` genera en `.next/types/` un chequeo
 * por ruta que exige que el módulo exporte SÓLO los verbos y la configuración
 * del segmento: después de un build, `tsc --noEmit` fallaba (lo escondía
 * `ignoreBuildErrors`). Los ayudantes viven en `src/lib/`.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

/** Lo que Next deja exportar de un route handler (verbos + configuración del segmento). */
const PERMITIDAS = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'dynamic',
  'dynamicParams',
  'revalidate',
  'fetchCache',
  'runtime',
  'preferredRegion',
  'maxDuration',
  'generateStaticParams',
])

function rutas(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) rutas(p, out)
    else if (/^route\.(ts|tsx)$/.test(e)) out.push(p)
  }
  return out
}

function exportadas(archivo: string): string[] {
  const sf = ts.createSourceFile(archivo, readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true)
  const nombres: string[] = []
  const exporta = (n: ts.Node) =>
    ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st)) {
      if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) nombres.push(el.name.text)
      } else nombres.push('*')
    } else if (ts.isExportAssignment(st)) nombres.push('default')
    else if (exporta(st)) {
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) nombres.push(d.name.getText(sf))
      } else if (
        (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) ||
          ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) &&
        st.name
      ) {
        nombres.push(st.name.text)
      } else nombres.push('?')
    }
  }
  return nombres
}

describe('🔴 los route handlers exportan sólo lo de Next', () => {
  it('ningún route.ts exporta ayudantes, constantes ni tipos', () => {
    const malas: string[] = []
    for (const f of rutas('src/app')) {
      const sobran = exportadas(f).filter((n) => !PERMITIDAS.has(n))
      if (sobran.length) malas.push(`${f}: ${sobran.join(', ')}`)
    }
    expect(
      malas,
      `Next sólo deja exportar los verbos y la configuración del segmento de un\n` +
        `route.ts; lo demás rompe \`tsc\` después de \`next build\`. Muévelo a src/lib/.\n\n  ${malas.join('\n  ')}\n`,
    ).toEqual([])
  })
})
