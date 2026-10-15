/**
 * memoria-escrituras.test.ts — guardia estática de las escrituras de la memoria de Naira (Fase 13, plan 13-07).
 *
 * Por qué existe: corregir, borrar, confirmar como cierto y resolver una propuesta procedural tocan datos personales y la
 * auditoría de la Ley 1581. Cada escritura tiene UN lugar (y una llamada) detrás de un gesto de la persona; la fase no
 * escribe memoria procedural nueva (D13-12); el motivo de un borrado lo elige la persona (nada preseleccionado).
 *
 * No mira lo que ya miran `b5-sin-persona` y `claimclass-del-contrato` (13-02). Lee el código sin comentarios y sin tests.
 * Marcador [N13:*] en el TÍTULO.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ACCIONES_DE_NAIRA, ENDPOINTS_DE_NAIRA } from '@/lib/api/naira/contrato'

const RAICES_UI = [
  'src/components/inmobiliaria/naira',
  'src/lib/hooks/naira',
  'src/lib/naira',
  'src/app/panel/inmobiliaria/reportes/naira',
] as const
const RAICES_TODAS = [...RAICES_UI, 'src/lib/api/naira'] as const

const ESCRITURAS = {
  corregirItem: 'src/components/inmobiliaria/naira/DialogoDeCorreccion.tsx',
  borrarItem: 'src/components/inmobiliaria/naira/DialogoDeBorrado.tsx',
  promoverItem: 'src/components/inmobiliaria/naira/ItemDeMemoria.tsx',
  resolverPropuestaProcedural: 'src/components/inmobiliaria/naira/PropuestaProceduralPendiente.tsx',
} as const

const ARCHIVOS_DE_MEMORIA = [
  'src/lib/naira/vocabulario-de-memoria.ts',
  'src/lib/hooks/naira/use-naira-memoria.ts',
  'src/components/inmobiliaria/naira/DialogoDeCorreccion.tsx',
  'src/components/inmobiliaria/naira/DialogoDeBorrado.tsx',
  'src/components/inmobiliaria/naira/ItemDeMemoria.tsx',
  'src/components/inmobiliaria/naira/PropuestaProceduralPendiente.tsx',
  'src/app/panel/inmobiliaria/reportes/naira/memoria/page.tsx',
  'src/app/panel/inmobiliaria/reportes/naira/memoria/MemoriaClient.tsx',
  'src/app/panel/inmobiliaria/reportes/naira/memoria/MemoriaView.tsx',
] as const

function archivosNoTest(raiz: string): string[] {
  const abs = join(process.cwd(), raiz)
  if (!existsSync(abs)) return []
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name)
      if (e.isDirectory()) recorrer(ruta)
      else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) {
        salida.push(relative(process.cwd(), ruta).split('\\').join('/'))
      }
    }
  }
  recorrer(abs)
  return salida.sort()
}

function sinComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .map((l) => {
      const i = l.indexOf(' // ')
      return i >= 0 ? l.slice(0, i) : l
    })
    .join('\n')
}

function literales(codigo: string): string[] {
  const salida: string[] = []
  for (const m of codigo.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    salida.push(m[1] ?? m[2] ?? m[3] ?? '')
  }
  return salida
}

function llamadas(codigo: string, nombre: string): number {
  return (codigo.match(new RegExp('\\b' + nombre + '\\(', 'g')) ?? []).length
}

const PROCEDURAL_NUEVO = /\/memory\/procedural(?!\/proposals)/

function marcaProceduralNuevo(codigo: string): boolean {
  return literales(codigo).some((s) => PROCEDURAL_NUEVO.test(s) || s.includes('procedural-propose'))
}

const codigoDe = (archivo: string) => sinComentarios(readFileSync(join(process.cwd(), archivo), 'utf8'))

describe('escrituras de la memoria de Naira', () => {
  it('[N13:control-positivo] el recorrido ve las raíces y los detectores marcan lo que tienen que marcar', () => {
    expect(archivosNoTest('src/components/inmobiliaria/naira').length).toBeGreaterThanOrEqual(10)
    for (const raiz of RAICES_UI.slice(1)) expect(archivosNoTest(raiz).length, raiz).toBeGreaterThanOrEqual(1)
    expect(llamadas(sinComentarios('x(); corregirItem(a, b, c);\n// corregirItem(z)'), 'corregirItem')).toBe(1)
    expect(marcaProceduralNuevo("fetch(base + '/memory/procedural', { method: 'POST' })")).toBe(true)
    expect(marcaProceduralNuevo("const a = 'procedural-propose'")).toBe(true)
    expect(marcaProceduralNuevo("'/memory/procedural/proposals/{proposalId}/resolution'")).toBe(false)
    expect(llamadas(codigoDe(ESCRITURAS.corregirItem), 'corregirItem')).toBe(1)
  })

  it('[N13:escritura-en-un-solo-lugar] cada escritura vive en UN archivo y se llama una vez', () => {
    const todos = RAICES_UI.flatMap((r) => archivosNoTest(r))
    for (const [nombre, archivo] of Object.entries(ESCRITURAS)) {
      const donde = todos.filter((a) => llamadas(codigoDe(a), nombre) > 0)
      expect(donde, nombre + ' se llama en ' + donde.join(', ')).toEqual([archivo])
      expect(llamadas(codigoDe(archivo), nombre), nombre + ' en ' + archivo).toBe(1)
    }
  })

  it('[N13:sin-procedural-nuevo] ni ruta, ni acción, ni función para escribir procedural nuevo', async () => {
    const todos = RAICES_TODAS.flatMap((r) => archivosNoTest(r))
    const conProcedural = todos.filter((a) => marcaProceduralNuevo(codigoDe(a)))
    expect(conProcedural, 'procedural nuevo en ' + conProcedural.join(', ')).toEqual([])
    expect((ACCIONES_DE_NAIRA as readonly string[]).includes('procedural-propose')).toBe(false)
    for (const e of Object.values(ENDPOINTS_DE_NAIRA)) expect(e.ruta.endsWith('/memory/procedural'), e.id).toBe(false)
    const cliente = await import('@/lib/api/naira/cliente')
    const procedurales = Object.keys(cliente).filter((k) => k.toLowerCase().includes('procedural'))
    expect(procedurales).toEqual(['resolverPropuestaProcedural'])
  })

  it('[N13:borrar-exige-motivo] el motivo del borrado empieza vacío y sin motivo no se envía', () => {
    const codigo = codigoDe(ESCRITURAS.borrarItem)
    expect(codigo).toContain('useState<MotivoDeBorrado | null>(null)')
    expect(codigo).toContain('if (motivo === null) return')
    expect(codigo).toContain('disabled={enVuelo || motivo === null}')
    expect(codigo).not.toMatch(/useState<MotivoDeBorrado \| null>\(\s*['"]/)
  })

  it('[N13:memoria-sin-consola-ni-almacenamiento] lo de 13-07 no escribe en la consola ni en el navegador', () => {
    for (const archivo of ARCHIVOS_DE_MEMORIA) {
      expect(existsSync(join(process.cwd(), archivo)), archivo).toBe(true)
      const codigo = codigoDe(archivo)
      for (const prohibido of ['console.', 'localStorage', 'sessionStorage', 'dangerouslySetInnerHTML', 'window.confirm']) {
        expect(codigo.includes(prohibido), archivo + ' usa ' + prohibido).toBe(false)
      }
    }
  })
})
