/**
 * El archivo real de una inmobiliaria (Terceros.csv, 26 columnas) contra el
 * mapeo automático. Lo que fija: que el nombre completo le gane al primer
 * nombre aunque venga después en el archivo, y que documento y tipo de
 * documento mapeen exactos. Se descubrió con el archivo en la mano (Nico,
 * 2026-09-07): el propietario entraba llamándose «MARIA».
 */
import { describe, expect, it } from 'vitest'
import { armarFila, mapearColumnas, obligatoriasSinMapear } from './columnas-de-tercero'

const col = (campo: string, titulo: string, alias: string[], obligatoria = false) =>
  ({ campo, titulo, alias, obligatoria, ejemplo: '' }) as never

// El mismo orden y los mismos alias que PLANTILLAS_DE_TERCEROS.PROPIETARIO
// en el back para las columnas que este archivo toca.
const PLANTILLA = [
  col('tipoDocumento', 'Tipo de documento', ['tipo documento', 'tipo doc', 'tipo de identificacion', 'tipo id', 'clase documento'], true),
  col('documento', 'Número de documento', ['documento', 'cedula', 'cc', 'nit', 'nro documento', 'numero de documento'], true),
  col('digitoVerificacion', 'Dígito de verificación', ['digito de verificacion', 'digito verificacion', 'dv']),
  col('nombre', 'Nombre completo', ['nombre', 'nombre completo', 'razon social', 'nombres y apellidos', 'propietario'], true),
  col('externalId', 'Código en tu sistema', ['codigo', 'id', 'consecutivo']),
  col('telefono', 'Teléfono', ['telefono', 'celular', 'movil', 'contacto', 'tel']),
  col('correo', 'Correo', ['correo', 'email', 'e mail']),
  col('direccion', 'Dirección', ['direccion', 'domicilio']),
  col('ciudad', 'Ciudad', ['ciudad', 'municipio']),
  col('departamento', 'Departamento', ['departamento', 'depto', 'dpto']),
  col('banco', 'Banco', ['banco', 'entidad bancaria', 'entidad']),
  col('tipoCuenta', 'Tipo de cuenta', ['tipo cuenta', 'clase de cuenta']),
  col('numeroCuenta', 'Número de cuenta', ['numero cuenta', 'nro cuenta', 'cuenta']),
  col('notas', 'Notas', ['notas', 'observaciones', 'comentarios']),
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

  it('las cuatro columnas del nombre partido se reconocen como PARTES, no como `nombre`', () => {
    expect(por['Primer Nombre/Razón Social']).toMatchObject({ campo: null, parte: 'primerNombre' })
    expect(por['Segundo Nombre']).toMatchObject({ campo: null, parte: 'segundoNombre', exacto: true })
    expect(por['Primer Apellido']).toMatchObject({ campo: null, parte: 'primerApellido' })
    expect(por['Segundo Apellido']).toMatchObject({ campo: null, parte: 'segundoApellido' })
  })

  it('una fila sin nombre completo lo arma con las partes; con nombre completo, ese gana', () => {
    const mapeo = mapearColumnas(PLANTILLA, ENCABEZADOS)
    const base = { 'Primer Nombre/Razón Social': 'MARIA', 'Segundo Nombre': '', 'Primer Apellido': 'RUIZ', 'Segundo Apellido': 'GOMEZ' }
    expect(armarFila({ ...base, 'Nombre Completo/Razón Social': '' }, mapeo).nombre).toBe('MARIA RUIZ GOMEZ')
    expect(armarFila({ ...base, 'Nombre Completo/Razón Social': 'MARIA RUIZ GOMEZ DE LA HOZ' }, mapeo).nombre).toBe(
      'MARIA RUIZ GOMEZ DE LA HOZ',
    )
    expect(obligatoriasSinMapear(PLANTILLA, mapeo).map((c) => c.campo)).not.toContain('nombre')
  })

  it('documento y tipo de documento mapean exactos', () => {
    expect(por['Documento']).toMatchObject({ campo: 'documento', exacto: true })
    expect(por['Tipo Documento']).toMatchObject({ campo: 'tipoDocumento', exacto: true })
    // El DV del NIT viene en su propia columna: ya no se ignora, se compara con el calculado.
    expect(por['Dígito de Verificación']).toMatchObject({ campo: 'digitoVerificacion', exacto: true })
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

  it('«Otro Teléfono» y «Representante Legal» no se tiran: van a las notas de la ficha', () => {
    expect(por['Otro Teléfono']).toMatchObject({ campo: null, aNotas: true })
    expect(por['Representante Legal']).toMatchObject({ campo: null, aNotas: true })
    const mapeo = mapearColumnas(PLANTILLA, ENCABEZADOS)
    const fila = armarFila({ 'Nombre Completo/Razón Social': 'GRUPO SAN PIO S.A.S', 'Otro Teléfono': ' 3017863100 ', 'Representante Legal': 'MAURICIO SRETER', 'Estado Civil': 'Soltero' }, mapeo)
    // En el orden de las columnas del archivo (Representante Legal va antes).
    expect(fila.notas).toBe('Representante Legal: MAURICIO SRETER\nOtro Teléfono: 3017863100')
    // Lo que no se pidió («Estado Civil») sigue afuera.
    expect(armarFila({ 'Nombre Completo/Razón Social': 'X', 'Estado Civil': 'Soltero' }, mapeo).notas).toBeUndefined()
  })

  it('una columna nunca pisa a otra: cada campo, una sola vez', () => {
    const campos = Object.values(por).map((m) => m.campo).filter(Boolean)
    expect(new Set(campos).size).toBe(campos.length)
  })
})
