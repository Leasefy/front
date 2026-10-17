import { describe, expect, it } from 'vitest'
import { datosAlAbrir } from './GenerarCarta'

/**
 * QA-AGENTES 16-10 (lab, contrato #1894): la carta prejurídica salió con
 * «Apartamento en Bellavista, Caldas» (el título de la publicación) como
 * dirección del inmueble; la del contrato es «CL 122 SUR 50 - 62 AP 405».
 */
const carta = {
  faltan: [{ campo: 'numContrato' as const }],
  conocidos: {
    ciudad: 'Medellín',
    direccionInmueble: 'Apartamento en Bellavista, Caldas',
    nombreInmobiliaria: 'Portofino Propiedad Raíz (lab)',
  },
}

describe('datosAlAbrir', () => {
  it('si el contrato tiene otra dirección, se propone ESA para revisar (no la etiqueta de la cuota)', () => {
    const r = datosAlAbrir(carta, { numero: '#1894', direccion: 'CL 122 SUR 50 - 62 AP 405' })
    expect(r.faltan).toEqual(['numContrato', 'direccionInmueble'])
    expect(r.conocidos).not.toHaveProperty('direccionInmueble')
    expect(r.datos).toEqual({ numContrato: '#1894', direccionInmueble: 'CL 122 SUR 50 - 62 AP 405' })
  })

  it('si coinciden, queda como sabida y no se pide', () => {
    const r = datosAlAbrir(
      { ...carta, conocidos: { ...carta.conocidos, direccionInmueble: 'CL 122 SUR 50 - 62 AP 405' } },
      { numero: '#1894', direccion: 'CL 122 SUR 50 - 62 AP 405' },
    )
    expect(r.faltan).toEqual(['numContrato'])
    expect(r.conocidos.direccionInmueble).toBe('CL 122 SUR 50 - 62 AP 405')
  })

  it('sin contrato, lo que diga el micro (como antes)', () => {
    const r = datosAlAbrir(carta, null)
    expect(r.faltan).toEqual(['numContrato'])
    expect(r.conocidos.direccionInmueble).toBe('Apartamento en Bellavista, Caldas')
    expect(r.datos).toEqual({})
  })

  it('si el micro no sabe la dirección y el contrato sí, se propone', () => {
    const r = datosAlAbrir(
      { faltan: [{ campo: 'numContrato' }, { campo: 'direccionInmueble' }], conocidos: {} },
      { numero: null, direccion: 'CL 122 SUR 50 - 62 AP 405' },
    )
    expect(r.faltan).toEqual(['numContrato', 'direccionInmueble'])
    expect(r.datos).toEqual({ direccionInmueble: 'CL 122 SUR 50 - 62 AP 405' })
  })
})
