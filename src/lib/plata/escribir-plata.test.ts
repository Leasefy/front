/**
 * Cómo se escribe la plata: P8 a de «centavos en todo» (C3-FRONT).
 *
 *   · En PANTALLA, los centavos SÓLO si el valor los tiene. Un entero sale
 *     EXACTAMENTE como siempre (lo que hoy ve la gente no cambia ni un espacio).
 *   · En un DOCUMENTO (el PDF del estado de cuenta, el cierre de la
 *     conciliación, la liquidación del recaudo), con la llave de su área,
 *     SIEMPRE dos decimales; sin la llave, como siempre.
 *   · Ya no se redondea al mostrar: «que no se redondee, se trae tal cual».
 *   · 🔴 Con TODAS las llaves apagadas (lo de hoy), cada pantalla y cada
 *     documento se ven EXACTAMENTE como siempre, aun con una cifra con fracción.
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { formatCurrency, formatCurrencyEnDocumento } from '@/lib/format';
import { formatCurrency as formatCurrencyDeInmobiliaria } from '@/lib/types/inmobiliaria';
import { pesos as pesosDelCierre, pesosEnDocumento as pesosDelCierreEnDocumento } from '@/components/cobros/extracto-bancario/cierre-del-mes';
import { pesos as pesosDeLaLiquidacion, pesosEnPdf } from '@/lib/admin/documento-de-la-liquidacion';
import { pesos as pesosDelNeto } from '@/lib/dinero/neto-del-propietario';
import { formatearPesos } from '@/components/messages/pendientes-a-mensaje';
import { EstadoDeCuentaPDF } from '@/components/estado-de-cuenta/estado-de-cuenta-pdf';
import { contrato, estadoDeCuenta, fila } from '@/components/estado-de-cuenta/ejemplo-de-prueba';
import { fijarConfigDePlataParaPruebas } from './con-centavos';
import {
  decimalesEnDocumento,
  decimalesEnPantalla,
  plataEnDocumento,
  plataEnPantalla,
  tieneCentavos,
} from './escribir-plata';

/** Quita el espacio duro que pone `Intl` después del «$». */
const plano = (s: string) => s.replace(/ /g, ' ');

/** Alguna llave prendida: la plataforma ya escribe centavos. */
const ALGUNA_PRENDIDA = { conCentavos: { contratos_y_cuotas: true, cobros_recibos_y_cartera: true } };

beforeEach(() => fijarConfigDePlataParaPruebas(ALGUNA_PRENDIDA));
afterEach(() => fijarConfigDePlataParaPruebas(null));

describe('con TODAS las llaves apagadas, exactamente como hoy', () => {
  beforeEach(() => fijarConfigDePlataParaPruebas(null));

  it('una cifra con fracción se redondea al peso como siempre, en todos los formatos', () => {
    expect(formatCurrency(1_234.56)).toBe('$ 1.235');
    expect(formatCurrencyDeInmobiliaria(1_234_567.29)).toBe('$1.234.567');
    expect(pesosDelCierre(1_234_567.29)).toBe('$1.234.567');
    expect(pesosDeLaLiquidacion(2_350_000.29)).toBe('$2.350.000');
    expect(pesosDelNeto(1_234_567.4)).toBe('$1.234.567');
    expect(formatearPesos(1_234_567.29)).toBe('$1.234.567');
    const opciones: Intl.NumberFormatOptions = { style: 'currency', currency: 'COP', maximumFractionDigits: 0 };
    expect(plataEnPantalla('es-CO', opciones).format(3_625_317.5)).toBe(
      new Intl.NumberFormat('es-CO', opciones).format(3_625_317.5),
    );
    expect(decimalesEnPantalla(2_500_000.5)).toEqual({ minimumFractionDigits: 0, maximumFractionDigits: 0 });
  });

  it('un documento sin su llave tampoco cambia', () => {
    expect(formatCurrencyEnDocumento(2_500_000, false)).toBe('$ 2.500.000');
    expect(pesosEnPdf(2_350_000.29)).toBe('$2.350.000');
  });
});

