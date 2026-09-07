/**
 * El archivo real de una inmobiliaria (Terceros.csv, 26 columnas) contra el
 * mapeo automático. Lo que fija: que el nombre completo le gane al primer
 * nombre aunque venga después en el archivo, y que documento y tipo de
 * documento mapeen exactos. Se descubrió con el archivo en la mano (Nico,
 * 2026-09-07): el propietario entraba llamándose «MARIA».
 */
import { describe, expect, it } from 'vitest'
import { mapearColumnas } from './columnas-de-tercero'

const col = (campo: string, titulo: string, alias: string[], obligatoria = false) =>
  ({ campo, titulo, alias, obligatoria, ejemplo: '' }) as never

// El mismo orden y los mismos alias que PLANTILLAS_DE_TERCEROS.PROPIETARIO
// en el back para las columnas que este archivo toca.
const PLANTILLA = [
  col('tipoDocumento', 'Tipo de documento', ['tipo documento', 'tipo doc', 'tipo de identificacion', 'tipo id', 'clase documento'], true),
  col('documento', 'Número de documento', ['documento', 'cedula', 'cc', 'nit', 'nro documento', 'numero de documento'], true),
  col('nombre', 'Nombre completo', ['nombre', 'nombre completo', 'razon social', 'nombres y apellidos', 'propietario'], true),
  col('externalId', 'Código en tu sistema', ['codigo', 'id', 'consecutivo']),
  col('telefono', 'Teléfono', ['telefono', 'celular', 'movil', 'contacto', 'tel']),
  col('correo', 'Correo', ['correo', 'email', 'e mail']),
  col('direccion', 'Dirección', ['direccion', 'domicilio']),
  col('ciudad', 'Ciudad', ['ciudad', 'municipio']),
  col('banco', 'Banco', ['banco', 'entidad bancaria', 'entidad']),
  col('tipoCuenta', 'Tipo de cuenta', ['tipo cuenta', 'clase de cuenta']),
  col('numeroCuenta', 'Número de cuenta', ['numero cuenta', 'nro cuenta', 'cuenta']),
]

const ENCABEZADOS = ['Código', 'Tipo Documento', 'Documento', 'Dígito de Verificación', 'Tratamiento',
  'Primer Nombre/Razón Social', 'Segundo Nombre', 'Primer Apellido', 'Segundo Apellido',
  'Nombre Completo/Razón Social', 'Representante Legal', 'Email', 'Dirección', 'Municipio (Departamento)',
  'Teléfono', 'Otro Teléfono', 'Tipo Tercero', 'Clase Tercero', 'Estado Civil', 'Sexo', 'Profesión',
  'Banco', 'Tipo Cuenta', 'Nro. Cuenta', 'Fecha Creación', 'Creado Por']

describe('Terceros.csv de una inmobiliaria real', () => {
  const por = Object.fromEntries(mapearColumnas(PLANTILLA, ENCABEZADOS).map((m) => [m.columna, m]))

  it('el nombre COMPLETO se queda con `nombre`, aunque el primer nombre venga antes', () => {
    expect(por['Nombre Completo/Razón Social'].campo).toBe('nombre')
    expect(por['Primer Nombre/Razón Social'].campo).toBeNull()
  })

  it('documento y tipo de documento mapean exactos', () => {
    expect(por['Documento']).toMatchObject({ campo: 'documento', exacto: true })
    expect(por['Tipo Documento']).toMatchObject({ campo: 'tipoDocumento', exacto: true })
  })

  it('lo demás que el archivo trae y sabemos guardar', () => {
    expect(por['Código'].campo).toBe('externalId')
    expect(por['Email'].campo).toBe('correo')
    expect(por['Municipio (Departamento)'].campo).toBe('ciudad')
    expect(por['Teléfono'].campo).toBe('telefono')
    expect(por['Banco'].campo).toBe('banco')
    expect(por['Tipo Cuenta'].campo).toBe('tipoCuenta')
    expect(por['Nro. Cuenta'].campo).toBe('numeroCuenta')
  })

  it('una columna nunca pisa a otra: cada campo, una sola vez', () => {
    const campos = Object.values(por).map((m) => m.campo).filter(Boolean)
    expect(new Set(campos).size).toBe(campos.length)
  })
})
