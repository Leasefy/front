/**
 * «Tu agente inmobiliario» (Nico, 27-10-2026): el propietario asigna, ve y quita al agente de su inmueble.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toast } = vi.hoisted(() => ({
  api: { getAgents: vi.fn(), assignAgent: vi.fn(), removeAgent: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast }));
vi.mock('@/components/ui/empty-state', () => ({ EmptyState: ({ title }: { title: string }) => <p>{title}</p> }));

import { ApiError } from '@/lib/api/client';
import { AgenteDelInmueble } from './AgenteDelInmueble';

let c: HTMLDivElement;
let r: Root;
const JULIANA = { id: 'u1', email: 'juliana@ejemplo.co', firstName: 'Juliana', lastName: 'Rodríguez', phone: '3001234567' };

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  Object.values(toast).forEach((f) => f.mockReset());
  c = document.createElement('div');
  document.body.appendChild(c);
  r = createRoot(c);
});
afterEach(() => {
  act(() => r.unmount());
  c.remove();
});

async function montar() {
  await act(async () => {
    r.render(<AgenteDelInmueble propertyId="p1" />);
  });
}
function escribir(valor: string) {
  const el = c.querySelector<HTMLInputElement>('[data-testid="agente-correo"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function asignar() {
  await act(async () => {
    c.querySelector<HTMLButtonElement>('[data-testid="agente-asignar"]')!.click();
  });
}

describe('AgenteDelInmueble', () => {
  it('sin agente: lo dice y ofrece asignarlo por correo', async () => {
    api.getAgents.mockResolvedValue([]);
    await montar();
    expect(c.textContent).toContain('Tu agente inmobiliario');
    expect(c.textContent).toContain('Todavía no tiene agente');
  });

  it('asigna por correo y lo muestra en la lista', async () => {
    api.getAgents.mockResolvedValueOnce([]).mockResolvedValueOnce([JULIANA]);
    api.assignAgent.mockResolvedValue(undefined);
    await montar();
    escribir(' juliana@ejemplo.co ');
    await asignar();
    expect(api.assignAgent).toHaveBeenCalledWith('p1', 'juliana@ejemplo.co');
    expect(c.querySelector('[data-testid="agentes-del-inmueble"]')?.textContent).toContain('Juliana Rodríguez');
  });

  it('un correo sin cuenta de agente: lo dice y ofrece el enlace para crearla', async () => {
    api.getAgents.mockResolvedValue([]);
    api.assignAgent.mockRejectedValue(new ApiError(404, 'No hay un asesor con ese correo'));
    await montar();
    escribir('nadie@ejemplo.co');
    await asignar();
    expect(c.textContent).toContain('Ese correo no tiene una cuenta de agente inmobiliario en Leasefy.');
    expect(c.querySelector('[data-testid="agente-sin-cuenta"]')).not.toBeNull();
  });

  it('un correo mal escrito no llega al servidor', async () => {
    api.getAgents.mockResolvedValue([]);
    await montar();
    escribir('juliana');
    await asignar();
    expect(api.assignAgent).not.toHaveBeenCalled();
    expect(c.textContent).toContain('Escribe el correo con el que tu agente entra a Leasefy.');
  });
});
