/**
 * La casa escoge la modalidad por defecto (D1), los cobros al arrendar y si es
 * responsable de IVA (D4). Tres cosas que mueven plata: la pantalla no puede
 * inventar ninguna — pinta lo que el back devolvió y guarda exactamente eso.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  configuracion: vi.fn(),
  guardarConfiguracion: vi.fn(),
  updateAgency: vi.fn(),
}));

vi.mock('@/lib/api/mandato.service', () => ({
  mandatoApi: { configuracion: h.configuracion, guardarConfiguracion: h.guardarConfiguracion },
}));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agencyApi: { updateAgency: h.updateAgency },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { SeccionMandato } from './SeccionMandato';

const CONFIG = {
  disponible: true,
  motivo: null,
  modalidadDeMandato: null,
  modalidadDeMandatoDesde: null,
  cobrosAlArrendar: [
    {
      id: 'colocacion',
      nombre: 'Comisión de colocación',
      tipo: 'PORCENTAJE_PRIMER_CANON' as const,
      valor: 50,
      opcional: false,
      activo: true,
    },
  ],
  ivaDeLaComision: {
    responsableIva: null,
    ivaPorcentaje: 19,
    efecto: 'Sin perfil tributario: la comisión sigue como hoy, sin IVA.',
  },
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.configuracion.mockReset().mockResolvedValue(structuredClone(CONFIG));
  h.guardarConfiguracion.mockReset().mockImplementation(async () => structuredClone(CONFIG));
  h.updateAgency.mockReset().mockResolvedValue({});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<SeccionMandato />);
  });
}

function botonPorTexto(texto: string): HTMLButtonElement {
  const b = [...container.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  if (!b) throw new Error(`No hay botón «${texto}». Hay: ${[...container.querySelectorAll('button')].map((x) => x.textContent).join(' | ')}`);
  return b as HTMLButtonElement;
}

describe('SeccionMandato', () => {
  it('pinta lo que el back devolvió: modalidad, cobros y el efecto del IVA', async () => {
    await pintar();
    const texto = container.textContent ?? '';
    expect(texto).toContain('Modalidad de los mandatos');
    expect(texto).toContain('Sin perfil tributario');
    const nombre = container.querySelector<HTMLInputElement>('input[aria-label="Nombre del cobro"]');
    expect(nombre?.value).toBe('Comisión de colocación');
  });

  it('guarda la modalidad escogida y no antes', async () => {
    await pintar();
    expect(botonPorTexto('Guardar').disabled).toBe(true);

    /* 🔴 Los radios son los del sistema de diseño desde el 21-09: `role="radio"`
       sobre un `<button>`, no `<input name=...>` de 13 px. Se busca por rol, que
       además es lo que ve un lector de pantalla. */
    const radios = [...container.querySelectorAll<HTMLElement>('[role="radio"]')];
    expect(radios.length).toBeGreaterThan(1);
    await act(async () => {
      radios[1].click();
    });
    await act(async () => {
      botonPorTexto('Guardar').click();
    });
    expect(h.guardarConfiguracion).toHaveBeenCalledWith({ modalidadDeMandato: 'GARANTIZADO' });
  });

  it('guarda los cobros al arrendar con el valor tal cual', async () => {
    await pintar();
    await act(async () => {
      botonPorTexto('Guardar cobros').click();
    });
    expect(h.guardarConfiguracion).toHaveBeenCalledWith({
      cobrosAlArrendar: [
        {
          id: 'colocacion',
          nombre: 'Comisión de colocación',
          tipo: 'PORCENTAJE_PRIMER_CANON',
          valor: 50,
          opcional: false,
          activo: true,
        },
      ],
    });
  });

  it('el perfil de IVA (D4) va por la agencia, no por el mandato', async () => {
    await pintar();
    await act(async () => {
      botonPorTexto('Responsable de IVA').click();
    });
    expect(h.updateAgency).toHaveBeenCalledWith({ responsableIva: true });
    expect(h.configuracion).toHaveBeenCalledTimes(2); // relee el efecto
  });

  it('sin migración, la pantalla dice el motivo y no deja guardar', async () => {
    h.configuracion.mockResolvedValue({
      ...structuredClone(CONFIG),
      disponible: false,
      motivo: 'Falta la migración del mandato.',
    });
    await pintar();
    expect(container.textContent).toContain('Falta la migración del mandato.');
    expect(botonPorTexto('Guardar cobros').disabled).toBe(true);
  });
});
