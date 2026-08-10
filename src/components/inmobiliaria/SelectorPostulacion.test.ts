/**
 * Qué postulaciones se ofrecen para armar un contrato.
 *
 * Es la regla que arregla el defecto original: el botón «Nuevo contrato»
 * navegaba a `/contratos/nuevo` sin `?applicationId=` y esa pantalla respondía
 * "Falta el parámetro applicationId". Ahora pregunta cuál, así que equivocarse
 * acá tiene dos costos distintos:
 *   · de menos → el botón vuelve a parecer roto ("no hay nadie" habiendo);
 *   · de más  → se abre un segundo contrato sobre alguien que ya tiene uno.
 */

import { describe, it, expect } from 'vitest'

import { postulacionesElegibles } from './SelectorPostulacion'
import type { AllCandidatesItem, LandlordApplicationStatus } from '@/lib/api/applications.types'
import type { Contract } from '@/lib/types/contract'

function candidato(
  id: string,
  status: LandlordApplicationStatus,
  tenantName = 'Ana Pérez',
  propertyTitle = 'Apartamento 302',
): AllCandidatesItem {
  return {
    id,
    tenantName,
    tenantEmail: `${id}@test.co`,
    status,
    submittedAt: '2026-08-01T00:00:00.000Z',
    propertyId: `prop-${id}`,
    propertyTitle,
  }
}

/** Un contrato solo necesita su `applicationId` para esta regla. */
const contrato = (applicationId?: string) => ({ id: 'c1', applicationId }) as Contract

describe('postulacionesElegibles', () => {
  it('solo ofrece las aprobadas', () => {
    const todos = (
      [
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'PREAPPROVED',
        'APPROVED',
        'REJECTED',
        'NEEDS_INFO',
        'WITHDRAWN',
        'CONTRACT_FAILED',
      ] as LandlordApplicationStatus[]
    ).map((s, i) => candidato(`a${i}`, s))

    const r = postulacionesElegibles(todos, [])
    expect(r.map((c) => c.status)).toEqual(['APPROVED'])
  })

  it('descarta la que ya tiene contrato', () => {
    const cands = [candidato('a1', 'APPROVED'), candidato('a2', 'APPROVED')]
    const r = postulacionesElegibles(cands, [contrato('a1')])
    expect(r.map((c) => c.id)).toEqual(['a2'])
  })

  it('un contrato sin applicationId no descarta a nadie', () => {
    // `Contract.applicationId` es opcional: los contratos cargados a mano no
    // vienen de una postulación y no deben esconder candidatos válidos.
    const cands = [candidato('a1', 'APPROVED')]
    expect(postulacionesElegibles(cands, [contrato(undefined)])).toHaveLength(1)
  })

  it('filtra por nombre y por propiedad, sin distinguir mayúsculas', () => {
    const cands = [
      candidato('a1', 'APPROVED', 'Ana Pérez', 'Apartamento 302'),
      candidato('a2', 'APPROVED', 'Bruno Díaz', 'Casa Chapinero'),
    ]
    expect(postulacionesElegibles(cands, [], 'bruno').map((c) => c.id)).toEqual(['a2'])
    expect(postulacionesElegibles(cands, [], 'CHAPINERO').map((c) => c.id)).toEqual(['a2'])
    expect(postulacionesElegibles(cands, [], '  ').map((c) => c.id)).toEqual(['a1', 'a2'])
  })

  it('el buscador no cambia la elegibilidad', () => {
    // La pantalla llama dos veces —con y sin búsqueda— para poder distinguir
    // "no hay ninguna" de "ninguna coincide". Si el buscador dejara pasar una
    // no aprobada, ese mensaje mentiría.
    const cands = [candidato('a1', 'REJECTED', 'Ana Pérez')]
    expect(postulacionesElegibles(cands, [], 'ana')).toEqual([])
  })

  it('sin candidatos devuelve vacío y no revienta', () => {
    expect(postulacionesElegibles([], [])).toEqual([])
  })
})
