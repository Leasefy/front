/**
 * 🔴 QA de Portofino (14-10-2026). El inmueble 1591 trae de dueña
 * «10037636770 - MARIA ALEJANDRA VALDERRAMA MUÑOZ»; en Propietarios está con la
 * CC 1037636779, mismo nombre y celular. Nico: «preguntar con un clic», nunca
 * asignarla sola.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { FilaImportacionRow } from './FilaImportacionRow';
import { etiquetaDelGrupoDeFaltante } from './lib/faltantesInmuebles';
import type { FilaDeImportacion } from '@/lib/api/inmuebles-importacion.service';

const FILA_1591: FilaDeImportacion = {
  id: 'f1591',
  lote: 'lote-1',
  fila: 1591,
  estado: 'PENDIENTE',
  faltantes: ['dueno_parecido'],
  overrides: [],
  candidatos: [],
  propertyId: null,
  datos: {
    externalId: '1591',
    title: 'Apartamento en El Poblado',
    address: 'CL 10 # 43-20',
    city: 'Medellín',
    listingType: 'RENT',
    monthlyRent: 2_000_000,
    propietarioDocumento: '10037636770',
    propietarioNombre: 'MARIA ALEJANDRA VALDERRAMA MUÑOZ',
    propietarioTelefono: '3017863100',
  },
  duenoParecido: {
    id: 'po-maria',
    nombre: 'Maria Alejandra Valderrama Muñoz',
    documento: '1037636779',
    tipoDocumento: 'CC',
    telefono: '6043023827',
    telefonoEnComun: '3017863100',
  },
};

let container: HTMLDivElement;
let root: Root;
const onResolver = vi.fn();

function pintar(fila: FilaDeImportacion) {
  act(() => {
    root.render(
      <FilaImportacionRow fila={fila} onResolver={onResolver} onDescartar={vi.fn()} isBusy={false} />,
    );
  });
}

beforeEach(() => {
  onResolver.mockReset().mockResolvedValue(undefined);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('<FilaImportacionRow> — ¿es el mismo propietario?', () => {
  it('pregunta por la ficha que ya está, con su documento, y dice qué trae el archivo', () => {
    pintar(FILA_1591);
    const caja = container.querySelector('[data-testid="dueno-parecido"]')!;
    expect(caja.textContent).toContain('¿Es Maria Alejandra Valderrama Muñoz (CC 1037636779)?');
    expect(caja.textContent).toContain('10037636770');
    expect(caja.textContent).toContain('el mismo teléfono (3017863100)');
    expect(caja.textContent).not.toContain('6043023827');
  });

  it('«Sí, es la misma persona» y «No, es otra persona» mandan la respuesta de un clic', async () => {
    pintar(FILA_1591);
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="dueno-parecido-si"]')!.click();
    });
    expect(onResolver).toHaveBeenLastCalledWith('f1591', { esElDuenoParecido: true });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="dueno-parecido-no"]')!.click();
    });
    expect(onResolver).toHaveBeenLastCalledWith('f1591', { esElDuenoParecido: false });
  });

  it('sin la pregunta del back, no aparece', () => {
    pintar({ ...FILA_1591, faltantes: ['titulo'], duenoParecido: undefined });
    expect(container.querySelector('[data-testid="dueno-parecido"]')).toBeNull();
  });

  it('el grupo de «Completar de golpe» no dice «Sin …»', () => {
    expect(etiquetaDelGrupoDeFaltante('dueno_parecido')).toBe(
      '¿es el mismo propietario? (otro documento, mismo nombre y teléfono)'.replace(/^./, (c) => c.toUpperCase()),
    );
  });
});
