import { describe, it, expect } from 'vitest';
import {
  colorDeVigencia,
  etiquetaDeVigencia,
  puedeCederse,
  puedeTerminarse,
  vigenciaDelContrato,
} from './vigencia';

const hoy = new Date('2026-09-15T12:00:00.000Z');

describe('vigenciaDelContrato', () => {
  it('activo dentro de plazo', () => {
    const v = vigenciaDelContrato(
      { status: 'active', endDate: '2026-12-31T00:00:00.000Z' },
      hoy,
    );
    expect(v.estado).toBe('VIGENTE');
    expect(v.leyenda).toBe('Vigente hasta el 2026-12-31');
  });

  it('🔴 el DÍA del vencimiento sigue vigente: un @db.Date no puede correrse por la zona horaria', () => {
    // Serializado como `...T00:00:00.000Z`, leído en hora local de Bogotá
    // (UTC−5) daría el 14 y el contrato aparecería vencido un día antes.
    const v = vigenciaDelContrato(
      { status: 'active', endDate: '2026-09-15T00:00:00.000Z' },
      hoy,
    );
    expect(v.estado).toBe('VIGENTE');
  });

  it('🔴 activo con la fecha pasada es VENCIDO, no «Activo»', () => {
    const v = vigenciaDelContrato({ status: 'active', endDate: '2026-08-31' }, hoy);
    expect(v.estado).toBe('VENCIDO_SIN_RENOVAR');
    expect(v.vencidoSinRenovar).toBe(true);
    expect(v.vencidoDesde).toBe('2026-08-31');
    expect(v.diasVencido).toBe(15);
    expect(v.leyenda).toBe('Vencido desde el 2026-08-31 (15 días)');
  });

  it('un día se dice en singular', () => {
    const v = vigenciaDelContrato({ status: 'active', endDate: '2026-09-14' }, hoy);
    expect(v.leyenda).toBe('Vencido desde el 2026-09-14 (1 día)');
  });

  it('🔴 terminado antes de tiempo se lee «Terminado», no «vencido»', () => {
    const v = vigenciaDelContrato(
      { status: 'expired', endDate: '2026-09-10', terminadoEn: '2026-09-10' },
      hoy,
    );
    expect(v.estado).toBe('TERMINADO_ANTICIPADAMENTE');
    expect(v.leyenda).toBe('Terminado el 2026-09-10');
  });

  it('🔴 sin la migración aplicada (`terminadoEn` ausente) no se rompe', () => {
    const v = vigenciaDelContrato({ status: 'expired', endDate: '2025-12-31' }, hoy);
    expect(v.estado).toBe('TERMINADO_POR_VENCIMIENTO');
  });

  it('un contrato migrado sin fecha de fin se muestra vigente', () => {
    const v = vigenciaDelContrato({ status: 'active', endDate: null }, hoy);
    expect(v.estado).toBe('VIGENTE');
    expect(v.leyenda).toBe('Vigente');
  });

  it('un borrador no tiene vigencia', () => {
    expect(
      vigenciaDelContrato({ status: 'draft', endDate: '2020-01-01' }, hoy).estado,
    ).toBe('NO_VIGENTE');
  });
});

describe('etiquetaDeVigencia / colorDeVigencia', () => {
  it('un activo vencido dice «Vencido» y se pinta de aviso', () => {
    const v = vigenciaDelContrato({ status: 'active', endDate: '2026-08-31' }, hoy);
    expect(etiquetaDeVigencia(v, 'Activo')).toBe('Vencido');
    expect(colorDeVigencia(v, 'verde')).toContain('yellow');
  });

  it('un activo al día conserva su etiqueta y su color', () => {
    const v = vigenciaDelContrato({ status: 'active', endDate: '2026-12-31' }, hoy);
    expect(etiquetaDeVigencia(v, 'Activo')).toBe('Activo');
    expect(colorDeVigencia(v, 'verde')).toBe('verde');
  });

  it('un expirado dice «Terminado», no «Expirado»', () => {
    const v = vigenciaDelContrato({ status: 'expired', endDate: '2026-01-01' }, hoy);
    expect(etiquetaDeVigencia(v, 'Expirado')).toBe('Terminado');
  });
});

describe('qué acciones ofrece', () => {
  it('sólo un activo se termina antes de tiempo', () => {
    expect(puedeTerminarse({ status: 'active' })).toBe(true);
    expect(puedeTerminarse({ status: 'signed' })).toBe(false);
    expect(puedeTerminarse({ status: 'expired' })).toBe(false);
  });

  it('se cede sobre un contrato que está corriendo', () => {
    expect(puedeCederse({ status: 'active' })).toBe(true);
    expect(puedeCederse({ status: 'signed' })).toBe(true);
    expect(puedeCederse({ status: 'draft' })).toBe(false);
  });
});
