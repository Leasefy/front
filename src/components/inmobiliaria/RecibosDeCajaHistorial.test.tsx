/**
 * RecibosDeCajaHistorial.test.tsx — el anulado NO se esconde.
 *
 * 🔴 La tentación al escribir esta lista es filtrar los anulados: se ve más
 * limpia. Pero un recibo anulado es plata que VOLVIÓ al saldo, y si desaparece
 * de la pantalla el saldo sube sin que nada lo explique. Estos tests fijan que
 * siga visible, tachado y marcado, y que no se pueda anular dos veces.
 *
 * También se fija que el «recibido con recibo» sume SÓLO los vivos: contar el
 * anulado ahí es cobrar dos veces la misma plata en el resumen.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ReciboDeCaja } from '@/lib/api/recibos-de-caja.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: Date) => d.toISOString().slice(0, 10),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { RecibosDeCajaHistorial } from './RecibosDeCajaHistorial';

const VIVO: ReciboDeCaja = {
  id: 'rc-1',
  numero: 'RC-0001',
  valorCop: 500_000,
  fecha: '2026-08-10',
  medio: 'transferencia',
  referencia: 'TRF-9',
  notas: null,
  registradoPorUserId: 'u-1',
  anuladoAt: null,
};

const ANULADO: ReciboDeCaja = {
  ...VIVO,
  id: 'rc-0',
  numero: 'RC-0000',
  valorCop: 300_000,
  fecha: '2026-08-05',
  anuladoAt: '2026-08-06T12:00:00.000Z',
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
  vi.restoreAllMocks();
});

function render(props: Parameters<typeof RecibosDeCajaHistorial>[0]) {
  act(() => root.render(<RecibosDeCajaHistorial {...props} />));
}

function botonesConTexto(texto: string): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button')).filter((b) =>
    (b.textContent ?? '').includes(texto),
  );
}

describe('<RecibosDeCajaHistorial>', () => {
  it('cada abono es un documento con su número, medio y monto', () => {
    render({ recibos: [VIVO], onAnular: vi.fn() });

    const texto = container.textContent ?? '';
    expect(texto).toContain('recibos.historial.numero');
    expect(texto).toContain('transferencia');
    expect(texto).toContain('TRF-9');
    expect(texto).toContain('$500000');
  });

  it('🔴 el anulado sigue en la lista, marcado y tachado', () => {
    render({ recibos: [VIVO, ANULADO], onAnular: vi.fn() });

    const filas = container.querySelectorAll('li');
    expect(filas).toHaveLength(2);

    const fila = container.querySelector('li[data-anulado="true"]');
    expect(fila).toBeTruthy();
    expect(fila?.textContent).toContain('recibos.historial.anulado');
    expect(fila?.querySelector('.line-through')).toBeTruthy();
    // Y dice que esa plata volvió al saldo.
    expect(fila?.textContent).toContain('recibos.historial.anuladoEl');
  });

  it('no ofrece anular un recibo que ya está anulado', () => {
    render({ recibos: [ANULADO], onAnular: vi.fn() });

    expect(botonesConTexto('recibos.historial.anular')).toHaveLength(0);
  });

  it('🔴 «recibido con recibo» suma los vivos, no los anulados', () => {
    render({ recibos: [VIVO, ANULADO], onAnular: vi.fn() });

    const texto = container.textContent ?? '';
    // 500.000 del vivo. Si contara el anulado daría 800.000.
    expect(texto).toContain('$500000');
    expect(texto).not.toContain('$800000');
    expect(texto).toContain('recibos.historial.conteoUno');
  });

  it('el más reciente va primero', () => {
    render({ recibos: [ANULADO, VIVO], onAnular: vi.fn() });

    const filas = Array.from(container.querySelectorAll('li'));
    expect(filas[0].getAttribute('data-anulado')).toBeNull();
  });

  it('sin recibos muestra el vacío, no una tabla en blanco', () => {
    render({ recibos: [] });

    const texto = container.textContent ?? '';
    expect(texto).toContain('recibos.historial.vacio');
    expect(texto).toContain('recibos.historial.vacioDesc');
  });

  it('sin onAnular no aparece el botón: nadie ofrece lo que no puede hacer', () => {
    render({ recibos: [VIVO] });

    expect(botonesConTexto('recibos.historial.anular')).toHaveLength(0);
  });
});

describe('<RecibosDeCajaHistorial> anular', () => {
  it('🔴 el motivo es obligatorio: el confirmar nace deshabilitado', () => {
    render({ recibos: [VIVO], onAnular: vi.fn() });

    act(() => {
      botonesConTexto('recibos.historial.anular')[0].click();
    });

    // El diálogo se monta en un portal, no dentro del container.
    const confirmar = Array.from(document.body.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('recibos.anular.confirmar'),
    );
    expect(confirmar).toBeTruthy();
    expect((confirmar as HTMLButtonElement).disabled).toBe(true);
  });

  it('manda el motivo recortado al back', async () => {
    const onAnular = vi.fn().mockResolvedValue(undefined);
    render({ recibos: [VIVO], onAnular });

    act(() => {
      botonesConTexto('recibos.historial.anular')[0].click();
    });

    const campo = document.body.querySelector<HTMLTextAreaElement>('#motivo-anulacion');
    expect(campo).toBeTruthy();

    // Cambio controlado: React escucha el evento nativo, no la asignación directa.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )!.set!;
    act(() => {
      setter.call(campo, '  se devolvió el cheque  ');
      campo!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const confirmar = Array.from(document.body.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('recibos.anular.confirmar'),
    ) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(false);

    await act(async () => {
      confirmar.click();
    });

    expect(onAnular).toHaveBeenCalledTimes(1);
    expect(onAnular.mock.calls[0][0]).toMatchObject({ id: 'rc-1' });
    expect(onAnular.mock.calls[0][1]).toBe('se devolvió el cheque');
  });

  it('🔴 muestra el mensaje del back cuando el anular falla, no un «hubo un error»', async () => {
    const onAnular = vi
      .fn()
      .mockRejectedValue(new Error('Un recibo conciliado no se puede anular'));
    render({ recibos: [VIVO], onAnular });

    act(() => {
      botonesConTexto('recibos.historial.anular')[0].click();
    });

    const campo = document.body.querySelector<HTMLTextAreaElement>('#motivo-anulacion');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )!.set!;
    act(() => {
      setter.call(campo, 'error de digitación');
      campo!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const confirmar = Array.from(document.body.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('recibos.anular.confirmar'),
    ) as HTMLButtonElement;

    await act(async () => {
      confirmar.click();
    });

    expect(document.body.textContent).toContain('Un recibo conciliado no se puede anular');
  });
});
