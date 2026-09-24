/**
 * ExtractoPropietario — lo que se ve sale del extracto, y los botones hacen
 * lo que dicen.
 *
 * Reventaba con «reading 'bank'» al leer `bankAccount` de la lista de
 * propietarios (que llega con el banco plano); «Enviar por Email» esperaba un
 * segundo de mentira y decía «enviado» sin mandar nada; «Descargar PDF» decía
 * «descargado» antes de que bajara.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ExtractoPropietario as Extracto } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _i, animate: _a, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) =>
      React.createElement('div', props, children),
    // Cada fila de la tabla es un `motion.tr`: sin él, un extracto con líneas no se deja montar.
    tr: ({ children, initial: _i, animate: _a, transition: _t, ...props }: React.ComponentProps<'tr'> & Record<string, unknown>) =>
      React.createElement('tr', props, children),
  },
}));
// La lista de propietarios llega SIN `bankAccount` (banco plano, como el back
// la manda cuando algo se salta la normalización): el extracto no debe depender de eso.
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({
    propietarios: [{ id: 'p1', name: 'Rentas', email: 'pagos@rentas.co', phone: '601', documentType: 'NIT', documentNumber: '9' }],
  }),
  useInmobiliariaConfig: () => ({ config: { agency: { name: 'portofinoqaprb', nit: '1', address: null, city: null } } }),
}));

import { ExtractoPropietario } from './ExtractoPropietario';

const extracto: Extracto = {
  propietarioId: 'p1',
  propietarioName: 'Rentas',
  month: '2026-09',
  generatedAt: '2026-09-02T18:00:00.000Z',
  lineItems: [],
  sinMovimiento: null,
  totals: {
    totalRent: 0, totalAdmin: 0, totalPaid: 0, totalCommission: 0, totalNet: 0,
    totalConceptosAFavor: 0, totalConceptosACargo: 0, totalDeTerceros: 0,
    totalGirado: 0, totalEnGiro: 0, totalPorGirar: 0,
  },
  bankInfo: { bankName: 'Banco Caja Social', bankAccountType: 'Corriente', bankAccountNumber: '36500386693', bankAccountHolder: 'Rentas' },
};

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
  vi.clearAllMocks();
});

async function render(props: Partial<React.ComponentProps<typeof ExtractoPropietario>> = {}) {
  await act(async () => {
    root.render(React.createElement(ExtractoPropietario, { extracto, ...props }));
  });
}

async function clickTestId(id: string) {
  const el = container.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);
  if (!el) throw new Error(`no está ${id}`);
  await act(async () => {
    el.click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** Una línea del extracto con los campos que pinta la tabla. */
const linea = (over: Partial<Extracto['lineItems'][number]> = {}): Extracto['lineItems'][number] => ({
  cuotaId: 'q-1', cobroId: null, contractId: 'ct-1', consignacionId: 'c-1',
  propertyTitle: 'Apartamento en La Floresta', propertyAddress: 'Cra 42',
  tenantName: 'Mónica', rentAmount: 720_000, adminAmount: 0, totalAmount: 720_000, paidAmount: 720_000,
  status: 'PAID', commissionPercent: 0, commissionAmount: 0, netAmount: 720_000, rentCollected: 720_000,
  conceptosAFavor: 0, conceptosACargo: 0, deTerceros: 0,
  dispersionId: null, giradoCop: 0, enGiroCop: 0, porGirarCop: 720_000,
  estadoDelGiro: 'POR_GIRAR', renglones: [], ...over,
});

describe('<ExtractoPropietario>', () => {
  it('con varios dueños la fila dice cuánto del inmueble es suyo, como el PDF; con uno solo no', async () => {
    await render({
      extracto: {
        ...extracto,
        lineItems: [
          linea({ participacionBps: 4000, participacionLabel: '40 %' }),
          linea({ cobroId: 'cob-2', consignacionId: 'c-2', propertyTitle: 'Local', participacionBps: 10000, participacionLabel: null }),
        ],
      },
    });
    const chips = container.querySelectorAll('[data-testid="participacion-en-el-extracto"]');
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain('40 %');
    expect(chips[0].closest('tr')?.textContent).toContain('La Floresta');
  });

  it('la cuenta bancaria sale del extracto, aunque la lista de propietarios venga sin bankAccount', async () => {
    await render();
    const banco = container.querySelector('[data-testid="extracto-banco"]')!.textContent;
    expect(banco).toContain('Banco Caja Social');
    expect(banco).toContain('36500386693');
  });

  it('sin cuenta registrada lo dice, no deja el bloque en blanco', async () => {
    await render({ extracto: { ...extracto, bankInfo: { bankName: null, bankAccountType: null, bankAccountNumber: null, bankAccountHolder: null } } });
    expect(container.querySelector('[data-testid="extracto-banco"]')!.textContent).toBe('inmobiliaria.propietario.extracto.sinCuenta');
  });

  it('el mes va con la inicial en mayúscula, no «Septiembre De 2026»', async () => {
    await render();
    expect(container.textContent).toContain('Septiembre de 2026');
    expect(container.textContent).not.toContain('Septiembre De 2026');
  });

  it('sin handlers no hay botones de PDF ni de correo: un botón que no hace nada no se muestra', async () => {
    await render();
    expect(container.querySelector('[data-testid="extracto-descargar"]')).toBeNull();
    expect(container.querySelector('[data-testid="extracto-enviar"]')).toBeNull();
  });

  it('«Descargar PDF» espera al handler y sólo entonces dice «descargado»', async () => {
    const onDownloadPDF = vi.fn(async () => undefined);
    await render({ onDownloadPDF });
    await clickTestId('extracto-descargar');
    expect(onDownloadPDF).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('inmobiliaria.propietario.extracto.pdfDownloaded', expect.anything());
  });

  it('si el PDF falla no dice «descargado»: dice qué pasó', async () => {
    await render({ onDownloadPDF: vi.fn(async () => { throw new Error('503'); }) });
    await clickTestId('extracto-descargar');
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietario.extracto.pdfError', { description: '503' });
  });

  it('«Enviar por Email» manda de verdad y sólo dice «enviado» si el envío resolvió', async () => {
    const onEmail = vi.fn(async () => { throw new Error('El propietario no tiene correo registrado'); });
    await render({ onEmail });
    await clickTestId('extracto-enviar');
    expect(onEmail).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietario.extracto.emailError', {
      description: 'El propietario no tiene correo registrado',
    });
  });
});

