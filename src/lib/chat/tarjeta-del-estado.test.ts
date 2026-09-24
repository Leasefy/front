import { describe, it, expect } from 'vitest';
import { mosaicosDelEstado } from './tarjeta-del-estado';
import { t } from '@/lib/i18n/i18n-test-stub';

/**
 * Nico, 23-09: las cifras del «estado de hoy» salían del esquema viejo del
 * agente —«0 deudores · $ 0 pagado hoy · 0 llamadas» en una inmobiliaria con
 * cartera de verdad—. Con la cartera del ERP, manda ésa.
 */
const VIEJO = { deudoresActivos: 0, pagadoHoyCop: 0, llamadasHoy: 0, escalacionesPendientes: 0, enPrejuridico: 0 };

describe('mosaicosDelEstado', () => {
  it('con la cartera del ERP, ésa manda y los ceros del agente no se pintan', () => {
    const m = mosaicosDelEstado({ ...VIEJO, carteraCop: 48_250_000, contratosEnCartera: 12 }, t);
    expect(m.map((x) => x.label)).toEqual(['Cartera por cobrar', 'Contratos en cartera']);
    expect(String(m[0].value)).toMatch(/48[,.]3/);
    expect(m[1].value).toBe(12);
  });

  it('con la cartera del ERP, una cifra del agente que SÍ dice algo se queda', () => {
    const m = mosaicosDelEstado({ ...VIEJO, llamadasHoy: 3, carteraCop: 1_000_000, contratosEnCartera: 1 }, t);
    expect(m.map((x) => x.label)).toEqual(['Cartera por cobrar', 'Contratos en cartera', 'Llamadas hoy']);
  });

  it('un micro viejo (sin cartera del ERP) se ve como antes', () => {
    expect(mosaicosDelEstado(VIEJO, t).map((x) => x.label)).toEqual(['Deudores activos', 'Pagado hoy', 'Llamadas hoy']);
  });
});
