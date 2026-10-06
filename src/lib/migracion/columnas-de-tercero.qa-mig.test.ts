import { describe, it, expect } from 'vitest'

import { mapearColumnas } from './columnas-de-tercero'
import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service'

/** Las columnas de la plantilla del back que importan acá (alias tal cual). */
const COLUMNAS = [
  { campo: 'tipoDocumento', titulo: 'Tipo de documento', obligatoria: true, alias: ['tipo documento', 'tipo doc'] },
  {
    campo: 'documento',
    titulo: 'Número de documento',
    obligatoria: true,
    alias: ['documento', 'cedula', 'cc', 'nit', 'identificacion', 'nro documento'],
  },
  { campo: 'nombre', titulo: 'Nombre completo', obligatoria: true, alias: ['nombre', 'razon social'] },
  { campo: 'telefono', titulo: 'Teléfono', obligatoria: false, alias: ['telefono', 'celular'] },
] as unknown as ColumnaDePlantilla[]

describe('QA-MIG-A MG-03: un alias corto cuenta como palabra completa', () => {
  it('«Nit/CC» es la columna del documento', () => {
    const m = mapearColumnas(COLUMNAS, ['Nit/CC', 'Razón social / Nombre', 'Teléfono'])
    expect(m.find((c) => c.columna === 'Nit/CC')?.campo).toBe('documento')
  })

  it('«NIT o CC del propietario» también', () => {
    const m = mapearColumnas(COLUMNAS, ['NIT o CC del propietario', 'Nombre'])
    expect(m.find((c) => c.columna === 'NIT o CC del propietario')?.campo).toBe('documento')
  })

  it('un alias corto NO se busca adentro de otra palabra («Acceso» no es «cc»)', () => {
    const m = mapearColumnas(COLUMNAS, ['Acceso', 'Nombre', 'Documento'])
    expect(m.find((c) => c.columna === 'Acceso')?.campo).toBeNull()
  })
})
