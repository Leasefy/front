/**
 * CB-13 / CB-14 (QA de Contabilidad, 03-10-2026): lo que el asiento ES y quién
 * es el tercero, sin pintar nunca un uuid.
 */
import { describe, expect, it } from 'vitest';

import type { AsientoContable } from '@/lib/api/contabilidad.service';
import {
  estadoDelAsiento,
  sePuedeReversar,
  textoDelOrigen,
  textoDelTercero,
} from './asientos';

const UUID = '9e09fd33-c093-4c23-93ad-4b396871dec1';

function asiento(extra: Partial<AsientoContable> = {}): AsientoContable {
  return {
    id: 'a-18',
    agencyId: 'ag',
    numero: 18,
    fecha: '2026-10-01',
    descripcion: 'Causación cobro',
    origen: 'COBRO',
    origenId: 'd8e5b110-c26d-4cf8-b374-008c4fb494fe',
    cerrado: false,
    creadoPorUserId: null,
    createdAt: '2026-10-01T00:00:00Z',
    movimientos: [],
    ...extra,
  };
}

describe('estadoDelAsiento', () => {
  it('🔴 un asiento vivo en un período abierto no dice «Abierto»: no dice nada', () => {
    expect(estadoDelAsiento(asiento())).toBeNull();
  });

  it('reversado, reversa y período cerrado', () => {
    expect(estadoDelAsiento(asiento({ reversadoPor: { id: 'a-163', numero: 163 } }))).toBe('REVERSADO');
    expect(estadoDelAsiento(asiento({ origen: 'MANUAL', reversaDe: { id: 'a-18', numero: 18 } }))).toBe('REVERSA');
    expect(estadoDelAsiento(asiento({ cerrado: true }))).toBe('CERRADO');
  });

  it('back anterior (sin `reversaDe`): MANUAL con origen sigue siendo una reversa', () => {
    expect(estadoDelAsiento(asiento({ origen: 'MANUAL', origenId: 'a-18' }))).toBe('REVERSA');
    // Con el back nuevo, `reversaDe: null` manda: un MANUAL con origen no es reversa.
    expect(estadoDelAsiento(asiento({ origen: 'MANUAL', origenId: 'x', reversaDe: null }))).toBeNull();
  });
});

describe('sePuedeReversar', () => {
  it('🔴 ni el reversado ni la reversa ofrecen «Reversar»', () => {
    expect(sePuedeReversar(asiento())).toBe(true);
    expect(sePuedeReversar(asiento({ reversadoPor: { id: 'a-163', numero: 163 } }))).toBe(false);
    expect(sePuedeReversar(asiento({ origen: 'MANUAL', origenId: 'a-18' }))).toBe(false);
  });
});

describe('textoDelTercero', () => {
  it('🔴 sin nombre no dice nada — nunca el id ni «ARRENDATARIO ·»', () => {
    expect(textoDelTercero({ terceroTipo: 'PROPIETARIO' })).toBeNull();
    expect(textoDelTercero({ terceroTipo: 'ARRENDATARIO', terceroNombre: '  ' })).toBeNull();
  });

  it('con nombre: el tipo dicho para una persona y el nombre', () => {
    expect(textoDelTercero({ terceroTipo: 'PROPIETARIO', terceroNombre: 'Paula Andrea Quintero' })).toBe(
      'Propietario · Paula Andrea Quintero',
    );
    expect(textoDelTercero({ terceroTipo: 'ARRENDATARIO', terceroNombre: 'Iván' })).toBe('Inquilino · Iván');
  });
});

describe('textoDelOrigen', () => {
  it('🔴 sin rótulo del back no pinta el id del cobro', () => {
    const texto = textoDelOrigen(asiento())!;
    expect(texto).toBe('Generado por la causación de un cobro');
    expect(texto).not.toContain('d8e5b110');
  });

  it('con el rótulo del back, el rótulo', () => {
    expect(textoDelOrigen(asiento({ origen: 'RECIBO_DE_CAJA', origenLegible: { tipo: 'RECIBO_DE_CAJA', rotulo: 'Recibo de caja N.º 23', id: 'r' } }))).toBe(
      'Generado por: Recibo de caja N.º 23',
    );
  });

  it('una reversa no lleva esta línea (tiene la suya)', () => {
    expect(textoDelOrigen(asiento({ origen: 'MANUAL', origenId: UUID }))).toBeNull();
  });
});
