import { describe, it, expect } from 'vitest'

import { historialDeLaPostulacion, historialMinimo } from './historial-de-la-postulacion'

// Los eventos REALES de la postulación de Iván en el laboratorio (04-10-2026).
const EVENTOS = [
  { id: 'e1', type: 'CREATED', metadata: {}, createdAt: '2026-10-04T06:19:39.628Z' },
  { id: 'e2', type: 'SUBMITTED', metadata: {}, createdAt: '2026-10-04T06:19:39.640Z' },
  { id: 'e3', type: 'STATUS_CHANGED', metadata: { to: 'UNDER_REVIEW', from: 'DRAFT' }, createdAt: '2026-10-04T06:19:39.643Z' },
  { id: 'e4', type: 'DOCUMENT_UPLOADED', metadata: { documentType: 'ID_DOCUMENT' }, createdAt: '2026-10-04T06:19:39.778Z' },
  { id: 'e5', type: 'STATUS_CHANGED', metadata: { to: 'APPROVED', from: 'UNDER_REVIEW', reason: 'Bienvenido, te escribimos para coordinar la firma.' }, createdAt: '2026-10-04T06:27:48.363Z' },
]

describe('historialDeLaPostulacion (QA-IA-A: nada de fechas inventadas)', () => {
  it('🔴 cada paso lleva la fecha del EVENTO, no «envío + 1 día»', () => {
    const pasos = historialDeLaPostulacion(EVENTOS, 'es')
    expect(pasos.map((p) => p.timestamp)).toEqual([
      '2026-10-04T06:19:39.628Z',
      '2026-10-04T06:19:39.640Z',
      '2026-10-04T06:19:39.643Z',
      '2026-10-04T06:27:48.363Z',
    ])
    // Ningún paso en el futuro respecto del último evento.
    expect(pasos.every((p) => p.timestamp <= '2026-10-04T06:27:48.363Z')).toBe(true)
  })

  it('habla de la inmobiliaria, deja fuera los documentos y muestra el mensaje al aprobar', () => {
    const pasos = historialDeLaPostulacion(EVENTOS, 'es')
    expect(pasos.map((p) => p.description)).toEqual([
      'Empezaste la solicitud',
      'Enviaste la solicitud a la inmobiliaria',
      'La inmobiliaria está revisando tu solicitud',
      '¡Tu solicitud fue aprobada!',
    ])
    expect(pasos[3].nota).toBe('Bienvenido, te escribimos para coordinar la firma.')
    expect(pasos.some((p) => /propietario/i.test(p.description))).toBe(false)
  })

  it('el pedido de información sale una vez, con su mensaje; el no adjudicado no muestra el texto interno', () => {
    const pasos = historialDeLaPostulacion(
      [
        { id: 'a', type: 'INFO_REQUESTED', metadata: { message: 'Envía el certificado de pensión.' }, createdAt: '2026-10-04T06:25:13.000Z' },
        { id: 'b', type: 'STATUS_CHANGED', metadata: { to: 'NEEDS_INFO' }, createdAt: '2026-10-04T06:25:13.100Z' },
        { id: 'c', type: 'STATUS_CHANGED', metadata: { to: 'NO_ADJUDICADO', reason: 'No adjudicado — otro candidato fue aprobado (ganador=abc)' }, createdAt: '2026-10-04T06:30:00.000Z' },
      ],
      'es',
    )
    expect(pasos).toHaveLength(2)
    expect(pasos[0]).toMatchObject({ type: 'needs_info', nota: 'Envía el certificado de pensión.' })
    expect(pasos[1]).toMatchObject({ type: 'no_adjudicado', description: 'El inmueble quedó para otra persona' })
    expect(pasos[1].nota).toBeUndefined()
  })

  it('sin historial, sólo lo que consta: la fecha de envío', () => {
    expect(historialMinimo('2026-10-04T06:19:39.640Z', 'es')).toEqual([
      { id: 'envio', type: 'submitted', timestamp: '2026-10-04T06:19:39.640Z', description: 'Enviaste la solicitud a la inmobiliaria' },
    ])
    expect(historialMinimo(null, 'es')).toEqual([])
  })
})
