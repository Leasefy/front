/**
 * «Escribir con IA» (Juan, Portofino, 15-10-2026): el borrador va al campo y
 * NUNCA se manda solo; si ya había algo escrito, se pide mejorarlo; un fallo
 * se dice con el traductor y el campo no se toca.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { redactarMock } = vi.hoisted(() => ({ redactarMock: vi.fn() }));
vi.mock('@/lib/api/redactar-mensaje.service', () => ({
  redactarMensaje: (...args: unknown[]) => redactarMock(...args),
}));

import { EscribirConIaPopover } from './EscribirConIaPopover';
import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CONTEXTO = {
  nombre: 'John Jaime Mesa',
  perfil: 'inquilino' as const,
  inmobiliaria: 'Portofino',
  mensajes: [{ deLaInmobiliaria: false, texto: '¿Cuánto debo?' }],
  datos: { mes: 'octubre de 2026' },
};

let container: HTMLDivElement;
let root: Root;
const onEscrito = vi.fn<(texto: string) => void>();

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  redactarMock.mockReset();
  onEscrito.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function montar(borradorActual = '') {
  act(() => {
    root.render(
      <EscribirConIaPopover
        locale="es"
        agencyId="agencia-1"
        contexto={() => CONTEXTO}
        borradorActual={borradorActual}
        onEscrito={onEscrito}
      />,
    );
  });
}

function abrir() {
  act(() => {
    (container.querySelector('[data-testid="abrir-escribir-con-ia"]') as HTMLButtonElement).click();
  });
}

function escribirInstruccion(texto: string) {
  const campo = container.querySelector('[data-testid="instruccion-de-la-ia"]') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(campo, texto);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function pedir() {
  await act(async () => {
    (container.querySelector('[data-testid="escribir-con-ia"]') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<EscribirConIaPopover>', () => {
  it('pide con el contexto y lo que quiere decir, y deja el borrador en el campo (no manda nada)', async () => {
    redactarMock.mockResolvedValue({ texto: 'Hola John, le recordamos el pago de octubre.', tokensUsed: { input: 1, output: 1 }, estimatedCostCop: 4 });
    montar();
    abrir();
    escribirInstruccion('recuérdale el pago de octubre');
    await pedir();

    expect(redactarMock).toHaveBeenCalledWith('agencia-1', {
      ...CONTEXTO,
      instruccion: 'recuérdale el pago de octubre',
      borrador: null,
    });
    expect(onEscrito).toHaveBeenCalledWith('Hola John, le recordamos el pago de octubre.');
    expect(container.querySelector('[data-testid="panel-escribir-con-ia"]')).toBeNull();
  });

  it('con algo escrito en el campo, ofrece mejorarlo y lo manda como borrador', async () => {
    redactarMock.mockResolvedValue({ texto: 'Hola John, ¿pudo pagar?', tokensUsed: { input: 1, output: 1 }, estimatedCostCop: 4 });
    montar('hola john pago');
    abrir();
    expect(container.textContent).toContain('Mejorar lo que escribí');
    await pedir();
    expect(redactarMock.mock.calls[0][1]).toMatchObject({ borrador: 'hola john pago', instruccion: null });
  });

  it('un fallo se dice con el traductor y el campo no se toca', async () => {
    redactarMock.mockRejectedValue(new ApiError(503, 'Escribir con IA no está disponible en este momento.', 'REDACCION_NO_DISPONIBLE'));
    montar();
    abrir();
    await pedir();
    expect(onEscrito).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="error-de-la-ia"]')?.textContent).toMatch(/\S/);
  });
});
