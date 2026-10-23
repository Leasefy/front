/**
 * Los atajos de período (GLOW UP 21-10): «este mes», «el mes pasado», «este año», «todo» a un
 * toque; las dos fechas sólo con «Otro rango» (o cuando el rango puesto no es un atajo).
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RangoDeFechas, atajoDe, hoyEnColombia, rangoDelAtajo } from './RangoDeFechas';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const radio = (texto: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((b) => b.textContent === texto)!;

describe('RangoDeFechas · atajos', () => {
  it('«Mes pasado» es del primer al último día del mes anterior (en Colombia)', () => {
    const [anio, mes] = hoyEnColombia().split('-').map(Number);
    const [a2, m2] = mes === 1 ? [anio - 1, 12] : [anio, mes - 1];
    const mm = String(m2).padStart(2, '0');
    const ultimo = String(new Date(Date.UTC(a2, m2, 0)).getUTCDate()).padStart(2, '0');
    expect(rangoDelAtajo('anterior')).toEqual({ desde: `${a2}-${mm}-01`, hasta: `${a2}-${mm}-${ultimo}` });
    expect(rangoDelAtajo('todo')).toEqual({ desde: '', hasta: '' });
  });

  it('«este mes» también es «del 1 hasta hoy» (así arrancan varios informes)', () => {
    const hoy = hoyEnColombia();
    expect(atajoDe(`${hoy.slice(0, 8)}01`, hoy)).toBe('mes');
    expect(atajoDe('2001-01-01', '2001-02-03')).toBe('otro');
  });

  it('tocar un atajo cambia el rango; con un atajo puesto no se ven las fechas', async () => {
    const onChange = vi.fn();
    await act(async () => {
      root.render(<RangoDeFechas atajos desde="" hasta="" onChange={onChange} />);
    });
    expect(host.querySelector('[data-testid="rango-desde"]')).toBeNull();
    await act(async () => radio('Mes pasado').click());
    expect(onChange).toHaveBeenCalledWith(rangoDelAtajo('anterior'));
  });

  it('«Otro rango» muestra las dos fechas', async () => {
    await act(async () => {
      root.render(<RangoDeFechas atajos desde="" hasta="" onChange={() => {}} />);
    });
    await act(async () => radio('Otro rango').click());
    expect(host.querySelector('[data-testid="rango-desde"]')).not.toBeNull();
  });
});