describe('tieneCentavos', () => {
  it('al centavo: 1234.004 no tiene, 0,1 + 0,2 sí (0,30)', () => {
    expect(tieneCentavos(2_500_000)).toBe(false);
    expect(tieneCentavos(1_234_567.29)).toBe(true);
    expect(tieneCentavos(1_234.004)).toBe(false);
    expect(tieneCentavos(0.1 + 0.2)).toBe(true);
    expect(tieneCentavos(Number.NaN)).toBe(false);
    expect(tieneCentavos('1500.5')).toBe(false);
  });

  it('las opciones de `Intl`: con un entero, las de siempre (0 decimales)', () => {
    expect(decimalesEnPantalla(2_500_000)).toEqual({ minimumFractionDigits: 0, maximumFractionDigits: 0 });
    expect(decimalesEnPantalla(2_500_000.5)).toEqual({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(decimalesEnDocumento(2_500_000, true)).toEqual({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(decimalesEnDocumento(2_500_000, false)).toEqual({ minimumFractionDigits: 0, maximumFractionDigits: 0 });
  });
});

describe('P8 a en pantalla — formatCurrency (las dos copias)', () => {
  it('un entero sale EXACTAMENTE como siempre', () => {
    expect(formatCurrency(2_500_000)).toBe('$ 2.500.000');
    expect(formatCurrency(0)).toBe('$ 0');
    expect(formatCurrency(-45_000)).toBe('$ -45.000');
    expect(formatCurrency(null)).toBe('$ 0');
    expect(formatCurrencyDeInmobiliaria(2_500_000)).toBe('$2.500.000');
    expect(formatCurrencyDeInmobiliaria(-2_500)).toBe('$-2.500');
  });

  it('con centavos, los dos decimales — ya no se redondea al peso', () => {
    expect(formatCurrency(1_234_567.29)).toBe('$ 1.234.567,29');
    expect(formatCurrency(1_500_000.5)).toBe('$ 1.500.000,50');
    expect(formatCurrency(0.1 + 0.2)).toBe('$ 0,30');
    expect(formatCurrency(1_234_567.29, 'en')).toBe('$ 1,234,567.29');
    expect(formatCurrencyDeInmobiliaria(1_234_567.29)).toBe('$1.234.567,29');
  });

  it('los formatos a mano de las pantallas: sin redondear', () => {
    expect(pesosDelCierre(1_234_567)).toBe('$1.234.567');
    expect(pesosDelCierre(-1_234_567.29)).toBe('−$1.234.567,29');
    expect(pesosDeLaLiquidacion(2_350_000.29)).toBe('$2.350.000,29');
    expect(pesosDeLaLiquidacion(2_350_000)).toBe('$2.350.000');
    expect(pesosDelNeto(980_000.5)).toBe('$980.000,50');
    expect(formatearPesos(1_234_567)).toBe('$1.234.567');
    expect(formatearPesos(1_234_567.29)).toBe('$1.234.567,29');
    expect(formatearPesos(-1_500.5)).toBe('-$1.500,50');
  });

  it('plataEnPantalla: con un entero, el MISMO texto que el `Intl` de siempre', () => {
    const opciones: Intl.NumberFormatOptions = { style: 'currency', currency: 'COP', maximumFractionDigits: 0 };
    const deSiempre = new Intl.NumberFormat('es-CO', opciones);
    const nuevo = plataEnPantalla('es-CO', opciones);
    for (const v of [0, 1, 999, 2_500_000, -45_000, 1_999_999_999]) {
      expect(nuevo.format(v)).toBe(deSiempre.format(v));
    }
    expect(plano(nuevo.format(1_234_567.29))).toBe('$ 1.234.567,29');
  });
});

describe('P8 a en documentos — siempre dos decimales con la llave', () => {
  it('formatCurrencyEnDocumento', () => {
    expect(formatCurrencyEnDocumento(2_500_000, true)).toBe('$ 2.500.000,00');
    expect(formatCurrencyEnDocumento(1_234_567.29, true)).toBe('$ 1.234.567,29');
    // Sin la llave, el documento sale como hoy.
    expect(formatCurrencyEnDocumento(2_500_000, false)).toBe('$ 2.500.000');
  });

  it('plataEnDocumento', () => {
    const opciones: Intl.NumberFormatOptions = { style: 'currency', currency: 'COP', maximumFractionDigits: 0 };
    expect(plano(plataEnDocumento('es-CO', opciones, true).format(2_500_000))).toBe('$ 2.500.000,00');
    expect(plataEnDocumento('es-CO', opciones, false).format(2_500_000)).toBe(
      new Intl.NumberFormat('es-CO', opciones).format(2_500_000),
    );
  });

  it('el cierre de la conciliación y la liquidación del recaudo', () => {
    expect(pesosDelCierreEnDocumento(1_234_567, true)).toBe('$1.234.567,00');
    expect(pesosDelCierreEnDocumento(1_234_567, false)).toBe('$1.234.567');
    expect(pesosEnPdf(2_350_000, true)).toBe('$2.350.000,00');
    expect(pesosEnPdf(-2_350_000.29, true)).toBe('-$2.350.000,29');
    expect(pesosEnPdf(2_350_000)).toBe('$2.350.000');
  });
});

// ── El PDF del estado de cuenta ──────────────────────────────────────────────

function textosDe(nodo: ReactNode): string[] {
  const salida: string[] = [];
  const recoger = (actual: ReactNode): void => {
    if (actual === null || actual === undefined || typeof actual === 'boolean') return;
    if (typeof actual === 'string' || typeof actual === 'number') {
      salida.push(String(actual));
      return;
    }
    if (Array.isArray(actual)) {
      actual.forEach((hijo) => recoger(hijo as ReactNode));
      return;
    }
    if (!isValidElement(actual)) return;
    const el = actual as ReactElement<{ children?: ReactNode }>;
    if (typeof el.type === 'function') {
      recoger((el.type as (props: unknown) => ReactNode)(el.props));
      return;
    }
    recoger(el.props?.children);
  };
  recoger(nodo);
  return salida;
}

describe('el estado de cuenta en PDF', () => {
  const conCentavos = { cancelado: 0, pendiente: 2_350_000.29, restaPorPagar: 2_350_000.29 };
  const doc = estadoDeCuenta({
    contratos: [
      contrato({
        secciones: {
          arriendos: [fila({ estado: 'PENDIENTE', valorBruto: 2_350_000.29, valorNeto: 2_350_000.29 })],
          otrosConceptos: [],
        },
        totales: conCentavos,
      }),
    ],
    totales: conCentavos,
  });

  it('con las llaves de la deuda, toda cifra con dos decimales', () => {
    const texto = textosDe(EstadoDeCuentaPDF({ doc, hoy: '2026-09-13', conCentavos: true })).join('\n');
    expect(texto).toContain('$ 2.350.000,29');
    const cifras = texto.match(/\$ [\d.]+(,\d{2})?/g) ?? [];
    expect(cifras.length).toBeGreaterThan(0);
    for (const c of cifras) expect(c).toMatch(/,\d{2}$/);
  });

  it('sin la llave de la deuda, los enteros como siempre (y un valor con centavos, tal cual)', () => {
    const entero = estadoDeCuenta();
    const texto = textosDe(EstadoDeCuentaPDF({ doc: entero, hoy: '2026-09-13' })).join('\n');
    expect(texto).not.toMatch(/\$ [\d.]+,00/);
    const conCentavos = textosDe(EstadoDeCuentaPDF({ doc, hoy: '2026-09-13' })).join('\n');
    expect(conCentavos).toContain('$ 2.350.000,29');
  });

  it('con todas las llaves apagadas, el PDF es el de hoy', () => {
    fijarConfigDePlataParaPruebas(null);
    const texto = textosDe(EstadoDeCuentaPDF({ doc, hoy: '2026-09-13' })).join('\n');
    expect(texto).toContain('$ 2.350.000');
    expect(texto).not.toMatch(/,\d{2}\b/);
  });
});
