/**
 * PQRS-FIX (QA del 04-10-2026): lo puro detrás de una PQRS que sirve.
 * Cada caso nombra su hallazgo de `qa-pqrs-buscador/bugs.md`.
 */
import { describe, expect, it } from 'vitest'

import { inmuebleSinRepetir, nombreDelTipo } from './pqrs-reglas'
import { filtrarPqrs, FILTROS_DE_PQRS_VACIOS } from '@/app/panel/inmobiliaria/solicitudes/filtrar-pqrs'
import { problemaDelAdjunto } from '@/lib/api/pqrs-adjuntos'
import { casoAbierto, pqrsToCase } from '@/lib/types/tenant-case'
import type { Pqrs } from '@/lib/api/pqrs-agencia.types'
import type { SolicitudPqrs } from '@/lib/api/pqrs.types'

const AHORA = new Date('2026-10-05T15:00:00Z') // lunes

function pqrs(extra: Partial<Pqrs>): Pqrs {
  return {
    id: 'p',
    numero: 4,
    radicado: 'PQRS-0004',
    tipo: 'RECLAMO',
    solicitanteTipo: 'INQUILINO',
    solicitanteNombre: 'Iván',
    solicitanteContacto: null,
    asunto: 'Cobro doble',
    descripcion: null,
    consignacionId: null,
    inmuebleLabel: null,
    asignadoAUserId: null,
    asignadoANombre: null,
    estado: 'ASIGNADA',
    slaVenceAt: '2026-10-26T15:00:00Z',
    resueltaAt: null,
    cerradaAt: null,
    createdAt: '2026-10-04T15:00:00Z',
    updatedAt: '2026-10-04T15:00:00Z',
    ...extra,
  }
}

describe('SO-19 · el inmueble sin repetir la dirección', () => {
  it('«Calle 45 · Calle 45» se ve una vez; título y dirección distintos, los dos', () => {
    expect(inmuebleSinRepetir('Calle 45 # 70-12 Apto 301 · Calle 45 # 70-12 Apto 301')).toBe('Calle 45 # 70-12 Apto 301')
    expect(inmuebleSinRepetir('Apto 402 · Cra 43 # 5-20')).toBe('Apto 402 · Cra 43 # 5-20')
    expect(inmuebleSinRepetir(null)).toBeNull()
  })
})

describe('SO-24 · Reparación y Sugerencia con su nombre', () => {
  it('el subtipo gana sobre el tipo de la Ley 1755', () => {
    expect(nombreDelTipo({ tipo: 'PETICION', subtipo: 'SUGERENCIA' })).toBe('Sugerencia')
    expect(nombreDelTipo({ tipo: 'SOLICITUD', subtipo: 'REPARACION' })).toBe('Reparación')
    expect(nombreDelTipo({ tipo: 'RECLAMO' })).toBe('Reclamo')
  })
})

describe('SO-25 · filtrar vencidas y las que vencen pronto', () => {
  const lista = [
    pqrs({ id: 'vencida', slaVenceAt: '2026-10-04T15:00:00Z' }),
    pqrs({ id: 'manana', slaVenceAt: '2026-10-06T15:00:00Z' }),
    pqrs({ id: 'lejos', slaVenceAt: '2026-10-26T15:00:00Z' }),
    pqrs({ id: 'resuelta-vencida', slaVenceAt: '2026-10-01T15:00:00Z', estado: 'RESUELTA' }),
  ]
  it('vencidas = abiertas con el plazo pasado', () => {
    const r = filtrarPqrs(lista, { ...FILTROS_DE_PQRS_VACIOS, estado: 'vencidas' }, AHORA)
    expect(r.map((p) => p.id)).toEqual(['vencida'])
  })
  it('por vencer = abiertas que vencen en 2 días hábiles o menos', () => {
    const r = filtrarPqrs(lista, { ...FILTROS_DE_PQRS_VACIOS, estado: 'porVencer' }, AHORA)
    expect(r.map((p) => p.id)).toEqual(['manana'])
  })
})

describe('SO-18 · el archivo se revisa antes de subir (la regla la pone el back)', () => {
  it('un .exe no entra aunque diga ser una imagen; 11 MB tampoco; una foto sí', () => {
    const exe = new File(['MZ'], 'fuga.exe', { type: 'application/x-msdownload' })
    expect(problemaDelAdjunto(exe)).toMatch(/no es una foto ni un PDF/)
    const grande = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' })
    expect(problemaDelAdjunto(grande)).toMatch(/más de 10 MB/)
    const foto = new File(['x'], 'fuga.jpg', { type: 'image/jpeg' })
    expect(problemaDelAdjunto(foto)).toBeNull()
  })
})

describe('SO-16 · «Casos abiertos» no cuenta los terminados', () => {
  it('resuelta y aprobada no están abiertas; en proceso sí', () => {
    expect(casoAbierto({ tone: 'neutral', estadoLabel: 'Resuelta' })).toBe(false)
    expect(casoAbierto({ tone: 'info', estadoLabel: 'Aprobada' })).toBe(false)
    expect(casoAbierto({ tone: 'info', estadoLabel: 'En proceso' })).toBe(true)
  })
})

describe('SO-06/SO-20 · el caso del portal trae radicado, historial real y respuesta', () => {
  it('pqrsToCase lleva el número, los pasos del back y «Respuesta de la inmobiliaria»', () => {
    const s: SolicitudPqrs = {
      id: 'p1',
      radicado: 'PQRS-0004',
      tipo: 'reclamo',
      estado: 'resuelta',
      asunto: 'Cobro doble',
      descripcion: 'Me cobraron dos veces',
      solicitanteNombre: 'Iván',
      solicitanteTipo: 'inquilino',
      createdAt: '2026-10-04T15:00:00Z',
      updatedAt: '2026-10-05T15:00:00Z',
      resueltaAt: '2026-10-05T15:00:00Z',
      historial: [
        { tipo: 'RADICADA', at: '2026-10-04T15:00:00Z', detalle: null },
        { tipo: 'ASIGNADA', at: '2026-10-04T16:00:00Z', detalle: 'Carlos Contador' },
        { tipo: 'RESPUESTA', at: '2026-10-05T15:00:00Z', detalle: null },
        { tipo: 'RESUELTA', at: '2026-10-05T15:00:00Z', detalle: null },
      ],
      respuestaDetalle: { texto: 'Anulamos el cobro duplicado.', medio: 'PORTAL', at: '2026-10-05T15:00:00Z' },
    }
    const caso = pqrsToCase(s)
    expect(caso.solicitud?.radicado).toBe('PQRS-0004')
    expect(caso.events.map((e) => e.label)).toEqual([
      'Radicada',
      'La atiende Carlos Contador',
      'Respuesta de la inmobiliaria',
      'Resuelta',
    ])
    expect(caso.solicitud?.respuesta?.texto).toBe('Anulamos el cobro duplicado.')
  })
})
