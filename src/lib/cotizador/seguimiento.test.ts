/**
 * COTIZ-17/18 (QA de los agentes 19-10-2026): el seguimiento de una cotización.
 */
import { describe, it, expect } from 'vitest'

import {
  enlaceDelCaso,
  faltaLaActualizacion,
  notaDeLaTareaDelAsesor,
  quienEsElCandidato,
  tituloDeLaTareaDelAsesor,
} from './seguimiento'
import { fraseDeLaCotizacion } from '@/lib/contratos/desde-la-cotizacion'

describe('el seguimiento de la cotización', () => {
  it('el enlace del caso, sin dobles barras', () => {
    expect(enlaceDelCaso('https://leasefy.co/', 'q1')).toBe('https://leasefy.co/panel/inmobiliaria/postulaciones/asegurabilidad/q1')
  })

  it('el candidato con su nombre; sin él, su referencia', () => {
    expect(quienEsElCandidato(' Ana Ruiz ', '9e1f341d')).toBe('Ana Ruiz')
    expect(quienEsElCandidato(null, '9e1f341d')).toBe('Ref. 9e1f341d')
  })

  it('la tarea del asesor: título y nota con lo que salió y el enlace', () => {
    expect(tituloDeLaTareaDelAsesor('Ana Ruiz')).toBe('Seguir la asegurabilidad de Ana Ruiz')
    expect(tituloDeLaTareaDelAsesor('')).toBe('Seguir una cotización de asegurabilidad')
    expect(
      notaDeLaTareaDelAsesor({ aseguradora: 'Mapfre', elegida: true, primaMensual: '$ 138.700', polizaNumero: 'POL-1', enlace: 'https://x/q1' }),
    ).toBe('Opción elegida: Mapfre ($ 138.700 al mes), póliza N.º POL-1.\nLa cotización: https://x/q1')
    expect(notaDeLaTareaDelAsesor({ aseguradora: 'Sura', elegida: false, primaMensual: null, polizaNumero: null, enlace: 'https://x/q1' })).toBe(
      'Recomendada: Sura.\nLa cotización: https://x/q1',
    )
  })

  it('«falta la actualización» es sólo el 503 FALTA_UNA_MIGRACION', () => {
    expect(faltaLaActualizacion({ status: 503, code: 'FALTA_UNA_MIGRACION' })).toBe(true)
    expect(faltaLaActualizacion({ status: 503, code: 'SIN_BASE' })).toBe(false)
    expect(faltaLaActualizacion(null)).toBe(false)
  })

  it('Nuevo contrato dice qué trae de la cotización, en singular o plural', () => {
    expect(fraseDeLaCotizacion({ nombre: 'Ana', aseguradora: 'Mapfre' })).toBe(
      'Viene de la cotización de asegurabilidad de Ana: el nombre, el canon y Mapfre como respaldo ya están puestos. Completa el inmueble, la cédula y las fechas.',
    )
    expect(fraseDeLaCotizacion({ nombre: null, aseguradora: null })).toBe(
      'Viene de la cotización de asegurabilidad: el canon ya está puesto. Completa el inmueble, la cédula y las fechas.',
    )
  })
})
