/**
 * Lo que el cajón del egreso ofrece y lo que manda (Nico, 22-09: «se debería de
 * poder cambiar esa fecha»). El back decide; esto sólo evita el clic que ya se
 * sabe que va a responder que no.
 */

import { describe, it, expect } from 'vitest';

import {
  faltaParaGuardar,
  pedidoDelCambio,
  queSePuedeCambiar,
} from './cambio-de-egreso';

const PUEDE = { puede: true, motivo: null };
const HOY = { fecha: '2026-09-15', referencia: 'PAB-1', nota: null };
const borrador = (b: Partial<{ fecha: string; referencia: string; nota: string; motivo: string }>) => ({
  fecha: '2026-09-15',
  referencia: 'PAB-1',
  nota: '',
  motivo: '',
  ...b,
});

describe('queSePuedeCambiar', () => {
  it('un egreso pagado deja cambiar las tres cosas', () => {
    const p = queSePuedeCambiar({ estado: 'PAGADO', fechaDelEgreso: '2026-09-15' }, PUEDE);
    expect([p.fecha.puede, p.referencia.puede, p.nota.puede]).toEqual([true, true, true]);
  });

  it('uno sin pagar sólo deja la nota, y dice por qué no la fecha', () => {
    const p = queSePuedeCambiar({ estado: 'EN_LOTE', fechaDelEgreso: null }, PUEDE);
    expect(p.fecha.puede).toBe(false);
    expect(p.fecha.motivo).toContain('pago del lote');
    expect(p.referencia.puede).toBe(false);
    expect(p.nota.puede).toBe(true);
  });

  it('uno anulado no deja nada', () => {
    const p = queSePuedeCambiar({ estado: 'ANULADO', fechaDelEgreso: '2026-09-15' }, PUEDE);
    expect([p.fecha.puede, p.referencia.puede, p.nota.puede]).toEqual([false, false, false]);
  });

  it('🔴 sin permiso de escritura no deja NADA, con el motivo del rol', () => {
    const p = queSePuedeCambiar(
      { estado: 'PAGADO', fechaDelEgreso: '2026-09-15' },
      { puede: false, motivo: 'Sólo el administrador o el contador.' },
    );
    expect([p.fecha.puede, p.referencia.puede, p.nota.puede]).toEqual([false, false, false]);
    expect(p.fecha.motivo).toBe('Sólo el administrador o el contador.');
  });
});

describe('pedidoDelCambio', () => {
  it('manda SÓLO lo que cambió: la misma fecha no viaja', () => {
    expect(pedidoDelCambio(HOY, borrador({ nota: 'Regirado' }))).toEqual({ nota: 'Regirado' });
  });

  it('la fecha nueva viaja con su motivo', () => {
    expect(
      pedidoDelCambio(HOY, borrador({ fecha: '2026-09-18', motivo: ' Rechazo del banco ' })),
    ).toEqual({ fecha: '2026-09-18', motivo: 'Rechazo del banco' });
  });

  it('borrar la referencia viaja como texto vacío (la quita)', () => {
    expect(pedidoDelCambio(HOY, borrador({ referencia: '  ', motivo: 'x' }))).toEqual({
      referencia: '',
      motivo: 'x',
    });
  });

  it('sin cambios es `null`', () => {
    expect(pedidoDelCambio(HOY, borrador({ motivo: 'algo' }))).toBeNull();
  });
});

describe('faltaParaGuardar', () => {
  it('🔴 la fecha sin motivo no se guarda: mueve un asiento', () => {
    expect(faltaParaGuardar({ fecha: '2026-09-18' }, '2026-09-22')).toContain('mueve el asiento');
  });

  it('🔴 una fecha futura no se guarda', () => {
    expect(faltaParaGuardar({ fecha: '2026-09-23', motivo: 'x' }, '2026-09-22')).toContain(
      'todavía no llega',
    );
  });

  it('la nota va sin motivo', () => {
    expect(faltaParaGuardar({ nota: 'hola' }, '2026-09-22')).toBeNull();
  });

  it('sin pedido dice que no hay nada que guardar', () => {
    expect(faltaParaGuardar(null, '2026-09-22')).toContain('No hay nada');
  });
});
