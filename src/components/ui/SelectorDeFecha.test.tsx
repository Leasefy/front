import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ANIO_MAS_VIEJO,
  CalendarioConMesYAnio,
  SelectorDeFecha,
  aniosDelMenu,
  fechaDelSelector,
  mesFueraDelRango,
} from './SelectorDeFecha';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function montar(ui: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

function elegir(select: HTMLSelectElement, valor: string) {
  act(() => {
    select.value = valor;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe('aniosDelMenu', () => {
  const hoy = new Date(2026, 9, 29);

  it('va de 1940 a dentro de 15 años, del más nuevo al más viejo', () => {
    const anios = aniosDelMenu({ hoy });
    expect(anios[0]).toBe(2041);
    expect(anios[anios.length - 1]).toBe(ANIO_MAS_VIEJO);
  });

  it('se recorta con minDate y maxDate', () => {
    expect(aniosDelMenu({ hoy, minDate: new Date(2020, 0, 1), maxDate: new Date(2026, 11, 31) })).toEqual([
      2026, 2025, 2024, 2023, 2022, 2021, 2020,
    ]);
  });

  it('nunca deja por fuera el año que se está mirando', () => {
    expect(aniosDelMenu({ hoy, incluir: 1930 }).at(-1)).toBe(1930);
  });
});

describe('mesFueraDelRango', () => {
  it('apaga los meses enteros antes del mínimo o después del máximo', () => {
    const min = new Date(2026, 3, 15);
    const max = new Date(2026, 8, 10);
    expect(mesFueraDelRango(2026, 2, min, max)).toBe(true);
    expect(mesFueraDelRango(2026, 3, min, max)).toBe(false);
    expect(mesFueraDelRango(2026, 8, min, max)).toBe(false);
    expect(mesFueraDelRango(2026, 9, min, max)).toBe(true);
  });
});

describe('<CalendarioConMesYAnio>', () => {
  it('salta de año y de mes con los menús, sin flechas, y elige el día', () => {
    const onChange = vi.fn();
    const el = montar(<CalendarioConMesYAnio value={new Date(2026, 9, 15)} onChange={onChange} />);
    const cal = el.querySelector('[data-testid="calendario-con-mes-y-anio"]')!;
    expect(cal.getAttribute('aria-label')).toBe('Calendario, octubre 2026');

    elegir(el.querySelector<HTMLSelectElement>('[data-testid="calendario-anio"]')!, '1985');
    elegir(el.querySelector<HTMLSelectElement>('[data-testid="calendario-mes"]')!, '2');
    expect(cal.getAttribute('aria-label')).toBe('Calendario, marzo 1985');

    const dia = el.querySelector<HTMLButtonElement>('button[aria-label="7 de marzo de 1985"]')!;
    act(() => dia.click());
    expect(onChange).toHaveBeenCalledTimes(1);
    const elegida: Date = onChange.mock.calls[0][0];
    expect([elegida.getFullYear(), elegida.getMonth(), elegida.getDate()]).toEqual([1985, 2, 7]);
  });

  it('las flechas siguen andando de mes en mes y se apagan en el borde del rango', () => {
    const el = montar(
      <CalendarioConMesYAnio value={new Date(2026, 0, 10)} minDate={new Date(2026, 0, 1)} maxDate={new Date(2026, 1, 28)} />,
    );
    const antes = el.querySelector<HTMLButtonElement>('button[aria-label="Mes anterior"]')!;
    const despues = el.querySelector<HTMLButtonElement>('button[aria-label="Mes siguiente"]')!;
    expect(antes.disabled).toBe(true);
    act(() => despues.click());
    expect(el.querySelector('[data-testid="calendario-con-mes-y-anio"]')!.getAttribute('aria-label')).toBe(
      'Calendario, febrero 2026',
    );
    expect(despues.disabled).toBe(true);
  });
});

describe('<SelectorDeFecha>', () => {
  it('escribe la fecha como el DatePicker de Cadence y dice cuál está elegida', () => {
    const el = montar(<SelectorDeFecha value={new Date(1990, 4, 3)} />);
    const boton = el.querySelector('button')!;
    expect(boton.textContent).toContain(fechaDelSelector(new Date(1990, 4, 3)));
    expect(boton.getAttribute('aria-label')).toBe('Fecha seleccionada: 3 may 1990');
  });

  it('sin fecha muestra el texto de ayuda', () => {
    const el = montar(<SelectorDeFecha placeholder="Fecha de nacimiento" />);
    expect(el.querySelector('button')!.textContent).toContain('Fecha de nacimiento');
  });
});
