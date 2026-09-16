/**
 * El resumen de arriba: lo que el CEO mira primero.
 *
 * Lo que se protege: que la «próxima cuota» no sea una vencida disfrazada, que
 * la mora se cuente desde la cuota más VIEJA, y que la barra de amortización no
 * se apropie de un recaudo que registró el sistema anterior.
 */

import { describe, expect, it } from 'vitest';

import { amortizacionDe, diasEntre, proximaCuotaDe, resumirElCliente } from './resumen';
import { contrato, estadoDeCuenta, fila } from './ejemplo-de-prueba';

const HOY = '2026-09-13';

describe('diasEntre', () => {
  it('cuenta días de calendario, sin zona horaria', () => {
    expect(diasEntre('2026-09-01', '2026-09-13')).toBe(12);
    expect(diasEntre('2026-09-13', '2026-09-13')).toBe(0);
  });

  it('cruza un cambio de horario de verano sin perder ni ganar un día', () => {
    expect(diasEntre('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('una fecha basura no revienta la tarjeta', () => {
    expect(diasEntre('nada', '2026-09-13')).toBe(0);
  });
});

describe('resumirElCliente', () => {
  it('el número grande es el que manda el back, no una suma del front', () => {
    const doc = estadoDeCuenta();
    expect(resumirElCliente(doc, HOY).restaPorPagar).toBe(doc.totales.restaPorPagar);
  });

  it('«próxima cuota» es la primera que TODAVÍA NO vence', () => {
    const r = resumirElCliente(estadoDeCuenta({ contratos: [contrato()] }), HOY);
    expect(r.proxima?.fecha).toBe('2026-09-21');
    expect(r.proxima?.valor).toBe(1_108_000);
  });

  it('si todo lo pendiente ya venció NO hay próxima: inventarla tranquiliza al que está atrasado', () => {
    const c = contrato({
      secciones: {
        arriendos: [fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-01-01' })],
        otrosConceptos: [],
      },
    });
    const r = resumirElCliente(estadoDeCuenta({ contratos: [c] }), HOY);
    expect(r.proxima).toBeNull();
    expect(r.enMora).toBe(true);
  });

  it('la mora se cuenta desde la cuota vencida MÁS VIEJA', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-08-13' }),
          fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-06-13' }),
        ],
        otrosConceptos: [],
      },
    });
    const r = resumirElCliente(estadoDeCuenta({ contratos: [c] }), HOY);
    expect(r.masVieja?.fecha).toBe('2026-06-13');
    expect(r.diasDeMora).toBe(92);
    expect(r.cuotasVencidas).toBe(2);
    // Lo vencido se suma de las filas vencidas, no de `totales.pendiente`:
    // bajo un filtro ese total pasa a ser todo lo que se debe, vencido o no.
    expect(r.vencidoCop).toBe(fila().valorNeto * 2);
  });

  it('una cuota que vence mañana no cuenta como vencida ni suma a lo vencido', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-09-14', valorNeto: 500 }),
          fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-09-01', valorNeto: 300 }),
        ],
        otrosConceptos: [],
      },
    });
    const r = resumirElCliente(estadoDeCuenta({ contratos: [c] }), HOY);
    expect(r.cuotasVencidas).toBe(1);
    expect(r.vencidoCop).toBe(300);
  });

  it('sin nada vencido, está al día', () => {
    const c = contrato({
      secciones: {
        arriendos: [fila({ estado: 'CANCELADA', fechaVencimiento: '2020-01-01' })],
        otrosConceptos: [],
      },
    });
    const r = resumirElCliente(estadoDeCuenta({ contratos: [c] }), HOY);
    expect(r.enMora).toBe(false);
    expect(r.diasDeMora).toBe(0);
  });

  /*
   * 🔴 Bug C de la prueba en navegador (16-09): el contrato #77 decía 100 días
   * de mora en la ficha y en el cajón, y 105 acá. El back manda en cada fila el
   * cajón y los días con el plazo del contrato; el resumen los LEE y no vuelve
   * a restar fechas. Si alguien vuelve a contar desde el vencimiento, esto da
   * 105 y se pone rojo.
   */
  it('🔴 los días de mora son los del back, con el plazo: 100, no los 105 desde el vencimiento', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          fila({
            estado: 'PENDIENTE',
            fechaVencimiento: '2026-06-01',
            cajon: 'CARTERA',
            diasDeMora: 100,
          }),
        ],
        otrosConceptos: [],
      },
    });
    const r = resumirElCliente(estadoDeCuenta({ contratos: [c] }), '2026-09-14');
    expect(diasEntre('2026-06-01', '2026-09-14')).toBe(105);
    expect(r).toMatchObject({ enMora: true, diasDeMora: 100, enPlazo: false, cuotasVencidas: 1 });
  });

  it('🔴 lo vencido DENTRO del plazo no es mora: se dice «Vencido, en plazo»', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          fila({
            estado: 'PENDIENTE',
            fechaVencimiento: '2026-09-10',
            cajon: 'VENCIDA_EN_PLAZO',
            diasDeMora: 0,
            valorNeto: 700,
          }),
          fila({
            estado: 'PENDIENTE',
            fechaVencimiento: '2026-10-05',
            cajon: 'POR_VENCER',
            diasDeMora: 0,
          }),
        ],
        otrosConceptos: [],
      },
    });
    const r = resumirElCliente(estadoDeCuenta({ contratos: [c] }), HOY);
    expect(r).toMatchObject({
      enMora: false,
      diasDeMora: 0,
      enPlazo: true,
      cuotasEnPlazo: 1,
      cuotasVencidas: 1,
      vencidoCop: 700,
    });
    expect(r.proxima?.fecha).toBe('2026-10-05');
  });

  it('una cuota ANTERIOR no pone a nadie en mora: la gestionó el sistema viejo', () => {
    const c = contrato({
      secciones: {
        arriendos: [fila({ estado: 'ANTERIOR', fechaVencimiento: '2022-01-21' })],
        otrosConceptos: [],
      },
    });
    expect(resumirElCliente(estadoDeCuenta({ contratos: [c] }), HOY).enMora).toBe(false);
  });
});

