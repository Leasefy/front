import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/client';
import {
  describirEstadoDelFirmante,
  describirEstadoDelPagare,
  esPagareNoDisponible,
  pagareEstaVivo,
  puedeEmitirNuevoPagare,
} from './pagare';

describe('esPagareNoDisponible', () => {
  it('true only for a 404', () => {
    expect(esPagareNoDisponible(new ApiError(404, 'not found'))).toBe(true);
    expect(esPagareNoDisponible(new ApiError(503, 'off'))).toBe(false);
    expect(esPagareNoDisponible(new Error('x'))).toBe(false);
  });
});

describe('describirEstadoDelPagare', () => {
  it('maps every known state', () => {
    expect(describirEstadoDelPagare('CREANDO').tono).toBe('warning');
    expect(describirEstadoDelPagare('PENDIENTE_DE_FIRMA').tono).toBe('warning');
    expect(describirEstadoDelPagare('FIRMADO').tono).toBe('success');
    expect(describirEstadoDelPagare('RECHAZADO').tono).toBe('danger');
    expect(describirEstadoDelPagare('VENCIDO').tono).toBe('danger');
    expect(describirEstadoDelPagare('CANCELADO').tono).toBe('neutral');
    expect(describirEstadoDelPagare('ERROR_AL_CREAR').tono).toBe('danger');
  });

  it('never throws on an unknown value', () => {
    // @ts-expect-error — future enum value
    expect(describirEstadoDelPagare('OTRO')).toEqual({ etiqueta: 'Desconocido', tono: 'neutral' });
  });
});

describe('describirEstadoDelFirmante', () => {
  it('maps every known state', () => {
    expect(describirEstadoDelFirmante('PENDIENTE').tono).toBe('warning');
    expect(describirEstadoDelFirmante('FIRMADO').tono).toBe('success');
    expect(describirEstadoDelFirmante('RECHAZADO').tono).toBe('danger');
    expect(describirEstadoDelFirmante('VENCIDO').tono).toBe('danger');
  });
});

describe('pagareEstaVivo', () => {
  it('true for CREANDO/PENDIENTE_DE_FIRMA, false otherwise (including null)', () => {
    expect(pagareEstaVivo('CREANDO')).toBe(true);
    expect(pagareEstaVivo('PENDIENTE_DE_FIRMA')).toBe(true);
    expect(pagareEstaVivo('FIRMADO')).toBe(false);
    expect(pagareEstaVivo(null)).toBe(false);
    expect(pagareEstaVivo(undefined)).toBe(false);
  });
});

describe('puedeEmitirNuevoPagare', () => {
  it('true when there is none, or the last one is closed (not FIRMADO, not live)', () => {
    expect(puedeEmitirNuevoPagare(null)).toBe(true);
    expect(puedeEmitirNuevoPagare('CANCELADO')).toBe(true);
    expect(puedeEmitirNuevoPagare('RECHAZADO')).toBe(true);
  });

  it('false while live or already FIRMADO', () => {
    expect(puedeEmitirNuevoPagare('CREANDO')).toBe(false);
    expect(puedeEmitirNuevoPagare('PENDIENTE_DE_FIRMA')).toBe(false);
    expect(puedeEmitirNuevoPagare('FIRMADO')).toBe(false);
  });
});
