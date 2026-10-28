/**
 * El registro rápido del publicador: propietario, inmobiliaria y —Nico, 27-10-2026— agente inmobiliario. El
 * agente usa la plataforma de la inmobiliaria con SU nombre: no se le pide el de una inmobiliaria.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: { post } }));

import { RegistroRapido } from './RegistroRapido';

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({});
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

const campo = (id: string) => contenedor.querySelector<HTMLInputElement>(`[data-testid="${id}"]`);

/** Escribe como una persona (React lee el valor por el `input`). */
function escribir(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function enviar() {
  await act(async () => {
    contenedor.querySelector<HTMLButtonElement>('[data-testid="registro-rapido-seguir"]')!.click();
  });
}

describe('RegistroRapido — agente inmobiliario', () => {
  it('sin perfil ofrece las tres opciones, el agente incluido', () => {
    act(() => raiz.render(<RegistroRapido perfilInicial={null} nombreConocido="" alTerminar={() => undefined} />));
    expect(campo('registro-propietario')).not.toBeNull();
    expect(campo('registro-inmobiliaria')).not.toBeNull();
    expect(contenedor.querySelector('[data-testid="registro-agente"]')?.textContent).toContain('Soy agente inmobiliario');
  });

  it('no pide el nombre de una inmobiliaria: su cuenta queda con SU nombre, en el registro corto', async () => {
    const alTerminar = vi.fn();
    act(() => raiz.render(<RegistroRapido perfilInicial="agente" nombreConocido="" alTerminar={alTerminar} />));
    expect(contenedor.textContent).toContain('Tu cuenta de agente');
    expect(campo('registro-nombre-inmobiliaria')).toBeNull();

    escribir(campo('registro-nombre')!, 'Juliana Rodríguez');
    escribir(campo('registro-whatsapp')!, '300 123 4567');
    await enviar();

    expect(post).toHaveBeenCalledTimes(1);
    const [ruta, cuerpo] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect(ruta).toBe('/users/me/onboarding');
    expect(cuerpo).toMatchObject({
      firstName: 'Juliana',
      lastName: 'Rodríguez',
      userType: 'INMOBILIARIA',
      registroRapido: true,
      agency: { name: 'Juliana Rodríguez' },
    });
    expect(alTerminar).toHaveBeenCalled();
  });

  it('con el nombre que ya trae la cuenta (Google), la cuenta lleva ese nombre', async () => {
    act(() => raiz.render(<RegistroRapido perfilInicial="agente" nombreConocido="Juliana Rodríguez" alTerminar={() => undefined} />));
    expect(campo('registro-nombre')).toBeNull();
    escribir(campo('registro-whatsapp')!, '300 123 4567');
    await enviar();
    expect((post.mock.calls[0] as [string, { agency: { name: string } }])[1].agency.name).toBe('Juliana Rodríguez');
  });

  it('la inmobiliaria sigue igual: pide su nombre y la cuenta lleva el de la inmobiliaria', async () => {
    act(() => raiz.render(<RegistroRapido perfilInicial="agency" nombreConocido="Ana Gómez" alTerminar={() => undefined} />));
    escribir(campo('registro-nombre-inmobiliaria')!, 'Arriendos del Valle');
    escribir(campo('registro-whatsapp')!, '300 123 4567');
    await enviar();
    expect((post.mock.calls[0] as [string, { agency: { name: string } }])[1].agency.name).toBe('Arriendos del Valle');
  });
});
