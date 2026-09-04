/**
 * CuentaDeCobro.test.tsx — que el documento diga lo que el cobro dice.
 *
 * Se fija lo que le importa al inquilino que lo recibe: cada concepto con su
 * signo, el total, los abonos con su recibo y el saldo. Y lo que le importa a
 * quien lo imprime: que el `<style>` de impresión apunte a las piezas REALES
 * del shell del panel (si alguien renombra el `<aside>` del sidebar, esto
 * avisa antes de que el PDF salga con el menú a la izquierda).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CobroConDesglose, ConceptoDelCobro } from '@/lib/api/recibos-de-caja.types';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    // Devuelve la clave: el componente cae a su propio texto en castellano.
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: Date) => d.toISOString().slice(0, 10),
  }),
}));

import { CuentaDeCobro } from './CuentaDeCobro';

const COBRO: CobroConDesglose = {
  id: 'c1',
  leaseId: 'l1',
  consignacionId: 'cons1',
  propertyId: 'p1',
  propietarioId: 'own1',
  tenantId: 't1',
  agenteId: 'ag1',
  propertyTitle: 'Local comercial en El Poblado',
  propertyAddress: 'Carrera 63 # 90-29 Local 2',
  tenantName: 'Esteban López Quintero',
  tenantEmail: 'esteban@correo.co',
  tenantPhone: null,
  month: '2026-09',
  rentAmount: 3_750_000,
  adminAmount: 180_000,
  totalAmount: 3_930_000,
  lateFee: 0,
  totalWithFees: 4_305_750,
  status: 'partial',
  dueDate: '2026-09-04',
  paidAmount: 1_000_000,
  pendingAmount: 3_305_750,
  daysLate: 0,
  remindersSent: 0,
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
  conceptos: [
    linea({ id: 'x1', tipo: 'CANON', nombre: 'Canon', valorCop: 3_750_000, orden: 1 }),
    linea({ id: 'x2', tipo: 'CONCEPTO_DEL_CONTRATO', nombre: 'Administración PH', valorCop: 180_000, orden: 2 }),
    linea({ id: 'x3', tipo: 'IVA', nombre: 'IVA 19 %', valorCop: 712_500, orden: 3 }),
    linea({ id: 'x4', tipo: 'RETEFUENTE', nombre: 'Retefuente 3,5 %', valorCop: 131_250, resta: true, orden: 4 }),
    linea({ id: 'x5', tipo: 'RETEIVA', nombre: 'ReteIVA 15 %', valorCop: 106_875, resta: true, orden: 5 }),
    linea({ id: 'x6', tipo: 'RETEICA', nombre: 'ReteICA', valorCop: 98_625, resta: true, orden: 6 }),
  ],
  recibosDeCaja: [
    {
      id: 'r1',
      numero: 'RC-0007',
      valorCop: 1_000_000,
      fecha: '2026-09-03',
      medio: 'transferencia',
      referencia: 'TRX-889',
      notas: null,
      registradoPorUserId: 'u1',
      anuladoAt: null,
    },
  ],
};

const AGENCIA: AgencyProfile = {
  id: 'a1',
  name: 'portofinoqaprb',
  razonSocial: 'Portofino Inmobiliaria S.A.S.',
  nit: '1004997858',
  address: 'Calle 10 # 20-30',
  city: 'Medellín',
  phone: '604 555 1234',
  email: 'hola@portofino.co',
  logoUrl: null,
};

function linea(
  p: Partial<ConceptoDelCobro> & Pick<ConceptoDelCobro, 'id' | 'tipo' | 'valorCop'>,
): ConceptoDelCobro {
  return { nombre: '', resta: false, reglaId: null, orden: 0, ...p };
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

function render(props: Parameters<typeof CuentaDeCobro>[0]) {
  act(() => root.render(<CuentaDeCobro {...props} />));
}

const HOY = new Date(2026, 8, 2, 20, 30); // 2 de septiembre de 2026, de noche (local)

describe('<CuentaDeCobro>', () => {
  it('pinta emisor, período, partes, cada concepto con su signo, total, abonos y saldo', () => {
    render({ cobro: COBRO, agencia: AGENCIA, hoy: HOY });
    const texto = container.textContent ?? '';

    // Emisor
    expect(texto).toContain('Portofino Inmobiliaria S.A.S.');
    expect(texto).toContain('NIT 1004997858');
    expect(texto).toContain('Calle 10 # 20-30, Medellín');

    // Qué es y de cuándo
    expect(texto).toContain('Cuenta de cobro');
    expect(texto).toContain('Septiembre de 2026');
    expect(texto).toContain('Vence el 4 de septiembre de 2026');
    expect(container.querySelector('[data-testid="estado-de-la-cuenta"]')?.textContent).toBe(
      'Abono parcial',
    );

    // A quién y por qué
    expect(texto).toContain('Esteban López Quintero');
    expect(texto).toContain('esteban@correo.co');
    expect(texto).toContain('Local comercial en El Poblado');
    expect(texto).toContain('Carrera 63 # 90-29 Local 2');

    // Las seis líneas, y las que restan con signo y rótulo
    const filas = Array.from(container.querySelectorAll('[data-testid="linea"]')).map(
      (tr) => tr.textContent ?? '',
    );
    expect(filas).toHaveLength(6);
    expect(filas[0]).toContain('Canon');
    expect(filas[0]).toContain('$3750000');
    expect(filas[2]).toContain('IVA 19 %');
    expect(filas[3]).toContain('Retefuente 3,5 %');
    expect(filas[3]).toContain('(resta)');
    expect(filas[3]).toContain('− $131250');
    // Con retenciones aparecen subtotal y descuentos.
    expect(texto).toContain('Suma de conceptos');
    expect(texto).toContain('$4642500');
    expect(texto).toContain('− $336750');
    expect(container.querySelector('[data-testid="total-de-la-cuenta"]')?.textContent).toBe(
      '$4305750',
    );

    // Abonos con su recibo
    const abonos = Array.from(container.querySelectorAll('[data-testid="abono"]')).map(
      (tr) => tr.textContent ?? '',
    );
    expect(abonos).toHaveLength(1);
    expect(abonos[0]).toContain('RC-0007');
    expect(abonos[0]).toContain('3 de septiembre de 2026');
    expect(abonos[0]).toContain('transferencia');
    expect(abonos[0]).toContain('TRX-889');
    expect(abonos[0]).toContain('$1000000');
    expect(texto).toContain('Total abonado');

    // Saldo
    expect(container.querySelector('[data-testid="saldo-de-la-cuenta"]')?.textContent).toBe(
      '$3305750',
    );

    // Pie: fecha LOCAL (de noche en Colombia sigue siendo el 2) y la advertencia.
    expect(texto).toContain('Generada por Leasefy el 2 de septiembre de 2026');
    expect(texto).toContain('Este documento no es factura electrónica.');
  });

  it('🔴 sin conceptos separa lo del cobro, lo dice, y no inventa IVA ni retenciones', () => {
    render({
      cobro: {
        ...COBRO,
        conceptos: [],
        recibosDeCaja: [],
        status: 'late',
        daysLate: 12,
        lateFee: 50_000,
        totalWithFees: 3_980_000,
        paidAmount: 0,
        pendingAmount: 3_980_000,
      },
      agencia: null,
      hoy: HOY,
    });
    const texto = container.textContent ?? '';

    const filas = Array.from(container.querySelectorAll('[data-testid="linea"]')).map(
      (tr) => tr.textContent ?? '',
    );
    expect(filas).toHaveLength(3);
    // Sin nombre del back cae a la etiqueta del catálogo; acá el mock de i18n
    // no la tiene, y el último respaldo es el tipo tal cual (igual que
    // `DesgloseAdeudado`): nunca una fila sin nombre.
    expect(filas[0]).toContain('CANON');
    expect(filas[0]).toContain('$3750000');
    expect(filas[2]).toContain('INTERES_DE_MORA');
    expect(filas[2]).toContain('mora');
    expect(filas[2]).toContain('$50000');
    expect(texto).not.toContain('IVA');
    expect(texto).toContain('no tiene el desglose por concepto');
    expect(texto).toContain('Sin abonos registrados.');
    expect(container.querySelector('[data-testid="estado-de-la-cuenta"]')?.textContent).toBe(
      'En mora · 12 días',
    );
    expect(container.querySelector('[data-testid="total-de-la-cuenta"]')?.textContent).toBe(
      '$3980000',
    );
    // Sin agencia: el documento sale igual, y lo dice.
    expect(texto).toContain('Inmobiliaria sin datos de contacto cargados');
  });

  it('avisa cuando las líneas no cuadran con el cobro', () => {
    render({
      cobro: {
        ...COBRO,
        conceptos: [linea({ id: 'x1', tipo: 'CANON', nombre: 'Canon', valorCop: 3_750_000, orden: 1 })],
      },
      agencia: AGENCIA,
      hoy: HOY,
    });
    const alerta = container.querySelector('[role="alert"]')?.textContent ?? '';
    expect(alerta).toContain('$3750000');
    expect(alerta).toContain('$4305750');
  });

  it('con saldo en cero lo dice como pagada', () => {
    render({
      cobro: { ...COBRO, status: 'paid', paidAmount: 4_305_750, pendingAmount: 0 },
      agencia: AGENCIA,
      hoy: HOY,
    });
    expect(container.querySelector('[data-testid="estado-de-la-cuenta"]')?.textContent).toBe('Pagada');
    expect(container.textContent).toContain('Sin saldo pendiente');
  });

  it('el <style> de impresión apunta a las piezas reales del shell y fuerza la paleta clara', () => {
    render({ cobro: COBRO, agencia: AGENCIA, hoy: HOY });
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('@media print');
    // Lo que se esconde: sidebar, barra superior, nav móvil, la barra de esta pantalla.
    expect(css).toMatch(/aside,\s*header,\s*nav\[aria-label="Mobile navigation"\],\s*\[data-cuenta-barra\]/);
    // El hueco del sidebar (`lg:pl-[240px]`) se quita por el id real del <main>.
    expect(css).toContain('div:has(> #main-content)');
    // La hoja imprime sin marco y en papel claro aunque el panel esté en oscuro.
    expect(css).toContain('[data-cuenta-hoja]');
    expect(css).toMatch(/\.dark\s*\{[^}]*--fg:\s*#14130f/);
    expect(container.querySelector('[data-cuenta-hoja]')).not.toBeNull();
  });
});