/**
 * Un extracto sin líneas tiene que decir POR QUÉ.
 *
 * «Este dueño no tiene inmuebles» y «este mes no se movió nada» se leen igual
 * —en blanco— y se arreglan distinto: la primera es un mandato que falta, la
 * segunda es un mes sin actividad. El back manda cuál es; la pantalla la pinta.
 */
describe('extracto sin movimiento', () => {
  it('dice el motivo que mandó el back en vez de quedarse en blanco', async () => {
    await render({
      extracto: {
        ...extracto,
        lineItems: [],
        sinMovimiento: {
          codigo: 'SIN_MOVIMIENTO_DEL_MES',
          mensaje: 'Este mes no tuvo movimiento en ninguno de sus inmuebles.',
        },
      },
    });
    expect(container.textContent).toContain(
      'Este mes no tuvo movimiento en ninguno de sus inmuebles.',
    );
  });
});

describe('extracto con deducciones', () => {
  const conDeducciones = {
    netoDelMesCop: 720_000,
    deducciones: [
      {
        id: 'ded-1', propietarioId: 'p1', origen: 'SALDO_ANTERIOR' as const, motivo: 'Saldo en contra de agosto',
        valorCop: 300_000, mesDesde: '2026-09', fecha: '2026-09-01', grupoId: 'g-1', valorTotalCop: 300_000,
        participacionBps: 10_000, consignacionId: null, solicitudMantenimientoId: null,
        tieneSoporte: false, soporteNombre: null, estado: 'EN_LIQUIDACION' as const,
      },
      {
        id: 'ded-2', propietarioId: 'p1', origen: 'MANUAL' as const, motivo: 'Predial 2026',
        valorCop: 600_000, mesDesde: '2026-09', fecha: '2026-09-02', grupoId: 'g-2', valorTotalCop: 600_000,
        participacionBps: 10_000, consignacionId: null, solicitudMantenimientoId: null,
        tieneSoporte: true, soporteNombre: 'predial.pdf', estado: 'EN_LIQUIDACION' as const,
      },
    ],
    deduccionesCop: 900_000,
    saldoAnteriorCop: 300_000,
    netoCop: -180_000,
    aGirarCop: 0,
    saldoEnContraCop: 180_000,
    compensadoCop: 720_000,
    renglones: [
      { concepto: 'Saldo en contra del mes anterior', valorCop: -300_000, motivo: 'Saldo en contra de agosto' },
      { concepto: 'Descuento: Predial 2026', valorCop: -600_000, motivo: 'Predial 2026' },
    ],
  };

  it('🔴 lo que recibe es el neto a girar del back, y el bloque dice el saldo en contra del mes anterior y el que pasa', async () => {
    await render({
      extracto: {
        ...extracto,
        lineItems: [linea()],
        totals: { ...extracto.totals, totalNet: 720_000 },
        conDeducciones,
      },
    });

    expect(container.querySelector('[data-testid="extracto-neto-a-recibir"]')?.textContent).toBe('$0');
    const bloque = container.querySelector('[data-testid="bloque-de-deducciones"]');
    expect(bloque?.textContent).toContain('Saldo en contra del mes anterior');
    expect(bloque?.textContent).toContain('Descuento: Predial 2026');
    expect(container.querySelector('[data-testid="bloque-saldo-en-contra"]')).not.toBeNull();
    // El soporte se puede abrir desde el extracto.
    expect(container.querySelector('[data-testid="soporte-ded-2"]')).not.toBeNull();
  });

  it('sin deducciones el extracto se lee como siempre', async () => {
    await render({ extracto: { ...extracto, totals: { ...extracto.totals, totalNet: 720_000 } } });
    expect(container.querySelector('[data-testid="extracto-neto-a-recibir"]')?.textContent).toBe('$720.000');
    expect(container.querySelector('[data-testid="bloque-de-deducciones"]')).toBeNull();
  });
});
