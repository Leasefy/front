/**
 * Lo que se le dice a quien aprieta «Invitar».
 *
 * 🔴 La distinción que importa: la cuenta puede quedar CREADA y el correo NO
 * salir. Decir «listo» ahí deja a una persona esperando un enlace que nunca
 * llegó — es el mismo agujero que dejó 1.446 invitaciones invisibles el 8 de
 * septiembre.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { invitarAlPortal, toastMock } = vi.hoisted(() => ({
  invitarAlPortal: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { invitarAlPortal },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { InvitarAlPortal } from './InvitarAlPortal';

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

async function pintar(correo: string | null = 'ana@example.co') {
  const onInvitado = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <InvitarAlPortal propietarioId="p-1" correo={correo} onInvitado={onInvitado} />,
    );
  });
  return onInvitado;
}

async function invitar() {
  await act(async () => {
    (q('invitar-propietario') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  invitarAlPortal.mockReset();
  Object.values(toastMock).forEach((f) => f.mockClear());
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

describe('<InvitarAlPortal>', () => {
  it('cuando sale, lo dice con el correo al que llegó', async () => {
    invitarAlPortal.mockResolvedValue({ cuentaDePortalId: 'u-1', enviada: true });
    const onInvitado = await pintar('ana@correo.co');

    await invitar();

    expect(onInvitado).toHaveBeenCalledWith('u-1');
    const [titulo, opciones] = toastMock.success.mock.calls[0];
    expect(titulo).toBe('Invitación enviada');
    expect(opciones.description).toContain('ana@correo.co');
  });

  /*
   * 🔴 La cuenta quedó creada —el mensaje ya funciona— pero el correo no
   * salió. Son dos hechos distintos y se dicen los dos.
   */
  it('si el correo no sale, avisa sin decir que está listo', async () => {
    invitarAlPortal.mockResolvedValue({
      cuentaDePortalId: 'u-1',
      enviada: false,
      motivo: 'ENVIO_FALLIDO',
    });
    const onInvitado = await pintar();

    await invitar();

    // La cuenta sirve igual: la ficha ya puede ofrecer el mensaje.
    expect(onInvitado).toHaveBeenCalledWith('u-1');
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.warning.mock.calls[0][0]).toContain('el correo no salió');
  });

  it('un correo que no existe como dominio se explica, no se repite', async () => {
    invitarAlPortal.mockResolvedValue({
      cuentaDePortalId: 'u-1',
      enviada: false,
      motivo: 'DOMINIO_NO_ENTREGABLE',
    });
    await pintar();

    await invitar();

    expect(toastMock.warning.mock.calls[0][1].description).toContain('Corrígelo en su ficha');
  });

  it('un reenvío demasiado seguido dice que espere', async () => {
    invitarAlPortal.mockResolvedValue({
      cuentaDePortalId: 'u-1',
      enviada: false,
      motivo: 'RECIEN_ENVIADA',
    });
    await pintar();

    await invitar();

    expect(toastMock.warning.mock.calls[0][1].description).toContain('Espera unos minutos');
  });

  it('si el servidor falla no se inventa una cuenta', async () => {
    invitarAlPortal.mockRejectedValue(new Error('500'));
    const onInvitado = await pintar();

    await invitar();

    expect(onInvitado).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
    // Y el botón vuelve: se puede reintentar.
    expect((q('invitar-propietario') as HTMLButtonElement).disabled).toBe(false);
  });

  it('sin correo el botón no se puede apretar', async () => {
    await pintar(null);

    expect((q('invitar-propietario') as HTMLButtonElement).disabled).toBe(true);
    expect(q('propietario-sin-cuenta')?.textContent).toContain('Agrega su correo');
  });
});
