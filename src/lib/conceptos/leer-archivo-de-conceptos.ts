/**
 * Las filas del archivo de conceptos del sistema anterior (Nico, 13-10-2026).
 * Puro: recibe las filas ya leídas de la planilla y devuelve lo que el back
 * necesita para proponer el catálogo. El % de IVA y retenciones sólo
 * clasifica (decisión de Nico): viaja para eso, no se guarda.
 *
 * Reconoce las columnas por su nombre, sin tildes ni mayúsculas: «Nombre»
 * (o «Concepto», «Producto»), «% IVA», «% Retención», «% ReteIva», «% ReteIca».
 */
import type { FilaDeConceptoDelArchivo } from '@/lib/api/conceptos.service'

const sinTildes = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim()

type Campo = 'nombre' | 'iva' | 'retencion' | 'reteIva' | 'reteIca'

function campoDeLaColumna(encabezado: string): Campo | null {
  const t = sinTildes(encabezado)
  if (/^(nombre|concepto|producto|descripcion del concepto)\b/.test(t)) return 'nombre'
  if (/rete\s*iva/.test(t)) return 'reteIva'
  if (/rete\s*ica/.test(t)) return 'reteIca'
  if (/retencion|retefuente|\brf\b/.test(t)) return 'retencion'
  if (/\biva\b/.test(t)) return 'iva'
  return null
}

function porcentaje(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null
  const n = Number(String(valor).replace('%', '').replace(',', '.').trim())
  return Number.isFinite(n) && String(valor).trim() !== '' ? n : null
}

export function filasDelArchivoDeConceptos(
  filas: ReadonlyArray<Record<string, unknown>>,
  encabezados: readonly string[],
): { filas: FilaDeConceptoDelArchivo[]; sinColumnaDeNombre: boolean } {
  const columnas = new Map<Campo, string>()
  for (const e of encabezados) {
    const campo = campoDeLaColumna(String(e))
    if (campo && !columnas.has(campo)) columnas.set(campo, String(e))
  }
  const nombre = columnas.get('nombre')
  if (!nombre) return { filas: [], sinColumnaDeNombre: true }
  const valor = (f: Record<string, unknown>, c: Campo) => {
    const col = columnas.get(c)
    return col ? porcentaje(f[col]) : null
  }
  return {
    sinColumnaDeNombre: false,
    filas: filas
      .map((f) => ({
        nombre: String(f[nombre] ?? '').trim(),
        iva: valor(f, 'iva'),
        retencion: valor(f, 'retencion'),
        reteIva: valor(f, 'reteIva'),
        reteIca: valor(f, 'reteIca'),
      }))
      .filter((f) => f.nombre.length > 0),
  }
}
