/**
 * La columna opcional de servicios públicos en la migración de contratos (Nico, 29-10-2026: «hoy no se migra eso, por
 * eso decimos que es sumarlo como opcional»). Portofino la tiene en Nuby como «ID 47591 EPM 13249728 VIGENCIA 12 MESES
 * SIN COBERTURA»; el back guarda la cuenta de EPM del inmueble.
 */
import { describe, it, expect } from 'vitest'

import { armarFilaAMigrar } from './armar-fila'
import { mapearColumnas } from './columnas-de-contrato'

const armar = (encabezados: string[], fila: Record<string, unknown>) => armarFilaAMigrar(fila, mapearColumnas(encabezados))
const EPM = 'ID 47591 EPM 13249728 VIGENCIA 12 MESES SIN COBERTURA'

describe('servicios públicos en la migración de contratos', () => {
  it.each(['Servicios públicos', 'EPM', 'Contrato EPM'])('la columna «%s» viaja como serviciosPublicos', (columna) => {
    const f = armar(['Inquilino', columna], { Inquilino: 'Ana', [columna]: EPM })
    expect(f.serviciosPublicos).toBe(EPM)
  })

  it('sin la columna (o vacía) no viaja la clave: un back anterior no la conoce', () => {
    expect('serviciosPublicos' in armar(['Inquilino'], { Inquilino: 'Ana' })).toBe(false)
    expect('serviciosPublicos' in armar(['Inquilino', 'Servicios públicos'], { Inquilino: 'Ana', 'Servicios públicos': '  ' })).toBe(false)
  })

  it('no le quita las observaciones a su columna', () => {
    const f = armar(['Inquilino', 'Observaciones', 'Servicios públicos'], {
      Inquilino: 'Ana',
      Observaciones: 'Dos juegos de llaves.',
      'Servicios públicos': EPM,
    })
    expect(f.observaciones).toBe('Dos juegos de llaves.')
    expect(f.serviciosPublicos).toBe(EPM)
  })
})