describe('amortizacionDe', () => {
  it('«14 de 24 cuotas»: cuenta las canceladas sobre todas las que existen', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          fila({ estado: 'CANCELADA', valorNeto: 100 }),
          fila({ estado: 'CANCELADA', valorNeto: 100 }),
          fila({ estado: 'PENDIENTE', valorNeto: 100 }),
          fila({ estado: 'PENDIENTE', valorNeto: 100 }),
        ],
        otrosConceptos: [],
      },
    });
    const a = amortizacionDe(c);
    expect(a).toMatchObject({ pagadas: 2, total: 4, pagadoCop: 200, pactadoCop: 400, porcentaje: 50 });
  });

  it('lo del sistema anterior va en SU tramo: ni verde ni fuera del total', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          fila({ estado: 'CANCELADA', valorNeto: 100 }),
          fila({ estado: 'ANTERIOR', valorNeto: 100 }),
        ],
        otrosConceptos: [],
      },
    });
    const a = amortizacionDe(c);
    expect(a.pagadas).toBe(1);
    expect(a.anteriores).toBe(1);
    expect(a.total).toBe(2);
    expect(a.porcentaje).toBe(50);
    expect(a.porcentajeAnterior).toBe(50);
  });

  it('una cuota ANULADA sale del total: dejó de existir', () => {
    const c = contrato({
      secciones: {
        arriendos: [
          fila({ estado: 'CANCELADA', valorNeto: 100 }),
          fila({ estado: 'ANULADA', valorNeto: 100 }),
        ],
        otrosConceptos: [],
      },
    });
    expect(amortizacionDe(c).total).toBe(1);
    expect(amortizacionDe(c).porcentaje).toBe(100);
  });

  it('un contrato sin cuotas no divide por cero', () => {
    const c = contrato({ secciones: { arriendos: [], otrosConceptos: [] } });
    expect(amortizacionDe(c)).toMatchObject({ total: 0, porcentaje: 0 });
  });
});

describe('proximaCuotaDe', () => {
  it('es la del contrato, no la del cliente entero', () => {
    const p = proximaCuotaDe(contrato(), HOY);
    expect(p?.contrato).toBe('1298');
    expect(p?.fecha).toBe('2026-09-21');
  });
});
