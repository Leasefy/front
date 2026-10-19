/**
 * CarteraDelSistemaAnterior.test.tsx — T-0168.
 *
 * La tarjeta de cartera pasó del balance por tercero (una cifra por inquilino)
 * al informe de cartera POR FACTURA (una línea por fila). Lo que se congela:
 *  - de las columnas del informe se toman las del INQUILINO y el SALDO
 *    PENDIENTE, nunca las del propietario ni el total de la factura;
 *  - todo el archivo viaja en UNA llamada, primero como vista previa y sólo
 *    después, al confirmar, como carga;
 *  - mientras la carga de comprobantes congela el paso, la zona de arrastre se
 *    ve bloqueada y lo dice.
 * Los valores son inventados: ninguna cédula, nombre ni monto de una persona real.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CargaDeCarteraPorFactura } from '@/lib/api/contracts.service';
import { ApiError } from '@/lib/api/client';
import { ENCABEZADOS_DEL_INFORME_DE_CARTERA } from '@/lib/migracion/cartera-por-factura.fixture';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
}));

const { api } = vi.hoisted(() => ({
  api: { fechaDeCorte: vi.fn(), carteraPorFactura: vi.fn() },
}));
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { migracion: api },
}));

import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { CarteraDelSistemaAnterior } from './CarteraDelSistemaAnterior';

const fila = (v: Record<string, unknown>, rowIndex: number) => ({
  _rowIndex: rowIndex,
  ...Object.fromEntries(ENCABEZADOS_DEL_INFORME_DE_CARTERA.map((h) => [h, ''])),
  ...v,
});

const FILAS = [
  fila(
    {
      'Fecha de Factura': '2025-12-28',
      'Fecha de Vencimiento': '2026-01-05',
      'Documento Inquilino': '900111222',
      'Nombre Inquilino': 'Inquilino Uno',
      'Documento Propietario': '555666777',
      'Nombre Propietario': 'Dueña Uno',
      Concepto: 'Canon',
      'Valor Total': '2000000',
      'Saldo Pendiente': '1500000',
    },
    1,
  ),
  fila(
    {
      'Fecha de Factura': '2026-01-28',
      'Fecha de Vencimiento': '2026-02-05',
      'Documento Inquilino': '900111222',
      'Nombre Inquilino': 'Inquilino Uno',
      'Documento Propietario': '555666777',
      'Nombre Propietario': 'Dueña Uno',
      Concepto: 'Administración',
      'Valor Total': '200000',
      'Saldo Pendiente': '80000',
    },
    2,
  ),
];

const RESPUESTA: CargaDeCarteraPorFactura = {
  fechaDeCorte: '2026-03-01',
  inquilinos: [
    {
      documento: '900111222',
      nombre: 'Inquilino Uno',
      lineas: 2,
      deudaCop: 1_580_000,
      aFavorCop: 0,
      desde: '2026-01-05',
      estado: 'SE_CARGA',
      motivo: null,
      contrato: { id: 'c-1', numero: 12, externalId: null, inquilino: 'Inquilino Uno', inmueble: 'Apto 101' },
      otrosContratos: 0,
    },
    {
      documento: '800333444',
      nombre: 'Inquilino Dos',
      lineas: 1,
      deudaCop: 50_000,
      aFavorCop: 0,
      desde: '2026-02-05',
      estado: 'SIN_CONTRATO',
      motivo: 'Ningún contrato de la inmobiliaria tiene este documento como inquilino.',
      contrato: null,
      otrosContratos: 0,
    },
  ],
  lineasConProblema: [
    { fila: 9, documento: '700', problema: 'DOCUMENTO_CORTO', motivo: 'El documento del inquilino no tiene suficientes dígitos.' },
  ],
  totales: {
    lineasRecibidas: 4,
    lineasValidas: 3,
    inquilinos: 2,
    conContrato: 1,
    sinContrato: 1,
    deudaCop: 1_580_000,
    aFavorCop: 0,
  },
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(props: { bloqueada?: boolean } = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<CarteraDelSistemaAnterior {...props} />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

async function click(el: Element | null | undefined) {
  if (!el) throw new Error('no está el botón');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

async function subir(rows: Record<string, unknown>[], headers: string[] = [...ENCABEZADOS_DEL_INFORME_DE_CARTERA]) {
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({ rows, headers, sheetNames: ['Hoja1'] } as never);
  const input = q('input-cartera') as HTMLInputElement;
  const file = new File(['x'], 'informe.csv', { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.fechaDeCorte.mockResolvedValue({ fecha: '2026-03-01', editable: true, motivo: null });
  api.carteraPorFactura.mockResolvedValue(RESPUESTA);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
  vi.clearAllMocks();
});

describe('la cartera por factura', () => {
  it('pide el informe de cartera por factura, no el balance por tercero', async () => {
    await pintar();
    const texto = q('cartera-del-sistema-anterior')?.textContent ?? '';
    expect(texto).toContain('informe de cartera');
    expect(texto).not.toContain('balance de prueba');
    expect(q('dropzone-cartera')?.textContent).toContain('Excel o CSV');
  });

  it('sin fecha de corte no deja subir nada y dice qué falta', async () => {
    api.fechaDeCorte.mockResolvedValue({ fecha: null, editable: true, motivo: null });
    await pintar();
    expect(q('cartera-sin-corte')).not.toBeNull();
    expect(q('dropzone-cartera')).toBeNull();
  });

  it('manda TODAS las filas en una llamada de vista previa, con el inquilino y el saldo pendiente', async () => {
    await pintar();
    await subir(FILAS);

    expect(api.carteraPorFactura).toHaveBeenCalledTimes(1);
    const [lineas, soloVer] = api.carteraPorFactura.mock.calls[0];
    expect(soloVer).toBe(true);
    expect(lineas).toEqual([
      { fila: 2, fecha: '2026-01-05', documento: '900111222', nombre: 'Inquilino Uno', concepto: 'Canon', valorCop: 1_500_000 },
      { fila: 3, fecha: '2026-02-05', documento: '900111222', nombre: 'Inquilino Uno', concepto: 'Administración', valorCop: 80_000 },
    ]);
  });

  it('pinta lo que contestó el back: inquilinos con su estado, las líneas con problema y los totales', async () => {
    await pintar();
    await subir(FILAS);

    expect(q('vista-de-la-cartera')).not.toBeNull();
    expect(q('inquilino-900111222')?.textContent).toContain('Se carga');
    expect(q('inquilino-900111222')?.textContent).toContain('#12');
    expect(q('inquilino-800333444')?.textContent).toContain('Sin contrato');
    expect(q('lineas-con-problema')?.textContent).toContain('Fila 9');
    expect(q('lineas-con-problema')?.textContent).toContain('suficientes dígitos');
    expect(q('resumen-de-la-cartera')?.textContent).toContain('3 de 4 líneas');
    // Nada se escribió todavía.
    expect(q('cartera-cargada')).toBeNull();
  });

  it('un estado que esta versión no conoce se ve como «Revisar» y no rompe', async () => {
    api.carteraPorFactura.mockResolvedValue({
      ...RESPUESTA,
      inquilinos: [{ ...RESPUESTA.inquilinos[0], estado: 'ALGO_NUEVO' as never, motivo: 'Mira esto.' }],
    });
    await pintar();
    await subir(FILAS);
    expect(q('inquilino-900111222')?.textContent).toContain('Revisar');
    expect(q('inquilino-900111222')?.textContent).toContain('Mira esto.');
  });

  it('«Cargar» manda la MISMA lista, ahora sí escribiendo, y dice que quedó cargada', async () => {
    await pintar();
    await subir(FILAS);
    const vistaPrevia = api.carteraPorFactura.mock.calls[0][0];

    api.carteraPorFactura.mockResolvedValue({
      ...RESPUESTA,
      inquilinos: [{ ...RESPUESTA.inquilinos[0], estado: 'CARGADO' }, RESPUESTA.inquilinos[1]],
    });
    await click(q('cargar-la-cartera'));

    expect(api.carteraPorFactura).toHaveBeenCalledTimes(2);
    const [lineas, soloVer] = api.carteraPorFactura.mock.calls[1];
    expect(soloVer).toBe(false);
    expect(lineas).toEqual(vistaPrevia);
    expect(q('cartera-cargada')).not.toBeNull();
    expect(q('cargar-la-cartera')).toBeNull();
  });

  it('sin nadie que cargar (todos sin contrato) el botón queda apagado', async () => {
    api.carteraPorFactura.mockResolvedValue({ ...RESPUESTA, inquilinos: [RESPUESTA.inquilinos[1]] });
    await pintar();
    await subir(FILAS);
    expect((q('cargar-la-cartera') as HTMLButtonElement).disabled).toBe(true);
  });

  it('si falta una columna obligatoria lo dice, ofrece elegirla y no llama al back', async () => {
    const sinSaldo = ENCABEZADOS_DEL_INFORME_DE_CARTERA.filter((h) => h !== 'Saldo Pendiente');
    await pintar();
    await subir(FILAS, sinSaldo);
    expect(q('mapeo-cartera')?.textContent).toContain('el saldo pendiente');
    expect(api.carteraPorFactura).not.toHaveBeenCalled();
  });

  it('cuenta las filas que no se mandan y las nombra, sin mandarlas', async () => {
    await pintar();
    await subir([...FILAS, { ...FILAS[0], _rowIndex: 3, 'Saldo Pendiente': 'mucho' }]);
    expect(q('cartera-sin-enviar')?.textContent).toContain('1 fila del archivo no se envía');
    expect(q('cartera-sin-enviar')?.textContent).toContain('Fila 4');
    expect(api.carteraPorFactura.mock.calls[0][0]).toHaveLength(2);
  });

  it('más de 20.000 líneas: lo rechaza con un mensaje y no manda nada', async () => {
    const muchas = Array.from({ length: 20_001 }, (_, i) => ({ ...FILAS[0], _rowIndex: i + 1 }));
    await pintar();
    await subir(muchas);
    expect(q('cartera-demasiadas')?.textContent).toContain('20.001');
    expect(api.carteraPorFactura).not.toHaveBeenCalled();
  });

  it('el 409 SIN_FECHA_DE_CORTE vuelve a pedir la fecha de corte, sin reintentar', async () => {
    api.carteraPorFactura.mockRejectedValue(
      new ApiError(409, 'Primero fija la fecha de corte de la migración.', 'SIN_FECHA_DE_CORTE'),
    );
    await pintar();
    await subir(FILAS);
    expect(q('cartera-sin-corte')).not.toBeNull();
    expect(api.carteraPorFactura).toHaveBeenCalledTimes(1);
  });
});

describe('el candado visible (fix A)', () => {
  it('bloqueada: la zona se ve apagada, aria-disabled y dice por qué', async () => {
    await pintar({ bloqueada: true });
    const zona = q('dropzone-cartera') as HTMLElement;
    expect(zona.getAttribute('aria-disabled')).toBe('true');
    expect(zona.className).toContain('opacity-');
    expect(zona.textContent).toContain('Espera a que termine la carga de comprobantes.');
    expect(zona.textContent).not.toContain('Excel o CSV');
  });

  it('libre: la zona no está marcada como deshabilitada', async () => {
    await pintar();
    const zona = q('dropzone-cartera') as HTMLElement;
    expect(zona.getAttribute('aria-disabled')).not.toBe('true');
    expect(zona.className).not.toContain('opacity-');
  });
});
