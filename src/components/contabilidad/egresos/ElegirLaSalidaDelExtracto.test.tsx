/**
 * 🔴 Seguimiento 6 (pendiente técnico de las salidas): la pantalla de Egresos
 * elige la salida del extracto de una lista con búsqueda. Primero lo que calza
 * con el neto; la búsqueda va al back con una pausa; sin nada, lo dice; si la
 * lectura falla, deja volver a intentar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({ api: { listar: vi.fn() } }));
vi.mock('@/lib/api/salidas-del-egreso', () => ({ salidasDelEgresoApi: api }));
vi.mock('@/lib/i18n', async () => {
  const { t } = await import('@/lib/i18n/i18n-test-stub');
  return { useI18n: () => ({ t, formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }) };
});

import { ElegirLaSalidaDelExtracto, PAUSA_DE_LA_BUSQUEDA_MS } from './ElegirLaSalidaDelExtracto';

const RESPUESTA = {
  egreso: { id: 'e1', netoCop: 480_000, fecha: '2026-09-10', beneficiario: 'Ferretería' },
  sePuedeConciliar: true,
  porQueNo: null,
  total: 2,
  salidas: [
    { id: 'mb-1', fecha: '2026-09-11', descripcion: 'PAGO FERRETERIA', referencia: 'REF 77', valorCop: 480_000, calza: true, dias: 1, cuenta: { id: 'c1', nombre: 'Ahorros •••• 6789' } },
    { id: 'mb-2', fecha: '2026-09-12', descripcion: 'PAGO ABOGADO', referencia: null, valorCop: 900_000, calza: false, dias: 2, cuenta: null },
  ],
};

let root: Root | null = null;
let div: HTMLDivElement;
const q = (t: string) => div.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

async function montar(onElegir = vi.fn(), elegido = '') {
  div = document.createElement('div');
  document.body.appendChild(div);
  await act(async () => {
    root = createRoot(div);
    root.render(
      <ElegirLaSalidaDelExtracto egresoId="e1" elegido={elegido} onElegir={onElegir} idDeLaBusqueda="buscar" />,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
  return onElegir;
}

beforeEach(() => {
  api.listar.mockReset().mockResolvedValue(RESPUESTA);
});
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  div.remove();
  vi.useRealTimers();
});

describe('elegir la salida del extracto', () => {
  it('lista las salidas con su fecha, su cuenta y «Calza con el neto», y elegir una avisa su id', async () => {
    const onElegir = await montar();
    expect(api.listar).toHaveBeenCalledWith('e1', '');
    expect(q('salida-del-egreso-mb-1')!.textContent).toContain('PAGO FERRETERIA');
    expect(q('salida-del-egreso-mb-1')!.textContent).toContain('Ahorros •••• 6789');
    expect(q('salida-del-egreso-mb-1')!.textContent).toContain('Calza con el neto');
    expect(q('salida-del-egreso-mb-2')!.textContent).not.toContain('Calza con el neto');
    expect(div.querySelector('[role="radiogroup"]')).not.toBeNull();
    const radio = q('salida-del-egreso-mb-1')!.querySelector('input') as HTMLInputElement;
    await act(async () => radio.click());
    expect(onElegir).toHaveBeenCalledWith('mb-1');
  });

  it('la búsqueda va al back después de una pausa (no en cada tecla)', async () => {
    vi.useFakeTimers();
    await montar();
    api.listar.mockClear();
    const input = q('buscar-la-salida') as HTMLInputElement;
    const escribir = (v: string) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(input, v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    await act(async () => {
      escribir('fer');
      escribir('ferre');
    });
    expect(api.listar).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(PAUSA_DE_LA_BUSQUEDA_MS + 10);
    });
    expect(api.listar).toHaveBeenCalledTimes(1);
    expect(api.listar).toHaveBeenCalledWith('e1', 'ferre');
  });

  it('sin salidas pendientes lo dice (y cómo seguir)', async () => {
    api.listar.mockResolvedValue({ ...RESPUESTA, salidas: [], total: 0 });
    await montar();
    expect(q('salidas-del-egreso-vacio')!.textContent).toContain('Carga el extracto de la cuenta');
  });

  it('si la lectura falla, lo dice y deja volver a intentar', async () => {
    api.listar.mockRejectedValueOnce(new Error('caído')).mockResolvedValueOnce(RESPUESTA);
    await montar();
    expect(q('salidas-del-egreso-error')).not.toBeNull();
    const boton = [...div.querySelectorAll('button')].find((b) => b.textContent === 'Volver a intentar')!;
    await act(async () => boton.click());
    await act(async () => {
      await Promise.resolve();
    });
    expect(q('salida-del-egreso-mb-1')).not.toBeNull();
  });
});
