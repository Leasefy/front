import { describe, expect, it } from 'vitest';

import { diaDePagoLegible, estadoGeneralDelArriendo, fraseDeLoVencido } from './estado-general-del-portal';
import type { ResumenDePagos } from './resumen-de-pagos';

const conVencido: ResumenDePagos = {
  proxima: null,
  vencidoCop: 6_050_000,
  cuotasVencidas: 3,
  restaPorPagar: 9_000_000,
  enMora: false,
  diasDeMora: 0,
};
const alDia: ResumenDePagos = { ...conVencido, vencidoCop: 0, cuotasVencidas: 0 };

describe('estadoGeneralDelArriendo', () => {
  it('con cuotas vencidas NO dice «Al día» aunque el pago del período esté confirmado', () => {
    const e = estadoGeneralDelArriendo('APPROVED', conVencido);
    expect(e?.etiqueta).toBe('Con saldo vencido');
    // COLA-04: el formateador común (espacio duro, como el resto de la pantalla).
    expect(e?.detalle).toBe('$\u00a06.050.000 vencidos en 3 cuotas');
    expect(e?.tono).toBe('peligro');
  });
  it('sin vencidas y pago confirmado sí dice «Al día»', () => {
    expect(estadoGeneralDelArriendo('APPROVED', alDia)?.etiqueta).toBe('Al día');
  });
  it('sin el estado de cuenta no afirma «Al día»', () => {
    expect(estadoGeneralDelArriendo('APPROVED', null)?.etiqueta).not.toBe('Al día');
  });
  it('GLOW UP 21-10: sin comprobante del período pero sin nada vencido dice «Al día» y la próxima cuota (como Pagos)', () => {
    const e = estadoGeneralDelArriendo('NONE', { ...alDia, proxima: { valor: 1_845_151, fecha: '2026-11-01', diasQueFaltan: 11 } });
    expect(e).toEqual({ etiqueta: 'Al día', detalle: 'Próxima cuota el 1 nov 2026', tono: 'ok' });
    expect(estadoGeneralDelArriendo('NONE', alDia)?.detalle).toBe('Sin cuotas vencidas');
  });
  it('sin comprobante del período y CON vencido sigue diciendo el saldo vencido', () => {
    expect(estadoGeneralDelArriendo('NONE', conVencido)?.etiqueta).toBe('Con saldo vencido');
  });
  it('sin comprobante del período y sin las cuotas queda «Pendiente» (no se afirma nada más)', () => {
    expect(estadoGeneralDelArriendo('NONE', null)).toEqual({ etiqueta: 'Pendiente', detalle: 'Pago del período pendiente', tono: 'neutro' });
  });
  it('un pago en validación se muestra como tal y nombra lo vencido', () => {
    const e = estadoGeneralDelArriendo('PENDING_VALIDATION', conVencido);
    expect(e?.etiqueta).toBe('En verificación');
    expect(e?.detalle).toContain('$\u00a06.050.000');
  });
  it('sin información devuelve null', () => {
    expect(estadoGeneralDelArriendo(undefined, null)).toBeNull();
  });
  it('una cuota vencida se cuenta en singular', () => {
    expect(fraseDeLoVencido({ ...conVencido, cuotasVencidas: 1, vencidoCop: 2_000_000 })).toBe('$\u00a02.000.000 vencidos en 1 cuota');
  });
});

describe('diaDePagoLegible', () => {
  it('nunca «Día undefined»', () => {
    expect(diaDePagoLegible(undefined)).toBeNull();
    expect(diaDePagoLegible(null)).toBeNull();
    expect(diaDePagoLegible(0)).toBeNull();
    expect(diaDePagoLegible(5)).toBe('Día 5');
  });
  it('pago rechazado: dice el motivo que dejó la inmobiliaria (y si no lo dejó, que revise el estado de cuenta)', () => {
    expect(estadoGeneralDelArriendo('REJECTED', null, 'El soporte está ilegible')?.detalle).toBe('El soporte está ilegible');
    expect(estadoGeneralDelArriendo('REJECTED', null, null)?.detalle).toBe('Revisa el estado de cuenta');
  });
});
