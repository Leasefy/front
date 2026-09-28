import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/client';
import type { ProcesoDeFirmaResponse } from '@/lib/api/consignacion-firma.types';
import {
  describirEstadoDelProceso,
  esFirmaDeConsignacionNoDisponible,
  progresoDePropietarios,
  puedeIniciarOtroProceso,
} from './firma-de-consignacion';

function proceso(overrides: Partial<ProcesoDeFirmaResponse> = {}): ProcesoDeFirmaResponse {
  return {
    id: 'p-1',
    consignacionId: 'con-1',
    estado: 'PENDIENTE',
    documentoSha256: 'abc',
    createdAt: '2026-01-01T00:00:00Z',
    firmadoAt: null,
    canceladoAt: null,
    motivoDeCancelacion: null,
    iniciadoPor: null,
    firmantes: [],
    documentoFirmado: null,
    puedeFirmarElUsuarioActual: false,
    ...overrides,
  };
}

describe('esFirmaDeConsignacionNoDisponible', () => {
  it('is true only for a 404 ApiError', () => {
    expect(esFirmaDeConsignacionNoDisponible(new ApiError(404, 'not found'))).toBe(true);
  });

  it('is false for a 409/403/500 ApiError — those are real failures, not "back sin WU-3"', () => {
    expect(esFirmaDeConsignacionNoDisponible(new ApiError(409, 'conflict'))).toBe(false);
    expect(esFirmaDeConsignacionNoDisponible(new ApiError(403, 'forbidden'))).toBe(false);
    expect(esFirmaDeConsignacionNoDisponible(new ApiError(500, 'boom'))).toBe(false);
  });

  it('is false for a non-ApiError', () => {
    expect(esFirmaDeConsignacionNoDisponible(new Error('boom'))).toBe(false);
    expect(esFirmaDeConsignacionNoDisponible(undefined)).toBe(false);
  });
});

describe('describirEstadoDelProceso', () => {
  it('maps the three known states', () => {
    expect(describirEstadoDelProceso('PENDIENTE')).toEqual({ etiqueta: 'En proceso de firma', tono: 'warning' });
    expect(describirEstadoDelProceso('FIRMADO')).toEqual({ etiqueta: 'Firmado', tono: 'success' });
    expect(describirEstadoDelProceso('CANCELADO')).toEqual({ etiqueta: 'Cancelado', tono: 'neutral' });
  });

  it('never throws on an unknown value — falls back to a neutral label', () => {
    // @ts-expect-error — simulating a future enum value the front doesn't know yet
    expect(describirEstadoDelProceso('OTRO')).toEqual({ etiqueta: 'Desconocido', tono: 'neutral' });
  });
});

describe('puedeIniciarOtroProceso', () => {
  it('true when there is no process yet', () => {
    expect(puedeIniciarOtroProceso(null)).toBe(true);
  });

  it('true once the last process is FIRMADO or CANCELADO', () => {
    expect(puedeIniciarOtroProceso(proceso({ estado: 'FIRMADO' }))).toBe(true);
    expect(puedeIniciarOtroProceso(proceso({ estado: 'CANCELADO' }))).toBe(true);
  });

  it('false while a process is PENDIENTE', () => {
    expect(puedeIniciarOtroProceso(proceso({ estado: 'PENDIENTE' }))).toBe(false);
  });
});

describe('progresoDePropietarios', () => {
  it('counts only PROPIETARIO signers, never the representative', () => {
    const p = proceso({
      firmantes: [
        { id: '1', tipo: 'PROPIETARIO', propietarioId: 'a', userId: null, nombre: 'Ana', email: null, telefono: null, firmado: true, firmadoAt: '2026-01-01T00:00:00Z', codigoVerificado: true, otpChannels: ['EMAIL'], invitacion: 'ENVIADA', enlaceVenceEn: null },
        { id: '2', tipo: 'PROPIETARIO', propietarioId: 'b', userId: null, nombre: 'Beto', email: null, telefono: null, firmado: false, firmadoAt: null, codigoVerificado: null, otpChannels: null, invitacion: 'ENVIADA', enlaceVenceEn: '2026-02-01T00:00:00Z' },
        { id: '3', tipo: 'REPRESENTANTE_DE_LA_AGENCIA', propietarioId: null, userId: 'u-1', nombre: 'Carla', email: null, telefono: null, firmado: true, firmadoAt: '2026-01-02T00:00:00Z', codigoVerificado: true, otpChannels: ['EMAIL'], invitacion: null, enlaceVenceEn: null },
      ],
    });
    expect(progresoDePropietarios(p)).toEqual({ firmados: 1, total: 2 });
  });
});
