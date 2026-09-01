/**
 * DesgloseAdeudado.test.tsx — la aritmética del desglose.
 *
 * Lo que se fija acá es lo que la inmobiliaria dijo que las mata: que el total
 * en pantalla sea el que de verdad se debe.
 *
 * 🔴 El caso que hay que blindar es `resta`. `valorCop` viene SIEMPRE positivo;
 * lo que decide el signo es la bandera. Sumar el `valorCop` de una retención en
 * vez de restarlo infla el total y nadie lo nota: las cifras siguen siendo
 * plausibles. Por eso hay un test que pone una línea que resta y comprueba el
 * total, y otro que comprueba que se avisa cuando los conceptos no cuadran con
 * el total del cobro.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Cobro } from '@/lib/types/inmobiliaria';
import type { ConceptoDelCobro } from '@/lib/api/recibos-de-caja.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    // Formato reconocible: los tests miran el signo y la cifra, no el estilo.
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: Date) => d.toISOString().slice(0, 10),
  }),
}));

import { DesgloseAdeudado } from './DesgloseAdeudado';

const COBRO: Cobro = {
  id: 'c1',
  leaseId: 'l1',
  consignacionId: 'cons1',
  propertyId: 'p1',
  propietarioId: 'own1',
  tenantId: 't1',
  agenteId: 'ag1',
  propertyTitle: 'Apto 101',
  propertyAddress: 'Calle 1 #2-3',
  tenantName: 'Jose Lopez',
  tenantEmail: null,
  tenantPhone: null,
  month: '2026-08',
  rentAmount: 1_800_000,
  adminAmount: 150_000,
  totalAmount: 1_950_000,
  lateFee: 50_000,
  totalWithFees: 2_000_000,
  status: 'pending',
  dueDate: '2026-08-05',
  paidAmount: 0,
  pendingAmount: 2_000_000,
  daysLate: 0,
  remindersSent: 0,
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

function concepto(p: Partial<ConceptoDelCobro> & Pick<ConceptoDelCobro, 'id' | 'tipo' | 'valorCop'>): ConceptoDelCobro {
  return {
    nombre: '',
    resta: false,
    reglaId: null,
    orden: 0,
    ...p,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render(props: Parameters<typeof DesgloseAdeudado>[0]) {
  act(() => root.render(<DesgloseAdeudado {...props} />));
}

describe('<DesgloseAdeudado> con el desglose del back', () => {
  it('pinta cada concepto y suma el total de las líneas', () => {
    render({
      cobro: COBRO,
      conceptos: [
        concepto({ id: 'x1', tipo: 'CANON', nombre: 'Canon', valorCop: 1_800_000, orden: 1 }),
        concepto({ id: 'x2', tipo: 'INTERES_DE_MORA', nombre: 'Intereses de mora', valorCop: 50_000, orden: 2 }),
        concepto({ id: 'x3', tipo: 'GASTO_ADMINISTRATIVO', nombre: 'Honorario de cobranza', valorCop: 150_000, orden: 3 }),
      ],
    });

    const texto = container.textContent ?? '';
    // Las tres líneas que la inmobiliaria pidió ver por separado.
    expect(texto).toContain('Canon');
    expect(texto).toContain('Intereses de mora');
    expect(texto).toContain('Honorario de cobranza');
    expect(texto).toContain('$2000000');
    // Con desglose real NO se muestra el aviso de «no disponible».
    expect(texto).not.toContain('recibos.desglose.sinDetalle');
  });

  it('🔴 RESTA la línea marcada `resta` aunque su valorCop sea positivo', () => {
    render({
      cobro: { ...COBRO, totalWithFees: 1_700_000, pendingAmount: 1_700_000 },
      conceptos: [
        concepto({ id: 'x1', tipo: 'CANON', nombre: 'Canon', valorCop: 1_800_000, orden: 1 }),
        // Positivo en el contrato, pero descuenta.
        concepto({ id: 'x2', tipo: 'RETEFUENTE', nombre: 'Retefuente', valorCop: 100_000, resta: true, orden: 2 }),
      ],
    });

    const texto = container.textContent ?? '';
    // 1.800.000 − 100.000. Si se sumara daría 1.900.000.
    expect(texto).toContain('$1700000');
    expect(texto).not.toContain('$1900000');
    // La línea se muestra con signo negativo y rotulada como que resta.
    expect(texto).toContain('− $100000');
    expect(texto).toContain('recibos.desglose.resta');
    // Con descuentos aparecen el subtotal y el renglón de lo que resta.
    expect(texto).toContain('recibos.desglose.subtotal');
    expect(texto).toContain('recibos.desglose.descuentos');
  });

  it('respeta el `orden` que manda el back', () => {
    render({
      cobro: COBRO,
      conceptos: [
        concepto({ id: 'x2', tipo: 'ADMINISTRACION', nombre: 'Administracion', valorCop: 150_000, orden: 9 }),
        concepto({ id: 'x1', tipo: 'CANON', nombre: 'ElCanon', valorCop: 1_800_000, orden: 1 }),
      ],
    });

    const texto = container.textContent ?? '';
    expect(texto.indexOf('ElCanon')).toBeLessThan(texto.indexOf('Administracion'));
  });

  it('avisa cuando los conceptos no cuadran con el total del cobro', () => {
    render({
      cobro: COBRO, // totalWithFees 2.000.000
      conceptos: [concepto({ id: 'x1', tipo: 'CANON', nombre: 'Canon', valorCop: 1_500_000, orden: 1 })],
    });

    // Callar esto es exactamente el error que se quiere evitar: alguien recibe
    // plata contra un cobro cuyo desglose no suma lo que el cobro dice.
    expect(container.textContent).toContain('recibos.desglose.descuadre');
  });

  it('no grita descuadre por un peso de redondeo', () => {
    render({
      cobro: { ...COBRO, totalWithFees: 2_000_000 },
      conceptos: [concepto({ id: 'x1', tipo: 'CANON', nombre: 'Canon', valorCop: 1_999_999, orden: 1 })],
    });

    expect(container.textContent).not.toContain('recibos.desglose.descuadre');
  });
});

describe('<DesgloseAdeudado> sin el motor de conceptos', () => {
  it('dice que el detalle no está disponible y NO inventa líneas', () => {
    render({ cobro: COBRO, conceptos: [] });

    const texto = container.textContent ?? '';
    expect(texto).toContain('recibos.desglose.sinDetalle');
    // Lo único que el cobro ya permite separar: canon, administración y mora.
    expect(texto).toContain('$1800000');
    expect(texto).toContain('$150000');
    expect(texto).toContain('$50000');
    // El total sigue siendo el del cobro, no una cuenta nuestra.
    expect(texto).toContain('$2000000');
    // Nada de líneas fabricadas.
    expect(texto).not.toContain('recibos.desglose.tipos.RETEFUENTE');
    expect(texto).not.toContain('recibos.desglose.tipos.IVA');
  });

  it('no pinta administración ni mora cuando están en cero', () => {
    render({
      cobro: { ...COBRO, adminAmount: 0, lateFee: 0, totalWithFees: 1_800_000 },
      conceptos: [],
    });

    const texto = container.textContent ?? '';
    expect(texto).not.toContain('recibos.desglose.tipos.ADMINISTRACION');
    expect(texto).not.toContain('recibos.desglose.tipos.INTERES_DE_MORA');
  });

  it('nunca queda en blanco: sin conceptos igual muestra el total', () => {
    render({ cobro: COBRO, conceptos: undefined, cargando: true });

    expect(container.textContent).toContain('recibos.desglose.cargando');
    expect(container.textContent).toContain('$2000000');
  });
});

describe('<DesgloseAdeudado> estado de pago', () => {
  it('muestra lo abonado y el saldo', () => {
    render({
      cobro: { ...COBRO, paidAmount: 500_000, pendingAmount: 1_500_000, status: 'partial' },
      conceptos: [],
    });

    const texto = container.textContent ?? '';
    expect(texto).toContain('recibos.desglose.yaAbonado');
    expect(texto).toContain('$500000');
    expect(texto).toContain('recibos.desglose.saldo');
    expect(texto).toContain('$1500000');
  });

  it('oculta el estado de pago cuando el formulario ya lo muestra', () => {
    render({ cobro: COBRO, conceptos: [], sinEstadoDePago: true });

    expect(container.textContent).not.toContain('recibos.desglose.saldo');
  });
});
