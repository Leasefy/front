/**
 * QA-INQ-95 (04-10-2026) · «Documentos» del portal: los recibos de caja que la
 * inmobiliaria emitió, cada uno con su PDF (antes: los intentos de pago, también
 * los rechazados, y la promesa «el PDF llegará con Pagos»).
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pdf = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/recibos-del-inquilino.service', () => ({ recibosDelInquilinoApi: { pdf } }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));

import { RecibosDeCaja, conceptoDelRecibo } from './RecibosDeCaja';
import { I18nProvider } from '@/lib/i18n';
import type { ReciboDelInquilino } from '@/lib/api/recibos-del-inquilino.service';

const RECIBOS: ReciboDelInquilino[] = [
  {
    id: 'r34', numero: 34, fecha: '2026-10-04', valorCop: 1_817_112, interesesCop: 0, medio: 'PSE', referencia: '7beb9560',
    mes: '2026-10', contrato: { numero: 3, inmueble: 'Calle 45 # 70-12 Apto 301, Medellín' }, inmobiliaria: 'Inmobiliaria Laboratorio S.A.S.',
  },
  {
    id: 'r3', numero: 3, fecha: '2026-08-20', valorCop: 1_000_000, interesesCop: 0, medio: 'Transferencia', referencia: 'TRF-LAB-1003',
    mes: '2026-08', contrato: { numero: 3, inmueble: 'Calle 45 # 70-12 Apto 301, Medellín' }, inmobiliaria: 'Inmobiliaria Laboratorio S.A.S.',
  },
];

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  pdf.mockReset();
  toastError.mockReset();
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:x';
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function pintar(props: Partial<React.ComponentProps<typeof RecibosDeCaja>> = {}) {
  await act(async () => {
    root.render(
      <I18nProvider>
        <RecibosDeCaja recibos={RECIBOS} error={null} onReintentar={() => {}} {...props} />
      </I18nProvider>,
    );
  });
}

describe('los recibos de caja del inquilino', () => {
  it('cada recibo con su número, concepto, valor, medio, fecha y su PDF; sin la promesa vieja', async () => {
    await pintar();
    const texto = host.textContent ?? '';
    expect(texto).toContain('Recibo de caja N.º 34 · Cuota de octubre de 2026');
    expect(texto).toContain('Recibo de caja N.º 3 · Cuota de agosto de 2026');
    expect(texto).toContain('Transferencia');
    expect(texto).toContain('20 de agosto de 2026');
    expect(texto).toMatch(/1\.000\.000/);
    expect(texto).not.toMatch(/llegará con Pagos|comprobante interno/i);
    expect(host.querySelectorAll('button').length).toBe(2);
  });

  it('«Descargar PDF» baja ese recibo', async () => {
    pdf.mockResolvedValue(new Blob(['%PDF']));
    await pintar();
    const boton = host.querySelector('[aria-label="Descargar el recibo de caja N.º 3"]') as HTMLButtonElement;
    await act(async () => {
      boton.click();
    });
    expect(pdf).toHaveBeenCalledWith('r3');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('un fallo de la lista se dice, no se ve como «no tienes recibos»', async () => {
    await pintar({ recibos: [], error: Object.assign(new Error('500'), { status: 500 }) });
    expect(host.textContent ?? '').not.toContain('Todavía no tienes recibos');
  });

  it('el concepto sin mes', () => {
    expect(conceptoDelRecibo({ mes: null })).toBe('Abono a la deuda del contrato');
  });
});
