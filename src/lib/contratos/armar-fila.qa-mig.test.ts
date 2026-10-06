/**
 * QA de la migración (QA-MIG-A, 04-10-2026): lo que el armado de la fila de
 * contrato inventaba o perdía con archivos de otras inmobiliarias.
 */
import { describe, it, expect } from 'vitest'

import { armarFilaAMigrar, personasEnDosColumnas, plataConLetras } from './armar-fila'
import { mapearColumnas } from './columnas-de-contrato'

const armar = (encabezados: string[], fila: Record<string, unknown>) =>
  armarFilaAMigrar(fila, mapearColumnas(encabezados))

describe('MG-07: una cifra con letras de magnitud no se lee como plata', () => {
  it('«2.1M» no es un canon de $2', () => {
    const f = armar(['Inquilino', 'Canon'], { Inquilino: 'Ana', Canon: '2.1M' })
    expect(f.monthlyRent).toBeUndefined()
  })

  it.each(['1,5 millones', '850k', '2 mil', '1.5 MM'])('«%s» tampoco', (canon) => {
    expect(plataConLetras(canon)).toBe(true)
  })

  it.each(['$1.500.000', '1,500,000.00', '$ 2.400.000 COP', '1.500.000 pesos', '1500000 M/CTE'])(
    '«%s» sí se lee',
    (canon) => {
      expect(plataConLetras(canon)).toBe(false)
      const f = armar(['Inquilino', 'Canon'], { Inquilino: 'Ana', Canon: canon })
      expect(f.monthlyRent).toBeGreaterThan(1_000_000)
    },
  )
})

describe('MG-11: dos personas en la celda del documento', () => {
  it('copropietarios «A / B» con «D1 / D2» son dos dueños, cada uno con su documento', () => {
    const f = armar(['Inquilino', 'Propietario', 'Cédula propietario'], {
      Inquilino: 'Gloria',
      Propietario: 'María Gómez / Pedro Henao',
      'Cédula propietario': '43.987.654 / 98765432',
    })
    expect(f.propietario?.documento).toBe('43987654')
    expect(f.propietario?.nombre).toBe('María Gómez')
    expect(f.propietarios).toEqual([
      { nombre: 'María Gómez', documento: '43987654' },
      { nombre: 'Pedro Henao', documento: '98765432' },
    ])
  })

  it('co-arrendatarios «A y B» con «D1 y D2» son dos inquilinos', () => {
    const f = armar(['Inquilino', 'Cédula inquilino'], {
      Inquilino: 'Juan Betancur y Daniela Correa',
      'Cédula inquilino': '1128444555 y 1128444556',
    })
    expect(f.inquilino.documento).toBe('1128444555')
    expect(f.inquilino.nombre).toBe('Juan Betancur')
    expect(f.inquilinos).toEqual([
      { nombre: 'Juan Betancur', documento: '1128444555' },
      { nombre: 'Daniela Correa', documento: '1128444556' },
    ])
  })

  it('si los nombres no se dejan emparejar, el documento NO viaja (nunca pegado)', () => {
    const f = armar(['Inquilino', 'Cédula inquilino'], {
      Inquilino: 'Juan Betancur',
      'Cédula inquilino': '1128444555 / 1128444556',
    })
    expect(f.inquilino.documento).toBeUndefined()
  })

  it('un documento con puntos de miles o con su DV no son «dos personas»', () => {
    expect(personasEnDosColumnas('Ana', '1.036.111.222')).toBeNull()
    expect(personasEnDosColumnas('Empresa', '900.456.789-1')).toBeNull()
  })
})

describe('MG-05/12/14/10: columnas de otras inmobiliarias', () => {
  it('«F. Inicio» y «F. Fin» son las dos fechas del contrato', () => {
    const m = mapearColumnas(['Arrendatario', 'F. Inicio', 'F. Fin'])
    expect(m.find((c) => c.columna === 'F. Fin')?.campo).toBe('fechaFin')
    expect(m.find((c) => c.columna === 'F. Inicio')?.campo).toBe('fechaInicio')
  })

  it('«Inicio» y «Fin» a secas también', () => {
    const m = mapearColumnas(['Arrendatario', 'Inicio', 'Fin'])
    expect(m.find((c) => c.columna === 'Fin')?.campo).toBe('fechaFin')
  })

  it('«Cédula» sola es del inquilino cuando el archivo sólo nombra al inquilino (y se marca para confirmar)', () => {
    const m = mapearColumnas(['Inquilino', 'Cédula', 'Correo', 'Teléfono', 'Canon'])
    const cedula = m.find((c) => c.columna === 'Cédula')
    expect(cedula?.campo).toBe('inquilinoDocumento')
    expect(cedula?.certeza).toBe('dudosa')
    expect(m.find((c) => c.columna === 'Correo')?.campo).toBe('inquilinoCorreo')
    expect(m.find((c) => c.columna === 'Teléfono')?.campo).toBe('inquilinoTelefono')
  })

  it('con inquilino Y propietario en el archivo, una «Cédula» sola no se asigna', () => {
    const m = mapearColumnas(['Inquilino', 'Propietario', 'Cédula', 'Canon'])
    expect(m.find((c) => c.columna === 'Cédula')?.campo).toBeNull()
  })

  it('un «Código» a secas no se asigna solo, pero el consejo es elegirlo en el desplegable', async () => {
    const { faltantesEsenciales } = await import('./columnas-de-contrato')
    const m = mapearColumnas(['Inquilino', 'Documento', 'Código', 'Canon', 'Inicio', 'Fin'])
    expect(m.find((c) => c.columna === 'Código')?.campo).toBeNull()
    const inmueble = faltantesEsenciales(m).find((f) => f.clave === 'inmueble')
    expect(inmueble?.hayColumnaPosible).toBe(true)
  })

  it('«Tipo inmueble» no es la columna del inmueble («Apartamento» no es una dirección)', () => {
    const m = mapearColumnas(['Código', 'Tipo inmueble', 'Dirección', 'Inquilino'])
    expect(m.find((c) => c.columna === 'Tipo inmueble')?.campo).toBeNull()
    expect(m.find((c) => c.columna === 'Dirección')?.campo).toBe('direccionInmueble')
  })
})
